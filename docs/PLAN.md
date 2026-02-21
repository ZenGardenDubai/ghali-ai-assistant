# Ghali AI Assistant — Build Plan

> Comprehensive execution plan. Each section follows strict TDD: write test → see fail → implement → see pass → commit.
>
> **Status legend:**
> - [ ] Not started
> - [🔄] In progress
> - [x] Done
> - [⏭️] Skipped (with reason)

---

## 1. Project Scaffolding & Infrastructure

Set up the project structure, install all dependencies, configure TypeScript, and wire up the dev environment. Nothing works until this is solid.

- [x] **1.1 Initialize Next.js 15 project**
  - `pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"`
  - Verify: `pnpm dev` serves the default page

- [x] **1.2 Install and configure Convex**
  - `pnpm add convex` + `pnpm dlx convex dev --once` to scaffold `convex/` directory
  - Create `convex/convex.config.ts` with agent, rag, and rate-limiter components
  - Verify: `npx convex dev` starts and connects to Convex Cloud

- [x] **1.3 Install Convex components**
  - `pnpm add @convex-dev/agent @convex-dev/rag @convex-dev/rate-limiter`
  - Register all three in `convex/convex.config.ts`
  - Verify: `npx convex dev` runs without component errors

- [x] **1.4 Install AI SDK providers**
  - `pnpm add ai @ai-sdk/google @ai-sdk/anthropic @ai-sdk/openai zod`
  - Verify: imports resolve without errors

- [x] **1.5 Install Clerk**
  - `pnpm add @clerk/nextjs`
  - Configure `middleware.ts` with Clerk auth
  - Set up `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` env vars
  - Verify: Clerk middleware runs on dev server

- [x] **1.6 Install Twilio SDK**
  - `pnpm add twilio`
  - Verify: import resolves

- [x] **1.7 Install shadcn/ui**
  - `pnpm dlx shadcn@latest init`
  - Add base components: button, card, input, badge
  - Verify: a test component renders

- [x] **1.8 Set up testing infrastructure**
  - `pnpm add -D vitest convex-test @edge-runtime/vm`
  - Create `vitest.config.ts` with edge runtime
  - Create `convex/vitest.config.ts` for Convex function tests (separate config)
  - Add scripts to `package.json`: `"test": "vitest"`, `"test:convex": "vitest --config convex/vitest.config.ts"`
  - Write a trivial passing test to verify the pipeline works
  - Verify: `pnpm test` runs and passes

