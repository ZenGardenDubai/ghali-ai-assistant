import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/** Helper: create a Telegram user and return their userId */
async function createTelegramUser(
  t: ReturnType<typeof convexTest>,
  telegramId: string,
  firstName = "Test"
) {
  const { userId } = await t.mutation(
    internal.users.findOrCreateTelegramUser,
    { telegramId, firstName }
  );
  return userId;
}

describe("getOrCreateReferralCode", () => {
  it("creates a 6-char alphanumeric code", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTelegramUser(t, "111");

    const code = await t.mutation(internal.referral.getOrCreateReferralCode, {
      userId,
    });

    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("returns the same code on subsequent calls", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTelegramUser(t, "222");

    const code1 = await t.mutation(internal.referral.getOrCreateReferralCode, {
      userId,
    });
    const code2 = await t.mutation(internal.referral.getOrCreateReferralCode, {
      userId,
    });

    expect(code1).toBe(code2);
  });

  it("generates different codes for different users", async () => {
    const t = convexTest(schema, modules);
    const user1 = await createTelegramUser(t, "333");
    const user2 = await createTelegramUser(t, "444");

    const code1 = await t.mutation(internal.referral.getOrCreateReferralCode, {
      userId: user1,
    });
    const code2 = await t.mutation(internal.referral.getOrCreateReferralCode, {
      userId: user2,
    });

    // Technically could collide but with 36^6 space it's astronomically unlikely
    expect(code1).not.toBe(code2);
  });
});

describe("getReferralStats", () => {
  it("returns null when no code exists", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTelegramUser(t, "500");

    const stats = await t.query(internal.referral.getReferralStats, { userId });
    expect(stats).toBeNull();
  });

  it("returns stats after code creation", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTelegramUser(t, "501");

    const code = await t.mutation(internal.referral.getOrCreateReferralCode, {
      userId,
    });
    const stats = await t.query(internal.referral.getReferralStats, { userId });

    expect(stats).toEqual({
      code,
      usageCount: 0,
      creditsEarned: 0,
    });
  });
});

describe("applyReferral", () => {
  it("awards +10 credits to referrer and marks new user", async () => {
    const t = convexTest(schema, modules);
    const referrer = await createTelegramUser(t, "600");
    const newUser = await createTelegramUser(t, "601");

    const code = await t.mutation(internal.referral.getOrCreateReferralCode, {
      userId: referrer,
    });

    await t.mutation(internal.referral.applyReferral, {
      newUserId: newUser,
      code,
    });

    // Referrer should have +10 credits (60 base + 10)
    const referrerDoc = await t.run(async (ctx) => ctx.db.get(referrer));
    expect(referrerDoc!.credits).toBe(70);

    // New user should be marked as referred
    const newUserDoc = await t.run(async (ctx) => ctx.db.get(newUser));
    expect(newUserDoc!.referredBy).toBe(referrer);
    expect(newUserDoc!.referralBonusGiven).toBe(true);

    // Referral code stats should be updated
    const stats = await t.query(internal.referral.getReferralStats, {
      userId: referrer,
    });
    expect(stats!.usageCount).toBe(1);
    expect(stats!.creditsEarned).toBe(10);
  });

  it("prevents self-referral", async () => {
    const t = convexTest(schema, modules);
    const user = await createTelegramUser(t, "700");

    const code = await t.mutation(internal.referral.getOrCreateReferralCode, {
      userId: user,
    });

    await t.mutation(internal.referral.applyReferral, {
      newUserId: user,
      code,
    });

    // Credits should remain unchanged (60 base)
    const userDoc = await t.run(async (ctx) => ctx.db.get(user));
    expect(userDoc!.credits).toBe(60);
    expect(userDoc!.referralBonusGiven).toBeUndefined();
  });

  it("prevents double referral bonus", async () => {
    const t = convexTest(schema, modules);
    const referrer = await createTelegramUser(t, "800");
    const newUser = await createTelegramUser(t, "801");

    const code = await t.mutation(internal.referral.getOrCreateReferralCode, {
      userId: referrer,
    });

    // Apply twice
    await t.mutation(internal.referral.applyReferral, {
      newUserId: newUser,
      code,
    });
    await t.mutation(internal.referral.applyReferral, {
      newUserId: newUser,
      code,
    });

    // Should only get +10, not +20
    const referrerDoc = await t.run(async (ctx) => ctx.db.get(referrer));
    expect(referrerDoc!.credits).toBe(70);

    const stats = await t.query(internal.referral.getReferralStats, {
      userId: referrer,
    });
    expect(stats!.usageCount).toBe(1);
  });

  it("skips non-Telegram users", async () => {
    const t = convexTest(schema, modules);
    const referrer = await createTelegramUser(t, "900");

    // Create a WhatsApp user (non-tg: phone)
    const whatsappUserId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const code = await t.mutation(internal.referral.getOrCreateReferralCode, {
      userId: referrer,
    });

    await t.mutation(internal.referral.applyReferral, {
      newUserId: whatsappUserId,
      code,
    });

    // Referrer credits unchanged
    const referrerDoc = await t.run(async (ctx) => ctx.db.get(referrer));
    expect(referrerDoc!.credits).toBe(60);
  });

  it("skips non-Telegram referrer", async () => {
    const t = convexTest(schema, modules);
    const newUser = await createTelegramUser(t, "950");

    // Create a WhatsApp referrer (non-tg: phone)
    const whatsappReferrer = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971509999999",
    });

    const code = await t.mutation(internal.referral.getOrCreateReferralCode, {
      userId: whatsappReferrer,
    });

    await t.mutation(internal.referral.applyReferral, {
      newUserId: newUser,
      code,
    });

    // WhatsApp referrer credits unchanged (60 base)
    const referrerDoc = await t.run(async (ctx) => ctx.db.get(whatsappReferrer));
    expect(referrerDoc!.credits).toBe(60);

    // New user should NOT be marked as referred
    const userDoc = await t.run(async (ctx) => ctx.db.get(newUser));
    expect(userDoc!.referralBonusGiven).toBeUndefined();
  });

  it("skips if referredBy already set", async () => {
    const t = convexTest(schema, modules);
    const referrer1 = await createTelegramUser(t, "960");
    const referrer2 = await createTelegramUser(t, "961");
    const newUser = await createTelegramUser(t, "962");

    const code1 = await t.mutation(internal.referral.getOrCreateReferralCode, {
      userId: referrer1,
    });
    const code2 = await t.mutation(internal.referral.getOrCreateReferralCode, {
      userId: referrer2,
    });

    // Apply first referral
    await t.mutation(internal.referral.applyReferral, {
      newUserId: newUser,
      code: code1,
    });

    // Try to apply second referral — should be rejected
    await t.mutation(internal.referral.applyReferral, {
      newUserId: newUser,
      code: code2,
    });

    // New user should still be referred by referrer1
    const userDoc = await t.run(async (ctx) => ctx.db.get(newUser));
    expect(userDoc!.referredBy).toBe(referrer1);

    // Referrer2 should NOT have gotten credits
    const referrer2Doc = await t.run(async (ctx) => ctx.db.get(referrer2));
    expect(referrer2Doc!.credits).toBe(60);
  });

  it("silently ignores invalid referral code", async () => {
    const t = convexTest(schema, modules);
    const newUser = await createTelegramUser(t, "1000");

    // Should not throw
    await t.mutation(internal.referral.applyReferral, {
      newUserId: newUser,
      code: "ZZZZZZ",
    });

    const userDoc = await t.run(async (ctx) => ctx.db.get(newUser));
    expect(userDoc!.referralBonusGiven).toBeUndefined();
  });
});
