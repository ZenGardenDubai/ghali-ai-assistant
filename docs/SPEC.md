# Ghali AI Assistant — Build Spec

> This spec is designed to be fed to an LLM (Cursor, Claude Code, etc.) to scaffold and build the app. Keep it concise.

## What to Build

A WhatsApp-first AI assistant. Users message a WhatsApp number and chat with AI. Web chat is secondary. That's it.

- **WhatsApp:** +971582896090 (Twilio Business API)
- **Web:** ghali.ae (Clerk auth, streaming chat)
- **License:** Apache 2.0

---

## Tech Stack

| Layer | Package | Docs |
|-------|---------|------|
| Framework | Next.js 15 (App Router, TypeScript, Tailwind) | https://nextjs.org/docs |
| UI | shadcn/ui | https://ui.shadcn.com |
| Database | Convex | https://docs.convex.dev |
| Auth | Clerk | https://docs.convex.dev/auth/clerk |
| AI Agent | @convex-dev/agent | https://docs.convex.dev/agents |
| RAG | @convex-dev/rag | https://www.convex.dev/components/rag |
| Rate Limit | @convex-dev/rate-limiter | https://www.convex.dev/components/rate-limiter |
| AI SDK | ai + @ai-sdk/google + @ai-sdk/anthropic + @ai-sdk/openai | https://ai-sdk.dev/docs |
| Embeddings | OpenAI text-embedding-3-small (1536d) | https://ai-sdk.dev/providers/ai-sdk-provider/openai |
| WhatsApp | Twilio | https://www.twilio.com/docs/whatsapp |
| Analytics | PostHog | https://posthog.com/docs |
| Testing | Vitest | https://vitest.dev |
| Hosting | Vercel + Convex Cloud | — |

---

## AI Models

| Role | Model | When |
|------|-------|------|
| Primary (85%) | Gemini 3 Flash | Default for all messages |
| Reasoning (10%) | Gemini 3 Pro | Agent calls `deepReasoning` tool |
| Premium (5%) | Claude Opus 4.6 | Agent calls `premiumReasoning` tool |
| Images | Gemini 3 Pro (image mode) | Agent calls `generateImage` tool |
| Voice → Text | Whisper | Voice notes received via Twilio |

**Routing:** Single Flash agent with escalation tools. No separate classifier. Flash decides when to escalate.

---

## MVP Features

Build these in order. Each one: write test → see fail → implement → see pass → commit.

### 1. Twilio Webhook
- `POST /api/whatsapp/webhook` receives messages from Twilio
- Validates Twilio signature
- Extracts: sender phone, message body, media URLs
- Returns 200 immediately, processes async

### 2. User Management
- Find or create user by phone number
- Store: phone, name (from WhatsApp profile), language, timezone, createdAt
- Convex `users` table

### 3. Conversation Threads
- One thread per user (Convex Agent threads)
- All messages stored with role, content, timestamp, model used, token counts
- Thread history auto-included in agent context

### 4. AI Agent (Core)
- Define agent with `@convex-dev/agent`:
  ```typescript
  const ghali = new Agent(components.agent, {
    name: "Ghali",
    model: google("gemini-3-flash"),
    instructions: "...", // base personality (warm, concise, multilingual)
    tools: {
      deepReasoning, premiumReasoning, generateImage, searchDocuments,
      updateMemory, updatePersonality, updateHeartbeat,
    },
  });
  ```
- On each turn: load user's 3 files (memory, personality, heartbeat) and prepend to context
- If personality file exists, it overrides/extends the base instructions for this user
- Process incoming message → run agent on user's thread → send reply via Twilio

### 5. Escalation Tools
- `deepReasoning`: Calls Gemini 3 Pro for complex tasks. Returns result to Flash.
- `premiumReasoning`: Calls Claude Opus 4.6. Returns result to Flash.
- Flash formats and delivers the final response.

### 6. Image Generation
- `generateImage`: Calls Gemini 3 Pro in image mode
- Returns image URL/buffer → send as WhatsApp media message

