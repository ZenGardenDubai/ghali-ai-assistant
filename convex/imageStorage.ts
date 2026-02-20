import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

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
