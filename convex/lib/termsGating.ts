/**
 * Terms acceptance gating — pure functions (no Convex deps).
 */

// ============================================================================
// needsTermsAcceptance — check if user must accept terms before service access
// ============================================================================

/** Returns true if the user has not yet accepted the Terms of Service. */
export function needsTermsAcceptance(user: { termsAcceptedAt?: number }): boolean {
  return user.termsAcceptedAt === undefined;
}
