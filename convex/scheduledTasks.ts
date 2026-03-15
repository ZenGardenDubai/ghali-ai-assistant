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
  TEMPLATE_INACTIVITY_GATE_MS,
} from "./constants";
import { getNextCronRun } from "./lib/cronParser";
import { getCurrentDateTime } from "./lib/utils";
import { buildUserContext } from "./lib/userFiles";
import { ghaliAgent, getOrCreateChatThread, setTraceId, clearTraceId } from "./agent";

/**
 * Pure helper: determine if a failure notification should be sent.
 * Only notifies on the first consecutive AI failure and not during backoff.
 */
export function shouldNotifyOnFailure(
  user: { errorBackoffUntil?: number; consecutiveErrors?: number } | null,
  now: number = Date.now()
): boolean {
  if (!user) return false;
  const inBackoff = !!(user.errorBackoffUntil && now < user.errorBackoffUntil);
  return !inBackoff && (user.consecutiveErrors ?? 0) === 1;
}

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

  const instructions = `\n<scheduled_task_instructions>
You are executing a scheduled task. RULES:
- Focus ONLY on this task. Do NOT call listScheduledTasks or manage other tasks.
- Do NOT mention other scheduled tasks the user has.
- Deliver the task result directly — no preamble like "Here's your scheduled task result".
- If this is a reminder, deliver a short, friendly reminder message.
- If this is a briefing/report, deliver the content directly.
- Respond in the user's preferred language (from their personality/memory above).
</scheduled_task_instructions>`;

  return userContext
    ? `${userContext}\n\n---${instructions}\n<scheduled_task>\nTitle: ${task.title}\n${taskPrompt}\n</scheduled_task>`
    : `${instructions}\n<scheduled_task>\nTitle: ${task.title}\n${taskPrompt}\n</scheduled_task>`;
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

    // Record proactive opt-in (only sets once)
    const userForOptIn = await ctx.db.get(userId);
    if (userForOptIn && !userForOptIn.proactiveOptInAt) {
      await ctx.db.patch(userId, { proactiveOptInAt: Date.now() });
    }

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

    // Skip opted-out, blocked, or inactive (>7 days) users — but reschedule cron so it resumes on reactivation
    const isInactive = !user.lastMessageAt || Date.now() - user.lastMessageAt > TEMPLATE_INACTIVITY_GATE_MS;
    if (user.optedOut || user.blocked || isInactive) {
      console.log(`[scheduled-task] Task ${taskId} skipped — user ${task.userId} opted out, blocked, or inactive >7 days`);
      if (task.schedule.kind === "cron") {
        await rescheduleNextRun(ctx, taskId);
      } else {
        // One-off: disable to avoid zombie tasks that never fire
        await ctx.runMutation(internal.scheduledTasks.updateScheduledTask, {
          taskId,
          updates: { enabled: false },
        });
      }
      return;
    }

    // Circuit breaker: skip if user is in error backoff (API outage protection)
    if (user.errorBackoffUntil && Date.now() < user.errorBackoffUntil) {
      console.log(
        `[circuit-breaker] Scheduled task ${taskId} skipped for user ${task.userId} — in error backoff`
      );
      if (task.schedule.kind === "cron") {
        // Reschedule next cron tick after backoff expires (not from now)
        await ctx.runMutation(internal.scheduledTasks.scheduleNextRunAfter, {
          taskId,
          afterMs: user.errorBackoffUntil,
        });
      } else {
        // One-off: reschedule to run after backoff expires (otherwise it never runs again)
        const schedulerJobId = await ctx.scheduler.runAt(
          user.errorBackoffUntil,
          internal.scheduledTasks.executeScheduledTask,
          { taskId }
        );
        await ctx.runMutation(internal.scheduledTasks.updateSchedulerJobId, {
          taskId,
          schedulerJobId,
        });
      }
      return;
    }

    // Check credits (pass "__scheduled__" to skip system command check)
    const creditCheck = await ctx.runQuery(internal.credits.checkCredit, {
      userId: task.userId,
      message: "__scheduled__",
    });

    if (creditCheck.status === "exhausted") {
      // Send one notification per credit cycle — guarded to respect outbound rate limits
      let notificationSent = task.creditNotificationSent === true;
      if (!notificationSent) {
        const guard = await ctx.runMutation(
          internal.outboundGuard.checkAndRecordOutbound,
          { userId: task.userId }
        );
        if (guard.allowed) {
          const withinWindow =
            user.lastMessageAt &&
            Date.now() - user.lastMessageAt < WHATSAPP_SESSION_WINDOW_MS;

          try {
            if (withinWindow) {
              await ctx.runAction(internal.whatsapp.sendMessage, {
                to: user.phone,
                body: `Your scheduled task "${task.title}" couldn't run — you're out of credits. Send "upgrade" to get more.`,
              });
            } else {
              await ctx.runAction(internal.whatsapp.sendTemplate, {
                to: user.phone,
                templateName: "ghali_credits_low_v2",
                variables: { "1": "0" },
              });
            }
            notificationSent = true;
          } catch (error) {
            console.error(`Failed to send credit notification for task ${taskId}:`, error);
          }
        } else {
          console.warn(`[outbound-guard] Credit notification for task ${taskId} blocked: ${guard.reason}`);
        }
      }

      await ctx.runMutation(internal.scheduledTasks.markLastRun, {
        taskId,
        lastStatus: "skipped_no_credits",
        creditNotificationSent: notificationSent,
      });

      // Fire analytics
      await ctx.runAction(internal.analytics.trackScheduledTaskSkipped, {
        phone: user.phone,
        reason: "no_credits",
        tier: user.tier,
      });
      if (notificationSent && !task.creditNotificationSent) {
        await ctx.runAction(internal.analytics.trackScheduledTaskCreditNotification, {
          phone: user.phone,
          tier: user.tier,
        });
      }

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

    // Track execution start time
    const executionStartMs = Date.now();

    // Build user context
    const userFiles = await ctx.runQuery(
      internal.users.internalGetUserFiles,
      { userId: task.userId }
    );
    const { date, time, tz } = getCurrentDateTime(user.timezone);
    const userContext = buildUserContext(userFiles, { date, time, tz });

    // Get the user's existing chat thread, or create one if none exists yet.
    // Using getOrCreateChatThread instead of createThread directly, because
    // createThread always inserts a new thread and would lose all history.
    const threadId = await getOrCreateChatThread(ctx, task.userId as string);

    // Build prompt (personality/memory language preferences are in userContext)
    const fullPrompt = buildScheduledTaskPrompt(task, userContext);

    // Set per-request trace ID for PostHog LLM analytics
    setTraceId(crypto.randomUUID());

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
      // Reset circuit breaker on success
      await ctx.runMutation(internal.users.resetApiErrors, { userId: task.userId });
    } catch (error) {
      console.error(`Scheduled task agent failed for ${taskId}:`, error);
      await ctx.runMutation(internal.users.recordApiError, { userId: task.userId });
      await ctx.runMutation(internal.scheduledTasks.markLastRun, {
        taskId,
        lastStatus: "error",
      });
    } finally {
      clearTraceId();
    }

    if (!aiSucceeded || !responseText) {
      // Only notify on the FIRST consecutive AI failure (same discipline as messages.ts).
      // Suppresses notification during backoff AND on 2nd+ pre-breaker failures.
      const freshUser = await ctx.runQuery(internal.users.internalGetUser, { userId: task.userId });
      if (shouldNotifyOnFailure(freshUser)) {
        const errorGuard = await ctx.runMutation(
          internal.outboundGuard.checkAndRecordOutbound,
          { userId: task.userId }
        );
        if (errorGuard.allowed) {
          try {
            const withinErrorWindow =
              user.lastMessageAt &&
              Date.now() - user.lastMessageAt < WHATSAPP_SESSION_WINDOW_MS;
            if (withinErrorWindow) {
              await ctx.runAction(internal.whatsapp.sendMessage, {
                to: user.phone,
                body: `Your scheduled task "${task.title}" failed to run. I'll try again next time or you can reschedule it.`,
              });
            }
          } catch {
            // Best-effort notification
          }
        }
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

    // Re-fetch user before delivery — agent call above can take seconds/minutes,
    // user may have opted out or crossed the 7-day inactivity boundary
    const latestUser = await ctx.runQuery(internal.users.internalGetUser, { userId: task.userId });
    const latestInactive = !latestUser?.lastMessageAt || Date.now() - latestUser.lastMessageAt > TEMPLATE_INACTIVITY_GATE_MS;
    if (!latestUser || latestUser.optedOut || latestUser.blocked || latestInactive) {
      console.log(`[scheduled-task] Task ${taskId} delivery skipped — user ${task.userId} not found, opted out, blocked, or inactive >7 days`);
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

    // Check daily proactive limit
    const proactiveGuard = await ctx.runMutation(
      internal.outboundGuard.checkAndRecordProactiveSend,
      { userId: task.userId }
    );
    if (!proactiveGuard.allowed) {
      console.warn(`[proactive-guard] Task ${taskId} delivery blocked: ${proactiveGuard.reason}`);
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

    // Deliver via WhatsApp — guarded to respect outbound rate limits
    const deliveryGuard = await ctx.runMutation(
      internal.outboundGuard.checkAndRecordOutbound,
      { userId: task.userId }
    );
    if (!deliveryGuard.allowed) {
      console.warn(`[outbound-guard] Task ${taskId} delivery blocked: ${deliveryGuard.reason}`);
      await ctx.runMutation(internal.outboundGuard.rollbackProactiveSend, { userId: task.userId });
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

    const withinWindow =
      latestUser.lastMessageAt &&
      Date.now() - latestUser.lastMessageAt < WHATSAPP_SESSION_WINDOW_MS;

    let delivered = false;
    try {
      if (withinWindow) {
        await ctx.runAction(internal.whatsapp.sendMessage, {
          to: latestUser.phone,
          body: responseText,
        });
        delivered = true;
      } else {
        // Out of session — check daily template cap before sending
        const templateGuard = await ctx.runMutation(
          internal.outboundGuard.checkAndRecordTemplateSend,
          { userId: task.userId }
        );
        if (!templateGuard.allowed) {
          console.warn(`[template-guard] Task ${taskId} template blocked: ${templateGuard.reason}`);
          // Fall through to the !delivered path below
        } else {
          try {
            const truncated = truncateForTemplate(responseText, SCHEDULED_TASK_MAX_RESULT_LENGTH);
            await ctx.runAction(internal.whatsapp.sendTemplate, {
              to: latestUser.phone,
              templateName: "ghali_scheduled_task_v2",
              variables: { "1": truncated },
            });
            delivered = true;
          } catch (error) {
            await ctx.runMutation(internal.outboundGuard.rollbackTemplateSend, { userId: task.userId });
            throw error;
          }
        }
      }
    } catch (error) {
      await ctx.runMutation(internal.outboundGuard.rollbackProactiveSend, { userId: task.userId });
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

    // Deduct credit after successful delivery
    await ctx.runMutation(internal.credits.deductCredit, {
      userId: task.userId,
    });

    // Mark success + clear credit notification flag
    await ctx.runMutation(internal.scheduledTasks.markLastRun, {
      taskId,
      lastStatus: "success",
      creditNotificationSent: false,
    });

    // Fire analytics
    await ctx.runAction(internal.analytics.trackScheduledTaskExecuted, {
      phone: user.phone,
      schedule_kind: task.schedule.kind,
      tier: user.tier,
      duration_ms: Date.now() - executionStartMs,
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

/** Shared helper: compute next cron run, schedule it, and patch the task. */
async function scheduleCronRun(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  taskId: Id<"scheduledTasks">,
  after?: Date
) {
  const task = await ctx.db.get(taskId);
  if (!task || !task.enabled || task.schedule.kind !== "cron") return;

  const runAt = getNextCronRun(task.schedule.expr, task.timezone, after ?? new Date());

  const schedulerJobId = await ctx.scheduler.runAt(
    runAt,
    internal.scheduledTasks.executeScheduledTask,
    { taskId }
  );

  await ctx.db.patch(taskId, { schedulerJobId });
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
    await scheduleCronRun(ctx, taskId);
  },
});

/**
 * Schedule the next cron run after a given timestamp (used by circuit breaker
 * to push the next tick past the backoff window).
 */
export const scheduleNextRunAfter = internalMutation({
  args: {
    taskId: v.id("scheduledTasks"),
    afterMs: v.number(),
  },
  handler: async (ctx, { taskId, afterMs }) => {
    await scheduleCronRun(ctx, taskId, new Date(Math.max(Date.now(), afterMs)));
  },
});

/**
 * Update only the schedulerJobId on a task (used when rescheduling one-off
 * tasks during circuit breaker backoff).
 */
export const updateSchedulerJobId = internalMutation({
  args: {
    taskId: v.id("scheduledTasks"),
    schedulerJobId: v.id("_scheduled_functions"),
  },
  handler: async (ctx, { taskId, schedulerJobId }) => {
    await ctx.db.patch(taskId, { schedulerJobId });
  },
});

/**
 * Update a scheduled task. Reschedules if schedule changes or task is re-enabled.
 *
 * userId is optional by design: agent tools pass it for user-initiated updates
 * (ownership verified via the `if (userId && task.userId !== userId)` guard),
 * while internal system operations (e.g. credit exhaustion, error recovery) omit
 * it to operate without user context.
 */
export const updateScheduledTask = internalMutation({
  args: {
    taskId: v.id("scheduledTasks"),
    userId: v.optional(v.id("users")),
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
  handler: async (ctx, { taskId, userId, updates }) => {
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    if (userId && task.userId !== userId) {
      throw new Error("Task not found");
    }

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
 *
 * userId is optional by design: agent tools pass it for user-initiated deletes
 * (ownership verified via the `if (userId && task.userId !== userId)` guard),
 * while internal system operations (e.g. clearEverything, error recovery) omit
 * it to operate without user context.
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
