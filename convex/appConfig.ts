import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getConfig = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
  },
});

export const setConfig = internalMutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
      return existing._id;
    }

    return await ctx.db.insert("appConfig", {
      key,
      value,
      updatedAt: Date.now(),
    });
  },
});

export const deleteConfig = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const existing = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (!existing) return;

    // Clean up storage if the value contains a storageId
    try {
      const parsed = JSON.parse(existing.value);
      if (parsed.storageId) {
        await ctx.storage.delete(parsed.storageId as Id<"_storage">);
      }
    } catch {
      // Value isn't JSON or doesn't have storageId — that's fine
    }

    await ctx.db.delete(existing._id);
  },
});
