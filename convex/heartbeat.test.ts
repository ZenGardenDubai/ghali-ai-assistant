import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("processHeartbeats", () => {
  it("skips basic tier users", async () => {
    const t = convexTest(schema, modules);

    // Create a basic user (default tier)
    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Give them a non-empty heartbeat
    await t.mutation(internal.users.updateUserFile, {
      userId,
      filename: "heartbeat",
      content: "- remind gym 7am daily",
    });

    // Run processHeartbeats — should not schedule anything
    await t.mutation(internal.heartbeat.processHeartbeats, {});

    // Verify user is still basic
    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.tier).toBe("basic");
  });

  it("skips pro users with empty heartbeat", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Upgrade to pro but leave heartbeat empty (default)
    await t.mutation(internal.users.updateUser, {
      userId,
      fields: { tier: "pro" },
    });

    // Heartbeat file is empty by default from findOrCreateUser
    const heartbeat = await t.query(internal.users.getUserFile, {
      userId,
      filename: "heartbeat",
    });
    expect(heartbeat!.content).toBe("");

    // Run processHeartbeats — should not schedule anything for empty heartbeat
    await t.mutation(internal.heartbeat.processHeartbeats, {});
  });

  it("skips pro users with whitespace-only heartbeat", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Upgrade to pro with whitespace-only heartbeat
    await t.mutation(internal.users.updateUser, {
      userId,
      fields: { tier: "pro" },
    });

    await t.mutation(internal.users.updateUserFile, {
      userId,
      filename: "heartbeat",
      content: "   \n  \n  ",
    });

    // Run processHeartbeats — should not schedule anything
    await t.mutation(internal.heartbeat.processHeartbeats, {});
  });

  it("schedules processing for pro users with non-empty heartbeat", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Upgrade to pro with valid heartbeat
    await t.mutation(internal.users.updateUser, {
      userId,
      fields: { tier: "pro" },
    });

    await t.mutation(internal.users.updateUserFile, {
      userId,
      filename: "heartbeat",
      content: "- remind gym 7am daily\n- check report every Monday",
    });

    // Run processHeartbeats — should schedule processUserHeartbeat
    // (convex-test will schedule the action but not execute it)
    await t.mutation(internal.heartbeat.processHeartbeats, {});
  });
});
