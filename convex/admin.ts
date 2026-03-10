import { v } from "convex/values";
import { internalQuery, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { CREDITS_PRO, WHATSAPP_SESSION_WINDOW_MS } from "./constants";
import { getDubaiMidnightMs, getDubaiWeekStartMs, getDubaiMonthStartMs } from "./lib/dateUtils";

/**
 * Generate an upload URL for admin image uploads (Convex storage).
 */
export const generateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get a public URL for a Convex storage ID (admin use).
 */
export const getStorageUrl = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

/** Number of users to send to concurrently in each broadcast batch */
const BROADCAST_BATCH_SIZE = 50;

/**
 * Send messages in parallel batches with throttling between batches.
 * Returns the number of successfully sent messages.
 */
async function sendInBatches(
  users: Array<{ phone: string; lastMessageAt?: number }>,
  sendFn: (phone: string) => Promise<unknown>,
): Promise<number> {
  let sentCount = 0;
  for (let i = 0; i < users.length; i += BROADCAST_BATCH_SIZE) {
    const batch = users.slice(i, i + BROADCAST_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((user) => sendFn(user.phone)),
    );
    sentCount += results.filter((r) => r.status === "fulfilled").length;
    results.forEach((r, index) => {
      if (r.status === "rejected") {
        console.error(`Broadcast send failed for ${batch[index].phone}:`, r.reason);
      }
    });
    // Throttle between batches
    if (i + BROADCAST_BATCH_SIZE < users.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return sentCount;
}

/** Template definitions — referenced by name for WhatsApp Cloud API */
export const TEMPLATE_DEFINITIONS = [
  { name: "ghali_reminder", description: "Scheduled Reminder", variables: ["reminder_text"], preview: "Hi from Ghali! Here is your scheduled reminder:\n\n{{1}}\n\nReply to chat with your AI assistant." },
  { name: "ghali_heartbeat", description: "Proactive Check-in", variables: ["message"], preview: "Hi from Ghali! Here is a check-in for you:\n\n{{1}}\n\nReply to chat with your AI assistant." },
  { name: "ghali_broadcast", description: "Admin Announcement", variables: ["announcement"], preview: "Hi from Ghali! Here is an announcement:\n\n{{1}}\n\nReply to chat with your AI assistant." },
  { name: "ghali_broadcast_image", description: "Admin Announcement (with Image)", variables: ["announcement"], preview: "Hi from Ghali! Here is an announcement:\n\n{{1}}\n\nReply to chat with your AI assistant." },
  { name: "ghali_credits_reset", description: "Monthly Credit Refresh", variables: ["credits", "tier"], preview: "Your {{2}} credits have been refreshed. You now have {{1}} credits for this month." },
  { name: "ghali_credits_low", description: "Low Credit Warning", variables: ["remaining_credits"], preview: "You have {{1}} credits remaining this month. Need more? Send \"upgrade\" to learn about Pro." },
  { name: "ghali_subscription_active", description: "Pro Plan Activated", variables: ["credits"], preview: "Your Ghali Pro plan is now active. You have {{1}} credits this month." },
  { name: "ghali_subscription_ended", description: "Pro Plan Ended", variables: ["basic_credits"], preview: "Your Pro plan has ended. You're now on the Basic plan with {{1}} credits/month." },
  { name: "ghali_scheduled_task", description: "Scheduled Task Result", variables: ["result"], preview: "📋 Scheduled Task Result:\n\n{{1}}\n\nReply to chat with your AI assistant." },
] as const;

/**
 * Get platform-wide stats for admin dashboard.
 * Used by both the WhatsApp `admin stats` command and the HTTP `/admin/stats` endpoint.
 *
 * Rolling windows: from (now - X) to now, regardless of calendar day.
 * Dubai calendar windows: from the start of the current Dubai day/week/month (UTC+4).
 * Yesterday window: from (now - 48h) to (now - 24h), for period-specific comparisons.
 */
export const getStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    // Rolling windows (from now - X to now)
    const oneDayAgo = now - DAY;
    const twoDaysAgo = now - 2 * DAY;
    const oneWeekAgo = now - 7 * DAY;
    const oneMonthAgo = now - 30 * DAY;

    // Dubai-anchored boundaries (UTC+4, week starts Sunday, month starts 1st)
    const dubaiDayStart = getDubaiMidnightMs(now);
    const dubaiWeekStart = getDubaiWeekStartMs(now);
    const dubaiMonthStart = getDubaiMonthStartMs(now);

    const allUsers = await ctx.db.query("users").collect();

    const totalUsers = allUsers.length;
    const proUsers = allUsers.filter((u) => u.tier === "pro").length;
    const basicUsers = allUsers.filter((u) => u.tier === "basic").length;

    // Rolling window active stats (users who sent a message in the last X hours/days)
    const activeToday = allUsers.filter(
      (u) => u.lastMessageAt && u.lastMessageAt >= oneDayAgo
    ).length;
    const activeWeek = allUsers.filter(
      (u) => u.lastMessageAt && u.lastMessageAt >= oneWeekAgo
    ).length;
    const activeMonth = allUsers.filter(
      (u) => u.lastMessageAt && u.lastMessageAt >= oneMonthAgo
    ).length;

    // Rolling new users (accounts created in the last X hours/days)
    const newToday = allUsers.filter((u) => u.createdAt >= oneDayAgo).length;
    const newWeek = allUsers.filter((u) => u.createdAt >= oneWeekAgo).length;
    const newMonth = allUsers.filter((u) => u.createdAt >= oneMonthAgo).length;

    // Yesterday window (24h–48h ago) — for period-specific dashboard comparisons
    const activeYesterday = allUsers.filter(
      (u) => u.lastMessageAt && u.lastMessageAt >= twoDaysAgo && u.lastMessageAt < oneDayAgo
    ).length;
    const newYesterday = allUsers.filter(
      (u) => u.createdAt >= twoDaysAgo && u.createdAt < oneDayAgo
    ).length;

    // Dubai calendar-day stats (anchored to Dubai midnight/week-start/month-start)
    const activeTodayDubai = allUsers.filter(
      (u) => u.lastMessageAt && u.lastMessageAt >= dubaiDayStart
    ).length;
    const activeWeekDubai = allUsers.filter(
      (u) => u.lastMessageAt && u.lastMessageAt >= dubaiWeekStart
    ).length;
    const activeMonthDubai = allUsers.filter(
      (u) => u.lastMessageAt && u.lastMessageAt >= dubaiMonthStart
    ).length;
    const newTodayDubai = allUsers.filter(
      (u) => u.createdAt >= dubaiDayStart
    ).length;

    return {
      totalUsers,
      proUsers,
      basicUsers,
      // Rolling windows
      activeToday,
      activeWeek,
      activeMonth,
      newToday,
      newWeek,
      newMonth,
      // Yesterday window
      activeYesterday,
      newYesterday,
      // Dubai calendar-day stats
      activeTodayDubai,
      activeWeekDubai,
      activeMonthDubai,
      newTodayDubai,
    };
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
 * Count users for broadcast: total users and those active within 24h session window.
 */
export const getBroadcastCounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - WHATSAPP_SESSION_WINDOW_MS;
    const allUsers = await ctx.db.query("users").collect();
    const activeCount = allUsers.filter(
      (u) => u.lastMessageAt && u.lastMessageAt >= cutoff
    ).length;
    return { totalUsers: allUsers.length, activeUsers: activeCount };
  },
});

