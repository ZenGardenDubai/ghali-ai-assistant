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
} from "./constants";
import { getNextCronRun } from "./lib/cronParser";

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

    // Check WhatsApp 24h session window
    const withinWindow =
      user.lastMessageAt &&
      Date.now() - user.lastMessageAt < WHATSAPP_SESSION_WINDOW_MS;

    try {
      if (withinWindow) {
        await ctx.runAction(internal.twilio.sendMessage, {
          to: user.phone,
          body: `⏰ ${job.payload}`,
        });
      } else {
        // Outside 24h window — use Content Template
        await ctx.runAction(internal.twilio.sendTemplate, {
          to: user.phone,
          templateEnvVar: "TWILIO_TPL_REMINDER",
          variables: { "1": job.payload },
        });
      }
    } catch (error) {
      console.error(`Failed to send reminder ${jobId}:`, error);
    }

    // Mark as done
    await ctx.runMutation(internal.reminders.markJobDone, { jobId });

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
