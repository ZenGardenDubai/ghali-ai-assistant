import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getNextCronRun } from "./lib/cronParser";

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
