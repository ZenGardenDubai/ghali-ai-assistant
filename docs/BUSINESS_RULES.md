# Business Rules

All business constants are defined in `convex/constants.ts` (single source of truth).
Model identifiers are in `convex/models.ts`. Cost tracking is handled by PostHog (not in-app).

## Credit System

| Rule | Value | Constant |
|------|-------|----------|
| Basic tier credits/month | 60 | `CREDITS_BASIC` |
| Pro tier credits/month | 600 | `CREDITS_PRO` |
| Credits per AI request | 1 | `CREDITS_PER_REQUEST` |
| System commands cost | 0 (free) | — |
| Reset period | 30 days | `CREDIT_RESET_PERIOD_MS` |
| Reset cron | Daily at 00:00 UTC | `convex/crons.ts` |

## Tiers & Pricing

| Tier | Price | Credits |
|------|-------|---------|
| Basic | Free | 60/month |
| Pro | $9.99/month (or $99.48/year) | 600/month |

Constants: `PRO_PLAN_PRICE_USD`

## Subscription Lifecycle

Managed via Clerk Billing webhooks → `convex/billing.ts` (all `internalMutation`).

| Event | Clerk Webhook | Action |
|-------|---------------|--------|
| User signs up on `/upgrade` | `user.created` | Link `clerkUserId` to Ghali user by phone (`linkClerkUser`) |
| Subscription activated | `subscriptionItem.active` | Set tier → `"pro"`, credits → 600 |
| User cancels mid-cycle | `subscriptionItem.canceled` | Set `subscriptionCanceling: true`, keep tier `"pro"` and credits unchanged |
| Billing period ends after cancel | `subscriptionItem.ended` | Set tier → `"basic"`, clear `subscriptionCanceling` |
| User reactivates after cancel | `subscriptionItem.active` | Set tier → `"pro"`, credits → 600, clear `subscriptionCanceling` |

Key behaviors:

- **Cancel = grace period, not immediate downgrade.** When a user cancels, they keep Pro benefits (tier, credits) until their paid period expires. The `subscriptionCanceling` flag is set so the UI can show "Your plan will end on [date]".
- **Credits are not reset on downgrade.** When `subscriptionItem.ended` fires, tier changes to basic but remaining credits stay as-is. The next monthly credit reset cron will give them 60 (basic) instead of 600 (pro).
- **Reactivation resets credits to 600.** If a user reactivates (new `subscriptionItem.active`), credits are set to `CREDITS_PRO` and the canceling flag is cleared.
- **Duplicate link guard.** If a `clerkUserId` is already linked to a user, subsequent `linkClerkUser` calls for the same `clerkUserId` are silently skipped.

Schema field: `subscriptionCanceling: v.optional(v.boolean())` on users table.

Webhook endpoint: `POST /clerk-webhook` in `convex/http.ts`, verified with `svix`.

Env var: `CLERK_WEBHOOK_SECRET` (Convex dashboard).

## Models

Defined in `convex/models.ts`:

| Constant | Model ID | Role |
|----------|----------|------|
| `FLASH` | gemini-3-flash-preview | Primary agent (~85%) |
| `DEEP_REASONING` | claude-opus-4-6 | Complex reasoning (~15%) |
| `IMAGE_GENERATION` | gemini-3-pro-image-preview | Image generation |
| `EMBEDDING` | text-embedding-3-small | RAG embeddings |

Whisper (`whisper-1`) is used for voice transcription in `convex/voice.ts`.

Usage and cost tracking is handled by PostHog analytics, not stored in Convex.

## Agent Configuration

| Setting | Value | Constant |
|---------|-------|----------|
| Max tool-call steps per turn | 5 | `AGENT_MAX_STEPS` |
| Recent messages in context | 50 | `AGENT_RECENT_MESSAGES` |
| Default image aspect ratio | 9:16 (portrait) | `DEFAULT_IMAGE_ASPECT_RATIO` |
| Max image prompt length | 2000 chars | `IMAGE_PROMPT_MAX_LENGTH` |

## Storage & Retention

| Rule | Value | Constant |
|------|-------|----------|
| Generated image retention | 90 days | `IMAGE_RETENTION_MS` |
| Image cleanup cron | Daily at 01:00 UTC | `convex/crons.ts` |
| Per-user file max size | 10KB | `MAX_USER_FILE_SIZE` |

