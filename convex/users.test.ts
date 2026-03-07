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

  it("initializes 4 user files on creation", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
      name: "Ahmad",
    });

    const files = await t.query(internal.users.getUserFiles, { userId });

    expect(files).toHaveLength(4);
    expect(files.map((f: { filename: string }) => f.filename).sort()).toEqual([
      "heartbeat",
      "memory",
      "personality",
      "profile",
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
      category: "preferences",
      content: "- Likes coffee in the morning",
    });

    expect(result.compactionScheduled).toBe(false);

    const file = await t.query(internal.users.getUserFile, {
      userId,
      filename: "memory",
    });

    expect(file!.content).toContain("## Preferences");
    expect(file!.content).toContain("- Likes coffee in the morning");
  });

  it("appends to existing section", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // First append
    await t.mutation(internal.users.internalAppendMemory, {
      userId,
      category: "preferences",
      content: "- Likes coffee",
    });

    // Second append
    await t.mutation(internal.users.internalAppendMemory, {
      userId,
      category: "preferences",
      content: "- Prefers mornings",
    });

    const file = await t.query(internal.users.getUserFile, {
      userId,
      filename: "memory",
    });

    expect(file!.content).toContain("- Likes coffee");
    expect(file!.content).toContain("- Prefers mornings");
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
      category: "general",
      content: "- Prefers detailed explanations",
    });

    const result = await t.mutation(internal.users.internalEditMemory, {
      userId,
      search: "- Prefers detailed explanations",
      replacement: "- Prefers brief responses",
    });

    expect(result.found).toBe(true);

    const file = await t.query(internal.users.getUserFile, {
      userId,
      filename: "memory",
    });
    expect(file!.content).toContain("- Prefers brief responses");
    expect(file!.content).not.toContain("- Prefers detailed explanations");
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

describe("internalUpdateProfileSection", () => {
  it("creates a profile section on empty profile", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.internalUpdateProfileSection, {
      userId,
      category: "personal",
      content: "- Name: Hesham\n- Birthday: March 15",
    });

    const file = await t.query(internal.users.getUserFile, {
      userId,
      filename: "profile",
    });

    expect(file!.content).toContain("## Personal");
    expect(file!.content).toContain("- Name: Hesham");
    expect(file!.content).toContain("- Birthday: March 15");
  });

  it("replaces entire section content", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.internalUpdateProfileSection, {
      userId,
      category: "personal",
      content: "- Name: Hesham",
    });

    await t.mutation(internal.users.internalUpdateProfileSection, {
      userId,
      category: "personal",
      content: "- Name: Ahmed\n- Nationality: Emirati",
    });

    const file = await t.query(internal.users.getUserFile, {
      userId,
      filename: "profile",
    });

    expect(file!.content).toContain("- Name: Ahmed");
    expect(file!.content).toContain("- Nationality: Emirati");
    expect(file!.content).not.toContain("Hesham");
  });

  it("creates profile file for existing user without one", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.run(async (ctx) => {
      const profile = await ctx.db
        .query("userFiles")
        .withIndex("by_userId_filename", (q) =>
          q.eq("userId", userId).eq("filename", "profile")
        )
        .unique();
      if (profile) await ctx.db.delete(profile._id);
    });

    await t.mutation(internal.users.internalUpdateProfileSection, {
      userId,
      category: "professional",
      content: "- Title: Director\n- Company: Hub71",
    });

    const file = await t.query(internal.users.getUserFile, {
      userId,
      filename: "profile",
    });

    expect(file).not.toBeNull();
    expect(file!.content).toContain("## Professional");
    expect(file!.content).toContain("- Title: Director");
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

describe("recordApiError / resetApiErrors", () => {
  it("increments consecutive error counter", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const result1 = await t.mutation(internal.users.recordApiError, { userId });
    expect(result1.consecutiveErrors).toBe(1);
    expect(result1.tripped).toBe(false);

    const result2 = await t.mutation(internal.users.recordApiError, { userId });
    expect(result2.consecutiveErrors).toBe(2);
    expect(result2.tripped).toBe(false);

    const result3 = await t.mutation(internal.users.recordApiError, { userId });
    expect(result3.consecutiveErrors).toBe(3);
    expect(result3.tripped).toBe(true); // Circuit breaker trips at threshold
  });

  it("sets errorBackoffUntil when circuit breaker trips", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Trip the circuit breaker
    await t.mutation(internal.users.recordApiError, { userId });
    await t.mutation(internal.users.recordApiError, { userId });
    const result = await t.mutation(internal.users.recordApiError, { userId });

    expect(result.tripped).toBe(true);

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.errorBackoffUntil).toBeDefined();
    expect(user!.errorBackoffUntil).toBeGreaterThan(Date.now());
  });

  it("resets error counter and backoff on success", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Record some errors
    await t.mutation(internal.users.recordApiError, { userId });
    await t.mutation(internal.users.recordApiError, { userId });

    // Reset
    await t.mutation(internal.users.resetApiErrors, { userId });

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.consecutiveErrors).toBe(0);
    expect(user!.errorBackoffUntil).toBeUndefined();
  });

  it("does not re-set backoff if already active", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Trip circuit breaker
    await t.mutation(internal.users.recordApiError, { userId });
    await t.mutation(internal.users.recordApiError, { userId });
    const firstTrip = await t.mutation(internal.users.recordApiError, { userId });

    const user1 = await t.query(internal.users.getUser, { userId });
    const firstBackoff = user1!.errorBackoffUntil;

    // Record another error while backoff is active
    const secondError = await t.mutation(internal.users.recordApiError, { userId });

    const user2 = await t.query(internal.users.getUser, { userId });

    expect(firstTrip.tripped).toBe(true);
    expect(secondError.tripped).toBe(false); // Already tripped, don't re-trip
    expect(user2!.errorBackoffUntil).toBe(firstBackoff); // Backoff unchanged
  });
});

