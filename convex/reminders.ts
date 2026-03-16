import { v } from "convex/values";
import {
  internalMutation,
  internalAction,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  MAX_REMINDERS_PER_USER,
  WHATSAPP_SESSION_WINDOW_MS,
  TEMPLATE_INACTIVITY_GATE_MS,
} from "./constants";
import { getNextCronRun } from "./lib/cronParser";
import { sendToUser, isTelegramUser } from "./lib/channelSend";

/**
 * Create a reminder job. Schedules it via ctx.scheduler.runAt for precise delivery.
 */
export const createReminder = internalMutation({
  args: {
    userId: v.id("users"),
    payload: v.string(),
    runAt: v.number(),
    cronExpr: v.optional(v.string()),
    timezone: v.string(),
    isReschedule: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, payload, runAt, cronExpr, timezone, isReschedule }) => {
    // Enforce per-user limit (skip for recurring reschedules)
    if (!isReschedule) {
      const pendingCount = await ctx.db
        .query("scheduledJobs")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", userId).eq("status", "pending")
        )
        .filter((q) => q.eq(q.field("kind"), "reminder"))
        .collect();

      if (pendingCount.length >= MAX_REMINDERS_PER_USER) {
        throw new Error(
          `Maximum ${MAX_REMINDERS_PER_USER} pending reminders allowed. Cancel some first.`
        );
      }
    }

    // Insert the job
    const jobId = await ctx.db.insert("scheduledJobs", {
      userId,
      kind: "reminder",
      payload,
      runAt,
      status: "pending",
      cronExpr,
      timezone,
    });

    // Schedule the firing
    const schedulerJobId = await ctx.scheduler.runAt(
      runAt,
      internal.reminders.fireReminder,
      { jobId }
    );

    // Store scheduler job ID for cancellation
    await ctx.db.patch(jobId, { schedulerJobId });

    // Record proactive opt-in (only sets once)
    if (!isReschedule) {
      const userForOptIn = await ctx.db.get(userId);
      if (userForOptIn && !userForOptIn.proactiveOptInAt) {
        await ctx.db.patch(userId, { proactiveOptInAt: Date.now() });
      }
    }

    return jobId;
  },
});

/**
 * Fire a reminder — sends the message to the user via WhatsApp.
 * If recurring (cronExpr), schedules the next occurrence.
 */
export const fireReminder = internalAction({
  args: {
    jobId: v.id("scheduledJobs"),
  },
  handler: async (ctx, { jobId }) => {
    // Load job
    const job = await ctx.runQuery(internal.reminders.getJob, { jobId });
    if (!job || job.status !== "pending") return;

    // Load user
    const user = await ctx.runQuery(internal.users.internalGetUser, {
      userId: job.userId,
    });
    if (!user) {
      await ctx.runMutation(internal.reminders.markJobDone, { jobId });
      return;
    }

    // Skip opted-out, blocked, or inactive (>7 days) users
    const isInactive = !user.lastMessageAt || Date.now() - user.lastMessageAt > TEMPLATE_INACTIVITY_GATE_MS;
    if (user.optedOut || user.blocked || isInactive) {
      console.log(`[reminder] Reminder ${jobId} skipped — user ${job.userId} opted out, blocked, or inactive >7 days`);
      // Still mark done so it doesn't retry, but schedule next recurrence
      await ctx.runMutation(internal.reminders.markJobDone, { jobId });
      if (job.cronExpr && job.timezone) {
        try {
          const nextRunAt = getNextCronRun(job.cronExpr, job.timezone, new Date());
          await ctx.runMutation(internal.reminders.createReminder, {
            userId: job.userId,
            payload: job.payload,
            runAt: nextRunAt,
            cronExpr: job.cronExpr,
            timezone: job.timezone!,
            isReschedule: true,
          });
        } catch (error) {
          console.error(`Failed to schedule next recurring reminder for ${jobId}:`, error);
        }
      }
      return;
    }

    // Check daily proactive limit
    const proactiveGuard = await ctx.runMutation(
      internal.outboundGuard.checkAndRecordProactiveSend,
      { userId: job.userId }
    );

    let sendSucceeded = false;
    if (!proactiveGuard.allowed) {
      console.warn(`[proactive-guard] Reminder ${jobId} blocked: ${proactiveGuard.reason}`);
      // Don't return — fall through to recurrence logic so recurring reminders keep their chain
    } else {
      // Check outbound rate guard before sending
      const guard = await ctx.runMutation(
        internal.outboundGuard.checkAndRecordOutbound,
        { userId: job.userId }
      );

      if (!guard.allowed) {
        console.warn(`[outbound-guard] Reminder ${jobId} blocked: ${guard.reason}`);
        await ctx.runMutation(internal.outboundGuard.rollbackProactiveSend, { userId: job.userId });
        // Don't return — fall through to recurrence logic
      } else {
        try {
          if (isTelegramUser(user)) {
            // Telegram: no session window or templates — send directly
            await sendToUser(ctx, user, `⏰ ${job.payload}`);
            sendSucceeded = true;
          } else {
            // WhatsApp: check 24h session window
            const withinWindow =
              user.lastMessageAt &&
              Date.now() - user.lastMessageAt < WHATSAPP_SESSION_WINDOW_MS;

            if (withinWindow) {
              await ctx.runAction(internal.whatsapp.sendMessage, {
                to: user.phone,
                body: `⏰ ${job.payload}`,
              });
              sendSucceeded = true;
            } else {
              // Outside 24h window — check daily template cap
              const templateGuard = await ctx.runMutation(
                internal.outboundGuard.checkAndRecordTemplateSend,
                { userId: job.userId }
              );
              if (!templateGuard.allowed) {
                console.warn(`[template-guard] Reminder ${jobId} template blocked: ${templateGuard.reason}`);
                await ctx.runMutation(internal.outboundGuard.rollbackProactiveSend, { userId: job.userId });
              } else {
                try {
                  await ctx.runAction(internal.whatsapp.sendTemplate, {
                    to: user.phone,
                    templateName: "ghali_reminder_v2",
                    variables: { "1": job.payload },
                  });
                  sendSucceeded = true;
                } catch (error) {
                  await ctx.runMutation(internal.outboundGuard.rollbackTemplateSend, { userId: job.userId });
                  throw error;
                }
              }
            }
          }
        } catch (error) {
          await ctx.runMutation(internal.outboundGuard.rollbackProactiveSend, { userId: job.userId });
          console.error(`Failed to send reminder ${jobId}:`, error);
        }
      }
    }

    // Mark done on success, failed on delivery error
    if (sendSucceeded) {
      await ctx.runMutation(internal.reminders.markJobDone, { jobId });
    } else {
      await ctx.runMutation(internal.reminders.markJobFailed, { jobId });
    }

    // If recurring, schedule next occurrence
    if (job.cronExpr && job.timezone) {
      try {
        const nextRunAt = getNextCronRun(
          job.cronExpr,
          job.timezone,
          new Date()
        );
        await ctx.runMutation(internal.reminders.createReminder, {
          userId: job.userId,
          payload: job.payload,
          runAt: nextRunAt,
          cronExpr: job.cronExpr,
          timezone: job.timezone!,
          isReschedule: true,
        });
      } catch (error) {
        console.error(
          `Failed to schedule next recurring reminder for ${jobId}:`,
          error
        );
      }
    }
  },
});

