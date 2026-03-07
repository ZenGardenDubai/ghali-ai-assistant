import { v } from "convex/values";
import { internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getNextCronRun } from "./lib/cronParser";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { MODELS } from "./constants";
import { parseProfileSections, replaceProfileSection, type ProfileCategory } from "./lib/profile";
import { isFileTooLarge } from "./lib/userFiles";

/** Shared mapping from display section names to ProfileCategory keys. */
const SECTION_TO_CATEGORY: Record<string, ProfileCategory> = {
  Personal: "personal",
  Professional: "professional",
  Education: "education",
  Family: "family",
  Location: "location",
  Links: "links",
};

/**
 * Migrate pending reminders from scheduledJobs to scheduledTasks.
 *
 * Idempotent: skips already-cancelled jobs.
 * Run manually via Convex dashboard after deployment.
 *
 * Steps per reminder:
 * 1. Compute schedule and runAt
 * 2. Create a scheduledTasks record + schedule execution
 * 3. Cancel the old scheduler job
 * 4. Mark old scheduledJobs record as "cancelled"
 * 5. Update any items referencing the old reminderJobId → set scheduledTaskId
 */
export const migrateRemindersToScheduledTasks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allReminders = await ctx.db
      .query("scheduledJobs")
      .filter((q) =>
        q.and(
          q.eq(q.field("kind"), "reminder"),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    let migratedCount = 0;
    let skippedCount = 0;

    for (const job of allReminders) {
      const timezone = job.timezone ?? "UTC";

      // Compute runAt — for cron, recompute from now (old runAt may be stale)
      let runAt = job.runAt;
      if (job.cronExpr) {
        try {
          runAt = getNextCronRun(job.cronExpr, timezone);
        } catch {
          // Invalid cron — keep original runAt
        }
      }

      // Skip stale one-off reminders (should have fired already)
      if (!job.cronExpr && runAt < Date.now()) {
        await ctx.db.patch(job._id, { status: "cancelled" });
        skippedCount++;
        continue;
      }

      // Build schedule object after runAt is finalized
      const schedule = job.cronExpr
        ? { kind: "cron" as const, expr: job.cronExpr }
        : { kind: "once" as const, runAt };

      // Create scheduledTasks record
      const taskId = await ctx.db.insert("scheduledTasks", {
        userId: job.userId,
        title: job.payload.slice(0, 100),
        description: job.payload,
        schedule,
        timezone,
        enabled: true,
        createdAt: Date.now(),
      });

      // Schedule the execution — delete task on failure to avoid orphans
      try {
        const schedulerJobId = await ctx.scheduler.runAt(
          runAt,
          internal.scheduledTasks.executeScheduledTask,
          { taskId }
        );
        await ctx.db.patch(taskId, { schedulerJobId });
      } catch (error) {
        console.error(`Failed to schedule migrated task ${taskId}, cleaning up:`, error);
        await ctx.db.delete(taskId);
        skippedCount++;
        continue;
      }

      // Cancel old scheduler job
      if (job.schedulerJobId) {
        try {
          await ctx.scheduler.cancel(job.schedulerJobId);
        } catch {
          // Already fired or cancelled
        }
      }

      // Mark old job as cancelled
      await ctx.db.patch(job._id, { status: "cancelled" });

      // Update items that reference this reminderJobId → set scheduledTaskId
      const items = await ctx.db
        .query("items")
        .withIndex("by_userId", (q) => q.eq("userId", job.userId))
        .filter((q) => q.eq(q.field("reminderJobId"), job._id))
        .collect();

      for (const item of items) {
        await ctx.db.patch(item._id, { scheduledTaskId: taskId });
      }

      migratedCount++;
    }

    console.log(
      `Migration complete: ${migratedCount} reminders migrated, ${skippedCount} stale skipped`
    );

    return { migratedCount, skippedCount };
  },
});

/**
 * Dry-run: count pending reminders without modifying anything.
 * Run this first to verify before running the actual migration.
 */
