# Post-Migration Enhancements

Items to tackle after the core Telegram migration is complete and stable.

---

## 1. Large File Support via Local Bot API Server

**Status:** Done
**Priority:** High — users previously got an error for files >20MB

**Problem:** Convex downloads Telegram files via `api.telegram.org` (20MB limit). The local Bot API server on `ubuntu-16gb-hel1-1:8081` supports up to 2GB but is only accessible from the bot server, not from Convex.

**Solution:** Have the bot server download files from the local API and upload to Convex storage directly.

**Flow:**
```
User sends 50MB file
  → Telegram servers
  → Bot server downloads from localhost:8081 (no limit)
  → Bot server calls /telegram-upload-url to get presigned upload URL
  → Bot server uploads file to Convex storage
  → Bot server sends { storageId, mimeType } in payload to /telegram-message
  → Convex uses storageId directly (no download needed)
```

**Implementation:**
- [x] Add `/telegram-upload-url` HTTP route in Convex (authenticated, returns `generateUploadUrl()`)
- [x] Update bot server to detect large files (>20MB) and download from local API
- [x] Bot server uploads to Convex via presigned URL
- [x] Pass `mediaStorageId` + `mediaMimeType` in payload instead of `mediaFileId`
- [x] `fetchMedia` in Convex is fallback for small files only
- [x] `generateResponse` uses pre-uploaded storageId directly when available

**Files affected:** `convex/http.ts`, `convex/messages.ts`, `convex/telegram.ts`, bot server `index.js`

---

## 2. Payment Flow — Telegram User Identity Linking

**Status:** Done (Option B — Mini App)
**Priority:** High — Pro subscriptions won't work for Telegram users without this

**Problem:** The current billing flow relies on Clerk to identify which user paid. On WhatsApp, this worked because users linked their phone number in Clerk, and we matched `clerkUserId` → `users.clerkUserId` via the phone number. Telegram users don't have a phone number in Clerk — their identifier is `telegramId` (and `phone` is a synthetic `tg:<chatId>`).

**Current WhatsApp flow:**
```
User visits ghali.ae/upgrade → signs in with Clerk (phone number)
  → Clerk Billing processes payment
  → Clerk webhook fires with clerkUserId
  → Convex looks up user by clerkUserId index
  → Activates Pro plan
```

**The gap:** Telegram users have no Clerk account linked to their `telegramId`. When they tap "Upgrade" (inline keyboard → ghali.ae/upgrade), they'd create a Clerk account, but there's no way to link that Clerk account back to their Telegram `telegramId` automatically.

**Possible solutions:**

### Option A — Deep Link Token
1. When Telegram user taps "Upgrade", generate a unique token stored in Convex
2. Inline keyboard URL includes the token: `ghali.ae/upgrade?ref=<token>`
3. Upgrade page passes token to Clerk as metadata
4. On payment webhook, look up token → find Telegram userId → link `clerkUserId`

### Option B — Telegram Mini App
1. Embed the upgrade flow as a Telegram Mini App (WebView)
2. Mini App receives `initData.user.id` (verified server-side)
3. Payment processed within the Mini App context
4. Direct link: `telegramId` → payment → Pro activation

### Option C — Telegram Stars
1. Use Telegram's native payment system (Stars)
2. No external auth needed — payment is tied to the Telegram user directly
3. Requires `sendInvoice` + `pre_checkout_query` handler
4. Zero fees for digital goods, but revenue is in Stars (convertible)

**Considerations:**
- Option A is simplest to implement, works with existing Clerk Billing
- Option B provides the best UX but requires building a Mini App
- Option C eliminates Clerk dependency entirely for Telegram but adds a parallel payment system
- May need to support both Clerk (web/WhatsApp) and Stars (Telegram) long-term

**Files affected:** `convex/billing.ts`, `convex/http.ts`, `convex/users.ts`, `app/(en)/upgrade/page.tsx`, bot server

---

## 3. Feedback Flow — Mini App for Telegram

**Status:** Done
**Priority:** Medium

