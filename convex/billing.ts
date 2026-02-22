import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { CREDITS_PRO } from "./constants";

// ============================================================================
// Phone-Based Account Linking
// ============================================================================

export const linkClerkUserByPhone = internalMutation({
  args: {
    phone: v.string(),
    clerkUserId: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { phone, clerkUserId, email }) => {
    // Look up Convex user by phone
    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();

    if (!user) {
      return { success: false, error: "No account found for this phone number" };
    }

    // Idempotent: already linked to this clerkUserId
    if (user.clerkUserId === clerkUserId) {
      // Still update email if provided and not yet stored
      if (email && !user.email) {
        await ctx.db.patch(user._id, { email });
      }
      return { success: true };
    }

    // Guard: check if clerkUserId is already linked to a *different* Convex user
    const existingLink = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (existingLink && existingLink._id !== user._id) {
      return { success: false, error: "This account is already linked to another user" };
    }

    // Link (or re-link) clerkUserId to the Ghali user.
    // Re-linking is safe because the phone was verified via OTP.
    const updates: { clerkUserId: string; email?: string } = { clerkUserId };
    if (email) updates.email = email;
    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

// ============================================================================
// Subscription Handlers
// ============================================================================

export const handleSubscriptionActive = internalMutation({
  args: {
    clerkUserId: v.string(),
    retryCount: v.optional(v.number()),
  },
  handler: async (ctx, { clerkUserId, retryCount = 0 }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user) {
      // The webhook may fire before linkClerkUserByPhone completes.
      // Retry up to 3 times with increasing delay to allow linking to complete.
      if (retryCount < 3) {
        const delayMs = (retryCount + 1) * 3000; // 3s, 6s, 9s
        console.log(`No user found for clerkUserId ${clerkUserId}, retrying in ${delayMs}ms (attempt ${retryCount + 1}/3)`);
        await ctx.scheduler.runAfter(delayMs, internal.billing.handleSubscriptionActive, {
          clerkUserId,
          retryCount: retryCount + 1,
        });
        return;
      }
      console.log(`No user found for clerkUserId ${clerkUserId} after 3 retries, skipping activation`);
      return;
    }

    console.log(`Activating Pro for user ${user._id} (clerkUserId ${clerkUserId}, attempt ${retryCount + 1})`);
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

    // Only downgrade if the user was in a canceling state.
    // This prevents a stale "ended" event from a previous subscription
    // from overriding a fresh "active" event for a new subscription.
    if (!user.subscriptionCanceling) {
      console.log(`User ${user._id} is not in canceling state, skipping downgrade (likely stale ended event)`);
      return;
    }

    await ctx.db.patch(user._id, {
      tier: "basic",
      subscriptionCanceling: undefined,
    });
  },
});