export const countPendingReminders = internalQuery({
  args: {},
  handler: async (ctx) => {
    const reminders = await ctx.db
      .query("scheduledJobs")
      .filter((q) =>
        q.and(
          q.eq(q.field("kind"), "reminder"),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    const oneOff = reminders.filter((r) => !r.cronExpr);
    const recurring = reminders.filter((r) => !!r.cronExpr);
    const stale = oneOff.filter((r) => r.runAt < Date.now());

    return {
      total: reminders.length,
      oneOff: oneOff.length,
      recurring: recurring.length,
      stale: stale.length,
      willMigrate: reminders.length - stale.length,
    };
  },
});

// ============================================================================
// Profile System Migration (v0.31)
// ============================================================================

/**
 * Migrate identity facts from memory's ## Personal and ## Work & Education
 * sections into the profile file using Gemini Flash for categorization.
 *
 * Idempotent: checks if memory still has those sections before migrating.
 * Run via Convex dashboard after deploying the new code.
 */
export const migrateMemoryToProfile = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    const users = await ctx.runQuery(internal.users.getAllUsers, {});
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const memoryFile = await ctx.runQuery(internal.users.getUserFile, {
          userId: user._id,
          filename: "memory",
        });

        if (!memoryFile || !memoryFile.content.trim()) {
          skipped++;
          continue;
        }

        const hasPersonal = memoryFile.content.includes("## Personal");
        const hasWorkEd = memoryFile.content.includes("## Work & Education");

        // Also check for bare identity facts before any ## header (e.g. "- Name: Hesham")
        const lines = memoryFile.content.split("\n");
        const bareIdentityLines: string[] = [];
        for (const line of lines) {
          if (line.match(/^##\s/)) break; // Stop at first section header
          if (line.match(/^-\s*(Name|Birthday|Age|Nationality|Job|Title|Company|Location|City|Country|Phone|Email|Languages?)\s*:/i)) {
            bareIdentityLines.push(line);
          }
        }
        const hasBareIdentity = bareIdentityLines.length > 0;

        if (!hasPersonal && !hasWorkEd && !hasBareIdentity) {
          skipped++;
          continue;
        }

        // Extract ## Personal and ## Work & Education sections
        const sectionsToExtract: string[] = [];
        let capturing = false;
        let capturedLines: string[] = [];

        // Include bare identity facts as pseudo-Personal section
        if (hasBareIdentity) {
          sectionsToExtract.push(`## Personal\n${bareIdentityLines.join("\n")}`);
        }

        for (const line of lines) {
          const headerMatch = line.match(/^##\s+(.+)$/);
          if (headerMatch) {
            if (capturing && capturedLines.length > 0) {
              sectionsToExtract.push(capturedLines.join("\n"));
            }
            const name = headerMatch[1]!.trim();
            capturing = name === "Personal" || name === "Work & Education";
            capturedLines = capturing ? [`## ${name}`] : [];
            continue;
          }
          if (capturing) {
            capturedLines.push(line);
          }
        }
        if (capturing && capturedLines.length > 0) {
          sectionsToExtract.push(capturedLines.join("\n"));
        }

        const extractedContent = sectionsToExtract.join("\n\n").trim();
        if (!extractedContent) {
          skipped++;
          continue;
        }

        // Use Gemini Flash to categorize into profile sections
        const { text: categorized } = await generateText({
          model: google(MODELS.FLASH),
          prompt: `Convert the following memory content into profile bullet-point format.

Input (old memory format):
${extractedContent}

Output format — organize into these sections ONLY if relevant facts exist:
## Personal
- Name: ...
- Birthday: ...
- Nationality: ...
- Languages: ...

## Professional
- Title: ...
- Company: ...
- Industry: ...
- Skills: ...

## Education
- Degree: ...
- School: ...

## Family
- Spouse: ...
- Children: ...

## Location
- City: ...
- Country: ...

## Links
- Website: ...
- LinkedIn: ...

Rules:
- Only include sections that have data
- Each fact on its own bullet line with "- Key: Value" format
- Strip any behavioral observations (those stay in memory)
- Only include identity facts (who the person IS)

Output ONLY the formatted sections, nothing else.`,
        });

        // Read existing profile to merge facts (don't clobber)
        const profileFile = await ctx.runQuery(internal.users.getUserFile, {
          userId: user._id,
          filename: "profile",
        });
        const existingProfile = profileFile?.content ?? "";
        const categorizedSections = parseProfileSections(categorized);

        // Build merged sections: combine new LLM output with existing profile facts
        const mappedSections: Array<[ProfileCategory, string]> = [];
        for (const [sectionName, sectionContent] of categorizedSections) {
          const catKey = SECTION_TO_CATEGORY[sectionName];
          if (catKey && sectionContent.trim()) {
            const existingSections = parseProfileSections(existingProfile);
            const existingBody = existingSections.get(sectionName) ?? "";
            const mergedBody = Array.from(
              new Set(
                `${existingBody}\n${sectionContent}`
                  .split("\n")
                  .map((l: string) => l.trim())
                  .filter(Boolean)
              )
            ).join("\n");
            mappedSections.push([catKey, mergedBody]);
          }
        }

        // Only clean memory if we actually have profile sections to write
        if (mappedSections.length === 0) {
          skipped++;
          continue;
        }

        // Write per-section via internalUpdateProfileSection which auto-creates
        // the profile file for users who don't have one yet.
        // Each call enforces the 50KB limit internally.
        for (const [catKey, body] of mappedSections) {
          await ctx.runMutation(internal.users.internalUpdateProfileSection, {
            userId: user._id,
            category: catKey,
            content: body,
          });
        }

        // Remove migrated legacy sections only after successful profile write
        let updatedMemory = memoryFile.content;
        // Remove only the bare identity lines whose keys were actually written to profile.
        // Extract keys from the written profile sections to avoid removing unwritten facts.
        if (bareIdentityLines.length > 0) {
          const writtenKeys = new Set<string>();
          for (const [, body] of mappedSections) {
            for (const line of body.split("\n")) {
              const m = line.match(/^-\s*([^:]+):/);
              if (m) writtenKeys.add(m[1]!.trim().toLowerCase());
            }
          }
          const migratedBareLines = bareIdentityLines.filter((bl) => {
            const m = bl.match(/^-\s*([^:]+):/);
            return m && writtenKeys.has(m[1]!.trim().toLowerCase());
          });

          if (migratedBareLines.length > 0) {
            const firstHeaderIdx = updatedMemory.search(/^##\s/m);
            const preHeader = firstHeaderIdx === -1 ? updatedMemory : updatedMemory.slice(0, firstHeaderIdx);
            const rest = firstHeaderIdx === -1 ? "" : updatedMemory.slice(firstHeaderIdx);
            let cleanedPreHeader = preHeader;
            for (const bareLine of migratedBareLines) {
              cleanedPreHeader = cleanedPreHeader.replace(bareLine + "\n", "");
              cleanedPreHeader = cleanedPreHeader.replace(bareLine, "");
            }
            updatedMemory = cleanedPreHeader + rest;
          }
        }
        updatedMemory = updatedMemory.replace(
          /## Personal\n[\s\S]*?(?=\n## |\s*$)/,
          ""
        );
        updatedMemory = updatedMemory.replace(
          /## Work & Education\n[\s\S]*?(?=\n## |\s*$)/,
          ""
        );
        updatedMemory = updatedMemory.replace(/\n{3,}/g, "\n\n").trim();

        await ctx.runMutation(internal.users.internalUpdateUserFile, {
          userId: user._id,
          filename: "memory",
          content: updatedMemory,
        });

        migrated++;
        console.log(
          `Migrated memory→profile for user ${user._id}: ${categorizedSections.size} sections`
        );
      } catch (err) {
        errors++;
        console.error(
          `Error migrating user ${user._id}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    const summary = `Memory→Profile migration: ${migrated} migrated, ${skipped} skipped, ${errors} errors (${users.length} total)`;
    console.log(summary);
    return summary;
  },
});

/**
 * Convert existing key/value profile data to bullet-point format.
 * Handles profiles created with the old `upsertProfileEntry` (key: value without "- " prefix).
 *
 * Idempotent: skips profiles already in bullet-point format.
 */
export const migrateProfileFormat = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    const users = await ctx.runQuery(internal.users.getAllUsers, {});
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const profileFile = await ctx.runQuery(internal.users.getUserFile, {
          userId: user._id,
          filename: "profile",
        });

        if (!profileFile || !profileFile.content.trim()) {
          skipped++;
          continue;
        }

        // Check format: bullet-point vs key/value
        const contentLines: string[] = profileFile.content
          .split("\n")
          .filter((l: string) => l.trim() && !l.startsWith("#"));
        const hasBullets = contentLines.some((l: string) => l.trim().startsWith("- "));
        const hasKeyValue = contentLines.some(
          (l: string) => !l.trim().startsWith("- ") && l.includes(":")
        );
        // Detect cryptic snake_case keys from old upsertProfileEntry (e.g. "- Bs_dates:", "- Experience_summary:")
        const hasCrypticKeys = contentLines.some(
          (l: string) => /^- \w+_\w+:/.test(l.trim())
        );

        if (hasBullets && !hasKeyValue && !hasCrypticKeys) {
          skipped++; // Already in clean bullet format
          continue;
        }

        if (!hasKeyValue && !hasCrypticKeys) {
          skipped++;
          continue;
        }

        // Clean up to human-readable bullet-point format
        const { text: converted } = await generateText({
          model: google(MODELS.FLASH),
          prompt: `Clean up this profile into human-readable bullet-point format.

Input:
${profileFile.content}

Rules:
- Keep the same ## section headers
- Every line must be "- Key: value" format
- Rename cryptic/snake_case keys to human-readable labels (e.g. "bs_dates" → "Bachelor's", "ms_dates" → "Master's", "experience_summary" → "Experience")
- Capitalize keys properly (e.g. "experience" → "Experience")
- Add "- " prefix to lines missing it
- Preserve all data values, only clean up the keys
- Output ONLY the formatted content, nothing else.`,
        });

        // Validate LLM output: every non-empty line must be a section header or "- Key: value"
        const isValidProfileLine = (line: string) => {
          const t = line.trim();
          return t === "" || /^##\s+/.test(t) || /^- [^:]+:\s*.+$/.test(t);
        };
        if (!converted.split("\n").every(isValidProfileLine)) {
          console.error(`LLM returned malformed profile for user ${user._id}, skipping`);
          skipped++;
          continue;
        }

        // Validate by parsing and re-serializing to prevent corrupted output.
        // Start from existing content so unrecognized sections are preserved.
        const parsedSections = parseProfileSections(converted);
        if (parsedSections.size > 0) {
          let validated = profileFile.content;
          let replacedCount = 0;
          for (const [sectionName, sectionContent] of parsedSections) {
            const catKey = SECTION_TO_CATEGORY[sectionName];
            if (catKey && sectionContent.trim()) {
              validated = replaceProfileSection(validated, catKey, sectionContent);
              replacedCount++;
            }
          }
          if (replacedCount > 0 && validated.trim()) {
            if (isFileTooLarge(validated)) {
              console.error(`Profile too large after format migration for user ${user._id}, skipping`);
              skipped++;
              continue;
            }
            await ctx.runMutation(internal.users.internalUpdateUserFile, {
              userId: user._id,
              filename: "profile",
              content: validated,
            });
            migrated++;
            console.log(`Migrated profile format for user ${user._id}`);
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } catch (err) {
        errors++;
        console.error(
          `Error migrating profile for ${user._id}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    const summary = `Profile format migration: ${migrated} migrated, ${skipped} skipped, ${errors} errors (${users.length} total)`;
    console.log(summary);
    return summary;
  },
});

// ---------------------------------------------------------------------------
// One-time backfill: fire user_new events for users missing from PostHog.
// Run via Convex dashboard or: npx convex run --prod migrations:backfillUserNew '{"phones":["..."]}'
// ---------------------------------------------------------------------------

export const backfillUserNew = internalAction({
  args: {
    phones: v.array(v.string()),
  },
  handler: async (ctx, { phones }) => {
    // Look up real timezones and creation dates from user records
    const users = await ctx.runQuery(internal.users.getAllUsers, {}) as Array<{
      phone: string;
      timezone: string;
      createdAt?: number;
      _creationTime: number;
    }>;
    const userByPhone = new Map(users.map((u) => [u.phone, u]));

    // Deduplicate input and skip phones not in Convex
    const uniquePhones = [...new Set(phones)];
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    for (const phone of uniquePhones) {
      const user = userByPhone.get(phone);
      if (!user) {
        skipped++;
        continue;
      }
      const createdMs = user.createdAt ?? user._creationTime;
      const timestamp = new Date(createdMs).toISOString();
      try {
        await ctx.runAction(internal.analytics.trackUserNew, {
          phone,
          timezone: user.timezone || "UTC",
          timestamp,
        });
        sent++;
      } catch {
        // Redact phone in logs (same pattern as analytics.ts)
        const redacted = phone.length > 4 ? `${phone.slice(0, 2)}***${phone.slice(-2)}` : "***";
        console.error(`[Backfill] Failed for ${redacted}`);
        failed++;
      }
    }
    const summary = `Backfill user_new: ${sent} sent, ${failed} failed, ${skipped} skipped (${uniquePhones.length} unique phones)`;
    console.log(summary);
    return summary;
  },
});

/**
 * One-time migration: sync language and timezone from user files → users table.
 *
 * Language: reads personality file, extracts any language reference,
 *   writes it to user.language, removes it from the personality file.
 *
 * Timezone: reads profile file, extracts location/city,
 *   resolves to IANA timezone, writes to user.timezone if different.
 *
 * Idempotent: safe to run multiple times.
 * Run manually via Convex dashboard after deploying PR #158.
 */
// ============================================================================
// migrateLanguageAndTimezone helpers — top-level for testability
// ============================================================================

/** Language display name / alias → ISO 639-1 code map. */
const MIGRATION_LANG_MAP: Record<string, string> = {
  arabic: "ar", عربية: "ar", عربي: "ar", ar: "ar",
  english: "en", en: "en",
  french: "fr", français: "fr", francais: "fr", fr: "fr",
  spanish: "es", español: "es", es: "es",
  hindi: "hi", hi: "hi",
  urdu: "ur", ur: "ur",
};
const MIGRATION_LANG_SUPPORTED = new Set(["en", "ar", "fr", "es", "hi", "ur"]);

/**
 * Extracts a supported ISO language code from personality file content.
 * Uses exact token matching (not substring) to avoid false positives like "Bengali" → "en".
 */
export function extractLanguageFromFile(content: string): string | null {
  const match = content.match(/[-*]?\s*(?:preferred\s+)?language\s*[:\-]\s*([^\n]+)/i);
  if (!match) return null;
  const normalized = match[1].trim().toLowerCase().replace(/\s+/g, " ");
  // Exact full-string match first
  if (MIGRATION_LANG_SUPPORTED.has(normalized)) return normalized;
  if (MIGRATION_LANG_MAP[normalized]) return MIGRATION_LANG_MAP[normalized];
  // Token-by-token exact match (handles "Arabic / English" style)
  for (const token of normalized.split(/\s*[\/,|&]|\band\b/g).map(t => t.trim()).filter(Boolean)) {
    if (MIGRATION_LANG_SUPPORTED.has(token)) return token;
    if (MIGRATION_LANG_MAP[token]) return MIGRATION_LANG_MAP[token];
  }
  return null;
}

/**
 * Extracts a city or location string from a profile file for timezone resolution.
 */
export function extractCityFromProfile(profileContent: string): string | null {
  const match = profileContent.match(/(?:city|location|based in|lives? in|located in)\s*[:\-]\s*([^\n,]+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Processes a single batch of user IDs for the language/timezone migration.
 * Extracts language from personality files, resets personality to default,
 * and resolves timezone from profile location.
 *
 * Only fills blank language/timezone fields — never overwrites existing settings.
 * Personality is reset to default for ALL users regardless (intentional brand reset).
 */
export const migrateLanguageAndTimezoneBatch = internalMutation({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, { userIds }) => {
    const { resolveCityToTimezone, buildDefaultPersonality } = await import("./lib/onboarding");
    const DEFAULT_PERSONALITY = buildDefaultPersonality();
    let langUpdated = 0, tzUpdated = 0, personalityReset = 0;

    for (const userId of userIds) {
      const user = await ctx.db.get(userId);
      if (!user) continue;

      const files = await ctx.db
        .query("userFiles")
        .withIndex("by_userId", q => q.eq("userId", userId))
        .collect();

      const personalityFile = files.find(f => f.filename === "personality");
      const profileFile = files.find(f => f.filename === "profile");

      // --- Language: extract from old personality file, only fill blanks ---
      if (personalityFile?.content && !user.language) {
        const detectedLang = extractLanguageFromFile(personalityFile.content);
        if (detectedLang) {
          await ctx.db.patch(userId, { language: detectedLang });
          langUpdated++;
        }
      }

      // --- Personality: reset ALL users to default (intentional brand reset) ---
      if (personalityFile) {
        if (personalityFile.content !== DEFAULT_PERSONALITY) {
          await ctx.db.patch(personalityFile._id, {
            content: DEFAULT_PERSONALITY,
            updatedAt: Date.now(),
          });
          personalityReset++;
        }
      } else {
        await ctx.db.insert("userFiles", {
          userId,
          filename: "personality",
          content: DEFAULT_PERSONALITY,
          updatedAt: Date.now(),
        });
        personalityReset++;
      }

      // --- Timezone: extract from profile location, only fill blanks ---
      if (profileFile?.content && !user.timezone) {
        const city = extractCityFromProfile(profileFile.content);
        if (city) {
          const resolved = resolveCityToTimezone(city);
          if (resolved) {
            await ctx.db.patch(userId, { timezone: resolved });
            tzUpdated++;
          }
        }
      }
    }

    return { langUpdated, tzUpdated, personalityReset, processed: userIds.length };
  },
});

/**
 * One-time migration: reset all personality files to the default personality,
 * sync language and timezone from user files → users table.
 *
 * Orchestrates batched processing via migrateLanguageAndTimezoneBatch to stay
 * within Convex per-mutation limits. Safe to run multiple times (idempotent).
 *
 * Run from the Convex dashboard after deploying PR #158.
 */
export const migrateLanguageAndTimezone = internalAction({
  args: {},
  handler: async (ctx) => {
    const BATCH_SIZE = 50;
    let cursor: string | null = null;
    let totalLang = 0, totalTz = 0, totalPersonality = 0, totalProcessed = 0;

    while (true) {
      // Page through users in the action
      const page = await ctx.runQuery(internal.migrations.migrateGetUserBatch, { cursor, limit: BATCH_SIZE });
      if (page.userIds.length === 0) break;

      const result = await ctx.runMutation(internal.migrations.migrateLanguageAndTimezoneBatch, {
        userIds: page.userIds,
      });

      totalLang += result.langUpdated;
      totalTz += result.tzUpdated;
      totalPersonality += result.personalityReset;
      totalProcessed += result.processed;

      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }

    return `Migration complete: personality reset=${totalPersonality}, language updated=${totalLang}, timezone updated=${totalTz}, total users=${totalProcessed}`;
  },
});

/** Internal query to fetch a paginated batch of user IDs for the migration. */
export const migrateGetUserBatch = internalQuery({
  args: { cursor: v.union(v.string(), v.null()), limit: v.number() },
  handler: async (ctx, { cursor, limit }) => {
    const result = await ctx.db.query("users").paginate({ cursor: cursor as string | null, numItems: limit });
    return {
      userIds: result.page.map(u => u._id),
      nextCursor: result.isDone ? null : result.continueCursor,
    };
  },
});