- [x] **1.9 Install PostHog**
  - `pnpm add posthog-js`
  - Create PostHog provider component
  - Set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` env vars
  - Verify: PostHog initializes in dev (check network tab)

- [x] **1.10 Configure environment variables**
  - Create `.env.local` with all required vars (see SPEC.md)
  - Create `.env.example` with placeholder values (no secrets)
  - Add `.env.local` to `.gitignore`
  - Set Convex environment variables via `npx convex env set`
  - Verify: all env vars accessible in their respective runtimes

- [x] **1.11 Commit: "Project scaffolding complete"**

---

## 2. Database Schema

Define the Convex schema. All tables, indexes, and validators. This is the foundation every feature builds on.

- [x] **2.1 Test: schema validates correctly**
  - Write a `convex-test` test that instantiates the schema and runs a trivial mutation
  - Verify: test fails (schema doesn't exist yet)

- [x] **2.2 Define `users` table**
  ```
  phone: string (indexed)
  name?: string
  language: string (default "en")
  timezone: string (default "Asia/Dubai")
  tier: "basic" | "pro"
  isAdmin: boolean (default false)
  credits: number
  creditsResetAt: number
  onboardingStep: number | null (null = done)
  clerkUserId?: string (indexed)
  createdAt: number
  ```

- [x] **2.3 Define `userFiles` table**
  ```
  userId: Id<"users"> (indexed)
  filename: "memory" | "personality" | "heartbeat"
  content: string
  updatedAt: number
  ```
  - Compound index on `(userId, filename)` for unique lookup

- [x] ~~**2.4 Define `usage` table**~~ *(removed — usage/cost tracking deferred to PostHog)*

- [x] **2.5 Define `scheduledJobs` table**
  ```
  userId: Id<"users"> (indexed)
  kind: "heartbeat" | "reminder" | "followup"
  payload: string
  runAt: number (indexed)
  status: "pending" | "done" | "cancelled"
  ```

- [x] **2.6 Run tests — all pass**
  - Verify: `pnpm test:convex` passes

- [x] **2.7 Commit: "Add Convex schema — users, userFiles, scheduledJobs"**

---

## 3. User Management

CRUD operations for users. Phone-keyed lookup, creation with defaults, and updates.

- [x] **3.1 Test: findOrCreateUser — new user**
  - Given a phone number that doesn't exist
  - When `findOrCreateUser("+971501234567", "Ahmad")` is called
  - Then a new user is created with: tier=basic, credits=60, language=en, timezone=Asia/Dubai, onboardingStep=1

- [x] **3.2 Test: findOrCreateUser — existing user**
  - Given a user already exists with that phone number
  - When `findOrCreateUser` is called again
  - Then the existing user is returned (no duplicate)

- [x] **3.3 Test: timezone detection from country code**
  - `+971...` → `Asia/Dubai`
  - `+44...` → `Europe/London`
  - `+1...` → `America/New_York`
  - `+33...` → `Europe/Paris`
  - Unknown → `UTC`

- [x] **3.4 Implement `findOrCreateUser` mutation**
  - Query by phone index → return if exists
  - Otherwise insert with defaults, auto-detect timezone from country code

- [x] **3.5 Implement `getUser` query and `updateUser` mutation**
  - `getUser(userId)` — by ID
  - `getUserByPhone(phone)` — by phone index
  - `updateUser(userId, fields)` — partial update

- [x] **3.6 Test: user file initialization**
  - When a new user is created, 3 userFiles are created: memory, personality, heartbeat
  - All start with empty content

- [x] **3.7 Implement user file CRUD**
  - `getUserFile(userId, filename)` — query
  - `updateUserFile(userId, filename, content)` — mutation
  - `getUserFiles(userId)` — get all 3 files for a user

- [x] **3.8 Run all tests — pass**

- [x] **3.9 Commit: "Add user management — findOrCreate, timezone detection, user files"**

---

## 4. Pure Utility Functions

Extract and test all pure business logic before wiring anything up. These have zero dependencies and are trivially testable.

- [x] **4.1 Test: `detectTimezone(phoneNumber)` → timezone string**
  - Map of country code prefixes to IANA timezone strings
  - Edge cases: unknown codes → UTC

- [x] **4.2 Test: `canAfford(credits, cost)` → boolean**
  - `canAfford(5, 1)` → true
  - `canAfford(0, 1)` → false

- [x] **4.3 Test: `isSystemCommand(message)` → boolean**
  - "credits" → true, "help" → true, "privacy" → true, "upgrade" → true
  - "what's the weather" → false
  - Case-insensitive: "CREDITS" → true

- [x] **4.4 Test: `isBlockedCountryCode(phone)` → boolean**
  - "+91..." → true (India)
  - "+971..." → false (UAE)
  - Full list from SPEC

- [x] **4.5 Test: `fillTemplate(template, variables)` → string**
  - Given `"*Credits:* {{credits}}"` and `{ credits: 45 }`
  - Returns `"*Credits:* 45"`
  - Missing variables throw an error

- [x] **4.6 Test: `splitLongMessage(text, maxLength)` → string[]**
  - Twilio sandbox limit: 1600 chars (production WhatsApp: 4096). Default set to 1500 for safety.
  - Splits at paragraph boundaries, falls back to sentence boundaries

- [x] **4.7 Implement all pure functions in `convex/lib/`**

- [x] **4.8 Run all tests — pass**

- [x] **4.9 Commit: "Add pure utility functions — timezone, credits, templates, message splitting"**

---

## 5. Twilio Webhook (Inbound)

Receive WhatsApp messages. Validate, block bad actors, extract data, return 200 fast.

- [x] **5.1 Test: signature validation**
  - Valid Twilio signature → passes
  - Invalid/missing signature → 403

- [x] **5.2 Test: country code blocking**
  - Message from +91... → 200 OK, no processing
  - Message from +971... → processes normally

- [x] **5.3 Test: message parsing**
  - Text message → extracts body, sender phone, profile name
  - Media message → extracts media URL, content type, body

- [x] **5.4 Implement `POST /api/whatsapp/webhook`**
  - Validate Twilio signature (`twilio.validateRequest`)
  - Check country code blocking → if blocked, return 200 silently
  - Extract: `From`, `Body`, `ProfileName`, `MediaUrl0`, `MediaContentType0`
  - Call Convex mutation to save message + schedule processing
  - Return 200 immediately (async processing)

- [x] **5.5 Test: webhook returns 200 for valid request**

- [x] **5.6 Implement Twilio signature validation middleware**

- [x] **5.7 Run all tests — pass**

- [x] **5.8 Commit: "Add Twilio inbound webhook — validation, blocking, message parsing"**

---

## 6. Twilio Outbound (Send Replies)

Send messages back to WhatsApp users via Twilio API.

- [x] **6.1 Test: sendWhatsAppMessage sends text**
  - Given a phone number and text body
  - Twilio client is called with correct params (from, to, body)

- [x] **6.2 Test: sendWhatsAppMedia sends image**
  - Given a phone number, caption, and media URL
  - Twilio client is called with mediaUrl param

- [x] **6.3 Test: long messages are split**
  - Message > 4096 chars → split into multiple Twilio API calls
  - Sent in correct order

- [x] **6.4 Implement `sendWhatsAppMessage` and `sendWhatsAppMedia`**
  - Convex action (needs HTTP access)
  - Use Twilio REST client
  - Auto-split long messages using `splitLongMessage`

- [x] **6.5 Run all tests — pass**

- [x] **6.6 Commit: "Add Twilio outbound — text, media, message splitting"**

---

## 7. AI Agent Core

The heart of the system. Define the Ghali agent with Gemini 3 Flash, configure threads, and wire up the basic message → response flow.

- [x] **7.1 Define the Ghali agent**
  - Single agent with `@convex-dev/agent`
  - Language model: `google("gemini-3-flash")`
  - Embedding model: `openai.embedding("text-embedding-3-small")`
  - Base system prompt from SPEC (personality system block)
  - `stopWhen: stepCountIs(5)` for tool loop safety

- [x] **7.2 Test: agent creates a thread**
  - `createThread` returns a valid threadId
  - Thread is associated with userId

- [x] **7.3 Test: agent generates a response**
  - Given a thread and a user message
  - Agent returns a non-empty text response

- [x] **7.4 Implement thread management**
  - `getOrCreateThread(userId)` — one thread per user
  - Store thread mapping in users table or a threads lookup table

- [x] **7.5 Implement the async message flow**
  ```
  sendMessage (mutation):
    → saveMessage to thread
    → ctx.scheduler.runAfter(0, generateResponse)

  generateResponse (internalAction):
    → Load user files (memory, personality, heartbeat)
    → Prepend to agent context
    → ghali.generateText(ctx, { threadId }, { promptMessageId })
    → Send reply via Twilio outbound
  ```

- [x] **7.6 Test: full message flow (mutation → action → response)**
  - Save message → generateResponse runs → response is saved to thread

- [x] ~~**7.7 Implement `usageHandler`**~~ *(removed — usage tracking deferred to PostHog)*

- [x] ~~**7.8 Test: usage is tracked after generation**~~ *(removed)*

- [x] **7.9 Run all tests — pass**

- [x] **7.10 Commit: "Add AI agent core — Flash agent, threads, async flow"**

---

## 8. Escalation Tool + WhatsApp Formatter + Search Grounding + Date/Time

Add deepReasoning tool, Google Search grounding, current date/time awareness, and WhatsApp response formatting.

- [x] **8.1 Implement `deepReasoning` tool**
  - `createTool` with description guiding Flash on when to use it
  - Internally calls `generateText` with Claude Opus 4.6 (complex reasoning, coding, analysis, nuanced writing)
  - Returns result text to Flash, with try/catch fallback
  - Set `maxSteps: 5` on agent so tool results get a final text response
  - Only one escalation tier — Flash + Opus. No premiumReasoning (removed).

- [x] **8.2 Register tool on the Ghali agent**

- [x] **8.3 Create `convex/models.ts` — Single Source of Truth for model constants**
  - `MODELS` object: `FLASH`, `DEEP_REASONING`, `IMAGE_GENERATION`, `EMBEDDING`
  - All consumers import from here — no hardcoded model strings
  - *(MODEL_COSTS removed — cost tracking deferred to PostHog)*

- [x] **8.4 Fix message splitting limit**
  - Twilio sandbox limit is 1600 chars (not 4096)
  - Updated `WHATSAPP_MAX_LENGTH` to 1500 (with safety margin)

- [x] **8.5 Add error handling to message flow**
  - `deepReasoning` handler: try/catch returns graceful fallback on failure
  - `generateResponse` action: try/catch sends "Sorry" message instead of silent failure

- [x] **8.6 Inject current date/time into every agent turn**
  - Build `getCurrentDateTime(timezone)` helper — formats date/time in user's timezone
  - Inject into prompt context: `CURRENT CONTEXT: Today is Thursday, February 20, 2026 / Current time: 02:30 AM (Asia/Dubai)`
  - Uses user's timezone from their profile (detected from phone country code)
  - Always included — agent should never be unaware of current date/time
  - Pattern from hub-ai-v2: `convex/ghali/prompts.ts` → `buildGhaliContext()`

- [x] **8.7 Add Google Search grounding to Flash agent**
  - Import `google.tools.googleSearch` from `@ai-sdk/google`
  - Register as a tool on the agent: `googleSearch: google.tools.googleSearch({})`
  - Gemini's native search grounding — real-time web data (weather, news, prices, sports, current events)
  - System prompt instruction: "For ANY current/real-time information, use google_search. ALWAYS search for time-sensitive questions."
  - Pattern from hub-ai-v2: `convex/toolAgent.ts` line 1221, `convex/ghali/handler.ts` line 1532

- [x] **8.8 Implement `formatForWhatsApp` utility** *(from hub-ai-v2 pattern)*
  - Port `convex/ghali/formatter.ts` from hub-ai-v2
  - Pipeline: strip code block markers → convert `**bold**` to `*bold*` → strip headers → strip markdown links (keep text) → convert `* item` to `- item` → strip blockquotes → remove horizontal rules → collapse whitespace
  - Apply to ALL outbound messages before splitting
  - Add 500ms delay between multi-part messages to preserve ordering

- [x] **8.9 Test: formatForWhatsApp converts markdown correctly**
  - `**bold**` → `*bold*`
  - `## Header` → `Header`
  - `[link](url)` → `link`
  - Code blocks → plain code text
  - Combined markdown → clean WhatsApp text

