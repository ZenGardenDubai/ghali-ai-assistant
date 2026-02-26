import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/** Track an incoming media file for future reply-to-media re-analysis */
export const trackMediaFile = internalMutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    messageSid: v.string(),
    mediaType: v.string(),
    expiresAt: v.number(),
    transcript: v.optional(v.string()),
  },
  handler: async (ctx, { userId, storageId, messageSid, mediaType, expiresAt, transcript }) => {
    await ctx.db.insert("mediaFiles", {
      userId,
      storageId,
      messageSid,
      mediaType,
      expiresAt,
      transcript,
    });
  },
});

/** Look up a stored media file by Twilio MessageSid */
export const getMediaBySid = internalQuery({
  args: { messageSid: v.string() },
  handler: async (ctx, { messageSid }) => {
    const record = await ctx.db
      .query("mediaFiles")
      .withIndex("by_messageSid", (q) => q.eq("messageSid", messageSid))
      .first();

    if (!record) return null;

    const storageUrl = await ctx.storage.getUrl(record.storageId);
    if (!storageUrl) return null;

    return {
      storageId: record.storageId,
      mediaType: record.mediaType,
      storageUrl,
      transcript: record.transcript,
    };
  },
});

/** Get the most recent media files for a user, with optional type filtering. */
export const getRecentUserMedia = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    mediaTypePrefix: v.optional(v.string()),
  },
  handler: async (ctx, { userId, limit, mediaTypePrefix }) => {
    const maxResults = limit ?? 5;
    let files = await ctx.db
      .query("mediaFiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(mediaTypePrefix ? maxResults * 3 : maxResults);

    if (mediaTypePrefix) {
      files = files.filter((f) => f.mediaType.startsWith(mediaTypePrefix));
    }

    return files.slice(0, maxResults).map((f) => ({
      storageId: f.storageId,
      mediaType: f.mediaType,
      createdAt: f._creationTime,
    }));
  },
});

/** Delete all media files for a user (used by "clear documents" / "clear everything") */
export const deleteUserMediaFiles = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const files = await ctx.db
      .query("mediaFiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const file of files) {
      try {
        await ctx.storage.delete(file.storageId);
      } catch {
        // Storage file may already be deleted — continue cleanup
      }
      await ctx.db.delete(file._id);
    }

    if (files.length > 0) {
      console.log(`[deleteUserMediaFiles] Deleted ${files.length} files for user ${userId}`);
    }
  },
});

/** Delete expired media files from storage */
export const cleanupExpiredMediaFiles = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("mediaFiles")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .collect();

    for (const file of expired) {
      try {
        await ctx.storage.delete(file.storageId);
      } catch {
        // Storage file may already be deleted — continue cleanup
      }
      await ctx.db.delete(file._id);
    }

    if (expired.length > 0) {
      console.log(`[cleanupExpiredMediaFiles] Deleted ${expired.length} files`);
    }
  },
});
