import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { CREDITS_PRO } from "./constants";

function maskPhone(phone: string): string {
  if (phone.length <= 4) return "***";
  return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
}

export const linkClerkUser = internalMutation({
  args: {
    clerkUserId: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, { clerkUserId, phone }) => {
    // Guard: check if clerkUserId is already linked to another user
    const existingLink = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (existingLink) {
      console.log(`clerkUserId ${clerkUserId} already linked, skipping`);
      return;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();

    if (!user) {
      console.log(`No Ghali user found for phone ${maskPhone(phone)}, skipping link`);
      return;
    }

    await ctx.db.patch(user._id, { clerkUserId });
  },
});

export const handleSubscriptionActive = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user) {
      console.log(`No user found for clerkUserId ${clerkUserId}, skipping activation`);
      return;
    }

    await ctx.db.patch(user._id, {
      tier: "pro",
      credits: CREDITS_PRO,
      subscriptionCanceling: undefined,
    });
  },
});

export const handleSubscriptionCanceled = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user) {
      console.log(`No user found for clerkUserId ${clerkUserId}, skipping cancel`);
      return;
    }

    await ctx.db.patch(user._id, { subscriptionCanceling: true });
  },
});

export const handleSubscriptionEnded = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user) {
      console.log(`No user found for clerkUserId ${clerkUserId}, skipping end`);
      return;
    }

    await ctx.db.patch(user._id, {
      tier: "basic",
      subscriptionCanceling: undefined,
    });
  },
});
