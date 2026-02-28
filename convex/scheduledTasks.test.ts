import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import {
  SCHEDULED_TASKS_LIMIT_BASIC,
  SCHEDULED_TASKS_LIMIT_PRO,
} from "./constants";

const modules = import.meta.glob("./**/*.ts");

// Helper: create a test user with a given tier
async function createUser(
  t: ReturnType<typeof convexTest>,
  phone: string,
  tier: "basic" | "pro" = "basic"
) {
  const userId = await t.mutation(internal.users.findOrCreateUser, { phone });
  if (tier === "pro") {
    await t.mutation(internal.admin.grantPro, { phone });
  }
  return userId;
}

describe("createScheduledTask", () => {
  it("creates a one-off task and returns its ID", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    const taskId = await t.mutation(
      internal.scheduledTasks.createScheduledTask,
      {
        userId,
        title: "Test reminder",
        description: "Remind me to drink water",
        schedule: { kind: "once", runAt: Date.now() + 60_000 },
        timezone: "Asia/Dubai",
      }
    );

    expect(taskId).toBeTruthy();

    const tasks = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId }
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Test reminder");
    expect(tasks[0].enabled).toBe(true);
    expect(tasks[0].schedule).toEqual({
      kind: "once",
      runAt: expect.any(Number),
    });
  });

  it("creates a cron task", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    const taskId = await t.mutation(
      internal.scheduledTasks.createScheduledTask,
      {
        userId,
        title: "Daily joke",
        description: "Tell me a joke every day at 9am",
        schedule: { kind: "cron", expr: "0 9 * * *" },
        timezone: "Asia/Dubai",
      }
    );

    expect(taskId).toBeTruthy();

    const tasks = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId }
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].schedule).toEqual({ kind: "cron", expr: "0 9 * * *" });
  });

  it("enforces basic tier limit", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    // Create max tasks
    for (let i = 0; i < SCHEDULED_TASKS_LIMIT_BASIC; i++) {
      await t.mutation(internal.scheduledTasks.createScheduledTask, {
        userId,
        title: `Task ${i}`,
        description: `Description ${i}`,
        schedule: { kind: "once", runAt: Date.now() + 60_000 * (i + 1) },
        timezone: "Asia/Dubai",
      });
    }

    // Next one should fail
    await expect(
      t.mutation(internal.scheduledTasks.createScheduledTask, {
        userId,
        title: "One too many",
        description: "Should fail",
        schedule: { kind: "once", runAt: Date.now() + 600_000 },
        timezone: "Asia/Dubai",
      })
    ).rejects.toThrow(/maximum/i);
  });

  it("enforces pro tier limit", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567", "pro");

    // Create max tasks
    for (let i = 0; i < SCHEDULED_TASKS_LIMIT_PRO; i++) {
      await t.mutation(internal.scheduledTasks.createScheduledTask, {
        userId,
        title: `Task ${i}`,
        description: `Description ${i}`,
        schedule: { kind: "once", runAt: Date.now() + 60_000 * (i + 1) },
        timezone: "Asia/Dubai",
      });
    }

    // Next one should fail
    await expect(
      t.mutation(internal.scheduledTasks.createScheduledTask, {
        userId,
        title: "One too many",
        description: "Should fail",
        schedule: { kind: "once", runAt: Date.now() + 600_000 },
        timezone: "Asia/Dubai",
      })
    ).rejects.toThrow(/maximum/i);
  });

  it("counts paused tasks toward the limit", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    // Create max tasks
    const taskIds = [];
    for (let i = 0; i < SCHEDULED_TASKS_LIMIT_BASIC; i++) {
      const taskId = await t.mutation(
        internal.scheduledTasks.createScheduledTask,
        {
          userId,
          title: `Task ${i}`,
          description: `Description ${i}`,
          schedule: { kind: "once" as const, runAt: Date.now() + 60_000 * (i + 1) },
          timezone: "Asia/Dubai",
        }
      );
      taskIds.push(taskId);
    }

    // Pause one task
    await t.mutation(internal.scheduledTasks.updateScheduledTask, {
      taskId: taskIds[0],
      updates: { enabled: false },
    });

    // Still at limit — should fail
    await expect(
      t.mutation(internal.scheduledTasks.createScheduledTask, {
        userId,
        title: "One too many",
        description: "Should fail",
        schedule: { kind: "once", runAt: Date.now() + 600_000 },
        timezone: "Asia/Dubai",
      })
    ).rejects.toThrow(/maximum/i);
  });

  it("rejects past runAt for one-off tasks", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    await expect(
      t.mutation(internal.scheduledTasks.createScheduledTask, {
        userId,
        title: "Past task",
        description: "Should fail",
        schedule: { kind: "once", runAt: Date.now() - 60_000 },
        timezone: "Asia/Dubai",
      })
    ).rejects.toThrow(/future/i);
  });
});

