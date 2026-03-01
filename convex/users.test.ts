import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
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
        ctx.db.get(uaeId) as Promise<Doc<"users"> | null>,
        ctx.db.get(ukId) as Promise<Doc<"users"> | null>,
        ctx.db.get(usId) as Promise<Doc<"users"> | null>,
        ctx.db.get(frId) as Promise<Doc<"users"> | null>,
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
    expect(files.map((f: { filename: string }) => f.filename).sort()).toEqual([
      "heartbeat",
      "memory",
      "personality",
    ]);
    expect(files.every((f: { content: string }) => f.content === "")).toBe(true);
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

describe("internalAppendMemory", () => {
  it("appends to empty memory file creating section", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const result = await t.mutation(internal.users.internalAppendMemory, {
      userId,
      category: "personal",
      content: "- Name: Ahmad",
    });

    expect(result.compactionScheduled).toBe(false);

    const file = await t.query(internal.users.getUserFile, {
      userId,
      filename: "memory",
    });

    expect(file!.content).toContain("## Personal");
    expect(file!.content).toContain("- Name: Ahmad");
  });

  it("appends to existing section", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // First append
    await t.mutation(internal.users.internalAppendMemory, {
      userId,
      category: "personal",
      content: "- Name: Ahmad",
    });

    // Second append
    await t.mutation(internal.users.internalAppendMemory, {
      userId,
      category: "personal",
      content: "- Age: 30",
    });

    const file = await t.query(internal.users.getUserFile, {
      userId,
      filename: "memory",
    });

    expect(file!.content).toContain("- Name: Ahmad");
    expect(file!.content).toContain("- Age: 30");
  });

  it("rejects content over 50KB", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const hugeContent = "a".repeat(60_000);

    await expect(
      t.mutation(internal.users.internalAppendMemory, {
        userId,
        category: "general",
        content: hugeContent,
      })
    ).rejects.toThrow("50KB");
  });
});

describe("internalEditMemory", () => {
  it("replaces existing text", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.internalAppendMemory, {
      userId,
      category: "personal",
      content: "- Name: Ahmad",
    });

    const result = await t.mutation(internal.users.internalEditMemory, {
      userId,
      search: "- Name: Ahmad",
      replacement: "- Name: Ahmed",
    });

    expect(result.found).toBe(true);

    const file = await t.query(internal.users.getUserFile, {
      userId,
      filename: "memory",
    });
    expect(file!.content).toContain("- Name: Ahmed");
    expect(file!.content).not.toContain("- Name: Ahmad");
  });

  it("returns found=false for missing search text", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const result = await t.mutation(internal.users.internalEditMemory, {
      userId,
      search: "nonexistent",
      replacement: "something",
    });

    expect(result.found).toBe(false);
  });
});

describe("saveMemorySnapshot", () => {
  it("creates a snapshot", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.saveMemorySnapshot, {
      userId,
      content: "## Personal\n- Name: Ahmad",
    });

    const snapshots = await t.run(async (ctx) => {
      return await ctx.db
        .query("memorySnapshots")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.content).toBe("## Personal\n- Name: Ahmad");
  });

  it("overwrites previous snapshot (keeps only 1)", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.saveMemorySnapshot, {
      userId,
      content: "old content",
    });

    await t.mutation(internal.users.saveMemorySnapshot, {
      userId,
      content: "new content",
    });

    const snapshots = await t.run(async (ctx) => {
      return await ctx.db
        .query("memorySnapshots")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.content).toBe("new content");
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
