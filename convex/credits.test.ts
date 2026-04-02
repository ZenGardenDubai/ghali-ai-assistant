import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("checkCredit", () => {
  it("returns available when user has credits", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const result = await t.query(internal.credits.checkCredit, {
      userId,
      message: "What is AI?",
    });

    expect(result.status).toBe("available");
    expect(result.credits).toBe(60);

    // Credits are NOT deducted — still 60
    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.credits).toBe(60);
  });

  it("returns exhausted when credits = 0", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.updateUser, {
      userId,
      fields: { credits: 0 },
    });

    const result = await t.query(internal.credits.checkCredit, {
      userId,
      message: "Hello",
    });

    expect(result.status).toBe("exhausted");
    expect(result.credits).toBe(0);
  });

  it("system commands are free", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const commands = ["credits", "help", "privacy", "upgrade"];
    for (const cmd of commands) {
      const result = await t.query(internal.credits.checkCredit, {
        userId,
        message: cmd,
      });
      expect(result.status).toBe("free");
    }

    // Credits unchanged
    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.credits).toBe(60);
  });

  it("system commands are case-insensitive", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const result = await t.query(internal.credits.checkCredit, {
      userId,
      message: "CREDITS",
    });

    expect(result.status).toBe("free");
  });
});

describe("checkAndDeductCredit", () => {
  it("atomically deducts 1 credit and returns available", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const result = await t.mutation(internal.credits.checkAndDeductCredit, {
      userId,
      message: "What is AI?",
    });

    expect(result.status).toBe("available");
    expect(result.credits).toBe(59);

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.credits).toBe(59);
  });

  it("returns exhausted and does not deduct when credits = 0", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.updateUser, {
      userId,
      fields: { credits: 0 },
    });

    const result = await t.mutation(internal.credits.checkAndDeductCredit, {
      userId,
      message: "Hello",
    });

    expect(result.status).toBe("exhausted");
    expect(result.credits).toBe(0);

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.credits).toBe(0);
  });

  it("system commands return free and do not deduct", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const result = await t.mutation(internal.credits.checkAndDeductCredit, {
      userId,
      message: "credits",
    });

    expect(result.status).toBe("free");

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.credits).toBe(60);
  });

  it("prevents race condition: second call on 1-credit balance returns exhausted", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.updateUser, {
      userId,
      fields: { credits: 1 },
    });

    const first = await t.mutation(internal.credits.checkAndDeductCredit, {
      userId,
      message: "Hello",
    });
    expect(first.status).toBe("available");
    expect(first.credits).toBe(0);

    const second = await t.mutation(internal.credits.checkAndDeductCredit, {
      userId,
      message: "Hello again",
    });
    expect(second.status).toBe("exhausted");
    expect(second.credits).toBe(0);

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.credits).toBe(0);
  });
});

describe("refundCredit", () => {
  it("adds 1 credit back after deduction", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.credits.checkAndDeductCredit, {
      userId,
      message: "Hello",
    });

    const result = await t.mutation(internal.credits.refundCredit, { userId });

    expect(result.credits).toBe(60);

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.credits).toBe(60);
  });

  it("does not exceed the tier cap when refunding", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Already at cap
    const result = await t.mutation(internal.credits.refundCredit, { userId });

    expect(result.credits).toBe(60);

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.credits).toBe(60);
  });
});

describe("deductCredit", () => {
  it("deducts 1 credit from user", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const result = await t.mutation(internal.credits.deductCredit, {
      userId,
    });

    expect(result.credits).toBe(59);

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.credits).toBe(59);
  });

  it("does not go below 0", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.updateUser, {
      userId,
      fields: { credits: 0 },
    });

    const result = await t.mutation(internal.credits.deductCredit, {
      userId,
    });

    expect(result.credits).toBe(0);
  });
});

describe("resetCredits", () => {
  it("resets credits for users past their reset date", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.updateUser, {
      userId,
      fields: {
        credits: 5,
        creditsResetAt: Date.now() - 1000,
      },
    });

    await t.mutation(internal.credits.resetCredits, {});

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.credits).toBe(60);
  });

  it("resets pro users to 600 credits", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.updateUser, {
      userId,
      fields: {
        tier: "pro",
        credits: 100,
        creditsResetAt: Date.now() - 1000,
      },
    });

    await t.mutation(internal.credits.resetCredits, {});

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.credits).toBe(600);
  });

  it("does not reset users whose date is in the future", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.updateUser, {
      userId,
      fields: { credits: 30 },
    });

    await t.mutation(internal.credits.resetCredits, {});

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.credits).toBe(30);
  });
});
