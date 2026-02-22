import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { CREDITS_PRO } from "./constants";

const modules = import.meta.glob("./**/*.ts");

/**
 * Helper: link a clerkUserId to a user via phone number.
 */
async function linkByPhone(
  t: ReturnType<typeof convexTest>,
  phone: string,
  clerkUserId: string
) {
  const result = await t.mutation(api.billing.linkClerkUserByPhone, {
    phone,
    clerkUserId,
  });
  expect(result.success).toBe(true);
}

// ============================================================================
// linkClerkUserByPhone
// ============================================================================

describe("linkClerkUserByPhone", () => {
  it("links clerkUserId to user by phone", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const result = await t.mutation(api.billing.linkClerkUserByPhone, {
      phone: "+971501234567",
      clerkUserId: "user_clerk123",
    });

    expect(result.success).toBe(true);

    const user = await t.query(api.users.getUser, { userId });
    expect(user!.clerkUserId).toBe("user_clerk123");
  });

  it("returns error when phone not found", async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(api.billing.linkClerkUserByPhone, {
      phone: "+971509999999",
      clerkUserId: "user_clerk123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No account found");
  });

  it("is idempotent when same clerkUserId re-links", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Link once
    await t.mutation(api.billing.linkClerkUserByPhone, {
      phone: "+971501234567",
      clerkUserId: "user_clerk123",
    });

    // Link again — same clerkUserId
    const result = await t.mutation(api.billing.linkClerkUserByPhone, {
      phone: "+971501234567",
      clerkUserId: "user_clerk123",
    });

    expect(result.success).toBe(true);
  });

  it("re-links phone to new clerkUserId (user verified via OTP)", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Link to first clerkUserId
    await t.mutation(api.billing.linkClerkUserByPhone, {
      phone: "+971501234567",
      clerkUserId: "user_clerk123",
    });

    // Re-link same phone to different clerkUserId (new Clerk account)
    const result = await t.mutation(api.billing.linkClerkUserByPhone, {
      phone: "+971501234567",
      clerkUserId: "user_clerk456",
    });

    expect(result.success).toBe(true);

    // User should now be linked to the new clerkUserId
    const user = await t.query(api.users.getUser, { userId });
    expect(user!.clerkUserId).toBe("user_clerk456");
  });

  it("rejects when clerkUserId is already linked to a different user", async () => {
    const t = convexTest(schema, modules);

    // Create two users
    await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501111111",
    });
    await t.mutation(api.users.findOrCreateUser, {
      phone: "+971502222222",
    });

    // Link clerkUserId to user1
    await linkByPhone(t, "+971501111111", "user_clerk_shared");

    // Try to link same clerkUserId to user2
    const result = await t.mutation(api.billing.linkClerkUserByPhone, {
      phone: "+971502222222",
      clerkUserId: "user_clerk_shared",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already linked");
  });
});

// ============================================================================
// Subscription Handlers
// ============================================================================

describe("handleSubscriptionActive", () => {
  it("upgrades tier to pro and sets 600 credits", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await linkByPhone(t, "+971501234567", "user_clerk123");

    const userId = (await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", "+971501234567"))
        .unique();
    }))!._id;

    await t.mutation(internal.billing.handleSubscriptionActive, {
      clerkUserId: "user_clerk123",
    });

    const user = await t.query(api.users.getUser, { userId });
    expect(user!.tier).toBe("pro");
    expect(user!.credits).toBe(CREDITS_PRO);
  });

  it("clears subscriptionCanceling flag on reactivation", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await linkByPhone(t, "+971501234567", "user_clerk123");

    // Simulate cancel then reactivate
    await t.mutation(internal.billing.handleSubscriptionCanceled, {
      clerkUserId: "user_clerk123",
    });
    await t.mutation(internal.billing.handleSubscriptionActive, {
      clerkUserId: "user_clerk123",
    });

    const user = await t.query(api.users.getUser, { userId });
    expect(user!.tier).toBe("pro");
    expect(user!.subscriptionCanceling).toBeUndefined();
  });

  it("no-op when clerkUserId not found", async () => {
    const t = convexTest(schema, modules);

    // Should not throw
    await t.mutation(internal.billing.handleSubscriptionActive, {
      clerkUserId: "user_nonexistent",
    });
  });
});

describe("handleSubscriptionCanceled", () => {
  it("sets subscriptionCanceling true but keeps tier pro", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await linkByPhone(t, "+971501234567", "user_clerk123");

    await t.mutation(internal.billing.handleSubscriptionActive, {
      clerkUserId: "user_clerk123",
    });

    await t.mutation(internal.billing.handleSubscriptionCanceled, {
      clerkUserId: "user_clerk123",
    });

    const user = await t.query(api.users.getUser, { userId });
    expect(user!.tier).toBe("pro");
    expect(user!.credits).toBe(CREDITS_PRO);
    expect(user!.subscriptionCanceling).toBe(true);
  });

  it("no-op when clerkUserId not found", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.billing.handleSubscriptionCanceled, {
      clerkUserId: "user_nonexistent",
    });
  });
});

describe("handleSubscriptionEnded", () => {
  it("downgrades tier to basic and clears subscriptionCanceling", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await linkByPhone(t, "+971501234567", "user_clerk123");

    // Activate, cancel, then end
    await t.mutation(internal.billing.handleSubscriptionActive, {
      clerkUserId: "user_clerk123",
    });
    await t.mutation(internal.billing.handleSubscriptionCanceled, {
      clerkUserId: "user_clerk123",
    });
    await t.mutation(internal.billing.handleSubscriptionEnded, {
      clerkUserId: "user_clerk123",
    });

    const user = await t.query(api.users.getUser, { userId });
    expect(user!.tier).toBe("basic");
    expect(user!.subscriptionCanceling).toBeUndefined();
    // Credits remain as-is — next monthly reset will give basic amount
    expect(user!.credits).toBe(CREDITS_PRO);
  });

  it("skips downgrade when user is not in canceling state (stale ended event)", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await linkByPhone(t, "+971501234567", "user_clerk123");

    // Activate (no cancel step) then ended arrives (stale event from old subscription)
    await t.mutation(internal.billing.handleSubscriptionActive, {
      clerkUserId: "user_clerk123",
    });
    await t.mutation(internal.billing.handleSubscriptionEnded, {
      clerkUserId: "user_clerk123",
    });

    // Should still be pro — stale ended event was ignored
    const user = await t.query(api.users.getUser, { userId });
    expect(user!.tier).toBe("pro");
    expect(user!.credits).toBe(CREDITS_PRO);
  });

  it("no-op when clerkUserId not found", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.billing.handleSubscriptionEnded, {
      clerkUserId: "user_nonexistent",
    });
  });
});
