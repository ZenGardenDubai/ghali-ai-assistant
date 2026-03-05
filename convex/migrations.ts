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

        if (!hasPersonal && !hasWorkEd) {
          skipped++;
          continue;
        }

        // Extract ## Personal and ## Work & Education sections
        const lines = memoryFile.content.split("\n");
        const sectionsToExtract: string[] = [];
        let capturing = false;
        let capturedLines: string[] = [];

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

        if (hasBullets && !hasKeyValue) {
          skipped++; // Already in bullet format
          continue;
        }

        if (!hasKeyValue) {
          skipped++;
          continue;
        }

        // Convert key/value to bullet-point format
        const { text: converted } = await generateText({
          model: google(MODELS.FLASH),
          prompt: `Convert this profile from key/value format to bullet-point format.

Input (old key/value format):
${profileFile.content}

Rules:
- Keep the same ## section headers
- Convert each "key: value" line to "- Key: value" (add "- " prefix, capitalize key)
- Lines already starting with "- " stay as-is
- Preserve all data, just change the format
- Output ONLY the formatted content, nothing else.`,
        });

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
