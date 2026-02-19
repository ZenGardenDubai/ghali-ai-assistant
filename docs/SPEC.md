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
    instructions: "...", // personality + rules
    tools: { deepReasoning, premiumReasoning, generateImage, searchDocuments },
  });
  ```
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
- Basic tier: 60 text + 20 media credits/month (free)
- Track usage per message (model, tokens in/out, cost)
- When credits run out → friendly message, suggest waiting for reset
- Monthly reset via Convex cron
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

### 11. Web Chat
- Landing page at ghali.ae (marketing + "try it" CTA)
- Chat page: Clerk auth → Convex streaming → same agent, same threads
- Mobile-first responsive design
- Colors: Navy `hsl(222, 47%, 11%)` + Orange `#f97316`

### 12. Heartbeat (Proactive Check-ins)
- Convex scheduled function runs periodically per user (configurable interval, default 24h)
- Checks: pending reminders, follow-ups, anything the agent noted to revisit
- If something needs attention → send WhatsApp message
- If nothing → skip silently
- Respect active hours (don't message at 3am)
- Store heartbeat config per user: interval, activeHoursStart, activeHoursEnd, timezone

### 13. Personality (SOUL)
- Agent instructions define Ghali's personality:
  - Warm, helpful, slightly playful
  - Concise — no filler ("Great question!", "I'd be happy to help!")
  - Multilingual — responds in the user's language automatically
  - Opinionated when asked
  - Knows when NOT to respond (in future group chat scenarios)
- Per-user preferences stored in users table (tone, language, name to use)
- Future: users customize via commands ("be more formal", "always reply in Arabic")

---

## Database Schema (Convex)

```typescript
// users table
{
  phone: string,          // +971XXXXXXXXX
  name?: string,          // WhatsApp profile name
  language: string,       // "en" | "ar" | auto-detected
  timezone: string,       // "Asia/Dubai"
  tier: string,           // "basic" | "premium"
  credits: { text: number, media: number },
  creditsResetAt: number, // next reset timestamp
  preferences: {
    tone?: string,        // "casual" | "formal"
    heartbeatInterval?: number, // ms
    activeHoursStart?: number,  // 0-23
    activeHoursEnd?: number,
  },
  createdAt: number,
}

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
```