- [x] **8.10 Add formatting instructions to agent system prompt and escalation prompts**
  - System prompt: "Format for WhatsApp — use *bold*, _italic_, plain text. No markdown headers, tables, or code blocks."
  - Deep reasoning prompt: same rules

- [x] **8.11 Run all tests — pass**

- [x] **8.12 Commit: "Add escalation, search grounding, date/time, WhatsApp formatter"**

---

## 9. Credit System

Gate all requests behind credits. Free commands bypass. Monthly resets via cron.

- [x] **9.1 Test: deductCredit reduces credits by 1**
  - User has 10 credits → deduct → 9 remaining

- [x] **9.2 Test: deductCredit fails when credits = 0**
  - Returns a "no credits" result, does not go negative

- [x] **9.3 Test: system commands are free**
  - "credits", "help", "privacy", "my memory", "clear memory", "upgrade", "account" → 0 credits
  - "what is AI?" → 1 credit

- [x] **9.4 Test: monthly credit reset**
  - User's `creditsResetAt` is in the past
  - Cron resets credits to tier limit (60 basic, 600 pro)
  - Updates `creditsResetAt` to next month

- [x] **9.5 Implement `deductCredit` mutation**
  - Check `isSystemCommand` → if true, skip deduction
  - Check `canAfford` → if false, return exhausted status
  - Deduct 1 credit, return success

- [x] **9.6 Implement credit reset cron job**
  - Convex cron: runs daily
  - Queries all users where `creditsResetAt < now()`
  - Resets credits to tier limit, sets new `creditsResetAt`