describe("setPendingAction / clearPendingAction", () => {
  it("sets pending action with timestamp", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const before = Date.now();
    await t.mutation(internal.users.setPendingAction, {
      userId,
      action: "clear_memory",
    });
    const after = Date.now();

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.pendingAction).toBe("clear_memory");
    expect(user!.pendingActionAt).toBeGreaterThanOrEqual(before);
    expect(user!.pendingActionAt).toBeLessThanOrEqual(after);
  });

  it("sets pending action with payload for admin broadcast", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.setPendingAction, {
      userId,
      action: "admin_broadcast",
      payload: "Important announcement",
    });

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.pendingAction).toBe("admin_broadcast");
    expect(user!.pendingPayload).toBe("Important announcement");
  });

  it("clears pending action", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.users.setPendingAction, {
      userId,
      action: "clear_schedules",
    });

    await t.mutation(internal.users.clearPendingAction, { userId });

    const user = await t.query(internal.users.getUser, { userId });
    expect(user!.pendingAction).toBeUndefined();
    expect(user!.pendingActionAt).toBeUndefined();
    expect(user!.pendingPayload).toBeUndefined();
  });
});

describe("getAllUsers", () => {
  it("returns all users", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
      name: "User1",
    });
    await t.mutation(internal.users.findOrCreateUser, {
      phone: "+447911123456",
      name: "User2",
    });

    const users = await t.query(internal.users.getAllUsers, {});

    expect(users.length).toBeGreaterThanOrEqual(2);
    expect(users.some((u: { name?: string }) => u.name === "User1")).toBe(true);
    expect(users.some((u: { name?: string }) => u.name === "User2")).toBe(true);
  });
});

describe("getAccountData", () => {
  it("returns account data for Clerk user", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
      name: "Ahmad",
    });

    await t.mutation(internal.users.updateUser, {
      userId,
      fields: { clerkUserId: "clerk_12345", tier: "pro", credits: 600 },
    });

    const accountData = await t.query(internal.users.getAccountData, {
      clerkUserId: "clerk_12345",
    });

    expect(accountData).toMatchObject({
      name: "Ahmad",
      phone: "+971501234567",
      tier: "pro",
      credits: 600,
      creditsTotal: 600,
      subscriptionCanceling: false,
    });
  });

  it("returns null for unknown clerkUserId", async () => {
    const t = convexTest(schema, modules);

    const accountData = await t.query(internal.users.getAccountData, {
      clerkUserId: "unknown_clerk_id",
    });

    expect(accountData).toBeNull();
  });
});

describe("updateUserFile edge cases", () => {
  it("throws error for non-existent file", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Delete the memory file
    await t.run(async (ctx) => {
      const file = await ctx.db
        .query("userFiles")
        .withIndex("by_userId_filename", (q) =>
          q.eq("userId", userId).eq("filename", "memory")
        )
        .unique();
      if (file) await ctx.db.delete(file._id);
    });

    await expect(
      t.mutation(internal.users.updateUserFile, {
        userId,
        filename: "memory",
        content: "test",
      })
    ).rejects.toThrow("User file not found");
  });

  it("updates file timestamp", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const before = Date.now();

    await t.mutation(internal.users.updateUserFile, {
      userId,
      filename: "personality",
      content: "Tone: friendly",
    });

    const after = Date.now();

    const file = await t.query(internal.users.getUserFile, {
      userId,
      filename: "personality",
    });

    expect(file!.updatedAt).toBeGreaterThanOrEqual(before);
    expect(file!.updatedAt).toBeLessThanOrEqual(after);
  });
});