/**
 * Cancel a pending reminder.
 */
export const cancelReminder = internalMutation({
  args: {
    jobId: v.id("scheduledJobs"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { jobId, userId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) {
      return { success: false, error: "Reminder not found." };
    }
    if (userId && job.userId !== userId) {
      return { success: false, error: "Reminder not found." };
    }
    if (job.status !== "pending") {
      return { success: false, error: "Reminder is not pending." };
    }

    await ctx.db.patch(jobId, { status: "cancelled" });

    // Cancel the scheduled function
    if (job.schedulerJobId) {
      try {
        await ctx.scheduler.cancel(
          job.schedulerJobId as Id<"_scheduled_functions">
        );
      } catch {
        // Already fired or cancelled — that's fine
      }
    }

    return { success: true };
  },
});

/**
 * List all pending reminders for a user.
 */
export const listUserReminders = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const jobs = await ctx.db
      .query("scheduledJobs")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "pending")
      )
      .filter((q) => q.eq(q.field("kind"), "reminder"))
      .collect();

    return jobs.map((job) => ({
      _id: job._id,
      payload: job.payload,
      runAt: job.runAt,
      cronExpr: job.cronExpr,
      timezone: job.timezone,
      status: job.status,
    }));
  },
});

/**
 * Cancel all pending reminders for a user (used by clearEverything).
 */
export const cancelAllUserReminders = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const jobs = await ctx.db
      .query("scheduledJobs")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "pending")
      )
      .filter((q) => q.eq(q.field("kind"), "reminder"))
      .collect();

    for (const job of jobs) {
      await ctx.db.patch(job._id, { status: "cancelled" });
      if (job.schedulerJobId) {
        try {
          await ctx.scheduler.cancel(
            job.schedulerJobId as Id<"_scheduled_functions">
          );
        } catch {
          // Already fired or cancelled
        }
      }
    }
  },
});

/**
 * Internal query to get a job by ID (used by fireReminder action).
 */
export const getJob = internalQuery({
  args: {
    jobId: v.id("scheduledJobs"),
  },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.get(jobId);
  },
});

/**
 * Mark a job as done (internal mutation called from fireReminder action).
 */
export const markJobDone = internalMutation({
  args: {
    jobId: v.id("scheduledJobs"),
  },
  handler: async (ctx, { jobId }) => {
    await ctx.db.patch(jobId, { status: "done" });
  },
});

/**
 * Mark a job as failed (internal mutation called from fireReminder when send fails).
 */
export const markJobFailed = internalMutation({
  args: {
    jobId: v.id("scheduledJobs"),
  },
  handler: async (ctx, { jobId }) => {
    await ctx.db.patch(jobId, { status: "failed" });
  },
});
