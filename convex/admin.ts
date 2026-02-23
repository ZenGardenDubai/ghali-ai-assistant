import { v } from "convex/values";
import { internalQuery, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { CREDITS_PRO, WHATSAPP_SESSION_WINDOW_MS } from "./constants";

/** Template definitions with env var names and variable schemas */
export const TEMPLATE_DEFINITIONS = [
  { key: "TWILIO_TPL_REMINDER", name: "ghali_reminder", description: "Scheduled Reminder", variables: ["reminder_text"], preview: "Hi from Ghali! Here is your scheduled reminder:\n\n{{1}}\n\nReply to chat with your AI assistant." },
  { key: "TWILIO_TPL_HEARTBEAT", name: "ghali_heartbeat", description: "Proactive Check-in", variables: ["message"], preview: "Hi from Ghali! Here is a check-in for you:\n\n{{1}}\n\nReply to chat with your AI assistant." },
  { key: "TWILIO_TPL_BROADCAST", name: "ghali_broadcast", description: "Admin Announcement", variables: ["announcement"], preview: "Hi from Ghali! Here is an announcement:\n\n{{1}}\n\nReply to chat with your AI assistant." },
  { key: "TWILIO_TPL_CREDITS_RESET", name: "ghali_credits_reset", description: "Monthly Credit Refresh", variables: ["credits", "tier"], preview: "Your {{2}} credits have been refreshed. You now have {{1}} credits for this month." },
  { key: "TWILIO_TPL_CREDITS_LOW", name: "ghali_credits_low", description: "Low Credit Warning", variables: ["remaining_credits"], preview: "You have {{1}} credits remaining this month. Need more? Send \"upgrade\" to learn about Pro." },
  { key: "TWILIO_TPL_SUB_ACTIVE", name: "ghali_subscription_active", description: "Pro Plan Activated", variables: ["credits"], preview: "Your Ghali Pro plan is now active. You have {{1}} credits this month." },
  { key: "TWILIO_TPL_SUB_ENDED", name: "ghali_subscription_ended", description: "Pro Plan Ended", variables: ["basic_credits"], preview: "Your Pro plan has ended. You're now on the Basic plan with {{1}} credits/month." },
] as const;

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

/**
 * Period-aware dashboard stats.
 */
export const getDashboardStats = internalQuery({
  args: { period: v.union(v.literal("today"), v.literal("yesterday"), v.literal("7d"), v.literal("30d")) },
  handler: async (ctx, { period }) => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    let start: number;
    let end: number = now;
    switch (period) {
      case "today":
        start = now - DAY;
        break;
      case "yesterday":
        start = now - 2 * DAY;
        end = now - DAY;
        break;
      case "7d":
        start = now - 7 * DAY;
        break;
      case "30d":
        start = now - 30 * DAY;
        break;
    }

    const allUsers = await ctx.db.query("users").collect();
    const totalUsers = allUsers.length;
    const newUsers = allUsers.filter((u) => u.createdAt >= start && u.createdAt < end).length;
    const activeUsers = allUsers.filter(
      (u) => u.lastMessageAt && u.lastMessageAt >= start && u.lastMessageAt < end
    ).length;
    const proUsers = allUsers.filter((u) => u.tier === "pro").length;
    const basicUsers = allUsers.filter((u) => u.tier === "basic").length;

    return { totalUsers, newUsers, activeUsers, proUsers, basicUsers };
  },
});

/**
 * Get recent users for admin table.
 */
export const getRecentUsers = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const allUsers = await ctx.db.query("users").order("desc").take(limit);
    return allUsers.map((u) => ({
      phone: u.phone,
      name: u.name,
      tier: u.tier,
      credits: u.credits,
      lastMessageAt: u.lastMessageAt,
      createdAt: u.createdAt,
    }));
  },
});

/**
 * Verify admin by Clerk user ID.
 */
export const verifyAdmin = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    return { isAdmin: user?.isAdmin === true };
  },
});

/**
 * Get template configuration status (which templates have Content SIDs set).
 */
export const getTemplateStatus = internalQuery({
  args: {},
  handler: async () => {
    return TEMPLATE_DEFINITIONS.map((t) => ({
      key: t.key,
      name: t.name,
      description: t.description,
      variables: t.variables as unknown as string[],
      preview: t.preview,
      configured: !!process.env[t.key],
    }));
  },
});

/**
 * Send a template message to the admin's own phone (test mode).
 */
export const sendTestTemplate = internalAction({
  args: {
    templateEnvVar: v.string(),
    variables: v.record(v.string(), v.string()),
    adminPhone: v.string(),
  },
  handler: async (ctx, { templateEnvVar, variables, adminPhone }) => {
    await ctx.runAction(internal.twilio.sendTemplate, {
      to: adminPhone,
      templateEnvVar,
      variables,
    });
    return { success: true };
  },
});

/**
 * Send a template message to a specific user by phone.
 */
export const sendTemplateToUser = internalAction({
  args: {
    phone: v.string(),
    templateEnvVar: v.string(),
    variables: v.record(v.string(), v.string()),
  },
  handler: async (ctx, { phone, templateEnvVar, variables }) => {
    const user = await ctx.runQuery(internal.admin.searchUser, { phone });
    if (!user) return { success: false, reason: "User not found", sentCount: 0 };

    await ctx.runAction(internal.twilio.sendTemplate, {
      to: phone,
      templateEnvVar,
      variables,
    });
    return { success: true, sentCount: 1 };
  },
});

/**
 * Broadcast a template to all active users within the 24h session window.
 */
export const sendTemplateBroadcast = internalAction({
  args: {
    templateEnvVar: v.string(),
    variables: v.record(v.string(), v.string()),
  },
  handler: async (ctx, { templateEnvVar, variables }) => {
    const cutoff = Date.now() - WHATSAPP_SESSION_WINDOW_MS;
    const allUsers = await ctx.runQuery(internal.admin.getAllUsers);
    const activeUsers = allUsers.filter(
      (u: { lastMessageAt?: number }) =>
        u.lastMessageAt && u.lastMessageAt >= cutoff
    );

    let sentCount = 0;
    for (const user of activeUsers) {
      try {
        await ctx.runAction(internal.twilio.sendTemplate, {
          to: (user as { phone: string }).phone,
          templateEnvVar,
          variables,
        });
        sentCount++;
        if (sentCount < activeUsers.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Template broadcast failed for ${(user as { phone: string }).phone}:`, error);
      }
    }

    return { sentCount };
  },
});