describe("listUserScheduledTasks", () => {
  it("returns all tasks for a user (enabled + disabled)", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    const taskId = await t.mutation(
      internal.scheduledTasks.createScheduledTask,
      {
        userId,
        title: "Task 1",
        description: "Description 1",
        schedule: { kind: "once", runAt: Date.now() + 60_000 },
        timezone: "Asia/Dubai",
      }
    );

    await t.mutation(internal.scheduledTasks.createScheduledTask, {
      userId,
      title: "Task 2",
      description: "Description 2",
      schedule: { kind: "once", runAt: Date.now() + 120_000 },
      timezone: "Asia/Dubai",
    });

    // Disable one
    await t.mutation(internal.scheduledTasks.updateScheduledTask, {
      taskId: taskId,
      updates: { enabled: false },
    });

    const tasks = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId }
    );
    expect(tasks).toHaveLength(2);
  });

  it("isolates tasks by user", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createUser(t, "+971501234567");
    const userId2 = await createUser(t, "+971509876543");

    await t.mutation(internal.scheduledTasks.createScheduledTask, {
      userId: userId1,
      title: "User1 task",
      description: "Description",
      schedule: { kind: "once", runAt: Date.now() + 60_000 },
      timezone: "Asia/Dubai",
    });

    await t.mutation(internal.scheduledTasks.createScheduledTask, {
      userId: userId2,
      title: "User2 task",
      description: "Description",
      schedule: { kind: "once", runAt: Date.now() + 60_000 },
      timezone: "UTC",
    });

    const tasks1 = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId: userId1 }
    );
    expect(tasks1).toHaveLength(1);
    expect(tasks1[0].title).toBe("User1 task");

    const tasks2 = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId: userId2 }
    );
    expect(tasks2).toHaveLength(1);
    expect(tasks2[0].title).toBe("User2 task");
  });
});

describe("updateScheduledTask", () => {
  it("updates task description", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    const taskId = await t.mutation(
      internal.scheduledTasks.createScheduledTask,
      {
        userId,
        title: "Original title",
        description: "Original description",
        schedule: { kind: "once", runAt: Date.now() + 60_000 },
        timezone: "Asia/Dubai",
      }
    );

    await t.mutation(internal.scheduledTasks.updateScheduledTask, {
      taskId: taskId,
      updates: {
        title: "Updated title",
        description: "Updated description",
      },
    });

    const tasks = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId }
    );
    expect(tasks[0].title).toBe("Updated title");
    expect(tasks[0].description).toBe("Updated description");
  });

  it("pauses and resumes a task", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    const taskId = await t.mutation(
      internal.scheduledTasks.createScheduledTask,
      {
        userId,
        title: "Pausable task",
        description: "Description",
        schedule: { kind: "once", runAt: Date.now() + 60_000 },
        timezone: "Asia/Dubai",
      }
    );

    // Pause
    await t.mutation(internal.scheduledTasks.updateScheduledTask, {
      taskId: taskId,
      updates: { enabled: false },
    });

    let tasks = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId }
    );
    expect(tasks[0].enabled).toBe(false);

    // Resume
    await t.mutation(internal.scheduledTasks.updateScheduledTask, {
      taskId: taskId,
      updates: { enabled: true },
    });

    tasks = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId }
    );
    expect(tasks[0].enabled).toBe(true);
  });
});

describe("deleteScheduledTask", () => {
  it("deletes a task", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    const taskId = await t.mutation(
      internal.scheduledTasks.createScheduledTask,
      {
        userId,
        title: "Delete me",
        description: "Description",
        schedule: { kind: "once", runAt: Date.now() + 60_000 },
        timezone: "Asia/Dubai",
      }
    );

    await t.mutation(internal.scheduledTasks.deleteScheduledTask, {
      taskId: taskId,
    });

    const tasks = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId }
    );
    expect(tasks).toHaveLength(0);
  });

  it("rejects deletion with wrong userId", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createUser(t, "+971501234567");
    const userId2 = await createUser(t, "+971509876543");

    const taskId = await t.mutation(
      internal.scheduledTasks.createScheduledTask,
      {
        userId: userId1,
        title: "Not yours",
        description: "Description",
        schedule: { kind: "once", runAt: Date.now() + 60_000 },
        timezone: "Asia/Dubai",
      }
    );

    await expect(
      t.mutation(internal.scheduledTasks.deleteScheduledTask, {
        taskId: taskId,
        userId: userId2,
      })
    ).rejects.toThrow(/not found/i);
  });
});