/**
 * Broadcast a message to all users active within 24h.
 * Sends in parallel batches of BROADCAST_BATCH_SIZE with 500ms between batches.
 */
export const broadcastMessage = internalAction({
  args: { message: v.string() },
  handler: async (ctx, { message }) => {
    const cutoff = Date.now() - WHATSAPP_SESSION_WINDOW_MS;
    const allUsers = await ctx.runQuery(internal.admin.getAllUsers);
    const activeUsers = allUsers.filter(
      (u: { lastMessageAt?: number; phone: string }) =>
        u.lastMessageAt && u.lastMessageAt >= cutoff
    ) as Array<{ phone: string; lastMessageAt?: number }>;

    const sentCount = await sendInBatches(activeUsers, (phone) =>
      ctx.runAction(internal.whatsapp.sendMessage, { to: phone, body: message }),
    );

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
 * Get template configuration status.
 * With Cloud API, templates are referenced by name — no env vars needed.
 */
export const getTemplateStatus = internalQuery({
  args: {},
  handler: async () => {
    return TEMPLATE_DEFINITIONS.map((t) => ({
      key: t.name, // 360dialog uses template names directly (no env var / ContentSid)
      name: t.name,
      description: t.description,
      variables: t.variables as unknown as string[],
      preview: t.preview,
      configured: true, // Templates are referenced by name, always "configured"
    }));
  },
});

/** Render a template preview by replacing {{1}}, {{2}}, etc. with variable values. */
export function renderTemplatePreview(preview: string, variables: Record<string, string>): string {
  let rendered = preview;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(`{{${key}}}`, value);
  }
  return rendered;
}

/**
 * Send a template message to the admin's own phone (test mode).
 */
export const sendTestTemplate = internalAction({
  args: {
    templateName: v.string(),
    variables: v.record(v.string(), v.string()),
    adminPhone: v.string(),
    mediaUrl: v.optional(v.string()),
  },
  handler: async (ctx, { templateName, variables, adminPhone, mediaUrl }) => {
    if (mediaUrl) {
      // Send single media message with template text as caption
      const template = TEMPLATE_DEFINITIONS.find((t) => t.name === templateName);
      const caption = template ? renderTemplatePreview(template.preview, variables) : "";
      await ctx.runAction(internal.whatsapp.sendMedia, {
        to: adminPhone,
        caption,
        mediaUrl,
      });
    } else {
      await ctx.runAction(internal.whatsapp.sendTemplate, {
        to: adminPhone,
        templateName,
        variables,
      });
    }
    return { success: true };
  },
});

/**
 * Send a template message to a specific user by phone.
 */
export const sendTemplateToUser = internalAction({
  args: {
    phone: v.string(),
    templateName: v.string(),
    variables: v.record(v.string(), v.string()),
    mediaUrl: v.optional(v.string()),
  },
  handler: async (ctx, { phone, templateName, variables, mediaUrl }) => {
    const user = await ctx.runQuery(internal.admin.searchUser, { phone });
    if (!user) return { success: false, reason: "User not found", sentCount: 0 };

    const isActive =
      !!user.lastMessageAt &&
      user.lastMessageAt >= Date.now() - WHATSAPP_SESSION_WINDOW_MS;

    if (mediaUrl && isActive) {
      // Active user: send single media message with template text as caption
      const template = TEMPLATE_DEFINITIONS.find((t) => t.name === templateName);
      const caption = template ? renderTemplatePreview(template.preview, variables) : "";
      await ctx.runAction(internal.whatsapp.sendMedia, {
        to: phone,
        caption,
        mediaUrl,
      });
    } else {
      // Inactive user or no media: send text-only template.
      // Note: WhatsApp templates don't support inline media — mediaUrl is
      // ignored for inactive users (24h session policy).
      await ctx.runAction(internal.whatsapp.sendTemplate, {
        to: phone,
        templateName,
        variables,
      });
    }
    return { success: true, sentCount: 1 };
  },
});

/**
 * Broadcast a template to ALL users.
 * Users active within 24h get a normal message; others get a template message.
 * Sends in parallel batches of BROADCAST_BATCH_SIZE with 500ms between batches.
 */
export const sendTemplateBroadcast = internalAction({
  args: {
    templateName: v.string(),
    variables: v.record(v.string(), v.string()),
    messageBody: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
  },
  handler: async (ctx, { templateName, variables, messageBody, mediaUrl }) => {
    const cutoff = Date.now() - WHATSAPP_SESSION_WINDOW_MS;
    const allUsers = await ctx.runQuery(internal.admin.getAllUsers) as Array<{
      phone: string;
      lastMessageAt?: number;
    }>;

    const userByPhone = new Map(allUsers.map((u) => [u.phone, u]));

    const sentCount = await sendInBatches(allUsers, async (phone) => {
      const user = userByPhone.get(phone)!;
      const isActive = user.lastMessageAt && user.lastMessageAt >= cutoff;

      if (isActive && messageBody && mediaUrl) {
        // Active user with image: send media message with caption
        return ctx.runAction(internal.whatsapp.sendMedia, {
          to: phone,
          caption: messageBody,
          mediaUrl,
        });
      }
      if (isActive && messageBody) {
        // Active user, text only
        return ctx.runAction(internal.whatsapp.sendMessage, {
          to: phone,
          body: messageBody,
        });
      }
      // Inactive user: send text-only template (media not supported in templates)
      return ctx.runAction(internal.whatsapp.sendTemplate, {
        to: phone,
        templateName,
        variables,
      });
    });

    return { sentCount };
  },
});
