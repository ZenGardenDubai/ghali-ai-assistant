import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import schema from "./schema";
import { DORMANT_MIGRATION_CUTOFF_MS } from "./constants";

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
      return await ctx.db.get(itemId) as Doc<"items"> | null;
    });
    expect(item?.scheduledTaskId).toBeTruthy();
  });
});

describe("flagDormantUsers", () => {
  /** Helper: create a user with specific createdAt and lastMessageAt */
  async function insertUser(
    t: ReturnType<typeof convexTest>,
    phone: string,
    createdAt: number,
    lastMessageAt?: number,
  ) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        phone,
        language: "en",
        timezone: "Asia/Dubai",
        tier: "basic",
        isAdmin: false,
        credits: 60,
        creditsResetAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        onboardingStep: null,
        createdAt,
        ...(lastMessageAt ? { lastMessageAt } : {}),
      });
    });
  }

  it("flags users created before cutoff with no post-migration activity", async () => {
    const t = convexTest(schema, modules);

    const preMigrationId = await insertUser(t, "+971501111111", DORMANT_MIGRATION_CUTOFF_MS - 1000);
    const postMigrationId = await insertUser(t, "+971502222222", DORMANT_MIGRATION_CUTOFF_MS + 1000);

    const result = await t.mutation(internal.migrations.flagDormantUsers, {});

    expect(result.flagged).toBe(1);

    const preMigration = await t.run(async (ctx) => ctx.db.get(preMigrationId));
    const postMigration = await t.run(async (ctx) => ctx.db.get(postMigrationId));

    expect(preMigration?.dormant).toBe(true);
    expect(postMigration?.dormant).toBeUndefined();
  });

  it("does not flag pre-migration users who messaged after cutoff", async () => {
    const t = convexTest(schema, modules);

    // Created before cutoff but messaged after
    const activeId = await insertUser(
      t,
      "+971501111111",
      DORMANT_MIGRATION_CUTOFF_MS - 1000,
      DORMANT_MIGRATION_CUTOFF_MS + 5000,
    );

    const result = await t.mutation(internal.migrations.flagDormantUsers, {});

    expect(result.flagged).toBe(0);

    const active = await t.run(async (ctx) => ctx.db.get(activeId));
    expect(active?.dormant).toBeUndefined();
  });

  it("is idempotent — running twice does not double-flag", async () => {
    const t = convexTest(schema, modules);

    await insertUser(t, "+971501111111", DORMANT_MIGRATION_CUTOFF_MS - 1000);

    const result1 = await t.mutation(internal.migrations.flagDormantUsers, {});
    const result2 = await t.mutation(internal.migrations.flagDormantUsers, {});

    expect(result1.flagged).toBe(1);
    expect(result2.flagged).toBe(0);
  });
});

describe("countDormantCandidates", () => {
  it("returns correct counts", async () => {
    const t = convexTest(schema, modules);

    // Pre-migration, no activity
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        phone: "+971501111111",
        language: "en",
        timezone: "Asia/Dubai",
        tier: "basic",
        isAdmin: false,
        credits: 60,
        creditsResetAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        onboardingStep: null,
        createdAt: DORMANT_MIGRATION_CUTOFF_MS - 1000,
      });
    });

    // Post-migration
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        phone: "+971502222222",
        language: "en",
        timezone: "Asia/Dubai",
        tier: "basic",
        isAdmin: false,
        credits: 60,
        creditsResetAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        onboardingStep: null,
        createdAt: DORMANT_MIGRATION_CUTOFF_MS + 1000,
      });
    });

    const counts = await t.query(internal.migrations.countDormantCandidates, {});

    expect(counts.total).toBe(2);
    expect(counts.candidates).toBe(1);
    expect(counts.alreadyDormant).toBe(0);
    expect(counts.willFlag).toBe(1);
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

    const counts = await t.query(
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
