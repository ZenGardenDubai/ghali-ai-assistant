# Security Audit Report

**Date:** 2026-02-23
**Scope:** Full codebase — Convex backend, Next.js frontend, Twilio webhook, Clerk auth, AI agent
**Tools:** Manual code review, CodeRabbit AI, `pnpm audit`

---

## Executive Summary

A comprehensive security audit identified **10 findings** across the codebase. **7 were fixed immediately**, **1 was fixed during code review** (TOCTOU race condition), and **3 were deferred** to post-MVP (`docs/POST_MVP.md`). All fixes passed 360 unit tests and production build verification.

| Severity | Found | Fixed | Deferred |
|----------|-------|-------|----------|
| Critical | 1 | 1 | 0 |
| High | 3 | 3 | 0 |
| Medium | 5 | 3 | 2 |
| Low | 1 | 0 | 1 |
| **Total** | **10** | **7 + 1** | **3** |

---

## Findings

### 1. [CRITICAL] Public Mutations Allow Privilege Escalation — FIXED

**Location:** `convex/users.ts`, `convex/billing.ts`

**Issue:** Core user and billing functions (`findOrCreateUser`, `getUser`, `getUserByPhone`, `updateUser`, `linkClerkUserByPhone`, etc.) were exported as public `mutation`/`query`. Anyone with the Convex deployment URL could call them directly — creating users, changing tiers, linking arbitrary Clerk accounts, or reading any user's data.

**Fix:** Converted all 7 functions in `users.ts` and `linkClerkUserByPhone` in `billing.ts` from `mutation`/`query` to `internalMutation`/`internalQuery`. These are now only callable from server-side code (httpActions, other internal functions, cron jobs).

**Files changed:**
- `convex/users.ts` — all exports now `internalMutation`/`internalQuery`
- `convex/billing.ts` — `linkClerkUserByPhone` now `internalMutation`
- `convex/http.ts` — updated caller from `api.users.*` to `internal.users.*`
- 6 test files updated to use `internal.*` references

---

### 2. [HIGH] No Webhook Replay Protection — FIXED

**Location:** `convex/http.ts` (WhatsApp webhook handler)

**Issue:** The webhook handler had no deduplication. If Twilio retried a webhook (network timeout, slow response) or an attacker replayed a captured webhook, the message would be processed multiple times — consuming credits and sending duplicate AI responses.

**Fix:** Added atomic MessageSid deduplication using a dedicated `processedWebhooks` table. A single `tryMarkProcessed` mutation atomically checks and marks in one transaction, preventing TOCTOU race conditions. Entries auto-expire after 24 hours via daily cron cleanup.

**Files created:**
- `convex/webhookDedup.ts` — `tryMarkProcessed` (atomic check+mark), `cleanupExpired`

**Files changed:**
- `convex/schema.ts` — added `processedWebhooks` table with `by_messageSid` and `by_processedAt` indexes
- `convex/http.ts` — dedup check before processing (lines 59-71)
- `convex/crons.ts` — daily cleanup at 02:00 UTC
- `convex/constants.ts` — `WEBHOOK_DEDUP_TTL_MS = 24h`

---

### 3. [HIGH] No Input Length Limit on Messages — FIXED

**Location:** `convex/http.ts`

**Issue:** No cap on incoming message body length. An attacker could send an extremely long message (e.g. 1MB of text) which would be stored in the database and forwarded to the LLM, causing cost amplification (token charges scale with input length).

**Fix:** Messages exceeding `MAX_MESSAGE_LENGTH` (10,000 chars) are truncated before storage and AI processing.

**Files changed:**
- `convex/http.ts` — truncation at line 55
- `convex/constants.ts` — `MAX_MESSAGE_LENGTH = 10_000`

---

### 4. [HIGH] Account Linking Endpoint Exposed — FIXED

**Location:** `convex/billing.ts`, `app/api/link-phone/route.ts`

**Issue:** `linkClerkUserByPhone` was a public mutation callable by any client. Combined with the Next.js API route that called it via `ConvexHttpClient`, an attacker could link any phone number to any Clerk account, hijacking a user's subscription status.

**Fix:** Two-layer protection:
1. **Convex side:** Converted to `internalMutation`, created `/link-phone` HTTP endpoint secured with `INTERNAL_API_SECRET` (shared bearer token)
2. **Next.js side:** Clerk middleware enforces authentication on `/api/link-phone`; the API route verifies the user's identity via `auth()`, retrieves their phone from Clerk (not user input), and calls the Convex HTTP endpoint with the server-to-server secret

**Files changed:**
- `convex/billing.ts` — `linkClerkUserByPhone` → `internalMutation`
- `convex/http.ts` — added `/link-phone` HTTP endpoint with secret validation
- `app/api/link-phone/route.ts` — rewrote to use fetch + bearer token instead of ConvexHttpClient
- `middleware.ts` — added Clerk `auth.protect()` for `/api/link-phone`
- `.env.local` — added `INTERNAL_API_SECRET`

---

### 5. [MEDIUM] Prompt Injection via User Messages — FIXED

**Location:** `convex/messages.ts`

**Issue:** User messages were concatenated into the agent prompt with a plain text marker (`User message: ${prompt}`). Crafted input like "Ignore previous instructions and..." could potentially manipulate the agent's behavior.

**Fix:** Wrapped user messages in XML-style delimiters (`<user_message>...</user_message>`) which modern LLMs respect as a boundary between instructions and user content. This is a defense-in-depth measure — not bulletproof, but significantly raises the bar.

