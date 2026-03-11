# Post-MVP Items

Issues, improvements, and tech debt to revisit after MVP completion.

## Security Hardening

- **Add security headers to `next.config.ts`** — CSP (Content-Security-Policy), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security (HSTS), Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy. Needs careful CSP tuning for PostHog, Clerk, and Convex domains.

## Re-engagement for Inactive Users

- **Proactive re-engagement cron** — Daily cron (8:00 UTC / 12:00 Dubai) finds users who haven't messaged in 5+ days, loads their profile + memory, uses Flash to compose a personalized 1-2 sentence WhatsApp check-in, and sends via Twilio template (`TWILIO_TPL_REENGAGEMENT`). Guardrails: 14-day cooldown between re-engagements, always uses template (users are outside 24h window by definition), respects error backoff, free (no credits), never mentions inactivity duration. Requires: new `lastReengagementAt` field on users table, new Twilio Content Template, new cron + mutation + action in `convex/heartbeat.ts`. Consider: opt-out via personality off-limits, minimum message threshold (only re-engage users with 5+ messages), analytics tracking (did user respond within 48h). See `docs/PHASE2_PLAN.md` PR C section for full design.

## Reflection Suppression (Out-of-Band)

- **Move reflection processing outside the main response loop** — The in-line reflection suppression (`extractResponseText`, `stripInlineReflection`) was removed because it caused silent response drops (see #218) and added latency to every response. The LLM occasionally emits internal narration ("Reflecting on...", "Silent reflection...") after memory/profile update tool calls. The current approach is to tolerate occasional reflection leaks rather than risk swallowing real replies. Future fix: run memory/profile updates as a separate post-response step (e.g. `ctx.scheduler.runAfter`) so the main response path never sees reflection text. This decouples user-facing response delivery from background bookkeeping entirely. See PRs #189, #204, and issue #218 for full history.
