"use node";

/**
 * Memory compaction — auto-summarize memory when it gets too large.
 * Also includes one-time migration to reorganize existing unstructured memories.
 *
 * Pattern follows convex/documents.ts — generateText from AI SDK with Gemini Flash.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { MODELS, MEMORY_COMPACTION_TARGET, MAX_USER_FILE_SIZE } from "./constants";
import { MEMORY_CATEGORIES, CATEGORY_ORDER, categoryHeader } from "./lib/memory";
import type { Id } from "./_generated/dataModel";

const CATEGORY_HEADERS = CATEGORY_ORDER.map((c) => categoryHeader(c)).join(", ");

/** Validate LLM output: non-empty, has at least one category header, within size limit */
function isValidMemoryOutput(content: string): boolean {
  if (!content) return false;
  const hasCategory = CATEGORY_ORDER.some((c) => content.includes(categoryHeader(c)));
  if (!hasCategory) return false;
  const bytes = new TextEncoder().encode(content).byteLength;
  if (bytes > MAX_USER_FILE_SIZE) return false;
  return true;
}

export const compactMemory = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const file = await ctx.runQuery(internal.users.getUserFile, {
      userId,
      filename: "memory",
    }) as { content: string; updatedAt: number } | null;

    if (!file || !file.content) {
      console.log("[MemoryCompaction] Empty memory, skipping");
      return;
    }

    const snapshotUpdatedAt = file.updatedAt;
    const beforeBytes = new TextEncoder().encode(file.content).byteLength;
    console.log(`[MemoryCompaction] Starting | userId: ${userId} | before: ${beforeBytes} bytes`);

    // Save snapshot before compaction
    await ctx.runMutation(internal.users.saveMemorySnapshot, {
      userId,
      content: file.content,
    });

    const targetKB = Math.round(MEMORY_COMPACTION_TARGET / 1024);

    const result = await generateText({
      model: google(MODELS.FLASH),
      system: `You are a memory compaction engine. Your job is to condense a user's memory file while preserving ALL facts.

Rules:
- Preserve EVERY fact — names, dates, preferences, relationships, events, details
- Remove redundancy — merge duplicate entries, combine related facts
- Resolve conflicts — keep the most recent version when facts contradict
- Maintain the ## Category structure: ${CATEGORY_HEADERS}
- Use concise bullet points (- prefix)
- Target approximately ${targetKB}KB output
- Output ONLY the compacted memory file, no commentary`,
      prompt: file.content,
    });

    const compacted = result.text.trim();

    if (!isValidMemoryOutput(compacted)) {
      console.log(`[MemoryCompaction] Invalid model output, skipping update for ${userId}`);
      return;
    }

    // Stale-write guard: skip if memory was updated during compaction
    const latest = await ctx.runQuery(internal.users.getUserFile, {
      userId,
      filename: "memory",
    }) as { updatedAt: number } | null;
    if (!latest || latest.updatedAt !== snapshotUpdatedAt) {
      console.log(`[MemoryCompaction] Skipped stale write for user ${userId}`);
      return;
    }

    const afterBytes = new TextEncoder().encode(compacted).byteLength;
    console.log(`[MemoryCompaction] Done | before: ${beforeBytes} → after: ${afterBytes} bytes`);

    await ctx.runMutation(internal.users.internalUpdateUserFile, {
      userId,
      filename: "memory",
      content: compacted,
    });
  },
});

/**
 * Fan-out migration: schedules individual migrateUserMemory actions per user.
 * Run once after deploy: `npx convex run memoryCompaction:migrateMemories`
 */
export const migrateMemories = internalAction({
  args: {},
  handler: async (ctx) => {
    // NOTE: getAllUsers uses .collect() — acceptable for one-time migration only
    const users = await ctx.runQuery(internal.users.getAllUsers, {}) as Array<{ _id: Id<"users"> }>;
    console.log(`[MemoryMigration] Scheduling migration for ${users.length} users`);

    let scheduled = 0;
    let skipped = 0;

    for (const user of users) {
      const file = await ctx.runQuery(internal.users.getUserFile, {
        userId: user._id,
        filename: "memory",
      }) as { content: string } | null;

      if (!file || !file.content.trim()) {
        skipped++;
        continue;
      }

      // Skip if already has structured headers
      if (file.content.includes("## Personal") || file.content.includes("## General")) {
        skipped++;
        continue;
      }

      await ctx.scheduler.runAfter(0, internal.memoryCompaction.migrateUserMemory, {
        userId: user._id,
      });
      scheduled++;
    }

    console.log(`[MemoryMigration] Done | scheduled: ${scheduled} | skipped: ${skipped}`);
  },
});

/** Migrate a single user's memory to structured categories */
export const migrateUserMemory = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const file = await ctx.runQuery(internal.users.getUserFile, {
      userId,
      filename: "memory",
    }) as { content: string; updatedAt: number } | null;

    if (!file || !file.content.trim()) return;
    if (file.content.includes("## Personal") || file.content.includes("## General")) return;

    const snapshotUpdatedAt = file.updatedAt;

    // Snapshot old content
    await ctx.runMutation(internal.users.saveMemorySnapshot, {
      userId,
      content: file.content,
    });

    const categoryList = Object.values(MEMORY_CATEGORIES).join(", ");

    const result = await generateText({
      model: google(MODELS.FLASH),
      system: `You are a memory reorganization engine. Reorganize the user's memory into structured categories.

Rules:
- Preserve EVERY fact exactly — do not add, remove, or rephrase anything
- Organize into these ## sections: ${categoryList}
- Use concise bullet points (- prefix)
- Only create sections that have content
- Output ONLY the reorganized memory file, no commentary`,
      prompt: file.content,
    });

    const migrated = result.text.trim();

    if (!migrated || !CATEGORY_ORDER.some((c) => migrated.includes(categoryHeader(c)))) {
      console.log(`[MemoryMigration] Invalid model output, skipping user ${userId}`);
      return;
    }

    // Stale-write guard
    const latest = await ctx.runQuery(internal.users.getUserFile, {
      userId,
      filename: "memory",
    }) as { updatedAt: number } | null;
    if (!latest || latest.updatedAt !== snapshotUpdatedAt) {
      console.log(`[MemoryMigration] Skipped stale write for user ${userId}`);
      return;
    }

    await ctx.runMutation(internal.users.internalUpdateUserFile, {
      userId,
      filename: "memory",
      content: migrated,
    });

    console.log(`[MemoryMigration] Migrated user ${userId}`);
  },
});