- [x] **9.7 Wire credits into the message flow**
  - Before `generateResponse`: check/deduct credits
  - If exhausted: send template `credits_exhausted_basic` or `credits_exhausted_pro` instead of generating

- [x] **9.8 Implement "credits" command handler**
  - Detects "credits" message → returns `check_credits` template with real data

- [x] **9.9 Run all tests — pass**

- [x] **9.10 Commit: "Add credit system — deduction, monthly reset cron, system command exemption"**

---

## 10. System Commands & Templates

Handle system commands (credits, help, privacy, upgrade, etc.) using pre-defined templates. No LLM generation for data-sensitive messages.

- [x] **10.1 Test: template rendering for all system commands**
  - "credits" → `check_credits` template with variables filled
  - "help" → `help` template
  - "privacy" → `privacy` template
  - "upgrade" → `upgrade` template (with URL)

- [x] **10.2 Test: language detection**
  - "كم رصيدي؟" → "ar"
  - "How many credits?" → "en"
  - "Combien de crédits?" → "fr"

- [x] **10.3 Test: template translation preserves numbers and formatting**
  - Translate `"*Credits:* 45"` to Arabic
  - "45" and "*" must remain unchanged

- [x] **10.4 Implement all templates from SPEC**
  - `TEMPLATES` object with all template definitions
  - `fillTemplate` (already done in Section 4)

- [x] **10.5 Implement `detectLanguage` helper**
  - Use Gemini 3 Flash with zero temperature
  - Returns ISO 639-1 code

- [x] **10.6 Implement `translateMessage` helper**
  - Takes filled template + target language
  - Translates text only — preserves numbers, emoji, formatting, URLs

- [x] **10.7 Implement `renderSystemMessage` pipeline**
  - Fill template → detect language → translate if not English → return

- [x] **10.8 Implement system command router**
  - Detects system commands from user message
  - Routes to correct template + data fetch
  - Returns rendered message (bypasses AI agent)

- [x] **10.9 Run all tests — pass**

- [x] **10.10 Commit: "Add system commands and template rendering with translation"**

---

## 11. Onboarding Flow

3-step conversational onboarding for new users. Skippable — if user asks a real question, answer it and mark onboarding done.

- [x] **11.1 Test: new user gets welcome + Step 1 (name + timezone)**
  - First message from unknown number triggers onboarding
  - Response includes detected name and timezone
  - `onboardingStep` set to 1

- [x] **11.2 Test: user confirms name → moves to Step 2 or 3**
  - If language is clear from reply → skip Step 2, go to Step 3
  - If ambiguous → show Step 2 (language selection)

- [x] **11.3 Test: user skips onboarding**
  - User sends a real question ("what's 2+2?") during onboarding
  - Agent answers the question
  - Onboarding marked as done (onboardingStep = null)
  - Defaults applied: profile name, detected timezone

- [x] **11.4 Test: user corrects timezone**
  - "I'm in London" during Step 1 → timezone updated to Europe/London

- [x] **11.5 Test: personality style selection**
  - User picks "Brief & to-the-point" → personality user block updated with: verbosity=concise, emoji=minimal

- [x] **11.6 Implement onboarding state machine**
  - Check `onboardingStep` on every incoming message
  - If non-null → run onboarding logic for that step
  - If user sends a real question → answer it, set onboardingStep=null

- [x] **11.7 Implement Step 1: name + timezone verification**
  - Pull `ProfileName` from Twilio payload
  - Detect timezone from phone country code
  - Send greeting template with name and timezone

- [x] **11.8 Implement Step 2: language (conditional)**
  - Only if language wasn't clear from Step 1 reply

- [x] **11.9 Implement Step 3: personality style**
  - Map choices to personality user block settings
  - Save to userFiles

- [x] **11.10 Implement onboarding completion**
  - Save all preferences to memory + personality files
  - Set `onboardingStep = null`
  - Send "All set!" message

- [x] **11.11 Run all tests — pass**

- [x] **11.12 Commit: "Add conversational onboarding — 3 steps, skippable, timezone detection"**

---

## 12. Per-User Files (Memory, Personality, Heartbeat)

Agent tools to read and update the 3 per-user files. These are loaded into context every turn and updated organically through conversation.

- [x] **12.1 Test: user files loaded into agent context**
  - Before each agent turn, all 3 files are fetched and prepended
  - If files are empty, no extra context is added

- [x] **12.2 Test: `updateMemory` tool appends to memory file**
  - Given existing memory "Name: Ahmad"
  - Agent calls `updateMemory("Name: Ahmad\nWork: ADNOC")`
  - Memory file content is updated

- [x] **12.3 Test: `updatePersonality` tool updates user block only**
  - Personality has two layers: SYSTEM BLOCK (readonly, hardcoded) + USER BLOCK (editable)
  - System block: safety, honesty, privacy, accuracy, language detection, credit awareness, template delivery, identity
  - User block: tone, name, language preference, verbosity, expertise level, emoji usage, interests, off-limits topics
  - `updatePersonality` only modifies the user block — system block is prepended at runtime, never stored in userFiles
  - Off-limits rule: "don't bring up proactively" not "never discuss" — direct questions still get answered

- [x] **12.4 Test: `updateHeartbeat` tool rewrites heartbeat file**
  - Content is fully replaced

- [x] **12.5 Test: file size limit (10KB max)**
  - Content exceeding 10KB is rejected with a friendly error

- [x] **12.6 Implement `updateMemory` tool**
  - `createTool` — agent calls this to persist user facts
  - Writes to `userFiles` where filename="memory"

