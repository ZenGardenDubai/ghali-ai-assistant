import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("migrateRemindersToScheduledTasks", () => {
  it("migrates a pending one-off reminder to a scheduled task", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Create a pending reminder
    const jobId = await t.mutation(internal.reminders.createReminder, {
      userId,
      payload: "Drink water",
      runAt: Date.now() + 60_000,
      timezone: "Asia/Dubai",
    });

    // Run migration
    const result = await t.mutation(
      internal.migrations.migrateRemindersToScheduledTasks,
      {}
    );

    expect(result.migratedCount).toBe(1);
    expect(result.skippedCount).toBe(0);

    // Old reminder should be cancelled
    const reminders = await t.query(internal.reminders.listUserReminders, {
      userId,
    });
    expect(reminders).toHaveLength(0);

    // New scheduled task should exist
    const tasks = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId }
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Drink water");
    expect(tasks[0].description).toBe("Drink water");
    expect(tasks[0].schedule.kind).toBe("once");
    expect(tasks[0].enabled).toBe(true);
    expect(tasks[0].timezone).toBe("Asia/Dubai");
  });

  it("migrates a recurring reminder preserving cron expression", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.reminders.createReminder, {
      userId,
      payload: "Daily standup",
      runAt: Date.now() + 60_000,
      cronExpr: "0 9 * * 1-5",
      timezone: "Asia/Dubai",
    });

    const result = await t.mutation(
      internal.migrations.migrateRemindersToScheduledTasks,
      {}
    );

    expect(result.migratedCount).toBe(1);

    const tasks = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId }
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].schedule.kind).toBe("cron");
    if (tasks[0].schedule.kind === "cron") {
      expect(tasks[0].schedule.expr).toBe("0 9 * * 1-5");
    }
  });

  it("skips stale one-off reminders in the past", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Create a reminder with runAt in the past (directly insert to bypass validation)
    await t.run(async (ctx) => {
      await ctx.db.insert("scheduledJobs", {
        userId,
        kind: "reminder",
        payload: "Stale reminder",
        runAt: Date.now() - 60_000,
        status: "pending",
        timezone: "UTC",
      });
    });

    const result = await t.mutation(
      internal.migrations.migrateRemindersToScheduledTasks,
      {}
    );

    expect(result.migratedCount).toBe(0);
    expect(result.skippedCount).toBe(1);

    // No scheduled tasks created
    const tasks = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId }
    );
    expect(tasks).toHaveLength(0);
  });

  it("is idempotent — does not re-migrate cancelled jobs", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.reminders.createReminder, {
      userId,
      payload: "Test",
      runAt: Date.now() + 60_000,
      timezone: "UTC",
    });

    // Run migration twice
    const result1 = await t.mutation(
      internal.migrations.migrateRemindersToScheduledTasks,
      {}
    );
    const result2 = await t.mutation(
      internal.migrations.migrateRemindersToScheduledTasks,
      {}
    );

    expect(result1.migratedCount).toBe(1);
    expect(result2.migratedCount).toBe(0);

    // Only one scheduled task
    const tasks = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId }
    );
    expect(tasks).toHaveLength(1);
  });

  it("updates items referencing old reminderJobId", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Create reminder
    const jobId = await t.mutation(internal.reminders.createReminder, {
      userId,
      payload: "Call dentist",
      runAt: Date.now() + 60_000,
      timezone: "UTC",
    });

    // Create item linked to the reminder
    const itemId = await t.mutation(internal.items.createItem, {
      userId,
      title: "Call dentist",
      reminderAt: Date.now() + 60_000,
      reminderJobId: jobId,
    });

    // Run migration
    await t.mutation(
      internal.migrations.migrateRemindersToScheduledTasks,
      {}
    );

    // Item should now have scheduledTaskId set
    const item = await t.run(async (ctx) => {
      return await ctx.db.get(itemId);
    });
    expect(item?.scheduledTaskId).toBeTruthy();
  });
});

describe("countPendingReminders", () => {
  it("returns correct counts", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // One future one-off
    await t.mutation(internal.reminders.createReminder, {
      userId,
      payload: "Future",
      runAt: Date.now() + 60_000,
      timezone: "UTC",
    });

    // One recurring
    await t.mutation(internal.reminders.createReminder, {
      userId,
      payload: "Recurring",
      runAt: Date.now() + 60_000,
      cronExpr: "0 9 * * *",
      timezone: "UTC",
    });

    // One stale (direct insert)
    await t.run(async (ctx) => {
      await ctx.db.insert("scheduledJobs", {
        userId,
        kind: "reminder",
        payload: "Stale",
        runAt: Date.now() - 60_000,
        status: "pending",
        timezone: "UTC",
      });
    });

    const counts = await t.mutation(
      internal.migrations.countPendingReminders,
      {}
    );

    expect(counts.total).toBe(3);
    expect(counts.oneOff).toBe(2);
    expect(counts.recurring).toBe(1);
    expect(counts.stale).toBe(1);
    expect(counts.willMigrate).toBe(2);
  });
});
