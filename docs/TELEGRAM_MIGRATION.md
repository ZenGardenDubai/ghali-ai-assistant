# Telegram Migration Plan

Full migration from WhatsApp (360dialog) to Telegram Bot API.

**Status**: In Progress (Step 7)
**Branch**: `feat/telegram-integration`
**Target**: 2-3 weeks
**Bots**: `@GhaliSmartBot` (prod), `@GhalDev_Bot` (staging)
**Local Bot API Server**: Running on ubuntu-16gb-hel1-1, port 8081 (Docker)
**Bot Server**: `/root/clawd/projects/ghali-telegram/index.js` (Node.js + Telegraf, systemd, long polling)

---

## Architecture

```
User
  |
Telegram servers
  | (long polling)
Bot server (Node.js on ubuntu-16gb-hel1-1)
  | POST /telegram-message
Convex HTTP action
  | scheduler.runAfter(0, ...)
generateResponse (reused, channel="telegram")
  | calls https://api.telegram.org directly
Telegram -> User
```

Convex cannot reach localhost:8081. Convex sends via `api.telegram.org` directly.
The local Bot API server is only used by the bot server for receiving/downloading large files.

---

## Decisions

| Decision              | Choice                                                                 |
|-----------------------|------------------------------------------------------------------------|
| User identity         | New `telegramId` (string, stores int64) field + `by_telegramId` index  |
| Onboarding            | Auto-detect name (firstName) + timezone (Asia/Dubai), send welcome infographic, ready immediately |
| Handler               | Reuse existing `generateResponse` with `channel` parameter            |
| Media support         | Full parity day one (text, photos, voice, video, documents, stickers, location) |
| Auth (bot server → Convex) | `INTERNAL_API_SECRET` as Bearer token                           |
| Country code blocking | Skip (Telegram doesn't expose phone numbers)                          |
| Message splitting     | 4096 chars, up to 5 chunks                                            |
| Formatting            | HTML mode (`<b>`, `<i>`, `<pre>`, `<code>`), escape `&<>`             |
| Terms acceptance      | Auto-set `termsAcceptedAt` at user creation (prevents stale cleanup cron deletion) |
| Inline keyboards      | Yes — upgrade prompts, help menu, confirmations, settings             |
| Streaming/typewriter  | Yes — editMessageText loop (send placeholder → progressive updates)   |
| /start deep linking   | Yes — acquisition tracking (`start=ig`, `start=web`, `start=referral_xyz`) |
| Mini Apps             | Yes — settings panel, upgrade/billing flow embedded in Telegram       |
| Inline Mode           | Yes, Phase 3 — `@GhaliSmartBot query` from any chat                  |
| Payment flow          | Inline keyboard → Clerk billing URL (existing ghali.ae/upgrade page)  |
| Frontend agent        | Use `frontend-design` skill for all frontend/branding work            |

---

## Telegram Compliance

| Requirement                        | Status              | Action                                      |
|------------------------------------|----------------------|---------------------------------------------|
| Privacy policy (via BotFather)     | Have `/terms` page   | Set URL in BotFather, update copy            |
| Data deletion on request           | Have `deleteAccount`  | Expose as `/deletedata` bot command          |
| Data encryption at rest            | Convex handles this   | Verify, no code change                       |
| No AI training on user data        | We don't do this      | No change                                    |
| Anti-spam (proactive messaging)    | Heartbeat is legit    | Keep opt-out mechanism                       |
| Bot token security                 | In env vars           | No change                                    |
| Branding separate from Telegram    | Ghali branding exists | No change                                    |
| `/paysupport` command              | N/A (using Clerk)     | Not needed unless we adopt Telegram Stars    |

---

## WhatsApp Pipeline — Preserved (Dormant)

WhatsApp code is **kept intact but dormant**. Meta has repeatedly disabled our WhatsApp Business account. If the appeal succeeds and the account is restored, WhatsApp can be re-enabled with zero code changes.

**What stays in the codebase (untouched):**
- `convex/lib/whatsapp.ts` — webhook parsing, signature validation
- `convex/lib/whatsappSend.ts` — 360dialog API, send text/media/template
- `convex/whatsapp.ts` — Convex actions
- `/whatsapp-webhook` routes in `convex/http.ts`
- Template system (`TEMPLATE_DEFINITIONS`, `guardedSendTemplate`, etc.)
- Session window logic, template gating, outbound message tracking
- `scripts/create-templates-360dialog.sh`
- WhatsApp constants (`WHATSAPP_SESSION_WINDOW_MS`, etc.)
- WhatsApp env vars (`DIALOG360_API_KEY`, `WEBHOOK_SECRET`, etc.)

**Frontend:** WhatsApp CTAs are **hidden** (not removed) — can be toggled back on.

**Not needed for Telegram** (but preserved for WhatsApp):
- 24h session window
- Template approval system
- Terms acceptance gate (Telegram auto-accepts at creation)
- Country code blocking (Telegram doesn't expose phone numbers)
- HMAC-SHA256 webhook validation (Telegram uses Bearer token)

---

## New Telegram Files (added alongside WhatsApp)

| New File                            | Purpose                                                       |
|-------------------------------------|---------------------------------------------------------------|
| `convex/lib/telegram.ts`           | Parse updates, escapeHtml, formatForTelegram, splitForTelegram |
| `convex/lib/telegramSend.ts`       | Send text/media/typing, edit messages, inline keyboards        |
| `convex/telegram.ts`              | Convex actions wrapping send utilities                         |
| `/telegram-message` route          | HTTP POST route (receives from bot server)                     |
| `/telegram-callback` route         | HTTP POST route (receives callback queries)                    |
| `convex/lib/telegram.test.ts`      | Unit tests for formatting/splitting                            |
| `convex/lib/telegramSend.test.ts`  | Unit tests for API call construction                           |

**Frontend (hidden, not replaced):**

| WhatsApp Component (hidden)         | Telegram Component (added)                                    |
|-------------------------------------|---------------------------------------------------------------|
| Sticky WhatsApp CTA (green)        | Sticky Telegram CTA (blue `#2AABEE`)                         |
| WhatsApp upgrade buttons           | Telegram upgrade buttons                                      |
| `whatsapp-color-icon.svg` (kept)   | `telegram-svgrepo-com.svg` (already in `public/`)            |

**Environment:**

| Env Var                  | Status                                          |
|--------------------------|-------------------------------------------------|
| `TELEGRAM_BOT_TOKEN`    | **Add** — new                                   |
| `INTERNAL_API_SECRET`    | **Keep** — reused for bot server auth            |
| `DIALOG360_API_KEY`      | **Keep** — dormant, needed if WhatsApp restored  |
| `WEBHOOK_SECRET`         | **Keep** — dormant                               |
| `WEBHOOK_VERIFY_TOKEN`   | **Keep** — dormant                               |
| `WHATSAPP_NUMBER`        | **Keep** — dormant                               |

---

## What Stays UNTOUCHED

- Agent (`convex/ghali/agent.ts`), all AI tools
- Credit system, billing (Clerk)
- User files (profile, memory, personality, heartbeat)
- RAG pipeline, document processing
- Voice transcription (Whisper)
- Rate limiting logic (per-user)
- Circuit breaker
- Deduplication (reuse with Telegram `message_id`)
- Web chat frontend (separate channel)

---

## Schema Changes

```
users table:
  + telegramId: v.optional(v.string())        // int64 stored as string
  + index("by_telegramId", ["telegramId"])
  ~ termsAcceptedAt: auto-set at creation for Telegram users
  ~ onboardingStep: null at creation for Telegram users (skip onboarding)
```

---

## Environment Variables

### Add to Convex
- `TELEGRAM_BOT_TOKEN` — prod bot token (`@GhaliSmartBot`)

### Keep (all existing vars preserved — WhatsApp dormant, not removed)
- `INTERNAL_API_SECRET` — reused for bot server → Convex auth
- `DIALOG360_API_KEY` — dormant (WhatsApp)
- `WEBHOOK_SECRET` — dormant (WhatsApp)
- `WEBHOOK_VERIFY_TOKEN` — dormant (WhatsApp)
- `WHATSAPP_NUMBER` — dormant (WhatsApp)

---

## Proactive Messaging (Simplified)

Heartbeat check-ins and reminders no longer need:
- Session window checks
- Template approval
- Template inactivity gates
- Daily template caps

They call `sendTelegramMessage()` directly. Only constraint: Telegram anti-spam rule (our use case is legitimate — user-configured, contextual check-ins).

---

## Implementation Steps

Each step has a **manual test checkpoint** (marked with `TEST`). Do not proceed to the next step until the checkpoint passes.

---

### Step 0 — Verify Infrastructure Access ✅

Confirm we can reach the existing servers and services before writing any code.

- [x] SSH into `ubuntu-16gb-hel1-1` and verify bot server is running: `systemctl status ghali-telegram`
- [x] Verify local Bot API server is running: `curl http://localhost:8081/bot<DEV_TOKEN>/getMe`
- [x] Verify dev bot responds: send `/start` to `@GhalDev_Bot` on Telegram
- [x] Verify prod bot responds: send `/start` to `@GhaliSmartBot` on Telegram
- [x] Verify Convex dev deployment is accessible: `convex dev` runs without errors
- [x] Verify `INTERNAL_API_SECRET` is set in Convex dev: `npx convex env get INTERNAL_API_SECRET`
- [x] Read current bot server code: `cat /root/clawd/projects/ghali-telegram/index.js`

**TEST:** ✅ All services reachable, both bots respond to `/start`, Convex dev runs. Server IP: `157.180.120.93`.

---

### Step 1 — Schema + Constants (no behavior change) ✅

Safe changes — adds new fields, doesn't break existing WhatsApp flow.

- [x] Add `telegramId` field + `by_telegramId` index to `convex/schema.ts`
- [x] Add Telegram constants to `convex/constants.ts`:
  - `TELEGRAM_MAX_LENGTH = 4096`
  - `TELEGRAM_MAX_CHUNKS = 5`
  - `TELEGRAM_MESSAGE_DELAY_MS = 500`
  - `TELEGRAM_EDIT_INTERVAL_MS = 700` (for streaming)
- [x] Set `TELEGRAM_BOT_TOKEN` env var in Convex dev dashboard
- [x] Deploy to dev: `convex dev` picks up schema changes

**TEST:** ✅ `convex dev` runs without errors. Schema migration succeeded. 835/835 tests pass.

---

### Step 2 — Telegram Send Utilities (isolated, no routes yet) ✅

Build the Telegram API layer. Testable in isolation via unit tests.

- [x] Create `convex/lib/telegramSend.ts`:
  - [x] `telegramApiCall()` — base HTTP call to `api.telegram.org/bot<token>/<method>`
  - [x] `sendTelegramMessage()` — send text (HTML parse mode, handles splitting)
  - [x] `sendTelegramPhoto()` — send image with caption
  - [x] `sendTelegramDocument()` — send document
  - [x] `sendTelegramAudio()` — send audio
  - [x] `sendTelegramVideo()` — send video
  - [x] `sendChatAction()` — typing indicators
  - [x] `getTelegramFile()` — resolve file_id → download URL + download binary
  - [x] `editMessageText()` — edit sent message (for streaming)
  - [x] `sendInlineKeyboard()` — send message with inline buttons
  - [x] `answerCallbackQuery()` — acknowledge button taps
- [x] Create `convex/lib/telegram.ts`:
  - [x] `escapeHtml()` — escape `&`, `<`, `>`
  - [x] `formatForTelegram()` — AI markdown → Telegram HTML
  - [x] `splitForTelegram()` — reuse `splitLongMessage` with 4096/5 params
- [x] Write tests: `convex/lib/telegram.test.ts` (24 tests — escapeHtml, formatForTelegram, splitForTelegram)
- [x] Write tests: `convex/lib/telegramSend.test.ts` (14 tests — API call construction, message splitting)

**TEST:** ✅ 42/42 test files pass (873 tests). All new + existing tests pass.

---

### Step 3 — Convex Actions + User Creation ✅

Wrap send utilities in Convex actions. Add Telegram user creation.

- [x] Create `convex/telegram.ts` — Convex actions:
  - [x] `sendMessage` action (wraps `sendTelegramMessage`)
  - [x] `sendMedia` action (wraps photo/doc/audio/video)
  - [x] `fetchMedia` action (wraps `downloadTelegramFile`)
  - [x] `sendTypingIndicator` action (wraps `sendChatAction`)
  - [x] `editMessage` action (wraps `editMessageText`)
  - [x] `sendKeyboard` action (wraps `sendInlineKeyboard`)
  - [x] `answerCallbackQuery` action
  - [x] `guardedSendMessage` action (check opt-out, rate limit, then send)
- [x] Add `findOrCreateTelegramUser()` to `convex/users.ts`:
  - [x] Lookup by `telegramId` index
  - [x] If new: create with `termsAcceptedAt: Date.now()`, `onboardingStep: null`, timezone `Asia/Dubai`, name from `firstName`
  - [x] Phone field: `tg:<chatId>` (placeholder, required by schema)
  - [x] Create 4 user files (memory, personality, heartbeat, profile)
  - [x] Fire `trackUserNew` + `identifyUser` analytics
  - [x] Returns `{ userId, isNew }` (isNew used for welcome message in Step 4)

**TEST:** ✅ Typecheck passes. 42/42 test files pass (873 tests).

---

### Step 4 — HTTP Route + Handler Integration ✅

Wire up the webhook and modify generateResponse for channel awareness.

- [x] Add `/telegram-message` POST route to `convex/http.ts`:
  - [x] Validate `Authorization: Bearer <INTERNAL_API_SECRET>` (timing-safe)
  - [x] Parse JSON body: `{ chatId, messageText, telegramMessageId, firstName, username, mediaType, mediaFileId, startParam }`
  - [x] Dedup by `tg:<telegramMessageId>`
  - [x] Fire typing indicator immediately
  - [x] Call `findOrCreateTelegramUser`
  - [x] Send welcome infographic to new users
  - [x] Map media types (photo→image/jpeg, voice→audio/ogg, etc.)
  - [x] Schedule `saveIncoming` with `channel: "telegram"`, `chatId`
  - [x] Return 200 immediately
- [x] Add `channel` + `chatId` params to `saveIncoming` mutation (passed through to `generateResponse`)
- [x] Modify `generateResponse` in `convex/messages.ts`:
  - [x] Add `channel` + `chatId` parameters (backwards compatible — defaults to WhatsApp)
  - [x] `isTelegram` flag drives channel-aware `guardedSendMessage` / `guardedSendMedia`
  - [x] Skip terms acceptance gate for Telegram (`!isTelegram && needsTermsAcceptance`)
  - [x] Low-credit warning uses `internal.telegram.guardedSendMessage` when Telegram
- [x] Update bot server (`/root/clawd/projects/ghali-telegram/index.js`):
  - [x] Forward all messages to Convex HTTP action with auth header
  - [x] Extract media (photo/voice/audio/video/document/sticker/location)
  - [x] Parse `/start` deep link parameter
  - [x] Handle message captions for media
- [x] Restart bot server: `systemctl restart ghali-telegram`

**TEST:** ✅ End-to-end working!
- User created: `telegramId=1862084559`, `termsAcceptedAt` set, `onboardingStep=null`
- 3 messages sent and processed (credits: 57/60)
- AI responses sent back via Telegram
- No errors in bot server or Convex logs

---

### Step 5 — Media Support ✅

Full media handling implemented during Steps 4 + CodeRabbit fixes.

- [x] `/telegram-message` route accepts `mediaType`, `mediaFileId`, `mediaMimeType`
- [x] Bot server forwards media with actual `mime_type` from Telegram payload
- [x] `fetchMedia` downloads via Bot API → stores directly in Convex storage (no base64)
- [x] File size check (>20MB returns user-friendly error)
- [x] Voice notes: download → Convex storage → Whisper transcription → text prompt
- [x] Documents: download → Convex storage → Gemini Flash extraction → RAG indexing
- [x] Media sending: `guardedSendMedia` routes to Telegram when `isTelegram`
- [x] Reply-to-media: `replyToMessageId` extracted from bot server, `telegramStorageId` fallback for `mediaStorage`

**TEST:** ✅ All media types working:
1. Photo → bot describes it
2. Voice note → bot responds to transcript
3. PDF document → bot acknowledges and processes
4. Location → bot acknowledges coordinates

---

### Step 6 — Inline Keyboards + Callback Queries ✅

Add interactive buttons to responses.

- [x] Add `/telegram-callback` POST route to `convex/http.ts` for callback queries
- [x] Update bot server to forward callback queries to Convex (`/telegram-callback`)
- [x] Bot server uses base URL + separate paths for messages and callbacks
- [x] Add inline keyboard to system responses:
  - [x] Credit exhaustion → "Upgrade to Pro" URL button
  - [x] Help response → "Credits" / "Privacy" callback buttons + "Upgrade" URL button
  - [x] Account/credits response → "Upgrade to Pro" URL button
  - [x] Welcome message → "Help" callback + "Upgrade" URL buttons
  - [x] Low credit warning → "Upgrade to Pro" URL button (via `guardedSendKeyboard`)
- [x] `guardedSendMessage` accepts optional `keyboard` param for Telegram
- [x] `guardedSendKeyboard` action for scheduled sends with inline buttons
- [x] Handle callback query processing in Convex:
  - [x] `answerCallbackQuery` first (within 10s)
  - [x] `cmd:*` callbacks processed as regular messages through `saveIncoming`

**TEST:** Send to `@GhalDev_Bot`:
1. Type "help" → response has inline keyboard buttons
2. Tap a button → bot responds appropriately
3. Credits/upgrade buttons open correct URL

---

### Step 7 — /start Deep Linking + Typing Indicators

- [ ] Parse `startParam` in `/telegram-message` route
- [ ] Log acquisition source in user record + PostHog `trackUserNew` event
- [ ] Customize welcome message per source (optional, can just log for now)
- [ ] Implement context-appropriate typing indicators:
  - [ ] Send `typing` for text, `upload_document` for doc processing, etc.
  - [ ] Refresh every 4s for long operations

**TEST:**
1. Open `t.me/GhalDev_Bot?start=test_source` → user created with source logged in PostHog
2. Send a message → typing indicator appears while processing
3. Send a document → upload indicator appears

---

### Step 8 — Streaming / Typewriter Effect

- [ ] Modify `generateResponse` for Telegram to use streaming:
  - [ ] Send placeholder "Thinking..." message, capture `message_id`
  - [ ] As AI generates, batch `editMessageText` updates every 700ms
  - [ ] Add cursor `▌` to intermediate edits
  - [ ] Final edit removes cursor
  - [ ] Fallback: if edit fails (429), skip intermediate updates, send final as new message
- [ ] Only for AI responses, not system commands

**TEST:** Send a question requiring a long response to `@GhalDev_Bot`:
1. "Thinking..." appears immediately
2. Text progressively reveals with cursor
3. Final message has no cursor
4. Response content is correct and complete

---

### Step 9 — Frontend Branding (use `frontend-design` skill)

Keep existing design intact — only swap platform-specific elements. **Hide** WhatsApp CTAs (do not remove).

- [ ] **Hide** sticky WhatsApp CTA (e.g., conditional render / feature flag)
- [ ] **Add** sticky Telegram CTA (blue `#2AABEE`, `telegram-svgrepo-com.svg`) — same position, same design, different color/icon/link
- [ ] **Hide** WhatsApp buttons on upgrade page, **add** Telegram buttons (same design, blue, Telegram icon)
- [ ] Update start page copy and links (`wa.me/...` → `t.me/GhaliSmartBot`)
- [ ] Update terms page copy (WhatsApp references → Telegram, keep WhatsApp mentioned as secondary/paused)
- [ ] Update translations (EN + AR) — add `telegramUrl`, keep `whatsappUrl` in translations file
- [ ] Keep `public/whatsapp-color-icon.svg` (do not delete)
- [ ] Update Google Ads conversion event name (`whatsapp_cta_click` → `telegram_cta_click`)

**IMPORTANT:** Do not change layouts, component structure, animations, or overall design. Only swap colors, icons, links, and copy text. WhatsApp components are hidden, not removed — they can be re-enabled if the WhatsApp account is restored.

**TEST:** `pnpm build` succeeds. Visually verify ghali.ae — Telegram CTAs visible, WhatsApp CTAs hidden, correct blue color, correct icon, no broken links. Arabic version also correct.

---

### Step 10 — BotFather Configuration + Docs

- [ ] Register bot commands in BotFather (both dev and prod):
  - `/start` — Start chatting with Ghali
  - `/help` — Show available commands
  - `/privacy` — View privacy policy
  - `/deletedata` — Request data deletion
  - `/settings` — Open settings
  - `/upgrade` — Upgrade to Pro
- [ ] Set privacy policy URL in BotFather → `ghali.ae/terms`
- [ ] Set bot description and about text
- [ ] Update `CLAUDE.md` (tech stack, message flow, architecture — note both channels exist, Telegram is primary)
- [ ] Update `docs/ARCHITECTURE.md`
- [ ] Update `docs/POSTHOG.md` (event names)

**TEST:** Open `@GhaliSmartBot` info page — commands list, description, about text all correct. Privacy policy link works.

---

### Step 11 — Advanced Features (future)

These are planned but not part of the initial migration.

- [ ] **Inline Mode**: `@GhaliSmartBot query` from any chat
- [ ] **Mini Apps**: Settings panel, upgrade flow embedded in Telegram
- [ ] **Message reactions**: Emoji feedback on messages

---

## Inline Keyboards

Native inline buttons attached to messages. No approval flags needed (unlike WhatsApp).

**Where to use:**
- **Upgrade prompts**: "Upgrade to Pro" button → opens `ghali.ae/upgrade` URL
- **Help responses**: Quick action buttons (Credits, Settings, Privacy)
- **Credit exhaustion**: "Upgrade" + "Check Reset Date" buttons
- **Welcome message**: "Get Started" + "Help" buttons
- **Confirmations**: "Yes, delete my data" / "Cancel" for destructive actions

**Button types:**
- `url` — opens link in browser (for upgrade, privacy policy, etc.)
- `callback_data` — triggers callback query to bot (for confirmations, settings toggles)
- `web_app` — opens Mini App in Telegram WebView (for settings panel)

**Callback flow:**
```
User taps button → Telegram sends callback_query → Bot server forwards to Convex
→ Convex handles action → answerCallbackQuery (within 10s) → optional message update
```

---

## Streaming / Typewriter Effect

Use `editMessageText` to progressively reveal AI responses.

**Flow:**
1. Send placeholder: "Thinking..." (get `message_id` back)
2. As AI generates tokens, batch updates every 600-800ms
3. Call `editMessageText` with accumulated text + cursor `▌`
4. On completion, final `editMessageText` without cursor

**Rate limits:**
- ~20 edits per message per minute
- ~30 global edits per second
- 1 edit per second per user (safe interval: 600-800ms)

**When to use:** All AI responses (not system commands, not template messages).

**Fallback:** If edit fails (429 rate limit), skip intermediate updates and send final response.

---

## /start Deep Linking

Track acquisition sources via `t.me/GhaliSmartBot?start=PARAMETER`.

**Parameters:**
- `start=web` — from ghali.ae website
- `start=ig` — from Instagram bio/ad
- `start=referral_USERID` — from user referral
- `start=promo_CAMPAIGN` — promotional campaign

**Implementation:**
- Bot server parses `/start PARAMETER` and includes `startParam` in payload to Convex
- Convex logs source in user record + PostHog analytics
- Welcome message can be customized per source

---

## Typing Indicators

Use `sendChatAction` with context-appropriate action types:

| User sends | Action to show |
|---|---|
| Text message | `typing` |
| Photo/image | `typing` (processing) |
| Voice note | `typing` (transcribing) |
| Document | `upload_document` (processing) |
| Video | `typing` |

Refresh every 4 seconds for long operations (each action displays ~5 seconds).

---

## Mini Apps (Future — Phase 3)

Telegram Web Apps embedded in the bot via WebView.

**Planned Mini Apps:**
1. **Settings panel** (high priority) — language, tone, emoji prefs, notification settings
2. **Upgrade flow** (high priority) — display plans, link to Clerk billing
3. **Account dashboard** (medium) — credits, usage stats, data controls
4. **Image gallery** (medium) — browse AI-generated images

**Auth:** Validate `initData` hash server-side using bot token. Never trust client-side identity.

**Entry points:**
- Menu button (always visible) → Settings Mini App
- Inline keyboard button with `web_app` type
- `/settings` command
- Deep link: `t.me/GhaliSmartBot?start=app_settings`

---

## Inline Mode (Future — Phase 3)

Users query Ghali from any chat: `@GhaliSmartBot translate hello to Arabic`

**Flow:**
1. User types `@GhaliSmartBot query` in any chat
2. Telegram sends `inline_query` update to bot
3. Bot server forwards to Convex
4. Convex processes (credit check, short AI response)
5. Returns `InlineQueryResultArticle` array
6. User taps result → message inserted into their chat

**Credit handling:** 1 credit per inline query (same as regular message).

**Use cases:** Quick translation, grammar fixes, summarization, calculations.

---

## Bot Server Payloads

### Message (POST /telegram-message)
```json
Authorization: Bearer <INTERNAL_API_SECRET>
Content-Type: application/json

{
  "chatId": 123456789,
  "messageText": "Hello Ghali!",
  "telegramMessageId": 42,
  "firstName": "Hesham",
  "username": "hesham",
  "mediaType": "photo",
  "mediaFileId": "AgACAgIAAxkBAAI...",
  "startParam": "web"
}
```

`mediaType` values: `"photo"`, `"voice"`, `"audio"`, `"video"`, `"document"`, `"sticker"`, `"location"`, or `null` for text-only.

`startParam`: Only present on `/start` commands. Used for deep link tracking.

### Callback Query (POST /telegram-callback)
```json
Authorization: Bearer <INTERNAL_API_SECRET>
Content-Type: application/json

{
  "chatId": 123456789,
  "callbackQueryId": "abc123",
  "callbackData": "confirm_delete",
  "messageId": 42,
  "firstName": "Hesham",
  "username": "hesham"
}
```

### Inline Query (POST /telegram-inline — Phase 3)
```json
Authorization: Bearer <INTERNAL_API_SECRET>
Content-Type: application/json

{
  "inlineQueryId": "xyz789",
  "query": "translate hello to Arabic",
  "fromId": 123456789,
  "firstName": "Hesham",
  "username": "hesham"
}
```

---

## Rate Limits (Telegram)

| Scope             | Limit                    |
|-------------------|--------------------------|
| Per private chat  | ~1 message/second        |
| Bulk broadcasting | ~30 messages/second      |
| File download     | 20 MB (cloud API)        |
| File upload       | 50 MB (cloud API)        |
| Local Bot API     | Up to 2 GB (running)     |
| Message length    | 4,096 characters         |

---

## Risk Register

| Risk                          | Mitigation                                                    |
|-------------------------------|---------------------------------------------------------------|
| Stale user cleanup deletes TG users | Auto-set `termsAcceptedAt` at creation                  |
| HTML formatter breaks on AI output  | Escape `&<>` before formatting, test with edge cases    |
| Rate limiting (1 msg/sec/chat)      | 500ms delay between chunks, retry with backoff on 429   |
| Bot token compromise                | Env var only, rotate via BotFather if leaked             |
| Large file downloads via cloud API  | Bot server uses local API server for downloads           |
| Message truncation at 4096          | Split into up to 5 chunks with smart boundary detection  |
| Edit rate limit during streaming    | 600-800ms interval, skip intermediate updates on 429    |
| Callback query timeout (10s)        | Process callbacks synchronously, answerCbQuery first    |
| Inline query timeout (unclear)      | Return cached/fast results, deduct credits async        |

---

## Notes

- **Frontend work**: Always use the `frontend-design` skill for UI/branding changes
- **Telegram logo**: `public/telegram-svgrepo-com.svg` (already in repo)
- **Bot tokens**: Prod (`@GhaliSmartBot`) = `8557300681:AAHdw3nRdqVE1WCN0UQS8XXPQWHWagBpEcU`, Dev (`@GhalDev_Bot`) = `8763436809:AAFsR2kQ9EpvFscQimD-WUfFL44gDA5IisA`
- **Reference doc**: [Telegram Migration Guide (Google Docs)](https://docs.google.com/document/d/1MXwR3C6wpIhE_jie1l9gkacYSRaYomR29GrUX9_ZMLY/edit?usp=sharing)
