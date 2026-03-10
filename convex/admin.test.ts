import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { TEMPLATE_DEFINITIONS } from "./admin";
import { DORMANT_CUTOFF_MS } from "./migrations";

const modules = import.meta.glob("./**/*.ts");

describe("TEMPLATE_DEFINITIONS", () => {
  it("contains 9 templates", () => {
    expect(TEMPLATE_DEFINITIONS).toHaveLength(9);
  });

  it("every template has required fields", () => {
    for (const tpl of TEMPLATE_DEFINITIONS) {
      expect(tpl.name).toMatch(/^ghali_/);
      expect(tpl.description).toBeTruthy();
      expect(tpl.variables.length).toBeGreaterThan(0);
      expect(tpl.preview).toBeTruthy();
    }
  });

  it("template variable count matches preview placeholders", () => {
    for (const tpl of TEMPLATE_DEFINITIONS) {
      const placeholders = tpl.preview.match(/\{\{\d+\}\}/g) ?? [];
      expect(placeholders.length).toBe(tpl.variables.length);
    }
  });

  it("all template names are unique", () => {
    const names = TEMPLATE_DEFINITIONS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

// ============================================================================
// getBroadcastCounts — dormant exclusion
// ============================================================================

describe("getBroadcastCounts", () => {
  async function insertUser(
    t: ReturnType<typeof convexTest>,
    phone: string,
    opts: { dormant?: boolean; lastMessageAt?: number } = {}
  ) {
    return t.run(async (ctx) => {
      return ctx.db.insert("users", {
        phone,
        language: "en",
        timezone: "Asia/Dubai",
        tier: "basic",
        isAdmin: false,
        credits: 60,
        creditsResetAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        onboardingStep: null,
        createdAt: opts.dormant ? DORMANT_CUTOFF_MS - 1 : DORMANT_CUTOFF_MS + 1,
        dormant: opts.dormant,
        lastMessageAt: opts.lastMessageAt,
      });
    });
  }

  it("excludes dormant users from total and active counts", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    await insertUser(t, "+971501220001", { dormant: true, lastMessageAt: now - 1000 });
    await insertUser(t, "+971501220002", { dormant: false, lastMessageAt: now - 1000 });
    await insertUser(t, "+971501220003"); // no lastMessageAt, not dormant

    const counts = await t.query(internal.admin.getBroadcastCounts, {});

    expect(counts.totalUsers).toBe(2); // dormant user excluded
    expect(counts.activeUsers).toBe(1); // only the active non-dormant user
  });

  it("returns zero counts when all users are dormant", async () => {
    const t = convexTest(schema, modules);

    await insertUser(t, "+971501230001", { dormant: true });
    await insertUser(t, "+971501230002", { dormant: true });

    const counts = await t.query(internal.admin.getBroadcastCounts, {});
    expect(counts.totalUsers).toBe(0);
    expect(counts.activeUsers).toBe(0);
  });
});
