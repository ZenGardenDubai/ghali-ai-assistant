import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

/** Insert a test user and return their ID. */
async function createTestUser(t: ReturnType<typeof convexTest>): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      phone: "+971501234567",
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
  t: ReturnType<typeof convexTest>,
  contentType: string
): Promise<Id<"_storage">> {
  return await t.run(async (ctx) => {
    return await ctx.storage.store(new Blob(["test"], { type: contentType }));
  });
}

describe("getRecentUserMedia", () => {
  it("returns empty array when user has no media files", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    const files = await t.query(internal.mediaStorage.getRecentUserMedia, {
      userId,
    });

    expect(files).toEqual([]);
  });

  it("returns all files without filtering when no prefix given", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    const storageId1 = await storeBlob(t, "image/jpeg");
    const storageId2 = await storeBlob(t, "audio/ogg");

    await t.run(async (ctx) => {
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId: storageId1,
        messageSid: "SM001",
        mediaType: "image/jpeg",
        expiresAt: Date.now() + 86400000,
      });
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId: storageId2,
        messageSid: "SM002",
        mediaType: "audio/ogg",
        expiresAt: Date.now() + 86400000,
      });
    });

    const files = await t.query(internal.mediaStorage.getRecentUserMedia, {
      userId,
    });

    expect(files).toHaveLength(2);
  });

  it("filters to only image files when mediaTypePrefix is 'image/'", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    const imageStorageId = await storeBlob(t, "image/jpeg");
    const audioStorageId = await storeBlob(t, "audio/ogg");
    const docStorageId = await storeBlob(t, "application/pdf");

    await t.run(async (ctx) => {
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId: imageStorageId,
        messageSid: "SM001",
        mediaType: "image/jpeg",
        expiresAt: Date.now() + 86400000,
      });
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId: audioStorageId,
        messageSid: "SM002",
        mediaType: "audio/ogg",
        expiresAt: Date.now() + 86400000,
      });
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId: docStorageId,
        messageSid: "SM003",
        mediaType: "application/pdf",
        expiresAt: Date.now() + 86400000,
      });
    });

    const files = await t.query(internal.mediaStorage.getRecentUserMedia, {
      userId,
      mediaTypePrefix: "image/",
    });

    expect(files).toHaveLength(1);
    expect(files[0]!.mediaType).toBe("image/jpeg");
  });

  it("filters to only audio files when mediaTypePrefix is 'audio/'", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    const imageStorageId = await storeBlob(t, "image/png");
    const audioStorageId1 = await storeBlob(t, "audio/ogg");
    const audioStorageId2 = await storeBlob(t, "audio/mpeg");

    await t.run(async (ctx) => {
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId: imageStorageId,
        messageSid: "SM001",
        mediaType: "image/png",
        expiresAt: Date.now() + 86400000,
      });
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId: audioStorageId1,
        messageSid: "SM002",
        mediaType: "audio/ogg",
        expiresAt: Date.now() + 86400000,
      });
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId: audioStorageId2,
        messageSid: "SM003",
        mediaType: "audio/mpeg",
        expiresAt: Date.now() + 86400000,
      });
    });

    const files = await t.query(internal.mediaStorage.getRecentUserMedia, {
      userId,
      mediaTypePrefix: "audio/",
    });

    expect(files).toHaveLength(2);
    expect(files.every((f) => f.mediaType.startsWith("audio/"))).toBe(true);
  });

  it("filters to only documents when mediaTypePrefix is 'application/'", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    const imageStorageId = await storeBlob(t, "image/jpeg");
    const pdfStorageId = await storeBlob(t, "application/pdf");

    await t.run(async (ctx) => {
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId: imageStorageId,
        messageSid: "SM001",
        mediaType: "image/jpeg",
        expiresAt: Date.now() + 86400000,
      });
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId: pdfStorageId,
        messageSid: "SM002",
        mediaType: "application/pdf",
        expiresAt: Date.now() + 86400000,
      });
    });

    const files = await t.query(internal.mediaStorage.getRecentUserMedia, {
      userId,
      mediaTypePrefix: "application/",
    });

    expect(files).toHaveLength(1);
    expect(files[0]!.mediaType).toBe("application/pdf");
  });

  it("returns empty array when filter matches no files", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    const storageId = await storeBlob(t, "image/jpeg");

    await t.run(async (ctx) => {
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId,
        messageSid: "SM001",
        mediaType: "image/jpeg",
        expiresAt: Date.now() + 86400000,
      });
    });

    const files = await t.query(internal.mediaStorage.getRecentUserMedia, {
      userId,
      mediaTypePrefix: "audio/",
    });

    expect(files).toHaveLength(0);
  });

  it("respects limit after filtering", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    const storageId1 = await storeBlob(t, "image/jpeg");
    const storageId2 = await storeBlob(t, "image/png");
    const storageId3 = await storeBlob(t, "image/webp");

    await t.run(async (ctx) => {
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId: storageId1,
        messageSid: "SM001",
        mediaType: "image/jpeg",
        expiresAt: Date.now() + 86400000,
      });
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId: storageId2,
        messageSid: "SM002",
        mediaType: "image/png",
        expiresAt: Date.now() + 86400000,
      });
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId: storageId3,
        messageSid: "SM003",
        mediaType: "image/webp",
        expiresAt: Date.now() + 86400000,
      });
    });

    const files = await t.query(internal.mediaStorage.getRecentUserMedia, {
      userId,
      limit: 2,
      mediaTypePrefix: "image/",
    });

    expect(files).toHaveLength(2);
  });

  it("returns only files for the requesting user", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createTestUser(t);
    const userId2 = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        phone: "+971509999999",
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

    const storageId1 = await storeBlob(t, "image/jpeg");
    const storageId2 = await storeBlob(t, "image/png");

    await t.run(async (ctx) => {
      await ctx.db.insert("mediaFiles", {
        userId: userId1,
        storageId: storageId1,
        messageSid: "SM001",
        mediaType: "image/jpeg",
        expiresAt: Date.now() + 86400000,
      });
      await ctx.db.insert("mediaFiles", {
        userId: userId2,
        storageId: storageId2,
        messageSid: "SM002",
        mediaType: "image/png",
        expiresAt: Date.now() + 86400000,
      });
    });

    const files = await t.query(internal.mediaStorage.getRecentUserMedia, {
      userId: userId1,
    });

    expect(files).toHaveLength(1);
    expect(files[0]!.storageId).toBe(storageId1);
  });

  it("returns storageId, mediaType, and createdAt for each file", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    const storageId = await storeBlob(t, "audio/ogg");

    await t.run(async (ctx) => {
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId,
        messageSid: "SM001",
        mediaType: "audio/ogg",
        expiresAt: Date.now() + 86400000,
      });
    });

    const files = await t.query(internal.mediaStorage.getRecentUserMedia, {
      userId,
    });

    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      storageId,
      mediaType: "audio/ogg",
    });
    expect(typeof files[0]!.createdAt).toBe("number");
  });

  it("returns transcript when available", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    const storageId = await storeBlob(t, "audio/ogg");

    await t.run(async (ctx) => {
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId,
        messageSid: "SM001",
        mediaType: "audio/ogg",
        expiresAt: Date.now() + 86400000,
        transcript: "Hello, this is a test transcript.",
      });
    });

    const files = await t.query(internal.mediaStorage.getRecentUserMedia, {
      userId,
    });

    expect(files).toHaveLength(1);
    expect(files[0]!.transcript).toBe("Hello, this is a test transcript.");
  });

  it("returns undefined transcript when not available", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    const storageId = await storeBlob(t, "image/jpeg");

    await t.run(async (ctx) => {
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId,
        messageSid: "SM001",
        mediaType: "image/jpeg",
        expiresAt: Date.now() + 86400000,
      });
    });

    const files = await t.query(internal.mediaStorage.getRecentUserMedia, {
      userId,
    });

    expect(files).toHaveLength(1);
    expect(files[0]!.transcript).toBeUndefined();
  });
});

