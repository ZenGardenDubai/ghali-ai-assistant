import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { CREDITS_PRO } from "./constants";

const modules = import.meta.glob("./**/*.ts");

describe("linkClerkUser", () => {
  it("links clerkUserId to user found by phone", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.billing.linkClerkUser, {
      clerkUserId: "user_clerk123",
      phone: "+971501234567",
    });

    const user = await t.query(api.users.getUser, { userId });
    expect(user!.clerkUserId).toBe("user_clerk123");
  });

  it("skips if clerkUserId already linked to another user", async () => {
    const t = convexTest(schema, modules);

    // Create two users
    const userId1 = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501111111",
    });
    await t.mutation(api.users.findOrCreateUser, {
      phone: "+971502222222",
    });

    // Link clerkUserId to first user
    await t.mutation(internal.billing.linkClerkUser, {
      clerkUserId: "user_clerk_dup",
      phone: "+971501111111",
    });

    // Try linking same clerkUserId to second user — should be skipped
    await t.mutation(internal.billing.linkClerkUser, {
      clerkUserId: "user_clerk_dup",
      phone: "+971502222222",
    });

    // First user still has the link
    const user1 = await t.query(api.users.getUser, { userId: userId1 });
    expect(user1!.clerkUserId).toBe("user_clerk_dup");
  });

  it("no-op when phone not found", async () => {
    const t = convexTest(schema, modules);

    // Should not throw
    await t.mutation(internal.billing.linkClerkUser, {
      clerkUserId: "user_clerk456",
      phone: "+971509999999",
    });
  });
});

describe("handleSubscriptionActive", () => {
  it("upgrades tier to pro and sets 600 credits", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Link clerk user first
    await t.mutation(internal.billing.linkClerkUser, {
      clerkUserId: "user_clerk123",
      phone: "+971501234567",
    });

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

    await t.mutation(internal.billing.linkClerkUser, {
      clerkUserId: "user_clerk123",
      phone: "+971501234567",
    });

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

    await t.mutation(internal.billing.linkClerkUser, {
      clerkUserId: "user_clerk123",
      phone: "+971501234567",
    });

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

    await t.mutation(internal.billing.linkClerkUser, {
      clerkUserId: "user_clerk123",
      phone: "+971501234567",
    });

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

  it("no-op when clerkUserId not found", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.billing.handleSubscriptionEnded, {
      clerkUserId: "user_nonexistent",
    });
  });
});