**Problem:** The current feedback system uses a web link with a token (ghali.ae/feedback?token=...) that identifies the user. Same identity-linking gap as the payment flow — Telegram users need a way to submit feedback that ties back to their `telegramId`.

**Solution:** Built a Telegram Mini App at `/tg/feedback` reusing the upgrade Mini App infrastructure (layout, SDK, dark theme, initData verification). Identity comes from `initData` — no token needed.

**Flow:**
```
User taps "Send Feedback" button (or /feedback command)
  → Mini App opens in Telegram
  → initData verified via /api/tg-auth (HMAC-SHA256)
  → User selects category (bug/feature/general) + writes message
  → POST /api/tg-feedback → verifies initData → forwards to Convex /tg-feedback
  → submitFeedbackByTelegramId mutation (lookup by telegramId index, rate limit, insert)
  → Success card with "Back to Chat" button
```

**Implementation:**
- [x] Add `"telegram_miniapp"` to feedback source enum in schema + feedback.ts
- [x] Add `submitFeedbackByTelegramId` internal mutation in feedback.ts
- [x] Add `POST /tg-feedback` HTTP route in http.ts (Bearer auth)
- [x] Add `/api/tg-feedback` Next.js API route (verifies initData, forwards to Convex)
- [x] Extract `verifyInitData` to shared `app/lib/telegram-auth.ts`
- [x] Create Mini App feedback page at `app/tg/feedback/page.tsx`
- [x] Update `generateFeedbackLink` agent tool (Mini App for Telegram, token for others)
- [x] Add `getFeedbackUrl()` helper in telegram.ts
- [x] Add `/feedback` bot command (registered in BotFather for dev + prod)
- [x] Add `feedback` system command with `web_app` inline keyboard button
- [x] Update layout title from "Ghali — Upgrade" to "Ghali"

**Files affected:** `convex/schema.ts`, `convex/feedback.ts`, `convex/http.ts`, `convex/agent.ts`, `convex/telegram.ts`, `convex/messages.ts`, `convex/constants.ts`, `convex/templates.ts`, `convex/lib/systemCommands.ts`, `app/api/tg-feedback/route.ts`, `app/api/tg-auth/route.ts`, `app/lib/telegram-auth.ts`, `app/tg/feedback/page.tsx`, `app/tg/layout.tsx`

---

## 4. Telegram Onboarding Flow Redesign

**Status:** Done
**Priority:** Medium

**Problem:** Telegram users previously skipped onboarding entirely (`onboardingStep: null` at creation) — no guided introduction, no timezone/language confirmation, no personality seeding.

**Solution:** Inline keyboard-driven onboarding. New users see a welcome message with auto-detected timezone/language, changeable via picker buttons (6 timezones, 4 languages, or type a city). Tapping "Start Chatting" or sending any message completes onboarding and seeds personality/memory files.

**Implementation:**
- [x] Welcome message with inline keyboard (Change Timezone / Change Language / Start Chatting)
- [x] Timezone picker (Dubai, Riyadh, London, Paris, New York, Mumbai, or type a city)
- [x] Language picker (English, العربية, Français, हिन्दी)
- [x] `ob:` callback handlers in `/telegram-callback` route
- [x] `completeTelegramOnboarding` mutation seeds personality + memory files
- [x] Onboarding callbacks guarded — ignored after completion
- [x] Validation: whitelisted timezone/language values from single source of truth
- [x] Step 2 (city text input) with `resolveCityToTimezone` + re-send welcome
- [x] Infographic moved from welcome to `/help` command

**Files affected:** `convex/telegram.ts`, `convex/http.ts`, `convex/users.ts`, `convex/lib/onboarding.ts`, `convex/messages.ts`, `convex/templates.ts`

---

## Remaining Items (moved to GitHub Issues)

| Item | Issue | Priority |
|------|-------|----------|
| Streaming / Typewriter Effect | [#283](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/283) | Low |
| Inline Mode (@GhaliSmartBot query) | [#284](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/284) | Low |
| Message Reactions | [#285](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/285) | Low |