### 7. Voice Notes
- Twilio delivers voice as media URL
- Download → transcribe with Whisper API → process as text message
- Reply as text (TTS is V2)

### 8. Credit System
- **Basic (free):** 60 credits/month
- **Pro ($19/month):** 600 credits/month
- Track usage per message (model, tokens in/out, cost)
- When credits run out → friendly message, upgrade CTA for Basic users, reset date for Pro
- **Monthly reset:** Convex cron job runs daily, resets credits for users whose `creditsResetAt` has passed
- **Billing:** Clerk Billing for Pro subscriptions. Webhook at `POST /api/clerk/webhook`:
  - `subscription.created` → upgrade user to Pro (600 credits)
  - `subscription.cancelled` → downgrade to Basic at period end
  - `subscription.updated` → handle plan changes
  - Verify webhook signature with Clerk signing secret
- Convex `usage` table: userId, model, tokensIn, tokensOut, cost, timestamp

### 9. Document Upload + RAG
- User sends PDF/image → extract text → chunk → embed → store in RAG
- `@convex-dev/rag` with per-user namespace
- `searchDocuments` tool: agent searches user's documents when relevant
- Supported: PDF, images (OCR via Gemini Vision)

### 10. System Message Templates
- Predefined templates for system messages (welcome, credits low, credits empty, error)
- Templates filled with data first, then translated to user's language via LLM
- Never let LLM generate numbers/credits — only translate text

### 11. Landing Page (ghali.ae)
- Single-page, no web chat — WhatsApp is the only product
- Goal: convert visitors → WhatsApp conversation (CTA: "Message Ghali on WhatsApp")
- Elegant, minimalist design. Mobile-first.
- SEO optimized: meta tags, Open Graph, structured data, fast load (<2s)
- Colors: Navy `hsl(222, 47%, 11%)` + Orange `#f97316`
- Sections: Hero (tagline + WhatsApp CTA) → What Ghali Can Do (3-4 bullets) → How It Works (3 steps) → FAQ → Footer
- No Clerk auth needed. No dashboard. No web chat.
- Static/SSG — minimal client-side JS (just PostHog + WhatsApp link)
- **PostHog analytics:** page views, CTA clicks, UTM tracking, conversion funnel