## WhatsApp & Messaging

| Rule | Value | Constant |
|------|-------|----------|
| Max message segment length | 1500 chars | `WHATSAPP_MAX_LENGTH` |
| Multi-part message delay | 500ms | `TWILIO_MESSAGE_DELAY_MS` |

## Voice Notes

| Rule | Value | Constant |
|------|-------|----------|
| Minimum audio size | 1KB | `VOICE_MIN_SIZE_BYTES` |
| Maximum audio size | 25MB | `VOICE_MAX_SIZE_BYTES` |

## Document Processing & RAG

| Rule | Value | Constant |
|------|-------|----------|
| Minimum media file size | 1KB | `MEDIA_MIN_SIZE_BYTES` |
| Maximum media file size | 20MB | `MEDIA_MAX_SIZE_BYTES` |
| Max extracted text length | 50K chars | `MAX_EXTRACTION_LENGTH` |
| CloudConvert timeout | 30s | `CLOUDCONVERT_TIMEOUT_MS` |
| Embedding model | text-embedding-3-small | `MODELS.EMBEDDING` |
| Embedding dimension | 1536 | — |
| RAG search limit | 5 results | default in `searchDocuments` |

Supported file types:
- **Images**: jpeg, png, webp, heic, heif → Gemini Flash analysis (no RAG)
- **Audio**: wav, mp3, mpeg, aiff, aac, ogg, flac, mp4, webm, amr → Gemini Flash transcription (no RAG)
- **Video**: mp4, mpeg, webm, 3gpp, mov, avi, flv, mpg, wmv → Gemini Flash analysis (no RAG)
- **PDF**: application/pdf → Gemini Flash extraction → RAG indexed
- **Text**: txt, md, csv, html, xml, json → UTF-8 decode → RAG indexed
- **Office**: docx, pptx, xlsx → CloudConvert → PDF → Gemini Flash → RAG indexed

Env vars: `CLOUDCONVERT_API_KEY` (for Office file conversion)

## Media Storage & Reply-to-Media

| Rule | Value | Constant |
|------|-------|----------|
| Media file retention | 90 days | `MEDIA_RETENTION_MS` |
| Media cleanup cron | Daily at 01:30 UTC | `convex/crons.ts` |
| Stored media scope | All supported types except voice notes (audio/ogg) | — |
| Reply-to-media window | 7 days (Twilio `OriginalRepliedMessageSid` limit) | Twilio constraint |

Incoming media files (images, PDFs, documents, audio, video) are stored in Convex file storage keyed by Twilio `MessageSid`. When a user replies to a previous message containing media, the original file is fetched from storage and re-processed with the new question via Gemini Flash.

Voice notes (audio/ogg) are excluded — they are transcribed and used as text input, not stored for re-analysis.

Twilio provides `OriginalRepliedMessageSid` only for replies made within 7 days. Files remain in storage for 90 days (matching generated image retention) but can only be triggered by reply within the Twilio window.

## Country Code Blocking

Defined in `convex/lib/utils.ts` as `BLOCKED_COUNTRY_CODES`:

+91 (India), +92 (Pakistan), +880 (Bangladesh), +234 (Nigeria), +62 (Indonesia), +263 (Zimbabwe)

## System Commands (Free)

Defined in `convex/lib/utils.ts` as `SYSTEM_COMMANDS`:

`credits`, `help`, `privacy`, `upgrade`, `account`, `my memory`, `clear memory`, `clear documents`, `clear everything`

## Onboarding Heuristics

| Rule | Value | Constant |
|------|-------|----------|
| Short message threshold | 4 words | `ONBOARDING_SHORT_MESSAGE_WORDS` |
| Long message threshold | 8 words | `ONBOARDING_LONG_MESSAGE_WORDS` |

## Supported Languages

Defined in `convex/lib/systemCommands.ts`: `en`, `ar`, `fr`, `es`, `hi`, `ur`

## New User Defaults

| Field | Default |
|-------|---------|
| language | `"en"` |
| tier | `"basic"` |
| isAdmin | `false` |
| credits | 60 (`CREDITS_BASIC`) |
| onboardingStep | 1 |
| timezone | Auto-detected from phone country code, fallback `"Asia/Dubai"` |
