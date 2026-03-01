import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/** Track a generated image for future cleanup */
export const trackGeneratedImage = internalMutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    expiresAt: v.number(),
  },
  handler: async (ctx, { userId, storageId, expiresAt }) => {
    await ctx.db.insert("generatedImages", { userId, storageId, expiresAt });
  },
});

/** Get a Convex storage URL for a generated image, verified against userId ownership. */
export const getGeneratedImageUrl = internalQuery({
  args: {
    storageId: v.id("_storage"),
    userId: v.id("users"),
  },
  handler: async (ctx, { storageId, userId }) => {
    const record = await ctx.db
      .query("generatedImages")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("storageId"), storageId))
      .first();
    if (!record) return null;
    return await ctx.storage.getUrl(storageId);
  },
});

/** Delete expired generated images from storage */
export const cleanupExpiredImages = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("generatedImages")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .collect();

    for (const image of expired) {
      await ctx.storage.delete(image.storageId);
      await ctx.db.delete(image._id);
    }

    if (expired.length > 0) {
      console.log(`[cleanupExpiredImages] Deleted ${expired.length} images`);
    }
  },
});