- [x] **12.7 Implement `updatePersonality` tool**
  - Only updates the user block section
  - System block is hardcoded and prepended at runtime

- [x] **12.8 Implement `updateHeartbeat` tool**
  - Rewrites the heartbeat checklist

- [x] **12.9 Implement context loading in `generateResponse`**
  - Before calling `ghali.generateText`:
    - Fetch all 3 userFiles
    - Prepend system block + user personality + memory + heartbeat as system messages
  - Use `contextHandler` or manual prepend

- [x] **12.10 Run all tests — pass**

- [x] **12.11 Commit: "Add per-user files — memory, personality, heartbeat with agent tools"**

---

## 13. Voice Notes

Receive WhatsApp voice notes, transcribe with Whisper, process as text.

- [x] **13.1 Test: voice media URL is detected**
  - Twilio payload with `MediaContentType0: audio/ogg` is identified as voice

- [x] **13.2 Test: audio is transcribed to text**
  - Given an audio URL → Whisper returns a transcription string

- [x] **13.3 Test: transcribed text is processed as normal message**
  - After transcription, the text enters the standard message flow

- [x] **13.4 Implement voice note detection in webhook**
  - Check `MediaContentType0` for audio types

- [x] **13.5 Implement `transcribeAudio` action**
  - Download audio from Twilio media URL
  - Send to OpenAI Whisper API
  - Return transcription text

- [x] **13.6 Wire into message flow**
  - If voice note → transcribe first → then process as text message
  - Store both the original audio reference and the transcription

- [x] **13.7 Run all tests — pass**

- [x] **13.8 Commit: "Add voice note support — Whisper transcription"**

---

## 14. Image Generation

Agent tool to generate images from text descriptions, sent as WhatsApp media messages.

- [x] **14.1 Test: generateImage tool returns an image URL/buffer**
  - Given a prompt "a sunset over Dubai"
  - Returns a valid image

- [x] **14.2 Test: generated image is sent via Twilio media**
  - Image is sent as a WhatsApp media message, not a text link

- [x] **14.3 Implement `generateImage` tool**
  - `createTool` with description for the agent
  - Calls Gemini 3 Pro in image generation mode via `@google/genai` SDK
  - Returns JSON `{ imageUrl, caption }` for reliable extraction from tool results

- [x] **14.4 Implement image delivery via Twilio**
  - Store generated image in Convex file storage
  - Get a serving URL
  - Send via `sendWhatsAppMedia` with fallback to text if media fails

- [x] **14.5 Register tool on the Ghali agent**

- [x] **14.6 Run all tests — pass**
  - 12 new tests for `parseImageToolResult` and `extractImageFromSteps`

- [x] **14.7 Commit: "Add image generation tool — Gemini 3 Pro + WhatsApp delivery"**

---

## 15. Document Processing & RAG

Users send files via WhatsApp → extract content → answer immediately → store in personal knowledge base for future retrieval.

- [x] **15.1 Test: PDF processing**
  - Given a PDF media URL
  - Content is extracted via Gemini 3 Flash (native PDF support)
  - Agent answers user's question about the PDF

- [x] **15.2 Test: image OCR/description**
  - Given an image media URL
  - Gemini Flash describes/OCRs the image
  - Text description is returned

- [x] **15.3 Test: document stored in RAG**
  - After processing, document is chunked and embedded
  - Stored in user's namespace (per-user isolation)

- [x] **15.4 Test: searchDocuments finds stored content**
  - User uploaded a contract last week
  - Query "payment terms" returns relevant chunks from that contract

- [x] **15.5 Initialize RAG component**
  - Configure `@convex-dev/rag` with OpenAI embeddings (1536d)
  - Pre-compute embeddings with ai@5 to avoid ai@6 incompatibility

- [x] **15.6 Implement document detection in webhook**
  - Check `MediaContentType0` for document types (PDF, image, audio, video, etc.)
  - Route to appropriate processor via `isSupportedMediaType`

- [x] **15.7 Implement PDF/image/audio/video processing**
  - Download from Twilio media URL (with SSRF protection)
  - Send to Gemini 3 Flash for content extraction
  - Return extracted text

- [x] **15.8 Implement DOCX/PPTX/XLSX processing**
  - Send to CloudConvert API → PDF → Gemini 3 Flash
  - Return extracted text

- [x] **15.9 Implement RAG storage pipeline**
  - Chunk extracted text using `@convex-dev/rag` default chunker
  - Pre-embed with OpenAI text-embedding-3-small (1536d)
  - Store in `@convex-dev/rag` with user's namespace
  - Store original file in Convex file storage for reply-to-media

- [x] **15.10 Implement `searchDocuments` agent tool**
  - `createTool` — agent uses this to search user's knowledge base
  - Searches by namespace (userId), returns relevant chunks with context

- [x] **15.11 Register tool on Ghali agent**

- [x] **15.12 Implement media storage & reply-to-media**
  - Store incoming media in Convex file storage keyed by Twilio `MessageSid`
  - Parse `OriginalRepliedMessageSid` from Twilio webhook
  - On reply: fetch stored file, re-process with new question via Gemini Flash
  - 90-day retention with daily cleanup cron
  - Voice notes excluded (transcribed, not stored)

- [x] **15.13 Run all tests — pass (281 tests)**

- [x] **15.14 Commit: "Add document processing, RAG, media storage, and reply-to-media"**

---

## 16. Data Management Commands

Users can clear their memory, documents, or everything. Confirmation required.

- [x] **16.1 Test: "clear memory" triggers confirmation**
  - Returns `clear_memory_confirm` template
  - Waits for "yes" to proceed

