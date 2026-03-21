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

describe("getRecentGeneratedImages", () => {
  it("returns the most recent generated image for a user", async () => {
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

    const images = await t.query(internal.imageStorage.getRecentGeneratedImages, {
      userId,
    });

    expect(images).toHaveLength(1);
    expect(images[0]!.storageId).toEqual(storageId);
    expect(images[0]!.mediaType).toBe("image/png");
    expect(typeof images[0]!.createdAt).toBe("number");
  });

  it("returns empty array when no generated images exist for user", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    const images = await t.query(internal.imageStorage.getRecentGeneratedImages, {
      userId,
    });

    expect(images).toHaveLength(0);
  });

  it("does not return another user's generated images", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createTestUser(t, "+971501234567");
    const userId2 = await createTestUser(t, "+971509999999");
    const storageId = await storeBlob(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("generatedImages", {
        userId: userId1,
        storageId,
        expiresAt: Date.now() + 86400000,
      });
    });

    const images = await t.query(internal.imageStorage.getRecentGeneratedImages, {
      userId: userId2,
    });

    expect(images).toHaveLength(0);
  });

  it("respects the limit parameter", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    // Insert 3 images
    const storageIds: Id<"_storage">[] = [];
    for (let i = 0; i < 3; i++) {
      const sid = await storeBlob(t);
      storageIds.push(sid);
      await t.run(async (ctx) => {
        await ctx.db.insert("generatedImages", {
          userId,
          storageId: sid,
          expiresAt: Date.now() + 86400000,
        });
      });
    }

    const images = await t.query(internal.imageStorage.getRecentGeneratedImages, {
      userId,
      limit: 2,
    });

    expect(images).toHaveLength(2);
  });

  it("returns images sorted most-recent-first", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    // Insert two images sequentially so they have distinct creationTimes
    const sid1 = await storeBlob(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("generatedImages", {
        userId,
        storageId: sid1,
        expiresAt: Date.now() + 86400000,
      });
    });

    const sid2 = await storeBlob(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("generatedImages", {
        userId,
        storageId: sid2,
        expiresAt: Date.now() + 86400000,
      });
    });

    const images = await t.query(internal.imageStorage.getRecentGeneratedImages, {
      userId,
      limit: 2,
    });

    expect(images).toHaveLength(2);
    // Most recent (sid2) should come first
    expect(images[0]!.storageId).toEqual(sid2);
    expect(images[1]!.storageId).toEqual(sid1);
    // Verify descending order
    expect(images[0]!.createdAt).toBeGreaterThanOrEqual(images[1]!.createdAt);
  });
});
