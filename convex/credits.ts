import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { isSystemCommand, isAdminCommand } from "./lib/utils";
import {
  CREDITS_BASIC,
  CREDITS_PRO,
  CREDIT_RESET_PERIOD_MS,
  WHATSAPP_SESSION_WINDOW_MS,
  CREDIT_RESET_INACTIVITY_GATE_MS,
} from "./constants";

/**
 * Check credit availability without deducting.
 * System commands are free (0 credits).
 * Returns: { status: "available" | "exhausted" | "free", credits: number }
 */
export const checkCredit = internalQuery({
  args: {
    userId: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, { userId, message }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (isSystemCommand(message)) {
      return { status: "free" as const, credits: user.credits };
    }

    // Admin commands are free for admin users
    if (isAdminCommand(message) && user.isAdmin) {
      return { status: "free" as const, credits: user.credits };
    }

    if (user.credits <= 0) {
      return { status: "exhausted" as const, credits: 0 };
    }

    return { status: "available" as const, credits: user.credits };
  },
});

/**
 * Atomically check credit availability and deduct 1 credit in a single transaction.
 * Prevents the race condition where concurrent checkCredit queries all see the same
 * stale balance, allowing multiple requests to exceed the credit cap.
 *
 * Returns: { status: "available" | "exhausted" | "free", credits: number }
 * - "available": credit was deducted; credits = new balance
 * - "exhausted": no credits; nothing deducted; credits = 0
 * - "free": system/admin command; nothing deducted; credits = current balance
 */
export const checkAndDeductCredit = internalMutation({
  args: {
    userId: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, { userId, message }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (isSystemCommand(message)) {
      return { status: "free" as const, credits: user.credits };
    }

    if (isAdminCommand(message) && user.isAdmin) {
      return { status: "free" as const, credits: user.credits };
    }

    if (user.credits <= 0) {
      return { status: "exhausted" as const, credits: 0 };
    }

    const newCredits = Math.max(0, user.credits - 1);
    await ctx.db.patch(userId, { credits: newCredits });
    return { status: "available" as const, credits: newCredits };
  },
});

/**
 * Refund 1 credit to a user. Call when an AI response fails after a credit was
 * already deducted by checkAndDeductCredit, so the user is not charged for errors.
 */
export const refundCredit = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const tier = user.tier ?? "basic";
    const cap = tier === "pro" ? CREDITS_PRO : CREDITS_BASIC;
    const newCredits = Math.min(cap, user.credits + 1);
    await ctx.db.patch(userId, { credits: newCredits });
    return { credits: newCredits };
  },
});

/**
 * Deduct 1 credit from a user. Call only after a successful AI response.
 * Returns the new credit balance.
 */
export const deductCredit = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const newCredits = Math.max(0, user.credits - 1);
    await ctx.db.patch(userId, { credits: newCredits });
    return { credits: newCredits };
  },
});

/**
 * Monthly credit reset cron handler.
 * Resets credits for users whose creditsResetAt has passed.
 */
export const resetCredits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const users = await ctx.db.query("users").collect();

    let resetCount = 0;
    for (const user of users) {
      if (user.creditsResetAt <= now) {
        const tierCredits = user.tier === "pro" ? CREDITS_PRO : CREDITS_BASIC;
        await ctx.db.patch(user._id, {
          credits: tierCredits,
          creditsResetAt: now + CREDIT_RESET_PERIOD_MS,
        });

        // Notify user — guarded to respect outbound rate limits
        // Skip notification for inactive users (>30 days since last message)
        const isInactive = !user.lastMessageAt || now - user.lastMessageAt > CREDIT_RESET_INACTIVITY_GATE_MS;
        if (isInactive) {
          // Reset creditNotificationSent on all user's scheduled tasks
          await ctx.scheduler.runAfter(0, internal.scheduledTasks.resetCreditNotifications, {
            userId: user._id,
          });
          resetCount++;
          continue;
        }

        const tierLabel = user.tier === "pro" ? "Pro" : "Basic";
        const refreshMsg = `Your ${tierLabel} credits have been refreshed. You now have ${tierCredits} credits for this month.`;

        if (user.telegramId) {
          await ctx.scheduler.runAfter(
            resetCount * 500,
            internal.telegram.guardedSendMessage,
            {
              userId: user._id,
              chatId: user.telegramId,
              body: refreshMsg,
            }
          );
        } else {
          const withinWindow =
            user.lastMessageAt &&
            now - user.lastMessageAt < WHATSAPP_SESSION_WINDOW_MS;
          if (withinWindow) {
            await ctx.scheduler.runAfter(
              resetCount * 500,
              internal.whatsapp.guardedSendMessage,
              {
                userId: user._id,
                to: user.phone,
                body: refreshMsg,
              }
            );
          } else {
            await ctx.scheduler.runAfter(
              resetCount * 500,
              internal.whatsapp.guardedSendTemplate,
              {
                userId: user._id,
                to: user.phone,
                templateName: "ghali_credits_refreshed",
                variables: {
                  "1": String(tierCredits),
                  "2": tierLabel,
                },
              }
            );
          }
        }

        // Reset creditNotificationSent on all user's scheduled tasks
        await ctx.scheduler.runAfter(0, internal.scheduledTasks.resetCreditNotifications, {
          userId: user._id,
        });

        resetCount++;
      }
    }

    console.log(`Credit reset: ${resetCount} users reset`);
  },
});