- [x] **16.2 Test: "yes" after "clear memory" wipes memory file**
  - Memory userFile content is emptied
  - Thread history is cleared
  - Returns `clear_memory_done` template

- [x] **16.3 Test: "clear documents" deletes RAG entries**
  - All documents in user's namespace are deleted
  - Storage is freed

- [x] **16.4 Test: "clear everything" does full reset**
  - Memory, personality, heartbeat files cleared
  - RAG entries deleted
  - Thread history cleared
  - Credits and account remain

- [x] **16.5 Implement confirmation state tracking**
  - Track pending confirmations (what action is awaiting "yes")
  - Timeout after 5 minutes

- [x] **16.6 Implement clear handlers**
  - `clearMemory` — wipe memory file + thread
  - `clearDocuments` — delete RAG namespace
  - `clearEverything` — all of the above + personality + heartbeat

- [x] **16.7 Wire into system command router**

- [x] **16.8 Run all tests — pass**

- [x] **16.9 Commit: "Add data management commands — clear memory, documents, everything"**

---

## 17. Rate Limiting

Prevent abuse with per-user rate limits using `@convex-dev/rate-limiter`.

- [x] **17.1 Test: rate limit allows normal usage**
  - User sends 10 messages in a minute → all processed

- [x] **17.2 Test: rate limit blocks excessive usage**
  - User sends 40+ messages in a minute → rate limited
  - Returns a friendly "slow down" message with retry time

- [x] **17.3 Configure rate limiter**
  - Token bucket: 30 messages per minute per user
  - Burst capacity: 40 (10 extra for short bursts)

- [x] **17.4 Wire into message flow**
  - Check rate limit before AI generation (after onboarding, credits, system commands)
  - If limited → send rate limit template, skip processing

- [x] **17.5 Run all tests — pass (296 tests)**

- [x] **17.6 Commit: "Add rate limiting — per-user token bucket"**

---

## 18. Heartbeat (Proactive Check-ins)

Hourly cron evaluates pro users' heartbeat files and sends proactive WhatsApp messages when reminders are due. AI-parsed — Flash reads the file and decides what's due. No credit deduction (Pro perk). Respects WhatsApp's 24-hour session window.

- [x] **18.1 Test: heartbeat skips basic users**
  - Basic tier users are filtered out by `by_tier` index

- [x] **18.2 Test: heartbeat skips pro users with empty heartbeat**
  - Empty heartbeat file → no processing scheduled

- [x] **18.3 Test: heartbeat skips pro users with whitespace-only heartbeat**
  - Whitespace-only content is treated as empty

- [x] **18.4 Test: heartbeat schedules processing for eligible pro users**
  - Pro user with non-empty heartbeat → `processUserHeartbeat` action scheduled

- [x] **18.5 Implement `processHeartbeats` (internalMutation, cron target)**
  - Query pro users via `by_tier` index
  - Check heartbeat file is non-empty
  - Schedule `processUserHeartbeat` for each eligible user

- [x] **18.6 Implement `processUserHeartbeat` (internalAction)**
  - Double-check pro tier (race condition guard)
  - Enforce WhatsApp 24h session window via `lastMessageAt`
  - Build user context + current datetime
  - Flash evaluates heartbeat against current time
  - If due → send WhatsApp message; if not → `__SKIP__`
  - One-shot reminders cleaned up after firing via `updateHeartbeat` tool
  - Error handling with try/catch + structured logging

- [x] **18.7 Track `lastMessageAt` on user record**
  - Schema: added `lastMessageAt: v.optional(v.number())` to users table
  - Updated on every incoming message in `saveIncoming`
  - Used by heartbeat to enforce WhatsApp 24h session window

- [x] **18.8 Add `by_tier` index to users table**
  - Efficient pro-user-only queries for heartbeat cron

- [x] **18.9 Add hourly cron to `crons.ts`**
  - `crons.interval("heartbeat-check", { hours: 1 }, internal.heartbeat.processHeartbeats)`

- [x] **18.10 Run all tests — pass (300 tests)**

- [ ] **18.11 Commit: "Add heartbeat system — hourly cron, 24h window enforcement, one-shot cleanup"**

---

## ~~19. Admin Commands (WhatsApp)~~ — Deferred to post-MVP

---

## 19. Billing (Clerk)

Pro subscriptions via Clerk Billing. Webhook handles subscription lifecycle.

- [ ] **19.1 Test: subscription.created upgrades user to Pro**
  - Clerk webhook → user tier=pro, credits=600

- [ ] **19.2 Test: subscription.cancelled downgrades at period end**
  - Clerk webhook → mark for downgrade, keep pro until end date

- [ ] **19.3 Test: webhook signature validation**
  - Invalid signature → 403
  - Valid signature → processed

- [ ] **19.4 Implement `POST /api/clerk/webhook`**
  - Validate Clerk webhook signature
  - Handle: `subscription.created`, `subscription.cancelled`, `subscription.updated`

- [ ] **19.5 Implement subscription handlers**
  - `handleSubscriptionCreated` — upgrade tier, set credits
  - `handleSubscriptionCancelled` — schedule downgrade
  - `handleSubscriptionUpdated` — handle plan changes

- [ ] **19.6 Implement "upgrade" command**
  - Returns `upgrade` template with Clerk checkout URL
  - If already pro → returns `already_pro` template

- [ ] **19.7 Run all tests — pass**

- [ ] **19.8 Commit: "Add Clerk billing — subscription webhooks, upgrade flow"**

---

## 20. Landing Page (ghali.ae)

