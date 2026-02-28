import { v } from "convex/values";
import {
  internalMutation,
  internalAction,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  SCHEDULED_TASKS_LIMIT_BASIC,
  SCHEDULED_TASKS_LIMIT_PRO,
  SCHEDULED_TASK_MAX_RESULT_LENGTH,
  WHATSAPP_SESSION_WINDOW_MS,
} from "./constants";
import { getNextCronRun } from "./lib/cronParser";
import { getCurrentDateTime } from "./lib/utils";
import { buildUserContext } from "./lib/userFiles";
import { ghaliAgent } from "./agent";

/**
 * Build the prompt for a scheduled task execution.
 */
export function buildScheduledTaskPrompt(
  task: { title: string; description: string; deliveryFormat?: string },
  userContext: string
): string {
  const taskPrompt = task.deliveryFormat
    ? `${task.description}\n\nDelivery format: ${task.deliveryFormat}`
    : task.description;

  return userContext
    ? `${userContext}\n\n---\n<scheduled_task>\nTitle: ${task.title}\n${taskPrompt}\n</scheduled_task>`
    : `<scheduled_task>\nTitle: ${task.title}\n${taskPrompt}\n</scheduled_task>`;
}

/**
 * Truncate a scheduled task result for template delivery.
 */
export function truncateForTemplate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Validate that a timezone string is a valid IANA timezone.
 * Throws a user-friendly error if invalid.
 */
function validateTimezone(timezone: string): void {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new Error(`Invalid timezone: "${timezone}". Use an IANA timezone like "Asia/Dubai" or "America/New_York".`);
  }
}

/**
 * Create a scheduled task. Validates per-user limits (all tasks count, including paused).
 */
export const createScheduledTask = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.string(),
    schedule: v.union(
      v.object({ kind: v.literal("cron"), expr: v.string() }),
      v.object({ kind: v.literal("once"), runAt: v.number() })
    ),
    timezone: v.string(),
    deliveryFormat: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, title, description, schedule, timezone, deliveryFormat } = args;

    // Load user to check tier
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Count ALL tasks (enabled + disabled) toward limit
    const existingTasks = await ctx.db
      .query("scheduledTasks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const limit = user.tier === "pro"
      ? SCHEDULED_TASKS_LIMIT_PRO
      : SCHEDULED_TASKS_LIMIT_BASIC;

    if (existingTasks.length >= limit) {
      throw new Error(
        `Maximum ${limit} scheduled tasks allowed for ${user.tier} tier. Delete some first.`
      );
    }

    // Validate timezone
    validateTimezone(timezone);

    // Validate schedule
    let runAt: number;
    if (schedule.kind === "once") {
      runAt = schedule.runAt;
      if (runAt <= Date.now()) {
        throw new Error("Scheduled time must be in the future.");
      }
    } else {
      runAt = getNextCronRun(schedule.expr, timezone);
    }

    // Insert the task
    const taskId = await ctx.db.insert("scheduledTasks", {
      userId,
      title,
      description,
      schedule,
      timezone,
      deliveryFormat,
      enabled: true,
      createdAt: Date.now(),
    });

    // Schedule execution — clean up task if scheduler registration fails
    let schedulerJobId;
    try {
      schedulerJobId = await ctx.scheduler.runAt(
        runAt,
        internal.scheduledTasks.executeScheduledTask,
        { taskId }
      );
    } catch (error) {
      await ctx.db.delete(taskId);
      throw error;
    }

    await ctx.db.patch(taskId, { schedulerJobId });

    return taskId;
  },
});

/**
 * Execute a scheduled task — runs a full agent turn and delivers via WhatsApp.
 */
