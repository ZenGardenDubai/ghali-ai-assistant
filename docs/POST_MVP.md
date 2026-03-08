# Post-MVP Items

Issues, improvements, and tech debt to revisit after MVP completion.

## Security Hardening

- **Add security headers to `next.config.ts`** — CSP (Content-Security-Policy), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security (HSTS), Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy. Needs careful CSP tuning for PostHog, Clerk, and Convex domains.

## Re-engagement for Inactive Users

- **Proactive re-engagement cron** — Daily cron (8:00 UTC / 12:00 Dubai) finds users who haven't messaged in 5+ days, loads their profile + memory, uses Flash to compose a personalized 1-2 sentence WhatsApp check-in, and sends via Twilio template (`TWILIO_TPL_REENGAGEMENT`). Guardrails: 14-day cooldown between re-engagements, always uses template (users are outside 24h window by definition), respects error backoff, free (no credits), never mentions inactivity duration. Requires: new `lastReengagementAt` field on users table, new Twilio Content Template, new cron + mutation + action in `convex/heartbeat.ts`. Consider: opt-out via personality off-limits, minimum message threshold (only re-engage users with 5+ messages), analytics tracking (did user respond within 48h). See `docs/PHASE2_PLAN.md` PR C section for full design.
