import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { isSystemCommand } from "./lib/utils";

/**
 * Check and deduct a credit for a message.
 * System commands are free (0 credits).
 * Returns: { status: "ok" | "exhausted" | "free", credits: number }
 */
export const deductCredit = internalMutation({
  args: {
    userId: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, { userId, message }) => {
    // System commands are free
    if (isSystemCommand(message)) {
      const user = await ctx.db.get(userId);
      return { status: "free" as const, credits: user?.credits ?? 0 };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.credits <= 0) {
      return { status: "exhausted" as const, credits: 0 };
    }

    await ctx.db.patch(userId, { credits: user.credits - 1 });
    return { status: "ok" as const, credits: user.credits - 1 };
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
        const tierCredits = user.tier === "pro" ? 600 : 60;
        await ctx.db.patch(user._id, {
          credits: tierCredits,
          creditsResetAt: now + 30 * 24 * 60 * 60 * 1000,
        });
        resetCount++;
      }
    }

    console.log(`Credit reset: ${resetCount} users reset`);
  },
});