export const executeScheduledTask = internalAction({
  args: {
    taskId: v.id("scheduledTasks"),
  },
  handler: async (ctx, { taskId }) => {
    // Load task
    const task = await ctx.runQuery(internal.scheduledTasks.getTask, { taskId });
    if (!task || !task.enabled) return;

    // Load user
    const user = await ctx.runQuery(internal.users.internalGetUser, {
      userId: task.userId,
    });
    if (!user) {
      await ctx.runMutation(internal.scheduledTasks.markLastRun, {
        taskId,
        lastStatus: "error",
      });
      await ctx.runMutation(internal.scheduledTasks.updateScheduledTask, {
        taskId,
        updates: { enabled: false },
      });
      return;
    }

    // Check credits (pass "__scheduled__" to skip system command check)
    const creditCheck = await ctx.runQuery(internal.credits.checkCredit, {
      userId: task.userId,
      message: "__scheduled__",
    });

    if (creditCheck.status === "exhausted") {
      // Send one notification per credit cycle
      let notificationSent = task.creditNotificationSent === true;
      if (!notificationSent) {
        const withinWindow =
          user.lastMessageAt &&
          Date.now() - user.lastMessageAt < WHATSAPP_SESSION_WINDOW_MS;

        try {
          if (withinWindow) {
            await ctx.runAction(internal.twilio.sendMessage, {
              to: user.phone,
              body: `Your scheduled task "${task.title}" couldn't run — you're out of credits. Send "upgrade" to get more.`,
            });
          } else {
            await ctx.runAction(internal.twilio.sendTemplate, {
              to: user.phone,
              templateEnvVar: "TWILIO_TPL_CREDITS_LOW",
              variables: { "1": "0" },
            });
          }
          notificationSent = true;
        } catch (error) {
          console.error(`Failed to send credit notification for task ${taskId}:`, error);
        }
      }

      await ctx.runMutation(internal.scheduledTasks.markLastRun, {
        taskId,
        lastStatus: "skipped_no_credits",
        creditNotificationSent: notificationSent,
      });

      // Reschedule next run for cron tasks
      if (task.schedule.kind === "cron") {
        await rescheduleNextRun(ctx, taskId);
      } else {
        // One-off task: disable since it can't run
        await ctx.runMutation(internal.scheduledTasks.updateScheduledTask, {
          taskId,
          updates: { enabled: false },
        });
      }
      return;
    }

    // Build user context
    const userFiles = await ctx.runQuery(
      internal.users.internalGetUserFiles,
      { userId: task.userId }
    );
    const { date, time, tz } = getCurrentDateTime(user.timezone);
    const userContext = buildUserContext(userFiles, { date, time, tz });

    // Get/create thread
    const { threadId } = await ghaliAgent.createThread(ctx, {
      userId: task.userId as string,
    });

    // Build prompt
    const fullPrompt = buildScheduledTaskPrompt(task, userContext);

    // Run agent
    let responseText: string | undefined;
    let aiSucceeded = false;
    try {
      const result = await ghaliAgent.generateText(
        ctx,
        { threadId },
        { prompt: fullPrompt }
      );
      responseText = result.text;
      aiSucceeded = true;
    } catch (error) {
      console.error(`Scheduled task agent failed for ${taskId}:`, error);
      await ctx.runMutation(internal.scheduledTasks.markLastRun, {
        taskId,
        lastStatus: "error",
      });
    }

    if (!aiSucceeded || !responseText) {
      // Notify user about the failure
      try {
        const withinErrorWindow =
          user.lastMessageAt &&
          Date.now() - user.lastMessageAt < WHATSAPP_SESSION_WINDOW_MS;
        if (withinErrorWindow) {
          await ctx.runAction(internal.twilio.sendMessage, {
            to: user.phone,
            body: `Your scheduled task "${task.title}" failed to run. I'll try again next time or you can reschedule it.`,
          });
        }
      } catch {
        // Best-effort notification
      }

      // Reschedule cron even on error
      if (task.schedule.kind === "cron") {
        await rescheduleNextRun(ctx, taskId);
      } else {
        await ctx.runMutation(internal.scheduledTasks.updateScheduledTask, {
          taskId,
          updates: { enabled: false },
        });
      }
      return;
    }

    // Deduct credit
    await ctx.runMutation(internal.credits.deductCredit, {
      userId: task.userId,
    });

    // Deliver via WhatsApp
    const withinWindow =
      user.lastMessageAt &&
      Date.now() - user.lastMessageAt < WHATSAPP_SESSION_WINDOW_MS;

    let delivered = false;
    try {
      if (withinWindow) {
        await ctx.runAction(internal.twilio.sendMessage, {
          to: user.phone,
          body: responseText,
        });
      } else {
        // Out of session — use template with truncation
        const truncated = truncateForTemplate(responseText, SCHEDULED_TASK_MAX_RESULT_LENGTH);
        await ctx.runAction(internal.twilio.sendTemplate, {
          to: user.phone,
          templateEnvVar: "TWILIO_TPL_SCHEDULED_TASK",
          variables: { "1": truncated },
        });
      }
      delivered = true;
    } catch (error) {
      console.error(`Failed to deliver scheduled task ${taskId}:`, error);
    }

    if (!delivered) {
      // Delivery failed — mark error, reschedule cron, disable one-off
      await ctx.runMutation(internal.scheduledTasks.markLastRun, {
        taskId,
        lastStatus: "error",
      });
      if (task.schedule.kind === "cron") {
        await rescheduleNextRun(ctx, taskId);
      } else {
        await ctx.runMutation(internal.scheduledTasks.updateScheduledTask, {
          taskId,
          updates: { enabled: false },
        });
      }
      return;
    }

    // Mark success + clear credit notification flag
    await ctx.runMutation(internal.scheduledTasks.markLastRun, {
      taskId,
      lastStatus: "success",
      creditNotificationSent: false,
    });

    // Handle next run
    if (task.schedule.kind === "cron") {
      await rescheduleNextRun(ctx, taskId);
    } else {
      // One-off: disable after execution
      await ctx.runMutation(internal.scheduledTasks.updateScheduledTask, {
        taskId,
        updates: { enabled: false },
      });
    }
  },
});

/**
 * Helper: reschedule a cron task's next run (called from action context).
 * Delegates to scheduleNextRun mutation which reads fresh task data.
 */
async function rescheduleNextRun(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: { runMutation: (...args: any[]) => Promise<any> },
  taskId: Id<"scheduledTasks">
) {
  await ctx.runMutation(internal.scheduledTasks.scheduleNextRun, { taskId });
}

