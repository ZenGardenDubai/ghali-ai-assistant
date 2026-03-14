/**
 * Terms acceptance gating — pure functions (no Convex deps).
 * Returns data, caller applies side effects.
 */

import { TEMPLATES } from "../templates";
import { fillTemplate } from "./utils";

const DEFAULT_BASE_URL = "https://ghali.ae";

// ============================================================================
// needsTermsAcceptance — check if user must accept terms before service access
// ============================================================================

/** Returns true if the user has not yet accepted the Terms of Service. */
export function needsTermsAcceptance(user: { termsAcceptedAt?: number }): boolean {
  return !user.termsAcceptedAt;
}

// ============================================================================
// buildAcceptUrl — construct the terms acceptance URL with encoded phone
// ============================================================================

/** Build the terms acceptance URL for a given phone number. */
export function buildAcceptUrl(phone: string, baseUrl: string = DEFAULT_BASE_URL): string {
  const encodedPhone = encodeURIComponent(phone);
  return `${baseUrl}/accept-terms?phone=${encodedPhone}`;
}

// ============================================================================
// buildTermsPromptForNewUser — bilingual welcome + terms link
// ============================================================================

/** Build the bilingual welcome + terms acceptance prompt for a new user. */
export function buildTermsPromptForNewUser(acceptUrl: string, baseUrl: string = DEFAULT_BASE_URL): string {
  return fillTemplate(TEMPLATES.terms_required_new.template, {
    acceptUrl,
    termsUrl: `${baseUrl}/terms`,
    termsUrlAr: `${baseUrl}/ar/terms`,
  });
}

// ============================================================================
// buildTermsPromptForExistingUser — migration prompt for existing users
// ============================================================================

/** Build the terms acceptance prompt for an existing user (migration). */
export function buildTermsPromptForExistingUser(
  name: string | undefined,
  acceptUrl: string
): string {
  return fillTemplate(TEMPLATES.terms_required_existing.template, {
    name: name || "there",
    acceptUrl,
  });
}
