/**
 * Account control — opt-out and account deletion flows.
 *
 * Opt-out: pauses all proactive messages (heartbeat + scheduled tasks).
 * Deletion: immediate permanent removal of all user data after confirmation.
 */

import { v } from "convex/values";
import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getNextCronRun } from "./lib/cronParser";

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
      // Cancel the pending scheduler job so it doesn't fire while opted out
      if (task.schedulerJobId) {
        try {
          await ctx.scheduler.cancel(task.schedulerJobId);
        } catch {
          // Already fired or cancelled
        }
      }
      await ctx.db.patch(task._id, {
        enabled: false,
        disabledByOptOut: true,
        schedulerJobId: undefined,
      });
    }

    console.log(`[accountControl] opt-out for user ${userId}, disabled ${tasks.length} task(s)`);
  },
});

/**
 * Resume proactive messages after START command.
 * Clears optedOut flag and re-enables scheduled tasks.
 * Archives missed one-shot tasks (runAt in the past).
 */
export const triggerOptIn = internalMutation({
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
      if (!task.disabledByOptOut) continue; // Skip tasks the user manually disabled
      if (task.schedule.kind === "once" && task.schedule.runAt < now) {
        // Missed one-shot — reuse "skipped_no_credits" status (schema only allows 3 values)
        await ctx.db.patch(task._id, { lastStatus: "skipped_no_credits", disabledByOptOut: undefined });
      } else {
        // Re-enable and reschedule the task
        const runAt = task.schedule.kind === "cron"
          ? getNextCronRun(task.schedule.expr, task.timezone)
          : task.schedule.runAt;

        const schedulerJobId = await ctx.scheduler.runAt(
          runAt,
          internal.scheduledTasks.executeScheduledTask,
          { taskId: task._id }
        );
        await ctx.db.patch(task._id, {
          enabled: true,
          disabledByOptOut: undefined,
          schedulerJobId,
        });
        reenabledCount++;
      }
    }

    console.log(`[accountControl] opt-in for user ${userId}, re-enabled ${reenabledCount} task(s)`);
  },
});

// ============================================================================
// Stale User Cleanup (cron)
// ============================================================================

const STALE_USER_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Cleanup users who messaged but never completed terms acceptance.
 * Runs hourly via cron. Deletes users created >24h ago without termsAcceptedAt.
 * Schedules deleteAccount for each stale user (handles all associated data).
 */
export const cleanupStaleUsers = internalAction({
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_USER_THRESHOLD_MS;
    const staleUserIds = await ctx.runQuery(
      internal.accountControl.findStaleUsers,
      { createdBefore: cutoff }
    );

    if (staleUserIds.length === 0) return;

    console.log(`[cleanupStaleUsers] Found ${staleUserIds.length} stale users to delete`);

    for (const userId of staleUserIds) {
      await ctx.scheduler.runAfter(0, internal.accountControl.deleteAccount, {
        userId,
      });
    }
  },
});

/** Find user IDs created before the cutoff who never accepted terms. Capped at 50 per run. */
export const findStaleUsers = internalQuery({
  args: { createdBefore: v.number() },
  handler: async (ctx, { createdBefore }) => {
    // Scan newest first — stale users are always recently created.
    // Caps at 200 candidates / 50 deletions per hourly cron run.
    const candidates = await ctx.db.query("users").order("desc").take(200);
    return candidates
      .filter((u) => !u.termsAcceptedAt && u.createdAt < createdBefore)
      .slice(0, 50)
      .map((u) => u._id);
  },
});

// ============================================================================
// Account Deletion
// ============================================================================

/**
 * Execute full account deletion. Called after user confirms with "yes".
 * Reuses clearEverything for core data, then cleans up remaining tables
 * and deletes the user record + Clerk.
 */
export const deleteAccount = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Load user before deletion (need phone for analytics + Clerk ID)
    const user = await ctx.runQuery(internal.users.internalGetUser, { userId });
    if (!user) {
      console.warn(`[accountControl] deleteAccount: user ${userId} not found`);
      return;
    }

    const phone = user.phone;
    console.log(`[accountControl] starting deletion for user ${userId}`);

    // 1. Clear core user data (threads, user file content, RAG, media, reminders, tasks, items, collections)
    try {
      await ctx.runAction(internal.dataManagement.clearEverything, { userId });
    } catch (err) {
      console.error(`[accountControl] clearEverything failed:`, err);
    }

    // 2. Delete remaining user-linked records not covered by clearEverything
    try {
      await ctx.runMutation(internal.accountControl.deleteOrphanedUserData, { userId, phone });
    } catch (err) {
      console.error(`[accountControl] failed to delete orphaned data:`, err);
    }

    // 3. Delete user record from Convex DB
    try {
      await ctx.runMutation(internal.accountControl.deleteUserRecord, { userId });
    } catch (err) {
      console.error(`[accountControl] failed to delete user record:`, err);
      return; // Don't proceed to Clerk if Convex deletion failed
    }

    // 4. Delete user from Clerk (always last — Clerk is the auth source)
    if (user.clerkUserId) {
      try {
        await deleteClerkUser(user.clerkUserId);
      } catch (err) {
        console.error(`[accountControl] failed to delete Clerk user ${user.clerkUserId}:`, err);
      }
    }

    // 5. Track deletion in PostHog with hashed phone for audit trail
    const phoneHash = await sha256(phone);
    await ctx.scheduler.runAfter(0, internal.analytics.trackAccountDeleted, {
      phoneHash,
    });

    console.log(`[accountControl] deletion complete for user ${userId}, phone hash: ${phoneHash}`);
  },
});

// ============================================================================
// Internal Mutations for delete steps
// ============================================================================

/**
 * Delete all user-linked records not handled by clearEverything:
 * userFiles (records), memorySnapshots, generatedImages (+ storage blobs),
 * proWriteBriefs, scheduledJobs, feedback, feedbackTokens.
 */
export const deleteOrphanedUserData = internalMutation({
  args: { userId: v.id("users"), phone: v.string() },
  handler: async (ctx, { userId, phone }) => {
    // User file records (clearEverything empties content but doesn't delete records)
    const files = await ctx.db
      .query("userFiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const file of files) {
      await ctx.db.delete(file._id);
    }

    // Memory snapshots
    const snapshots = await ctx.db
      .query("memorySnapshots")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const snap of snapshots) {
      await ctx.db.delete(snap._id);
    }

    // Generated images (delete storage blobs + records)
    const images = await ctx.db
      .query("generatedImages")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const img of images) {
      try {
        await ctx.storage.delete(img.storageId);
      } catch {
        // Storage blob may already be expired/deleted
      }
      await ctx.db.delete(img._id);
    }

    // ProWrite briefs
    const briefs = await ctx.db
      .query("proWriteBriefs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const brief of briefs) {
      await ctx.db.delete(brief._id);
    }

    // Scheduled jobs (legacy reminders — cancelAllUserReminders only soft-cancels)
    const jobs = await ctx.db
      .query("scheduledJobs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }

    // Feedback records
    const feedbacks = await ctx.db
      .query("feedback")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const fb of feedbacks) {
      await ctx.db.delete(fb._id);
    }

    // Feedback tokens (keyed by phone, no userId field)
    const tokens = await ctx.db
      .query("feedbackTokens")
      .collect();
    for (const token of tokens) {
      if (token.phone === phone) {
        await ctx.db.delete(token._id);
      }
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
