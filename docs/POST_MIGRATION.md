# Post-Migration Enhancements

Items to tackle after the core Telegram migration is complete and stable.

---

## 1. Large File Support via Local Bot API Server

**Status:** Not started
**Priority:** High — users currently get an error for files >20MB

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
- [ ] Add `/telegram-upload-url` HTTP route in Convex (authenticated, returns `generateUploadUrl()`)
- [ ] Update bot server to detect large files (>20MB) and download from local API
- [ ] Bot server uploads to Convex via presigned URL
- [ ] Pass `storageId` + `mimeType` in payload instead of `mediaFileId`
- [ ] `fetchMedia` in Convex becomes fallback for small files only
- [ ] Remove the 20MB error message from `generateResponse`

**Files affected:** `convex/http.ts`, `convex/messages.ts`, `convex/telegram.ts`, bot server `index.js`

---

## 2. Payment Flow — Telegram User Identity Linking

**Status:** Not started
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
