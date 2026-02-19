import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { MODELS } from "./models";

const modules = import.meta.glob("./**/*.ts");

describe("schema", () => {
  it("creates a user with all required fields", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        phone: "+971501234567",
        name: "Ahmad",
        language: "en",
        timezone: "Asia/Dubai",
        tier: "basic",
        isAdmin: false,
        credits: 60,
        creditsResetAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        onboardingStep: 1,
        createdAt: Date.now(),
      });
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user).toMatchObject({
      phone: "+971501234567",
      name: "Ahmad",
      tier: "basic",
      credits: 60,
      onboardingStep: 1,
    });
  });

  it("creates a user without optional fields", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        phone: "+971501234567",
        language: "en",
        timezone: "Asia/Dubai",
        tier: "basic",
        isAdmin: false,
        credits: 60,
        creditsResetAt: Date.now(),
        onboardingStep: null,
        createdAt: Date.now(),
      });
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user).not.toBeNull();
    expect(user!.name).toBeUndefined();
    expect(user!.onboardingStep).toBeNull();
  });

  it("creates userFiles for a user", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        phone: "+971501234567",
        language: "en",
        timezone: "Asia/Dubai",
        tier: "basic",
        isAdmin: false,
        credits: 60,
        creditsResetAt: Date.now(),
        onboardingStep: null,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("userFiles", {
        userId,
        filename: "memory",
        content: "",
        updatedAt: now,
      });
      await ctx.db.insert("userFiles", {
        userId,
        filename: "personality",
        content: "",
        updatedAt: now,
      });
      await ctx.db.insert("userFiles", {
        userId,
        filename: "heartbeat",
        content: "",
        updatedAt: now,
      });
    });

    const files = await t.run(async (ctx) => {
      return await ctx.db
        .query("userFiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    });

    expect(files).toHaveLength(3);
    expect(files.map((f) => f.filename).sort()).toEqual([
      "heartbeat",
      "memory",
      "personality",
    ]);
  });

  it("creates usage records", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        phone: "+971501234567",
        language: "en",
        timezone: "Asia/Dubai",
        tier: "basic",
        isAdmin: false,
        credits: 60,
        creditsResetAt: Date.now(),
        onboardingStep: null,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("usage", {
        userId,
        model: MODELS.FLASH,
        tokensIn: 100,
        tokensOut: 50,
        cost: 0.001,
        timestamp: Date.now(),
      });
    });

    const records = await t.run(async (ctx) => {
      return await ctx.db
        .query("usage")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      model: MODELS.FLASH,
      tokensIn: 100,
      tokensOut: 50,
    });
  });

  it("creates scheduledJobs", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        phone: "+971501234567",
        language: "en",
        timezone: "Asia/Dubai",
        tier: "basic",
        isAdmin: false,
        credits: 60,
        creditsResetAt: Date.now(),
        onboardingStep: null,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("scheduledJobs", {
        userId,
        kind: "reminder",
        payload: JSON.stringify({ message: "Take medicine" }),
        runAt: Date.now() + 3600000,
        status: "pending",
      });
    });

    const jobs = await t.run(async (ctx) => {
      return await ctx.db
        .query("scheduledJobs")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      kind: "reminder",
      status: "pending",
    });
  });

  it("queries userFiles by userId and filename index", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        phone: "+971501234567",
        language: "en",
        timezone: "Asia/Dubai",
        tier: "basic",
        isAdmin: false,
        credits: 60,
        creditsResetAt: Date.now(),
        onboardingStep: null,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("userFiles", {
        userId,
        filename: "memory",
        content: "Name: Ahmad",
        updatedAt: Date.now(),
      });
    });

    const file = await t.run(async (ctx) => {
      return await ctx.db
        .query("userFiles")
        .withIndex("by_userId_filename", (q) =>
          q.eq("userId", userId).eq("filename", "memory")
        )
        .unique();
    });

    expect(file).toMatchObject({
      filename: "memory",
      content: "Name: Ahmad",
    });
  });
});
