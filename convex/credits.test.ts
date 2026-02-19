import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("deductCredit", () => {
  it("deducts 1 credit for normal messages", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // User starts with 60 credits
    const result = await t.mutation(internal.credits.deductCredit, {
      userId,
      message: "What is AI?",
    });

    expect(result.status).toBe("ok");
    expect(result.credits).toBe(59);
  });

  it("returns exhausted when credits = 0", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Set credits to 0
    await t.mutation(api.users.updateUser, {
      userId,
      fields: { credits: 0 },
    });

    const result = await t.mutation(internal.credits.deductCredit, {
      userId,
      message: "Hello",
    });

    expect(result.status).toBe("exhausted");
    expect(result.credits).toBe(0);
  });

  it("system commands are free", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const commands = ["credits", "help", "privacy", "upgrade"];
    for (const cmd of commands) {
      const result = await t.mutation(internal.credits.deductCredit, {
        userId,
        message: cmd,
      });
      expect(result.status).toBe("free");
    }

    // Credits should still be 60 (none deducted)
    const user = await t.query(api.users.getUser, { userId });
    expect(user!.credits).toBe(60);
  });

  it("system commands are case-insensitive", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const result = await t.mutation(internal.credits.deductCredit, {
      userId,
      message: "CREDITS",
    });

    expect(result.status).toBe("free");
  });
});

describe("resetCredits", () => {
  it("resets credits for users past their reset date", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Set credits to 5, reset date in the past
    await t.mutation(api.users.updateUser, {
      userId,
      fields: {
        credits: 5,
        creditsResetAt: Date.now() - 1000,
      },
    });

    await t.mutation(internal.credits.resetCredits, {});

    const user = await t.query(api.users.getUser, { userId });
    expect(user!.credits).toBe(60); // basic tier = 60
  });

  it("resets pro users to 600 credits", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(api.users.updateUser, {
      userId,
      fields: {
        tier: "pro",
        credits: 100,
        creditsResetAt: Date.now() - 1000,
      },
    });

    await t.mutation(internal.credits.resetCredits, {});

    const user = await t.query(api.users.getUser, { userId });
    expect(user!.credits).toBe(600);
  });

  it("does not reset users whose date is in the future", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Credits reset is in the future (default from findOrCreateUser)
    await t.mutation(api.users.updateUser, {
      userId,
      fields: { credits: 30 },
    });

    await t.mutation(internal.credits.resetCredits, {});

    const user = await t.query(api.users.getUser, { userId });
    expect(user!.credits).toBe(30); // unchanged
  });
});