Static marketing page. WhatsApp CTA only — no web chat. Mobile-first, SEO optimized.

- [ ] **20.1 Build landing page layout**
  - **Copy & content:** See `docs/LANDING_PAGE_COPY.md` for all text, structure, and messaging
  - Hero section: tagline + WhatsApp CTA button
  - Key Strengths — 5 blocks (zero friction, learns you, privacy, smartest AI, open source)
  - "How It Works" — 3 steps
  - "What Ghali Can Do" — 6 capability bullets
  - Pricing — Basic (free) vs Pro ($19/mo)
  - FAQ section (collapsible)
  - Footer with legal links

- [ ] **20.2 Style with Tailwind**
  - Colors: Navy `hsl(222, 47%, 11%)` + Orange `#f97316`
  - Mobile-first responsive design
  - Load time target: < 2 seconds

- [ ] **20.3 Add PostHog analytics**
  - Page views, CTA clicks, UTM tracking
  - Conversion funnel: page view → CTA click → WhatsApp opened

- [ ] **20.4 Build `/privacy` page**
  - Privacy Policy for SAHEM DATA TECHNOLOGY
  - Covers: data collected, AI processing, user rights, analytics, retention

- [ ] **20.5 Build `/terms` page**
  - Terms of Service for SAHEM DATA TECHNOLOGY
  - Covers: credit system, acceptable use, AI disclaimer, content ownership, liability

- [ ] **20.6 SEO optimization**
  - Meta tags, Open Graph, structured data (JSON-LD)
  - Static generation (SSG)
  - Minimal client-side JS (PostHog + WhatsApp link only)

- [ ] **20.7 Commit: "Add landing page — hero, features, FAQ, privacy, terms"**

---

## 21. PostHog Analytics & Usage Tracking

Set up and configure PostHog for usage tracking, analytics, and observability across the platform.

- [ ] **21.1 Configure PostHog provider**
  - Set up PostHog client in Next.js (server + client components)
  - Environment variables for project API key and host

- [ ] **21.2 Track WhatsApp message events**
  - Message received, response sent, escalation triggered, image generated
  - Include metadata: model used, response time, credit cost

- [ ] **21.3 Track system command usage**
  - Which commands are used most, clear data frequency, upgrade funnel

- [ ] **21.4 Track credit events**
  - Credit deduction, exhaustion, reset, tier upgrade/downgrade

- [ ] **21.5 Track document & media events**
  - Document uploaded, RAG indexed, media stored, clear data executed

- [ ] **21.6 Track onboarding funnel**
  - Step completion rates, skip rates, drop-off points

- [ ] **21.7 Landing page analytics**
  - Page views, CTA clicks, UTM tracking, conversion funnel

- [ ] **21.8 Set up PostHog dashboards**
  - Daily active users, messages per day, model usage breakdown
  - Credit utilization, upgrade conversion, error rates

- [ ] **21.9 Run all tests — pass**

- [ ] **21.10 Commit: "Add PostHog analytics — usage tracking, event capture, dashboards"**

---

## 22. End-to-End Integration Testing

Verify the full flow works end-to-end before deployment.

- [ ] **22.1 Test: new user WhatsApp → onboarding → first AI response**
  - Full flow from Twilio webhook to WhatsApp reply

- [ ] **22.2 Test: credit deduction → exhaustion → upgrade prompt**
  - Use credits down to 0 → verify exhaustion template is sent

- [ ] **22.3 Test: document upload → immediate answer → future RAG retrieval**
  - Send a PDF → get answer → ask about it days later

- [ ] **22.4 Test: voice note → transcription → AI response**

- [ ] **22.5 Test: escalation flow**
  - Message that triggers deepReasoning → verify Pro model is used
  - Message that triggers premiumReasoning → verify Opus is used

- [ ] **22.6 Test: system commands in multiple languages**
  - "credits" in English, Arabic, French → correct template, correct translation

- [ ] **22.7 Fix any issues found**

- [ ] **22.8 Commit: "Add end-to-end integration tests"**

---

## 23. Deployment & Configuration

Get everything running in production.

- [ ] **23.1 Deploy Convex to production**
  - `npx convex deploy`
  - Set all environment variables in Convex Cloud dashboard
  - Verify: functions deploy without errors

- [ ] **23.2 Deploy Next.js to Vercel**
  - Connect GitHub repo to Vercel
  - Set all environment variables in Vercel dashboard
  - Verify: landing page loads at ghali.ae

- [ ] **23.3 Configure DNS for ghali.ae**
  - Point domain to Vercel
  - SSL certificate active

- [ ] **23.4 Configure Twilio webhook**
  - Set webhook URL: `https://ghali.ae/api/whatsapp/webhook`
  - Method: POST
  - Verify: test message from WhatsApp reaches the webhook

- [ ] **23.5 Configure Clerk**
  - Set up Clerk application
  - Configure billing/subscription products (Basic, Pro)
  - Set webhook URL: `https://ghali.ae/api/clerk/webhook`
  - Verify: Clerk dashboard shows correct config

- [ ] **23.6 Configure PostHog**
  - Verify events are flowing from landing page
  - Set up conversion funnel dashboard

- [ ] **23.7 Set up admin user**
  - Mark admin phone number(s) in Convex dashboard

- [ ] **23.8 Smoke test in production**
  - Send a WhatsApp message → get a response
  - Check credits → correct template
  - Send a document → RAG storage works
  - Send a voice note → transcription works
  - Generate an image → received in WhatsApp

- [ ] **23.9 Commit: "Production deployment configuration"**

---

## 24. Post-Launch Hardening

