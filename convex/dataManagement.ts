/**
 * Data management actions — clear memory, documents, everything.
 * Called after user confirms a "clear" command.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Clear user's memory: empty memory file + delete all agent threads.
 */
export const clearMemory = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Empty the memory file
    await ctx.runMutation(internal.users.internalUpdateUserFile, {
      userId,
      filename: "memory",
      content: "",
    });

    // Delete all agent threads for this user
    await deleteUserThreads(ctx, userId);

    // Clear pending action
    await ctx.runMutation(internal.users.clearPendingAction, { userId });

    console.log(`[dataManagement] cleared memory for user ${userId}`);
  },
});

/**
 * Clear user's documents: delete RAG namespace + media files.
 */
export const clearDocuments = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Delete RAG namespace (all indexed documents)
    await ctx.runAction(internal.rag.deleteUserNamespace, {
      userId: userId as string,
    });

    // Delete stored media files
    await ctx.runMutation(internal.mediaStorage.deleteUserMediaFiles, {
      userId,
    });

    // Clear pending action
    await ctx.runMutation(internal.users.clearPendingAction, { userId });

    console.log(`[dataManagement] cleared documents for user ${userId}`);
  },
});

/**
 * Clear everything: memory + personality + heartbeat files, threads, RAG, media.
 */
export const clearEverything = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Empty all 3 user files
    const files = ["memory", "personality", "heartbeat"] as const;
    for (const filename of files) {
      await ctx.runMutation(internal.users.internalUpdateUserFile, {
        userId,
        filename,
        content: "",
      });
    }

    // Delete all agent threads
    await deleteUserThreads(ctx, userId);

    // Delete RAG namespace
    await ctx.runAction(internal.rag.deleteUserNamespace, {
      userId: userId as string,
    });

    // Delete stored media files
    await ctx.runMutation(internal.mediaStorage.deleteUserMediaFiles, {
      userId,
    });

    // Cancel all pending reminders
    await ctx.runMutation(internal.reminders.cancelAllUserReminders, {
      userId,
    });

    // Clear pending action
    await ctx.runMutation(internal.users.clearPendingAction, { userId });

    console.log(`[dataManagement] cleared everything for user ${userId}`);
  },
});

/**
 * Delete all agent threads for a user via the agent component.
 * Paginates through all threads to handle users with many conversations.
 */
async function deleteUserThreads(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  userId: Id<"users">
) {
  let totalDeleted = 0;
  let cursor: string | null = null;
  let isDone = false;

  while (!isDone) {
    const result = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId: userId as string,
        paginationOpts: { cursor, numItems: 100 },
      }
    ) as { page: Array<{ _id: string }>; continueCursor: string; isDone: boolean };

    // Delete each thread (sync action handles messages + streams)
    for (const thread of result.page) {
      await ctx.runAction(
        components.agent.threads.deleteAllForThreadIdSync,
        { threadId: thread._id }
      );
    }

    totalDeleted += result.page.length;
    isDone = result.isDone;
    cursor = result.continueCursor;
  }

  if (totalDeleted > 0) {
    console.log(
      `[dataManagement] deleted ${totalDeleted} threads for user ${userId}`
    );
  }
}