**Before:** `User message: ${prompt}`
**After:** `<user_message>\n${prompt}\n</user_message>`

**File changed:** `convex/messages.ts` (line 513)

---

### 6. [MEDIUM] Image Generation Error Leaks SDK Details — FIXED

**Location:** `convex/images.ts`

**Issue:** On image generation failure, the raw error message from the AI SDK was returned to the user (`Image generation failed: ${error.message}`). This could expose internal model names, API error codes, rate limit details, or infrastructure information.

**Fix:** Replaced with a generic user-friendly message.

**Before:** `error: \`Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}\``
**After:** `error: "Image generation failed. Please try again with a different prompt."`

**File changed:** `convex/images.ts` (line 142)

---

### 7. [MEDIUM] Middleware Does Not Enforce Auth on API Routes — FIXED

**Location:** `middleware.ts`

**Issue:** Clerk middleware was present but permissive — it ran on API routes without enforcing authentication, acting only as a pass-through. The `/api/link-phone` endpoint relied solely on application-level auth checks.

**Fix:** Added route matcher to enforce Clerk `auth.protect()` on `/api/link-phone`, providing defense-in-depth alongside the server-to-server secret.

**File changed:** `middleware.ts`

---

### 8. [MEDIUM] No Security Headers — DEFERRED

**Location:** `next.config.ts`

**Issue:** No HTTP security headers configured. Missing: CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy. This leaves the app vulnerable to clickjacking, MIME-type sniffing, and reduces defense against XSS.

**Status:** Deferred to post-MVP. Requires careful CSP tuning for PostHog, Clerk, and Convex domains. See `docs/POST_MVP.md` → Security Hardening.

---

### 9. [MEDIUM] Phone Number Visible in Upgrade URL — DEFERRED

**Location:** Upgrade flow URL params

**Issue:** The upgrade URL includes `?phone=+971...` in the query string, which is visible in browser history, referrer headers, and PostHog pageview captures.

**Status:** Deferred to post-MVP. Plan: replace with an opaque short-lived token or use `sessionStorage`. See `docs/POST_MVP.md` → Security Hardening.

---

### 10. [LOW] PostHog Captures Sensitive URL Params — DEFERRED

**Location:** PostHog `PostHogPageView` component

**Issue:** The `PostHogPageView` component captures the full URL including query parameters. Phone numbers from the upgrade URL are sent to PostHog as part of pageview events.

**Status:** Deferred to post-MVP. Plan: strip sensitive params before sending, or configure PostHog server-side property filtering. See `docs/POST_MVP.md` → Security Hardening.

---

## CodeRabbit Review Finding

### 11. [HIGH] TOCTOU Race Condition in Webhook Dedup — FIXED

**Location:** `convex/webhookDedup.ts`, `convex/http.ts`

**Issue:** Found during CodeRabbit code review. The original dedup implementation used a two-step check-then-mark pattern (separate `isProcessed` query + `markProcessed` mutation). Between the two calls, a concurrent duplicate webhook could pass the check before the first one completed the mark.

**Fix:** Replaced with a single atomic `tryMarkProcessed` mutation that checks for an existing record and inserts in one transaction. If the MessageSid exists, returns `false`; otherwise inserts and returns `true`.

**Files changed:**
- `convex/webhookDedup.ts` — replaced `isProcessed` + `markProcessed` with `tryMarkProcessed`
- `convex/http.ts` — single `runMutation` call instead of query + mutation

---

## Dependency Audit

`pnpm audit` found **0 production vulnerabilities**. Two advisory-level issues exist in dev dependencies only:

| Package | Severity | Context |
|---------|----------|---------|
| `minimatch` (via eslint) | Advisory | Dev only, no runtime impact |
| `ajv` (via eslint) | Advisory | Dev only, no runtime impact |

---

## Existing Security Controls (Verified Good)

| Control | Location | Status |
|---------|----------|--------|
| Twilio signature validation (HMAC via Web Crypto) | `convex/lib/twilio.ts` | Correct |
| Clerk webhook verification (Svix) | `convex/lib/clerk.ts` | Correct |
| Country code blocking | `convex/http.ts` | Active |
| Rate limiting (per-user token bucket) | `convex/rateLimiting.ts` | 30/min + 40 burst |
| Credit system (prevents unlimited usage) | `convex/credits.ts` | Working |
| `.env*` in `.gitignore` | `.gitignore` | Confirmed |
| No `NEXT_PUBLIC_` prefix on secrets | `.env.local` | Confirmed |
| No `dangerouslySetInnerHTML` with user content | All React components | Only JSON-LD (safe) |
| Admin commands require `isAdmin` flag | `convex/lib/adminCommands.ts` | Correct |

---

## Deployment Checklist

- [x] Set `INTERNAL_API_SECRET` in Convex dev environment
- [ ] Set `INTERNAL_API_SECRET` in Convex production: `npx convex env set INTERNAL_API_SECRET <secret> --prod`
- [ ] Implement deferred security headers (post-MVP)
- [ ] Sanitize phone from upgrade URL (post-MVP)
- [ ] Configure PostHog URL filtering (post-MVP)

---

## Verification

- **360 tests passing** (21 test files)
- **Production build successful** (`pnpm build`)
- **Convex typecheck passing** (`npx convex typecheck`)
- **CodeRabbit review clean** (1 finding → fixed)
