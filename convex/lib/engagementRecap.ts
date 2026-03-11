import { CREDITS_BASIC, CREDITS_PRO } from "../constants";

/** Recap trigger for new users — first recap at this credit */
const NEW_USER_FIRST_TRIGGER = 4;

/** Recap interval for new users after the first trigger (every Nth credit after the 4th) */
const NEW_USER_INTERVAL = 8;

/** Recap trigger interval for returning users (every Nth credit) */
const RETURNING_USER_INTERVAL = 12;

type UserForRecap = {
  credits: number;
  tier: "basic" | "pro";
  totalMessages?: number;
};

/**
 * Determines whether the agent should weave an engagement recap/insight
 * into the current response.
 *
 * - New users (first cycle): trigger at 4th credit, then every 8th (4, 12, 20, 28, 36, ...)
 * - Returning users (post-reset): trigger every 12th credit (12, 24, 36, ...)
 */
export function shouldIncludeRecap(user: UserForRecap): boolean {
  const maxCredits = user.tier === "pro" ? CREDITS_PRO : CREDITS_BASIC;
  const creditsUsed = Math.min(maxCredits, maxCredits - user.credits);

  if (creditsUsed <= 0) return false;

  // New user: fewer than 60 lifetime messages means still new to Ghali
  const isNewUser = (user.totalMessages ?? 0) < CREDITS_BASIC;

  if (isNewUser) {
    if (creditsUsed < NEW_USER_FIRST_TRIGGER) return false;
    return (creditsUsed - NEW_USER_FIRST_TRIGGER) % NEW_USER_INTERVAL === 0;
  }

  return creditsUsed % RETURNING_USER_INTERVAL === 0;
}

/**
 * Builds the recap instruction block to append to the agent's system prompt.
 */
export function buildRecapInstruction(creditsUsed: number): string {
  return (
    `🎯 ENGAGEMENT RECAP: This is the user's message #${creditsUsed} this cycle. ` +
    `Weave a brief, natural recap or insight into your response. ` +
    `Options: summarize topics discussed so far, share a behavioral observation about the user, ` +
    `or suggest something new they could try with Ghali. ` +
    `Keep it 1-3 sentences, warm and genuine. ` +
    `Don't label it as a "recap" — make it feel organic, like a natural aside.`
  );
}

/**
 * Returns the recap instruction string if the user should receive one,
 * or an empty string otherwise. Combines check + build in one call.
 */
export function getRecapInstruction(user: UserForRecap): string {
  if (!shouldIncludeRecap(user)) return "";
  const maxCredits = user.tier === "pro" ? CREDITS_PRO : CREDITS_BASIC;
  const creditsUsed = Math.min(maxCredits, maxCredits - user.credits);
  return buildRecapInstruction(creditsUsed);
}
