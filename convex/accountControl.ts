/**
 * Account control — opt-out and account deletion flows.
 *
 * Opt-out: pauses all proactive messages (heartbeat + scheduled tasks).
 * Deletion: 7-day grace period then permanent removal of all user data.
 */

import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ACCOUNT_DELETION_GRACE_MS } from "./constants";
import { fillTemplate } from "./lib/utils";
import { TEMPLATES } from "./templates";

// ============================================================================
// Opt-Out
// ============================================================================

/**
 * Pause all proactive messages for a user.
 * Sets optedOut=true and disables all scheduled tasks.
 */
export const triggerOptOut = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, { optedOut: true });

    // Disable all enabled scheduled tasks
    const tasks = await ctx.db
      .query("scheduledTasks")
      .withIndex("by_userId_enabled", (q) => q.eq("userId", userId).eq("enabled", true))
      .collect();

    for (const task of tasks) {
      await ctx.db.patch(task._id, { enabled: false });
    }

    console.log(`[accountControl] opt-out for user ${userId}, disabled ${tasks.length} task(s)`);
  },
});

/**
 * Resume proactive messages after YES confirmation.
 * Clears optedOut flag and re-enables scheduled tasks.
 * Archives missed one-shot tasks (runAt in the past).
 */
export const resumeFromOptOut = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, { optedOut: false });

    const now = Date.now();
    const tasks = await ctx.db
      .query("scheduledTasks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    let reenabledCount = 0;
    for (const task of tasks) {
      if (task.schedule.kind === "once" && task.schedule.runAt < now) {
        // Missed one-shot — mark lastStatus as skipped (leave enabled=false)
        await ctx.db.patch(task._id, { lastStatus: "skipped_no_credits" });
      } else if (!task.enabled) {
        await ctx.db.patch(task._id, { enabled: true });
        reenabledCount++;
      }
    }

    console.log(`[accountControl] resumed from opt-out for user ${userId}, re-enabled ${reenabledCount} task(s)`);
  },
});

/**
 * Check if a user has any scheduled tasks (used to pick the right resume message).
 */
export const hasScheduledTasks = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const tasks = await ctx.db
      .query("scheduledTasks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return !!tasks;
  },
});

// ============================================================================
// Account Deletion
// ============================================================================

/**
 * Start the 7-day deletion grace period.
 * Sets deletionScheduledAt and deletionDueAt on the user record.
 */
export const scheduleAccountDeletion = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const now = Date.now();
    const deletionDueAt = now + ACCOUNT_DELETION_GRACE_MS;
    await ctx.db.patch(userId, {
      deletionScheduledAt: now,
      deletionDueAt,
    });
    console.log(`[accountControl] deletion scheduled for user ${userId}, due at ${new Date(deletionDueAt).toISOString()}`);
    return { deletionDueAt };
  },
});

/**
 * Cancel a pending account deletion.
 */
export const cancelAccountDeletion = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, {
      deletionScheduledAt: undefined,
      deletionDueAt: undefined,
    });
    console.log(`[accountControl] deletion cancelled for user ${userId}`);
  },
});

/**
 * Cron target: find all users whose deletionDueAt has passed and delete them.
 * Runs hourly to ensure < 1 hour variance on the 7-day promise.
 */
export const processAccountDeletions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      if (user.deletionDueAt && user.deletionDueAt <= now) {
        await ctx.scheduler.runAfter(0, internal.accountControl.deleteAccount, {
          userId: user._id,
        });
      }
    }
  },
});

/**
 * Execute full account deletion in the correct order.
 * Called by processAccountDeletions after 7-day grace period expires.
 */
