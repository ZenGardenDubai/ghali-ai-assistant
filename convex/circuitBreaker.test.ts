import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { ERROR_CIRCUIT_BREAKER_THRESHOLD, ERROR_BACKOFF_MS } from "./constants";

const modules = import.meta.glob("./**/*.ts");

describe("recordApiError", () => {
  it("increments consecutiveErrors on each call", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const r1 = await t.mutation(internal.users.recordApiError, { userId });
    expect(r1.consecutiveErrors).toBe(1);
    expect(r1.tripped).toBe(false);

    const r2 = await t.mutation(internal.users.recordApiError, { userId });
    expect(r2.consecutiveErrors).toBe(2);
    expect(r2.tripped).toBe(false);
  });

  it("trips circuit breaker at threshold and sets errorBackoffUntil", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const before = Date.now();

    for (let i = 1; i < ERROR_CIRCUIT_BREAKER_THRESHOLD; i++) {
      const r = await t.mutation(internal.users.recordApiError, { userId });
      expect(r.tripped).toBe(false);
    }

    const trippingResult = await t.mutation(internal.users.recordApiError, { userId });
    expect(trippingResult.consecutiveErrors).toBe(ERROR_CIRCUIT_BREAKER_THRESHOLD);
    expect(trippingResult.tripped).toBe(true);

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.errorBackoffUntil).toBeDefined();
    expect(user!.errorBackoffUntil!).toBeGreaterThanOrEqual(before + ERROR_BACKOFF_MS - 100);
  });

  it("does not overwrite errorBackoffUntil on errors beyond threshold", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Trip the circuit breaker
    for (let i = 0; i < ERROR_CIRCUIT_BREAKER_THRESHOLD; i++) {
      await t.mutation(internal.users.recordApiError, { userId });
    }

    const userAfterTrip = await t.query(internal.users.getUser, { userId });
    const backoffUntil = userAfterTrip!.errorBackoffUntil!;

    // Additional errors should not change errorBackoffUntil
    await t.mutation(internal.users.recordApiError, { userId });
    const userAfterExtra = await t.query(internal.users.getUser, { userId });
    expect(userAfterExtra!.errorBackoffUntil).toBe(backoffUntil);
  });
});

describe("resetApiErrors", () => {
  it("clears consecutiveErrors and errorBackoffUntil", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Trip circuit breaker
    for (let i = 0; i < ERROR_CIRCUIT_BREAKER_THRESHOLD; i++) {
      await t.mutation(internal.users.recordApiError, { userId });
    }

    let user = await t.query(internal.users.getUser, { userId });
    expect(user!.consecutiveErrors).toBe(ERROR_CIRCUIT_BREAKER_THRESHOLD);
    expect(user!.errorBackoffUntil).toBeDefined();

    await t.mutation(internal.users.resetApiErrors, { userId });

    user = await t.query(internal.users.getUser, { userId });
    expect(user!.consecutiveErrors).toBe(0);
    expect(user!.errorBackoffUntil).toBeUndefined();
  });

  it("is idempotent on a user with no errors", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.resetApiErrors, { userId });

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.consecutiveErrors).toBe(0);
    expect(user!.errorBackoffUntil).toBeUndefined();
  });
});
