import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("findOrCreateUser", () => {
  it("creates a new user with correct defaults", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
      name: "Ahmad",
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user).toMatchObject({
      phone: "+971501234567",
      name: "Ahmad",
      tier: "basic",
      credits: 60,
      language: "en",
      timezone: "Asia/Dubai",
      onboardingStep: 1,
      isAdmin: false,
    });
  });

  it("returns existing user without creating duplicate", async () => {
    const t = convexTest(schema, modules);

    const id1 = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
      name: "Ahmad",
    });

    const id2 = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
      name: "Ahmad",
    });

    expect(id1).toEqual(id2);

    // Verify only one user exists
    const users = await t.run(async (ctx) => {
      return await ctx.db.query("users").collect();
    });
    expect(users).toHaveLength(1);
  });

  it("auto-detects timezone from country code", async () => {
    const t = convexTest(schema, modules);

    const uaeId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });
    const ukId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+447911123456",
    });
    const usId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+12025551234",
    });
    const frId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+33612345678",
    });

    const [uae, uk, us, fr] = await t.run(async (ctx) => {
      return await Promise.all([
        ctx.db.get(uaeId),
        ctx.db.get(ukId),
        ctx.db.get(usId),
        ctx.db.get(frId),
      ]);
    });

    expect(uae!.timezone).toBe("Asia/Dubai");
    expect(uk!.timezone).toBe("Europe/London");
    expect(us!.timezone).toBe("America/New_York");
    expect(fr!.timezone).toBe("Europe/Paris");
  });

  it("initializes 3 user files on creation", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
      name: "Ahmad",
    });

    const files = await t.query(internal.users.getUserFiles, { userId });

    expect(files).toHaveLength(3);
    expect(files.map((f) => f.filename).sort()).toEqual([
      "heartbeat",
      "memory",
      "personality",
    ]);
    expect(files.every((f) => f.content === "")).toBe(true);
  });
});

describe("getUser / getUserByPhone", () => {
  it("gets user by ID", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
      name: "Ahmad",
    });

    const user = await t.query(internal.users.getUser, { userId });
    expect(user).toMatchObject({ phone: "+971501234567", name: "Ahmad" });
  });

  it("gets user by phone", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
      name: "Ahmad",
    });

    const user = await t.query(internal.users.getUserByPhone, {
      phone: "+971501234567",
    });
    expect(user).toMatchObject({ name: "Ahmad" });
  });

  it("returns null for unknown phone", async () => {
    const t = convexTest(schema, modules);

    const user = await t.query(internal.users.getUserByPhone, {
      phone: "+999999999",
    });
    expect(user).toBeNull();
  });
});

describe("updateUser", () => {
  it("updates user fields", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.updateUser, {
      userId,
      fields: { name: "Ahmad", language: "ar", timezone: "Europe/London" },
    });

    const user = await t.query(internal.users.getUser, { userId });
    expect(user).toMatchObject({
      name: "Ahmad",
      language: "ar",
      timezone: "Europe/London",
    });
  });

  it("completes onboarding", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.updateUser, {
      userId,
      fields: { onboardingStep: null },
    });

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.onboardingStep).toBeNull();
  });
});

describe("userFile CRUD", () => {
  it("gets a specific user file", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const file = await t.query(internal.users.getUserFile, {
      userId,
      filename: "memory",
    });

    expect(file).toMatchObject({ filename: "memory", content: "" });
  });

  it("updates user file content", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.updateUserFile, {
      userId,
      filename: "memory",
      content: "Name: Ahmad\nWork: ADNOC",
    });

    const file = await t.query(internal.users.getUserFile, {
      userId,
      filename: "memory",
    });

    expect(file!.content).toBe("Name: Ahmad\nWork: ADNOC");
  });
});