Final polish and monitoring after the system is live.

- [ ] **24.1 Set up error monitoring**
  - Convex function error logs → alerts
  - Vercel deployment logs

- [ ] **24.2 Set up usage monitoring (via PostHog)**
  - Daily credit consumption trends
  - Model usage breakdown (Flash vs Pro vs Opus)
  - Cost tracking via PostHog `$ai_generation` events

- [ ] **24.3 Review rate limits**
  - Adjust based on real usage patterns
  - Ensure blocked country codes list is up to date

- [ ] **24.4 Performance check**
  - Webhook response time < 500ms (just the 200 OK)
  - AI response delivery time tracking
  - Landing page Lighthouse score > 90

- [ ] **24.5 Backup and recovery plan**
  - Convex data export strategy
  - Document recovery procedure

- [ ] **24.6 Commit: "Add monitoring and post-launch hardening"**

---

## 25. Constants Single Source of Truth

Consolidate ALL business rule constants into a single file (`convex/constants.ts`). Nothing hardcoded anywhere else. Every constant imported from one place.

- [ ] **25.1 Create `convex/constants.ts` — the SSOT file**
  - Merge existing `convex/models.ts` into this file (models become a section)
  - All business rules, limits, and configuration in one place

- [ ] **25.2 Tier & Credit Constants**
  ```
  USER_TIERS = ["basic", "pro"]
  BASIC_TIER_CREDITS = 60
  PRO_TIER_CREDITS = 600
  CREDITS_PER_MESSAGE = 1
  CREDITS_RESET_DAYS = 30
  ```

- [ ] **25.3 Storage & File Limits**
  ```
  MAX_USER_FILE_SIZE = 10 * 1024          // 10 KB per user file
  MAX_MEDIA_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
  MIN_MEDIA_SIZE_BYTES = 1024             // 1 KB
  MAX_EXTRACTION_LENGTH = 50000           // 50K chars from docs
  RAG_CHUNK_SIZE = 2000
  RAG_CHUNK_OVERLAP = 200
  ```

- [ ] **25.4 WhatsApp & Messaging Constants**
  ```
  WHATSAPP_MAX_MESSAGE_LENGTH = 1500
  WHATSAPP_MULTI_PART_DELAY_MS = 500
  WHATSAPP_NUMBER = "+971582896090"
  ```

- [ ] **25.5 Agent Configuration**
  ```
  AGENT_MAX_STEPS = 5
  AGENT_CONTEXT_MESSAGES = 50
  DEFAULT_TEMPERATURE = 0.7
  ```

- [ ] **25.6 Model Constants (from existing `convex/models.ts`)**
  ```
  MODELS = { FLASH, DEEP_REASONING, IMAGE_GENERATION, EMBEDDING }
  // MODEL_COSTS removed — cost tracking handled by PostHog
  ```

- [ ] **25.7 Blocked Country Codes**
  ```
  BLOCKED_COUNTRY_CODES = ["+91", "+92", "+880", "+234", "+62", "+263"]
  ```

- [ ] **25.8 System Commands**
  ```
  SYSTEM_COMMANDS = ["credits", "help", "privacy", "upgrade", "account", "my memory", "clear memory", "clear documents", "clear everything"]
  ```

- [ ] **25.9 Brand & Company**
  ```
  DOMAIN = "ghali.ae"
  SITE_URL = "https://ghali.ae"
  SUPPORT_EMAIL = "support@ghali.ae"
  COMPANY_NAME = "SAHEM DATA TECHNOLOGY"
  ```

- [ ] **25.10 Helper Functions**
  - `getCreditsForTier(tier)` — returns credit limit for tier
  - `getModelApiName(modelId)` — if any internal→API name mapping needed

- [ ] **25.11 Audit: replace all hardcoded values across codebase**
  - `convex/agent.ts` — imports from constants
  - ~~`convex/usageTracking.ts`~~ *(removed — usage tracking deferred to PostHog)*
  - `convex/lib/utils.ts` — imports BLOCKED_COUNTRY_CODES, SYSTEM_COMMANDS, WHATSAPP_MAX_MESSAGE_LENGTH
  - `convex/credits.ts` — imports tier limits
  - `convex/schema.test.ts` — imports from constants
  - Grep entire codebase for remaining hardcoded strings

- [ ] **25.12 Run all tests — pass**

- [ ] **25.13 Commit: "Consolidate all constants into single source of truth"**

---

## 26. Documentation

Update README and ensure docs are complete. SPEC.md is the single source of truth for architecture and business rules — no separate architecture or business rules docs.

- [ ] **26.1 Update `README.md`**
  - Project overview: what Ghali is, who it's for
  - Tech stack summary (with versions)
  - Getting started: prerequisites, env vars, `pnpm install`, `pnpm dev`
  - Project structure: key directories and files
  - Development: testing, linting, type-checking, deployment
  - Environment variables: full list with descriptions (no secrets)
  - Link to SPEC.md (architecture + business rules) and PLAN.md (execution plan)
  - License: Apache 2.0

- [ ] **26.2 Review SPEC.md for accuracy**
  - Verify all business rules match the implemented code
  - Verify model assignments match code (Flash, Pro, Opus)
  - Verify credit system matches implementation
  - Update any sections that drifted during development

- [ ] **26.3 Review PLAN.md for accuracy**
  - Mark all completed sections accurately
  - Remove any tasks that were skipped with reasons
  - Ensure remaining tasks are still relevant

- [ ] **26.4 Commit: "Update documentation — README, verify SPEC.md and PLAN.md accuracy"**
