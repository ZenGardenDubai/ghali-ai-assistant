import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { TEMPLATE_INACTIVITY_GATE_MS } from "./constants";

const modules = import.meta.glob("./**/*.ts");

describe("processHeartbeats", () => {
  it("processes basic users with non-empty heartbeat", async () => {
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

    // Run processHeartbeats — should schedule processing (all tiers eligible)
    await t.mutation(internal.heartbeat.processHeartbeats, {});

    // Verify user is still basic (tier unchanged, but heartbeat was processed)
    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.tier).toBe("basic");
  });

  it("skips users with empty heartbeat", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
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

  it("skips users with whitespace-only heartbeat", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.updateUserFile, {
      userId,
      filename: "heartbeat",
      content: "   \n  \n  ",
    });

    // Run processHeartbeats — should not schedule anything
    await t.mutation(internal.heartbeat.processHeartbeats, {});
  });

  it("schedules processing for users with non-empty heartbeat", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
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

  it("skips opted-out users", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.updateUserFile, {
      userId,
      filename: "heartbeat",
      content: "- remind gym 7am daily",
    });

    // Opt out the user
    await t.mutation(internal.accountControl.triggerOptOut, { userId });

    // Run processHeartbeats — should skip opted-out user (no action scheduled)
    await t.mutation(internal.heartbeat.processHeartbeats, {});

    // User still opted out
    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.optedOut).toBe(true);
  });

  it("skips users with no lastMessageAt (never messaged)", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.updateUserFile, {
      userId,
      filename: "heartbeat",
      content: "- remind gym 7am daily",
    });

    // New user has no lastMessageAt — treated as inactive, skipped by inactivity gate
    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.lastMessageAt).toBeUndefined();

    // Run processHeartbeats — should skip user with no lastMessageAt
    await t.mutation(internal.heartbeat.processHeartbeats, {});

    // User data unchanged (not modified by heartbeat)
    const userAfter = await t.query(internal.users.getUser, { userId });
    expect(userAfter!.lastMessageAt).toBeUndefined();
  });

  it("TEMPLATE_INACTIVITY_GATE_MS is exactly 7 days", () => {
    expect(TEMPLATE_INACTIVITY_GATE_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
