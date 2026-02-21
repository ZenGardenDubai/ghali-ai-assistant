import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { isSystemCommand, isAdminCommand } from "./lib/utils";
import {
  CREDITS_BASIC,
  CREDITS_PRO,
  CREDIT_RESET_PERIOD_MS,
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
        resetCount++;
      }
    }

    console.log(`Credit reset: ${resetCount} users reset`);
  },
});
