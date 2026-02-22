import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { MAX_REMINDERS_PER_USER } from "./constants";

const modules = import.meta.glob("./**/*.ts");

describe("createReminder", () => {
  it("inserts a pending reminder and returns its ID", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const jobId = await t.mutation(internal.reminders.createReminder, {
      userId,
      payload: "Drink water",
      runAt: Date.now() + 60_000,
      timezone: "Asia/Dubai",
    });

    expect(jobId).toBeTruthy();

    // Verify job was created
    const reminders = await t.query(internal.reminders.listUserReminders, {
      userId,
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0].payload).toBe("Drink water");
    expect(reminders[0].status).toBe("pending");
  });

  it("creates a recurring reminder with cronExpr", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const jobId = await t.mutation(internal.reminders.createReminder, {
      userId,
      payload: "Stretch",
      runAt: Date.now() + 60_000,
      cronExpr: "0 15 * * *",
      timezone: "Asia/Dubai",
    });

    expect(jobId).toBeTruthy();

    const reminders = await t.query(internal.reminders.listUserReminders, {
      userId,
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0].cronExpr).toBe("0 15 * * *");
  });

  it("enforces MAX_REMINDERS_PER_USER cap", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Create MAX reminders
    for (let i = 0; i < MAX_REMINDERS_PER_USER; i++) {
      await t.mutation(internal.reminders.createReminder, {
        userId,
        payload: `Reminder ${i}`,
        runAt: Date.now() + 60_000 * (i + 1),
        timezone: "Asia/Dubai",
      });
    }

    // The next one should fail
    await expect(
      t.mutation(internal.reminders.createReminder, {
        userId,
        payload: "One too many",
        runAt: Date.now() + 60_000 * 100,
        timezone: "Asia/Dubai",
      })
    ).rejects.toThrow(/maximum/i);
  });
});

describe("listUserReminders", () => {
  it("returns only pending reminders for the specific user", async () => {
    const t = convexTest(schema, modules);

    const userId1 = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });
    const userId2 = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971509876543",
    });

    // Create reminders for both users
    await t.mutation(internal.reminders.createReminder, {
      userId: userId1,
      payload: "User1 reminder",
      runAt: Date.now() + 60_000,
      timezone: "Asia/Dubai",
    });
    await t.mutation(internal.reminders.createReminder, {
      userId: userId2,
      payload: "User2 reminder",
      runAt: Date.now() + 60_000,
      timezone: "UTC",
    });

    const reminders1 = await t.query(internal.reminders.listUserReminders, {
      userId: userId1,
    });
    expect(reminders1).toHaveLength(1);
    expect(reminders1[0].payload).toBe("User1 reminder");

    const reminders2 = await t.query(internal.reminders.listUserReminders, {
      userId: userId2,
    });
    expect(reminders2).toHaveLength(1);
    expect(reminders2[0].payload).toBe("User2 reminder");
  });
});

describe("cancelReminder", () => {
  it("marks a pending job as cancelled", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const jobId = await t.mutation(internal.reminders.createReminder, {
      userId,
      payload: "Cancel me",
      runAt: Date.now() + 60_000,
      timezone: "Asia/Dubai",
    });

    const result = await t.mutation(internal.reminders.cancelReminder, {
      jobId,
    });
    expect(result.success).toBe(true);

    // Verify no pending reminders remain
    const reminders = await t.query(internal.reminders.listUserReminders, {
      userId,
    });
    expect(reminders).toHaveLength(0);
  });

  it("returns error for non-pending jobs", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const jobId = await t.mutation(internal.reminders.createReminder, {
      userId,
      payload: "Cancel me",
      runAt: Date.now() + 60_000,
      timezone: "Asia/Dubai",
    });

    // Cancel once
    await t.mutation(internal.reminders.cancelReminder, { jobId });

    // Try to cancel again — should fail
    const result = await t.mutation(internal.reminders.cancelReminder, {
      jobId,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not pending/i);
  });
});

describe("cancelAllUserReminders", () => {
  it("cancels all pending reminders for a user", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Create multiple reminders
    await t.mutation(internal.reminders.createReminder, {
      userId,
      payload: "Reminder 1",
      runAt: Date.now() + 60_000,
      timezone: "Asia/Dubai",
    });
    await t.mutation(internal.reminders.createReminder, {
      userId,
      payload: "Reminder 2",
      runAt: Date.now() + 120_000,
      timezone: "Asia/Dubai",
    });

    // Cancel all
    await t.mutation(internal.reminders.cancelAllUserReminders, { userId });

    // Verify none remain
    const reminders = await t.query(internal.reminders.listUserReminders, {
      userId,
    });
    expect(reminders).toHaveLength(0);
  });
});
