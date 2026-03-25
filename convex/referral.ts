import { v } from "convex/values";
import { internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/** Get or lazy-create a permanent 6-char referral code for a user. */
export const getOrCreateReferralCode = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("referralCodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) return existing.code;

    const code = crypto.randomUUID().replace(/-/g, "").toUpperCase().slice(0, 6);
    await ctx.db.insert("referralCodes", {
      userId,
      code,
      usageCount: 0,
      creditsEarned: 0,
      createdAt: Date.now(),
    });
    return code;
  },
});

/** Get referral stats for a user. Returns null if no referral code exists yet. */
export const getReferralStats = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const record = await ctx.db
      .query("referralCodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!record) return null;
    return {
      code: record.code,
      usageCount: record.usageCount,
      creditsEarned: record.creditsEarned,
    };
  },
});

/**
 * Apply a referral: award +10 credits to the referrer, mark the new user as referred.
 * Guards: skip self-referral, skip non-Telegram users, skip if already referred.
 */
export const applyReferral = internalMutation({
  args: {
    newUserId: v.id("users"),
    code: v.string(),
  },
  handler: async (ctx, { newUserId, code }) => {
    const newUser = await ctx.db.get(newUserId);
    if (!newUser) return;

    // Only apply for Telegram users
    if (!newUser.phone.startsWith("tg:")) return;

    // Skip if already referred
    if (newUser.referralBonusGiven) return;

    // Find the referral code
    const referralRecord = await ctx.db
      .query("referralCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (!referralRecord) return;

    // Skip self-referral
    if (referralRecord.userId === newUserId) return;

    // Award +10 credits to referrer
    const referrer = await ctx.db.get(referralRecord.userId);
    if (!referrer) return;

    await ctx.db.patch(referralRecord.userId, {
      credits: referrer.credits + 10,
    });

    // Mark new user as referred
    await ctx.db.patch(newUserId, {
      referredBy: referralRecord.userId,
      referralBonusGiven: true,
    });

    // Update referral code stats
    await ctx.db.patch(referralRecord._id, {
      usageCount: referralRecord.usageCount + 1,
      creditsEarned: referralRecord.creditsEarned + 10,
    });
  },
});

/** Get or create the referral code and return the full Telegram deep link. */
export const getReferralLink = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<string> => {
    const code: string = await ctx.runMutation(internal.referral.getOrCreateReferralCode, { userId });
    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "GhaliSmartBot";
    return `https://t.me/${botUsername}?start=${code}`;
  },
});