export const deleteAccount = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Load user before deletion (need phone for final message + analytics)
    const user = await ctx.runQuery(internal.users.internalGetUser, { userId });
    if (!user) {
      console.warn(`[accountControl] deleteAccount: user ${userId} not found`);
      return;
    }

    const phone = user.phone;
    console.log(`[accountControl] starting deletion for user ${userId}`);

    // 1. Send TWILIO_TPL_DELETE_FINAL (before deleting user record)
    try {
      const finalMsg = fillTemplate(TEMPLATES.delete_final.template, {});
      await ctx.runAction(internal.twilio.sendMessage, { to: phone, body: finalMsg });
    } catch (err) {
      console.error(`[accountControl] failed to send final message to ${phone}:`, err);
      // Continue with deletion even if message fails
    }

    // 2. Delete user files (profile, memory, personality, heartbeat)
    try {
      await ctx.runMutation(internal.accountControl.deleteUserFiles, { userId });
    } catch (err) {
      console.error(`[accountControl] failed to delete user files:`, err);
    }

    // 3. Delete items and collections
    try {
      await ctx.runMutation(internal.items.deleteAllUserItems, { userId });
    } catch (err) {
      console.error(`[accountControl] failed to delete items:`, err);
    }

    // 4. Delete scheduled tasks
    try {
      await ctx.runMutation(internal.scheduledTasks.cancelAllUserScheduledTasks, { userId });
    } catch (err) {
      console.error(`[accountControl] failed to cancel scheduled tasks:`, err);
    }

    // 5. Delete media from Convex storage
    try {
      await ctx.runMutation(internal.mediaStorage.deleteUserMediaFiles, { userId });
    } catch (err) {
      console.error(`[accountControl] failed to delete media files:`, err);
    }

    // 6. Delete RAG documents
    try {
      await ctx.runAction(internal.rag.deleteUserNamespace, { userId: userId as string });
    } catch (err) {
      console.error(`[accountControl] failed to delete RAG namespace:`, err);
    }

    // 7. Delete conversation thread history
    try {
      await deleteUserThreads(ctx, userId);
    } catch (err) {
      console.error(`[accountControl] failed to delete threads:`, err);
    }

    // 8. Delete user record from Convex DB
    try {
      await ctx.runMutation(internal.accountControl.deleteUserRecord, { userId });
    } catch (err) {
      console.error(`[accountControl] failed to delete user record:`, err);
      return; // Don't proceed to Clerk if Convex deletion failed
    }

    // 9. Delete user from Clerk (always last — Clerk is the auth source)
    if (user.clerkUserId) {
      try {
        await deleteClerkUser(user.clerkUserId);
      } catch (err) {
        console.error(`[accountControl] failed to delete Clerk user ${user.clerkUserId}:`, err);
        // Non-fatal — user record is already deleted from Convex
      }
    }

    // 10. Log deletion with phone hash for audit trail
    const phoneHash = await sha256(phone);
    await ctx.scheduler.runAfter(0, internal.analytics.trackAccountDeletionCompleted, {
      phoneHash,
    });

    console.log(`[accountControl] deletion complete for user ${userId}, phone hash: ${phoneHash}`);
  },
});

// ============================================================================
// Internal Mutations for delete steps
// ============================================================================

export const deleteUserFiles = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const files = await ctx.db
      .query("userFiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const file of files) {
      await ctx.db.delete(file._id);
    }

    // Also delete memory snapshots
    const snapshots = await ctx.db
      .query("memorySnapshots")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const snap of snapshots) {
      await ctx.db.delete(snap._id);
    }
  },
});

export const deleteUserRecord = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.delete(userId);
  },
});

// ============================================================================
// Helpers
// ============================================================================

async function deleteUserThreads(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  userId: Id<"users">
) {
  let cursor: string | null = null;
  let isDone = false;
  let totalDeleted = 0;

  while (!isDone) {
    const result = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId: userId as string,
        paginationOpts: { cursor, numItems: 100 },
      }
    ) as { page: Array<{ _id: string }>; continueCursor: string; isDone: boolean };

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
    console.log(`[accountControl] deleted ${totalDeleted} threads for user ${userId}`);
  }
}

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deleteClerkUser(clerkUserId: string): Promise<void> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey) {
    console.warn("[accountControl] CLERK_SECRET_KEY not set — skipping Clerk user deletion");
    return;
  }

  const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Clerk DELETE /users/${clerkUserId} failed: HTTP ${res.status} — ${text}`);
  }
}