describe("cancelAllUserScheduledTasks", () => {
  it("deletes all tasks for a user", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    await t.mutation(internal.scheduledTasks.createScheduledTask, {
      userId,
      title: "Task 1",
      description: "Description",
      schedule: { kind: "once", runAt: Date.now() + 60_000 },
      timezone: "Asia/Dubai",
    });

    await t.mutation(internal.scheduledTasks.createScheduledTask, {
      userId,
      title: "Task 2",
      description: "Description",
      schedule: { kind: "once", runAt: Date.now() + 120_000 },
      timezone: "Asia/Dubai",
    });

    await t.mutation(internal.scheduledTasks.cancelAllUserScheduledTasks, {
      userId,
    });

    const tasks = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId }
    );
    expect(tasks).toHaveLength(0);
  });

  it("does not affect other users' tasks", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createUser(t, "+971501234567");
    const userId2 = await createUser(t, "+971509876543");

    await t.mutation(internal.scheduledTasks.createScheduledTask, {
      userId: userId1,
      title: "User1 task",
      description: "Description",
      schedule: { kind: "once", runAt: Date.now() + 60_000 },
      timezone: "Asia/Dubai",
    });

    await t.mutation(internal.scheduledTasks.createScheduledTask, {
      userId: userId2,
      title: "User2 task",
      description: "Description",
      schedule: { kind: "once", runAt: Date.now() + 60_000 },
      timezone: "UTC",
    });

    await t.mutation(internal.scheduledTasks.cancelAllUserScheduledTasks, {
      userId: userId1,
    });

    const tasks1 = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId: userId1 }
    );
    expect(tasks1).toHaveLength(0);

    const tasks2 = await t.query(
      internal.scheduledTasks.listUserScheduledTasks,
      { userId: userId2 }
    );
    expect(tasks2).toHaveLength(1);
  });
});

describe("markLastRun", () => {
  it("updates lastRunAt and lastStatus", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    const taskId = await t.mutation(
      internal.scheduledTasks.createScheduledTask,
      {
        userId,
        title: "Mark me",
        description: "Description",
        schedule: { kind: "once", runAt: Date.now() + 60_000 },
        timezone: "Asia/Dubai",
      }
    );

    await t.mutation(internal.scheduledTasks.markLastRun, {
      taskId: taskId,
      lastStatus: "success",
    });

    const task = await t.query(internal.scheduledTasks.getTask, {
      taskId: taskId,
    });
    expect(task?.lastStatus).toBe("success");
    expect(task?.lastRunAt).toBeGreaterThan(0);
  });

  it("sets creditNotificationSent flag", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    const taskId = await t.mutation(
      internal.scheduledTasks.createScheduledTask,
      {
        userId,
        title: "Credit test",
        description: "Description",
        schedule: { kind: "once", runAt: Date.now() + 60_000 },
        timezone: "Asia/Dubai",
      }
    );

    await t.mutation(internal.scheduledTasks.markLastRun, {
      taskId: taskId,
      lastStatus: "skipped_no_credits",
      creditNotificationSent: true,
    });

    const task = await t.query(internal.scheduledTasks.getTask, {
      taskId: taskId,
    });
    expect(task?.creditNotificationSent).toBe(true);
  });

  it("clears creditNotificationSent flag", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    const taskId = await t.mutation(
      internal.scheduledTasks.createScheduledTask,
      {
        userId,
        title: "Credit clear test",
        description: "Description",
        schedule: { kind: "once", runAt: Date.now() + 60_000 },
        timezone: "Asia/Dubai",
      }
    );

    // Set it
    await t.mutation(internal.scheduledTasks.markLastRun, {
      taskId: taskId,
      lastStatus: "skipped_no_credits",
      creditNotificationSent: true,
    });

    // Clear it
    await t.mutation(internal.scheduledTasks.markLastRun, {
      taskId: taskId,
      lastStatus: "success",
      creditNotificationSent: false,
    });

    const task = await t.query(internal.scheduledTasks.getTask, {
      taskId: taskId,
    });
    expect(task?.creditNotificationSent).toBe(false);
  });
});

describe("resetCreditNotifications", () => {
  it("resets creditNotificationSent on all user tasks", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "+971501234567");

    const taskId1 = await t.mutation(
      internal.scheduledTasks.createScheduledTask,
      {
        userId,
        title: "Task 1",
        description: "Description",
        schedule: { kind: "once", runAt: Date.now() + 60_000 },
        timezone: "Asia/Dubai",
      }
    );

    const taskId2 = await t.mutation(
      internal.scheduledTasks.createScheduledTask,
      {
        userId,
        title: "Task 2",
        description: "Description",
        schedule: { kind: "once", runAt: Date.now() + 120_000 },
        timezone: "Asia/Dubai",
      }
    );

    // Set both as notified
    await t.mutation(internal.scheduledTasks.markLastRun, {
      taskId: taskId1,
      lastStatus: "skipped_no_credits",
      creditNotificationSent: true,
    });
    await t.mutation(internal.scheduledTasks.markLastRun, {
      taskId: taskId2,
      lastStatus: "skipped_no_credits",
      creditNotificationSent: true,
    });

    // Reset
    await t.mutation(internal.scheduledTasks.resetCreditNotifications, {
      userId,
    });

    const task1 = await t.query(internal.scheduledTasks.getTask, {
      taskId: taskId1,
    });
    const task2 = await t.query(internal.scheduledTasks.getTask, {
      taskId: taskId2,
    });
    expect(task1?.creditNotificationSent).toBe(false);
    expect(task2?.creditNotificationSent).toBe(false);
  });
});