### 12. Heartbeat (Proactive Check-ins)
- Convex scheduled function runs periodically per user (configurable interval, default 24h)
- Checks: pending reminders, follow-ups, anything the agent noted to revisit
- If something needs attention → send WhatsApp message
- If nothing → skip silently
- Respect active hours (don't message at 3am)
- Store heartbeat config per user: interval, activeHoursStart, activeHoursEnd, timezone

### 13. Personality (SOUL) + User Files
- Base personality in agent instructions: warm, concise, multilingual, no filler
- **Per-user files** (stored in `userFiles` table, loaded every turn):
  - `memory` — agent writes facts, preferences, history ("prefers Arabic", "works in finance")
  - `personality` — overrides base tone/style ("formal", "always greet in Arabic", "call me Abu Ahmad")
  - `heartbeat` — checklist for periodic proactive messages ("remind gym 7am", "check report Mondays")
- **Agent tools** to update files:
  - `updateMemory(content)` — rewrite memory file
  - `updatePersonality(content)` — rewrite personality file
  - `updateHeartbeat(content)` — rewrite heartbeat file
- Users edit naturally: "remember I like coffee at 7am" → agent calls `updateMemory`
- Web UI: markdown editor for each file (direct editing)
- Max 10KB per file — keeps context small

**Proactive memory capture (critical for user retention):**
- The agent doesn't wait to be told "remember this" — it actively listens and captures:
  - **Name** — first mention, store immediately
  - **Language** — detect from first message, adapt instantly
  - **Age/birthday** — if mentioned in conversation
  - **Location/timezone** — from context clues or when asked
  - **Interests** — topics they ask about repeatedly (cooking, football, coding, etc.)
  - **Work/role** — what they do, industry, company
  - **Family** — kids, spouse, if naturally shared
  - **Preferences** — communication style, favorite topics, things they dislike
- After every conversation, the agent reviews what it learned and updates the memory file
- Next conversation starts with full context — user feels *known*, not like starting over
- This is Ghali's competitive advantage: the more you use it, the better it gets

---

## Database Schema (Convex)

```typescript
// users table
{
  phone: string,          // +971XXXXXXXXX
  name?: string,          // WhatsApp profile name
  language: string,       // "en" | "ar" | auto-detected
  timezone: string,       // "Asia/Dubai"
  tier: string,           // "basic" | "pro"
  credits: number,        // remaining credits this cycle
  creditsResetAt: number, // next reset timestamp
  createdAt: number,
}

// userFiles table — per-user markdown files (OpenClaw-inspired)
// Each user gets 3 files. The agent reads them every turn and can update them via tools.
// Max 10KB per file. Raw markdown — flexible, no schema migrations needed.
{
  userId: Id<"users">,
  filename: string,       // "memory" | "personality" | "heartbeat"
  content: string,        // raw markdown
  updatedAt: number,
}
// "memory" — long-term memory. Agent writes: preferences, facts, history.
//   e.g. "Prefers Arabic. Works in finance. Has 2 kids. Reminded about dentist."
// "personality" — how the agent behaves with this user.
//   e.g. "Formal tone. Always greet with السلام عليكم. Use Arabic for replies."
//   Defaults to Ghali's base personality if empty.
// "heartbeat" — what to check on periodic heartbeats.
//   e.g. "- Remind about gym at 7am\n- Check if quarterly report is due"
//
// Users edit via natural language:
//   "remember I like coffee at 7am" → agent updates memory file
//   "be more casual with me" → agent updates personality file
//   "remind me every Monday to call mom" → agent updates heartbeat file
// Web UI: direct markdown editor for each file.

// usage table
{
  userId: Id<"users">,
  model: string,
  tokensIn: number,
  tokensOut: number,
  cost: number,
  creditType: "text" | "media",
  timestamp: number,
}

// scheduledJobs table (for heartbeat + reminders)
{
  userId: Id<"users">,
  kind: "heartbeat" | "reminder" | "followup",
  payload: string,
  runAt: number,
  status: "pending" | "done" | "cancelled",
}
```

Agent threads and messages are managed by `@convex-dev/agent` (no custom tables needed).
RAG documents managed by `@convex-dev/rag`.

---

## Convex Reference Links

Read these before building:

- **Agent quickstart:** https://docs.convex.dev/agents
- **Agent usage & patterns:** https://docs.convex.dev/agents/agent-usage
- **Threads:** https://docs.convex.dev/agents/threads
- **Tools:** https://docs.convex.dev/agents/tools
- **Context & RAG:** https://docs.convex.dev/agents/context
- **Streaming:** https://docs.convex.dev/agents/streaming
- **Usage tracking:** https://docs.convex.dev/agents/usage-tracking
- **Rate limiting:** https://docs.convex.dev/agents/rate-limiting
- **RAG component:** https://www.convex.dev/components/rag
- **Agent GitHub:** https://github.com/get-convex/agent
- **RAG GitHub:** https://github.com/get-convex/rag
- **Convex + Clerk:** https://docs.convex.dev/auth/clerk
- **Convex scheduled functions:** https://docs.convex.dev/scheduling/scheduled-functions
- **Convex cron jobs:** https://docs.convex.dev/scheduling/cron-jobs

---

## Development Rules

1. **Strict TDD** — write test first, see it fail, implement, see it pass, commit
2. **Feature-by-feature** — build in the order listed above
3. **Extract pure functions** for testability (`canAfford()`, `calculateCost()`, `splitMessage()`)
4. **Vitest** for all tests
5. **No premature optimization** — get it working, then improve

---

## Environment Variables

```
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=+971582896090
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
CLERK_WEBHOOK_SIGNING_SECRET=
```
