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

**Status:** Not started
**Priority:** Medium

**Problem:** The current feedback system uses a web link with a token (ghali.ae/feedback?token=...) that identifies the user. Same identity-linking gap as the payment flow — Telegram users need a way to submit feedback that ties back to their `telegramId`.

**Possible solutions:**
- **Mini App:** Build a Telegram Mini App for feedback submission. `initData.user.id` provides verified identity without external auth. Best UX — users never leave Telegram.
- **Deep Link Token:** Same approach as payment Option A — generate a token, embed in URL, resolve on submission.
- **Inline Feedback:** Skip the web form entirely. Use inline keyboards with rating buttons (1-5 stars) + a follow-up text prompt for comments. Simplest, no web required.

**Note:** This shares infrastructure with the payment Mini App (Section 2, Option B). If we build a Mini App for upgrades, the feedback form can live in the same app.

**Files affected:** `convex/feedback.ts`, `convex/http.ts`, bot server, potential Mini App

---

## 4. Telegram Onboarding Flow Redesign

**Status:** Not started
**Priority:** Medium

**Problem:** Telegram users currently skip onboarding entirely (`onboardingStep: null` at creation). This means:
- No guided introduction to Ghali's capabilities
- No timezone/language confirmation (auto-detected from `language_code` but not verified)
- No personality preferences collected
- Welcome message is generic

**Current state:** New Telegram users get a welcome infographic + "Help" / "Upgrade" inline keyboard, then go straight to AI chat.

**Proposed redesign:**
1. Welcome infographic with inline keyboard introducing Ghali
2. Inline keyboard-driven onboarding (not step-by-step text like WhatsApp):
   - "What language do you prefer?" → keyboard with language options
   - "What's your timezone?" → keyboard with common timezones or auto-detect confirmation
   - "How should I talk to you?" → tone preferences (formal/casual/emoji-heavy)
3. Each step uses callback queries — no free-text input needed
4. User can skip at any point with a "Skip" button
5. Results saved to user profile + personality files

**Key difference from WhatsApp onboarding:** Use Telegram's native inline keyboards instead of free-text Q&A. Faster, lower friction, better UX.

**Files affected:** `convex/telegram.ts` (sendWelcome), `convex/users.ts`, `convex/lib/onboarding.ts` (new Telegram path or separate module), bot server (callback handling)

---

## 5. Streaming / Typewriter Effect

**Status:** Deferred from migration Step 8
**Priority:** Low — nice-to-have UX enhancement, not blocking

**Problem:** Users see a typing indicator while the AI generates a response, then get the full response at once. A streaming effect (progressive text reveal via message edits) would feel more responsive.

**Why deferred:**
- `ghaliAgent.generateText` returns the full response in one shot — switching to `streamText` requires a major refactor of `generateResponse` (~1000 lines with credit checks, media processing, tool results, circuit breaker)
- Tool calls (deepReasoning, generateImage) pause the stream mid-generation, creating janky UX
- Telegram rate limits ~20 edits/message/minute — a 30s response at 700ms intervals = ~43 edits, exceeding the limit
- Fake typewriter (post-generation reveal) adds latency without saving user wait time
- Typing indicator refresh (every 4s) already provides adequate feedback

**Infrastructure already in place:**
- `editMessageText` in `telegramSend.ts`
- `editMessage` action in `telegram.ts`
- `TELEGRAM_EDIT_INTERVAL_MS` constant (700ms)

**When to revisit:** After @convex-dev/agent adds better streaming support for actions, or if user feedback strongly requests it.

**Files affected:** `convex/messages.ts` (switch `generateText` → `streamText` + edit loop)

---

## 6. Inline Mode (@GhaliSmartBot query)

**Status:** Not started
**Priority:** Low — convenience feature, not blocking

**Problem:** Users can only interact with Ghali inside the bot's own chat. Inline mode lets users type `@GhaliSmartBot <query>` from any chat (group, private, channel) and get an instant AI answer they can share.

**How it works:**
1. User types `@GhaliSmartBot what is the capital of France` in any chat
2. Telegram sends an `inline_query` to the bot server
3. Bot server forwards to Convex → runs a lightweight agent call (no thread, no tools, no credit deduction — or 1 credit per inline query)
4. Convex returns answer text
5. Bot server responds with `answerInlineQuery` containing result articles
6. User taps a result → it's inserted into the chat as a message from them

**Design decisions:**
- **Credit model:** Free (no credit deduction) for short answers, or 1 credit per query? Free encourages adoption but risks abuse.
- **Model:** Use Flash only (no deep reasoning or image gen — inline results must be fast, <3s)
- **Context:** No user files loaded (no memory/personality). Stateless, fast answers only.
- **Rate limiting:** Telegram throttles inline queries naturally, but add per-user rate limit (e.g., 20/min)
- **Result format:** `InlineQueryResultArticle` with title (short answer) and message_text (full answer in HTML)
- **Caching:** Set `cache_time` to reduce repeat queries (e.g., 300s)

**Implementation:**
- [ ] Add `inline_query` handler in bot server (extract query text, forward to Convex)
- [ ] Add `/telegram-inline` HTTP route in Convex (lightweight agent call, no thread)
- [ ] Return `answerInlineQuery` with formatted results
- [ ] Enable inline mode in BotFather (`/setinline` with placeholder text)
- [ ] Add per-user rate limiting for inline queries

**Files affected:** bot server `index.js`, `convex/http.ts`, new `convex/inlineQuery.ts` or handler in `convex/telegram.ts`

---

## 7. Message Reactions

**Status:** Not started
**Priority:** Low — UX polish

**Problem:** Users can react to Ghali's messages with emoji (Telegram native feature), but the bot doesn't acknowledge or use reactions. Reactions could serve as lightweight feedback signals.

**Use cases:**
- **Feedback signal:** 👍/👎 on responses → track satisfaction without asking explicitly
- **Acknowledgment:** Bot reacts to user messages (e.g., 👀 when processing, ✅ when done) instead of typing indicator
- **Analytics:** Track reaction patterns per user/model/feature for quality insights

**How it works:**
1. User reacts to a bot message with an emoji
2. Telegram sends a `message_reaction` update to the bot server
3. Bot server forwards to Convex
4. Convex logs the reaction (message ID, emoji, user) for analytics

**Bot-initiated reactions:**
- `setMessageReaction` API call to add emoji to user messages
- Useful as processing indicators: 👀 (seen), ⚡ (processing), ✅ (done)
- Alternative to typing indicator for quick responses

**Implementation:**
- [ ] Add `message_reaction` handler in bot server
- [ ] Add `/telegram-reaction` HTTP route in Convex (or extend `/telegram-callback`)
- [ ] Track reactions in PostHog (`message_reaction` event with emoji, message context)
- [ ] Optionally: bot reacts with 👀 on receipt, ✅ on completion
- [ ] Enable in BotFather: `/setjoingroups` if needed for group reactions

**Files affected:** bot server `index.js`, `convex/http.ts`, `convex/analytics.ts`