/**
 * Schedule the next run for a cron task. Reads fresh task data to avoid
 * stale schedule/timezone from the action's earlier snapshot.
 */
export const scheduleNextRun = internalMutation({
  args: {
    taskId: v.id("scheduledTasks"),
  },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task || !task.enabled || task.schedule.kind !== "cron") return;

    const runAt = getNextCronRun(task.schedule.expr, task.timezone, new Date());

    const schedulerJobId = await ctx.scheduler.runAt(
      runAt,
      internal.scheduledTasks.executeScheduledTask,
      { taskId }
    );

    await ctx.db.patch(taskId, { schedulerJobId });
  },
});

/**
 * Update a scheduled task. Reschedules if schedule changes or task is re-enabled.
 */
export const updateScheduledTask = internalMutation({
  args: {
    taskId: v.id("scheduledTasks"),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      schedule: v.optional(
        v.union(
          v.object({ kind: v.literal("cron"), expr: v.string() }),
          v.object({ kind: v.literal("once"), runAt: v.number() })
        )
      ),
      enabled: v.optional(v.boolean()),
      deliveryFormat: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { taskId, updates }) => {
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    const patch: Record<string, unknown> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.deliveryFormat !== undefined) patch.deliveryFormat = updates.deliveryFormat;

    const scheduleChanged = updates.schedule !== undefined;
    const enabledChanged = updates.enabled !== undefined && updates.enabled !== task.enabled;

    if (updates.schedule !== undefined) patch.schedule = updates.schedule;
    if (updates.enabled !== undefined) patch.enabled = updates.enabled;

    // Cancel existing scheduler job if schedule or enabled state changed
    if ((scheduleChanged || enabledChanged) && task.schedulerJobId) {
      try {
        await ctx.scheduler.cancel(task.schedulerJobId);
      } catch {
        // Already fired or cancelled
      }
      patch.schedulerJobId = undefined;
    }

    await ctx.db.patch(taskId, patch);

    // Reschedule if the task should be running
    const newEnabled = updates.enabled ?? task.enabled;
    if (newEnabled && (scheduleChanged || enabledChanged)) {
      const schedule = updates.schedule ?? task.schedule;
      const timezone = task.timezone;

      let runAt: number;
      if (schedule.kind === "once") {
        runAt = schedule.runAt;
        if (runAt <= Date.now()) {
          throw new Error("Scheduled time must be in the future.");
        }
      } else {
        runAt = getNextCronRun(schedule.expr, timezone);
      }

      const schedulerJobId = await ctx.scheduler.runAt(
        runAt,
        internal.scheduledTasks.executeScheduledTask,
        { taskId }
      );
      await ctx.db.patch(taskId, { schedulerJobId });
    }
  },
});

/**
 * Delete a scheduled task. Cancels any pending scheduler job.
 */
export const deleteScheduledTask = internalMutation({
  args: {
    taskId: v.id("scheduledTasks"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { taskId, userId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    if (userId && task.userId !== userId) {
      throw new Error("Task not found");
    }

    // Cancel scheduler job
    if (task.schedulerJobId) {
      try {
        await ctx.scheduler.cancel(task.schedulerJobId);
      } catch {
        // Already fired or cancelled
      }
    }

    await ctx.db.delete(taskId);
  },
});

/**
 * List all scheduled tasks for a user (enabled + disabled).
 */
export const listUserScheduledTasks = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("scheduledTasks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Get a single task by ID (used by executeScheduledTask action).
 */
export const getTask = internalQuery({
  args: {
    taskId: v.id("scheduledTasks"),
  },
  handler: async (ctx, { taskId }) => {
    return await ctx.db.get(taskId);
  },
});

/**
 * Cancel and delete all scheduled tasks for a user (used by clearEverything).
 */
export const cancelAllUserScheduledTasks = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const tasks = await ctx.db
      .query("scheduledTasks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const task of tasks) {
      if (task.schedulerJobId) {
        try {
          await ctx.scheduler.cancel(task.schedulerJobId);
        } catch {
          // Already fired or cancelled
        }
      }
      await ctx.db.delete(task._id);
    }
  },
});

/**
 * Update last run metadata on a task.
 */
export const markLastRun = internalMutation({
  args: {
    taskId: v.id("scheduledTasks"),
    lastStatus: v.union(
      v.literal("success"),
      v.literal("skipped_no_credits"),
      v.literal("error")
    ),
    creditNotificationSent: v.optional(v.boolean()),
  },
  handler: async (ctx, { taskId, lastStatus, creditNotificationSent }) => {
    const patch: Record<string, unknown> = {
      lastRunAt: Date.now(),
      lastStatus,
    };

    if (creditNotificationSent !== undefined) {
      patch.creditNotificationSent = creditNotificationSent;
    }

    await ctx.db.patch(taskId, patch);
  },
});

/**
 * Reset creditNotificationSent on all tasks for a user (called after credit reset).
 */
export const resetCreditNotifications = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const tasks = await ctx.db
      .query("scheduledTasks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const task of tasks) {
      if (task.creditNotificationSent) {
        await ctx.db.patch(task._id, { creditNotificationSent: false });
      }
    }
  },
});
