# PostHog Analytics

Server-side analytics via `posthog-node` in Convex actions. Client-side via `posthog-js` on the landing page.

**distinct_id**: User's phone number (e.g. `+971500000000`)

All server events include `phone_country` derived from phone prefix (`convex/lib/analytics.ts`).

## Architecture

```
Message flow → ctx.scheduler.runAfter(0, internal.analytics.track*) → PostHog
Agent usageHandler → ctx.runMutation(scheduleTrackAIGeneration) → scheduler → PostHog
```

- **Client**: `flushAt: 1`, `flushInterval: 0` (immediate flush for serverless)
- **All calls are fire-and-forget** — analytics never blocks the response flow
- **Env var**: `POSTHOG_API_KEY` (set in Convex, not in `.env.local`)

## Key Files

| File | Purpose |
|---|---|
| `convex/analytics.ts` | `"use node"` — PostHog client singleton + 7 internal actions |
| `convex/analyticsHelper.ts` | Scheduling mutation for agent's usageHandler (no Node.js deps) |
| `convex/lib/analytics.ts` | `detectCountryFromPhone()` pure function |
| `convex/agent.ts` | `usageHandler` — captures `$ai_generation` for every LLM call |
| `convex/messages.ts` | Analytics calls at 6 instrumentation points in `generateResponse` |
| `convex/images.ts` | Image generation tracking via scheduler |

## Server Events

### `user_new`

First message from an unknown phone number.

| Property | Type | Description |
|---|---|---|
| `phone_country` | string | ISO country code (e.g. `AE`, `GB`) |
| `timezone` | string | IANA timezone (e.g. `Asia/Dubai`) |

**Triggered in**: `convex/messages.ts` — when `onboardingStep === 1`

### `user_returning`

Message from an existing user (not their first).

| Property | Type | Description |
|---|---|---|
| `phone_country` | string | ISO country code |
| `tier` | string | `basic` or `pro` |
| `credits_remaining` | number | Credits left in current period |

**Triggered in**: `convex/messages.ts` — when `onboardingStep !== 1`

### `$ai_generation`

PostHog standard event for LLM calls. Shows in LLM Analytics dashboard.

| Property | Type | Description |
|---|---|---|
| `$ai_model` | string | Model ID (e.g. `gemini-3-flash-preview`, `claude-opus-4-6`) |
| `$ai_provider` | string | `google`, `anthropic`, or `openai` |
| `$ai_input_tokens` | number | Input/prompt tokens |
| `$ai_output_tokens` | number | Output/completion tokens |
| `$ai_reasoning_tokens` | number? | Reasoning tokens (Claude only) |
| `$ai_latency` | number? | Latency in seconds (image gen only) |
| `$ai_is_error` | boolean? | Whether generation failed (image gen only) |
| `cached_input_tokens` | number? | Cached input tokens |
| `generation_type` | string? | `image` for image generation |
| `phone_country` | string | ISO country code |
| `tier` | string | `basic` or `pro` |

**Triggered in**:
- `convex/agent.ts` usageHandler — every LLM call (Flash, embeddings, deep reasoning)
- `convex/images.ts` — image generation (with estimated tokens: 1290 output)

### `credit_used`

After successful AI response (1 credit deducted).

| Property | Type | Description |
|---|---|---|
| `credits_remaining` | number | Credits left after deduction |
| `tier` | string | `basic` or `pro` |
| `model` | string? | Primary model used (from `MODELS` constants) |
| `tools_used` | string[]? | Agent tools invoked (e.g. `["deepReasoning", "googleSearch"]`) |
| `phone_country` | string | ISO country code |

**Triggered in**: `convex/messages.ts` — after `deductCredit`

### `credits_exhausted`

User hits 0 credits.

| Property | Type | Description |
|---|---|---|
| `tier` | string | `basic` or `pro` |
| `reset_at` | number | Unix timestamp of next credit reset |
| `phone_country` | string | ISO country code |

**Triggered in**: `convex/messages.ts` — when `checkCredit` returns `exhausted`

### `system_command`

Free system command processed (no credit deducted).

| Property | Type | Description |
|---|---|---|
| `command` | string | Command name (e.g. `credits`, `help`, `privacy`, `upgrade`) |
| `phone_country` | string | ISO country code |

**Triggered in**: `convex/messages.ts` — when system command handler fires

### `image_generated`

Image generation attempt (success or failure).

| Property | Type | Description |
|---|---|---|
| `success` | boolean | Whether image was generated |
| `latency_ms` | number? | Generation time in milliseconds |
| `phone_country` | string | ISO country code |

**Triggered in**: `convex/images.ts` — after Gemini image generation completes

### `document_processed`

Document or media file processed via Gemini.

| Property | Type | Description |
|---|---|---|
| `media_type` | string | MIME type (e.g. `application/pdf`, `image/jpeg`) |
| `has_rag` | boolean | Whether content was stored in RAG |
| `phone_country` | string | ISO country code |

**Triggered in**: `convex/messages.ts` — after successful media processing

## Client Events (Landing Page)

Captured via `posthog-js` on ghali.ae:

- `$pageview` — page views with UTM params
- `$pageleave` — page leave
- `$autocapture` — CTA button clicks, link clicks

## Dashboard

**"Ghali Server Analytics"** — PostHog dashboard ID `1299426`

| Insight | Type | Description |
|---|---|---|
| Daily Active Users | Line | Unique users per day (DAU via `user_returning`) |
| New vs Returning Users | Line | `user_new` count vs `user_returning` DAU |
| Messages per Day | Bar | `credit_used` (paid) + `system_command` (free) |
| Model Usage Breakdown | Pie | `$ai_generation` broken down by `$ai_model` |
| Image & Document Processing | Line | `image_generated` + `document_processed` per day |
| Token Usage (Input vs Output) | Line | Sum of `$ai_input_tokens` and `$ai_output_tokens` |
| Credits Exhausted | Line | `credits_exhausted` events per day |

## Country Code Mapping

`detectCountryFromPhone()` maps phone prefixes to ISO codes:

```
+971 → AE    +966 → SA    +973 → BH    +974 → QA
+968 → OM    +965 → KW    +44  → GB    +1   → US
+33  → FR    +49  → DE    +61  → AU    +81  → JP
+86  → CN    +91  → IN    +92  → PK    +20  → EG
+27  → ZA    +55  → BR    +7   → RU    +82  → KR
+90  → TR    +234 → NG    +880 → BD    +62  → ID
+263 → ZW
```

Unknown prefixes → `XX`.
