import { v } from "convex/values";
import { internalQuery, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { CREDITS_PRO, WHATSAPP_SESSION_WINDOW_MS } from "./constants";

/**
 * Get platform-wide stats for admin dashboard.
 */
export const getStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const allUsers = await ctx.db.query("users").collect();

    const totalUsers = allUsers.length;
    const activeToday = allUsers.filter(
      (u) => u.lastMessageAt && u.lastMessageAt >= oneDayAgo
    ).length;
    const activeWeek = allUsers.filter(
      (u) => u.lastMessageAt && u.lastMessageAt >= oneWeekAgo
    ).length;
    const activeMonth = allUsers.filter(
      (u) => u.lastMessageAt && u.lastMessageAt >= oneMonthAgo
    ).length;
    const newToday = allUsers.filter(
      (u) => u.createdAt >= oneDayAgo
    ).length;
    const proUsers = allUsers.filter((u) => u.tier === "pro").length;

    return { totalUsers, activeToday, activeWeek, activeMonth, newToday, proUsers };
  },
});

/**
 * Search for a user by phone number.
 */
export const searchUser = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
  },
});

/**
 * Grant Pro tier to a user.
 */
export const grantPro = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();

    if (!user) return { success: false, reason: "User not found" };

    await ctx.db.patch(user._id, {
      tier: "pro",
      credits: CREDITS_PRO,
    });

    return { success: true };
  },
});

/**
 * Add credits to a user's balance.
 */
export const grantCredits = internalMutation({
  args: { phone: v.string(), amount: v.number() },
  handler: async (ctx, { phone, amount }) => {
    if (amount <= 0) return { success: false, reason: "Amount must be positive", newBalance: 0 };

    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();

    if (!user) return { success: false, reason: "User not found", newBalance: 0 };

    const newBalance = user.credits + amount;
    await ctx.db.patch(user._id, { credits: newBalance });

    return { success: true, newBalance };
  },
});

/**
 * Count users active within the WhatsApp 24h session window.
 */
export const getActiveUserCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - WHATSAPP_SESSION_WINDOW_MS;
    const allUsers = await ctx.db.query("users").collect();
    return allUsers.filter(
      (u) => u.lastMessageAt && u.lastMessageAt >= cutoff
    ).length;
  },
});

/**
 * Broadcast a message to all users active within 24h.
 * Uses 500ms delay between sends to respect Twilio rate limits.
 */
export const broadcastMessage = internalAction({
  args: { message: v.string() },
  handler: async (ctx, { message }) => {
    const cutoff = Date.now() - WHATSAPP_SESSION_WINDOW_MS;
    const allUsers = await ctx.runQuery(internal.admin.getAllUsers);
    const activeUsers = allUsers.filter(
      (u: { lastMessageAt?: number }) =>
        u.lastMessageAt && u.lastMessageAt >= cutoff
    );

    let sentCount = 0;
    for (const user of activeUsers) {
      try {
        await ctx.runAction(internal.twilio.sendMessage, {
          to: (user as { phone: string }).phone,
          body: message,
        });
        sentCount++;
        // 500ms delay between sends (Twilio rate limits)
        if (sentCount < activeUsers.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Broadcast failed for ${(user as { phone: string }).phone}:`, error);
      }
    }

    return { sentCount };
  },
});

/**
 * Helper query to get all users (used by broadcastMessage action).
 */
export const getAllUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});
