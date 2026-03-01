import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

/** Insert a test user and return their ID. */
async function createTestUser(
  t: ReturnType<typeof convexTest>,
  phone = "+971501234567"
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      phone,
      language: "en",
      timezone: "Asia/Dubai",
      tier: "basic",
      isAdmin: false,
      credits: 60,
      creditsResetAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      onboardingStep: null,
      createdAt: Date.now(),
    });
  });
}

/** Store a small blob and return its storage ID. */
async function storeBlob(
  t: ReturnType<typeof convexTest>
): Promise<Id<"_storage">> {
  return await t.run(async (ctx) => {
    return await ctx.storage.store(new Blob(["test"], { type: "image/png" }));
  });
}

describe("getGeneratedImageUrl", () => {
  it("returns URL when userId owns the generated image", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);
    const storageId = await storeBlob(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("generatedImages", {
        userId,
        storageId,
        expiresAt: Date.now() + 86400000,
      });
    });

    const url = await t.query(internal.imageStorage.getGeneratedImageUrl, {
      storageId,
      userId,
    });

    expect(url).toBeTruthy();
    expect(typeof url).toBe("string");
  });

  it("returns null when userId does not own the image", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createTestUser(t, "+971501234567");
    const userId2 = await createTestUser(t, "+971509999999");
    const storageId = await storeBlob(t);

    // Image belongs to userId1
    await t.run(async (ctx) => {
      await ctx.db.insert("generatedImages", {
        userId: userId1,
        storageId,
        expiresAt: Date.now() + 86400000,
      });
    });

    // userId2 tries to access it
    const url = await t.query(internal.imageStorage.getGeneratedImageUrl, {
      storageId,
      userId: userId2,
    });

    expect(url).toBeNull();
  });

  it("returns null when no generatedImages record exists for the storageId", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);
    const storageId = await storeBlob(t);

    // No generatedImages record — just a raw storage blob
    const url = await t.query(internal.imageStorage.getGeneratedImageUrl, {
      storageId,
      userId,
    });

    expect(url).toBeNull();
  });
});
