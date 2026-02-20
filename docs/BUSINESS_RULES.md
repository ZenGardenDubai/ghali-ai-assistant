# Business Rules

All business constants are defined in `convex/constants.ts` (single source of truth).
Model identifiers and costs are in `convex/models.ts`.

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

| Tier | Price | Credits | Storage |
|------|-------|---------|---------|
| Basic | Free | 60/month | 100MB |
| Pro | $19/month | 600/month | 500MB |

Constants: `PRO_PLAN_PRICE_USD`, `STORAGE_LIMIT_BASIC_MB`, `STORAGE_LIMIT_PRO_MB`

## Models

Defined in `convex/models.ts`:

| Constant | Model ID | Role | Input $/1M | Output $/1M |
|----------|----------|------|-----------|------------|
| `FLASH` | gemini-3-flash-preview | Primary agent (~85%) | 0.10 | 0.40 |
| `DEEP_REASONING` | claude-opus-4-6 | Complex reasoning (~15%) | 15.00 | 75.00 |
| `IMAGE_GENERATION` | gemini-3-pro-image-preview | Image generation | 1.25 | 30.00 |
| `EMBEDDING` | text-embedding-3-small | RAG embeddings | 0.02 | 0.00 |

Whisper (`whisper-1`) is used for voice transcription in `convex/voice.ts`.

Fallback cost rates for unknown models: `{ input: 0.5, output: 1.5 }` in `convex/usageTracking.ts`.

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
| Document storage (basic) | 100MB | `STORAGE_LIMIT_BASIC_MB` |
| Document storage (pro) | 500MB | `STORAGE_LIMIT_PRO_MB` |

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