describe("getStorageUrl", () => {
  it("returns URL for a valid storage ID without userId check", async () => {
    const t = convexTest(schema, modules);
    const storageId = await storeBlob(t, "image/jpeg");

    const url = await t.query(internal.mediaStorage.getStorageUrl, {
      storageId,
    });

    expect(url).toBeTruthy();
    expect(typeof url).toBe("string");
  });

  it("returns URL when userId owns the file", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);
    const storageId = await storeBlob(t, "audio/ogg");

    await t.run(async (ctx) => {
      await ctx.db.insert("mediaFiles", {
        userId,
        storageId,
        messageSid: "SM001",
        mediaType: "audio/ogg",
        expiresAt: Date.now() + 86400000,
      });
    });

    const url = await t.query(internal.mediaStorage.getStorageUrl, {
      storageId,
      userId,
    });

    expect(url).toBeTruthy();
    expect(typeof url).toBe("string");
  });

  it("returns null when userId does not own the file", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createTestUser(t);
    const userId2 = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        phone: "+971509999999",
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

    const storageId = await storeBlob(t, "image/jpeg");

    // File belongs to userId1
    await t.run(async (ctx) => {
      await ctx.db.insert("mediaFiles", {
        userId: userId1,
        storageId,
        messageSid: "SM001",
        mediaType: "image/jpeg",
        expiresAt: Date.now() + 86400000,
      });
    });

    // userId2 tries to access it
    const url = await t.query(internal.mediaStorage.getStorageUrl, {
      storageId,
      userId: userId2,
    });

    expect(url).toBeNull();
  });

  it("returns null when userId is provided but file has no mediaFiles record", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);
    const storageId = await storeBlob(t, "image/jpeg");

    // No mediaFiles record — just a raw storage blob
    const url = await t.query(internal.mediaStorage.getStorageUrl, {
      storageId,
      userId,
    });

    expect(url).toBeNull();
  });
});
