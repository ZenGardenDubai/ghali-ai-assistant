# Ghali AI Assistant — MVP Specification

## What is Ghali?

Ghali (غالي) is an open-source WhatsApp-first AI assistant. Users message Ghali on WhatsApp and get access to the world's best AI models. No apps, no accounts — just chat.

- **Primary:** WhatsApp (+971582896090 via Twilio)
- **Secondary:** Web chat at ghali.ae
- **License:** Apache 2.0
- **Repo:** github.com/ZenGardenDubai/ghali-ai-assistant

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, TypeScript, Tailwind) |
| Database | Convex |
| Auth | Clerk |
| AI Agents | @convex-dev/agent |
| RAG | @convex-dev/rag |
| Rate Limiting | @convex-dev/rate-limiter |
| AI SDK | Vercel AI SDK (`ai`) |
| AI Providers | @ai-sdk/google, @ai-sdk/anthropic, @ai-sdk/openai |
| Embeddings | OpenAI text-embedding-3-small (1536d) |
| WhatsApp | Twilio (existing account) |
| Testing | Vitest (strict TDD) |
| Hosting | Vercel + Convex Cloud |

### AI Models

| Role | Model | Cost (in/out per 1M tokens) |
|------|-------|----------------------------|
| Primary (85%) | Gemini 3 Flash | $0.50 / $3 |
| Reasoning (10%) | Gemini 3 Pro | $2 / $12 |
| Premium (5%) | Claude Opus 4.6 | $15 / $75 |
| Images | Gemini 3 Pro (image mode) | ~$0.13/image |
| Voice | Whisper | $0.006/min |

### Routing

Single Ghali agent on Gemini 3 Flash. Escalates to Pro or Opus via tool calls when the task needs it. No separate classifier — saves cost.

---

## MVP Scope

### In (V1)

- [ ] WhatsApp send/receive via Twilio webhook
- [ ] Single AI agent (Flash) with escalation tools (Pro, Opus)
- [ ] Conversation threads (one per user, persistent)
- [ ] Voice note transcription (Whisper)
- [ ] System message templates (multilingual, auto-translated)
- [ ] Credit system (Basic: 60 text + 20 media/month)
- [ ] Usage tracking per model/user
- [ ] Document upload + RAG search per user
- [ ] Web chat (Clerk auth, Convex streaming)
- [ ] Landing page (ghali.ae)

### Out (V2+)

- Voice responses (TTS)
- Video generation (Veo 3.1)
- Stripe payments
- WhatsApp Flows (interactive menus)
- Group chat support
- Mobile apps
- Proactive messages (heartbeat/cron — see below)

---

## Core Concepts (from OpenClaw)

Ghali borrows key architectural ideas from [OpenClaw](https://github.com/openclaw/openclaw):

### 🫀 Heartbeat
Periodic background check-ins. Instead of only responding to messages, Ghali can proactively check things (reminders, calendar, notifications) and reach out when relevant. Configurable interval.

### 👤 Personality (SOUL)
Each Ghali instance has a personality file that defines tone, language preferences, behavior rules, and capabilities. This makes Ghali customizable — users (or deployers) can shape how Ghali communicates.

### ⏰ Cron Jobs
Scheduled tasks that run independently — reminders, recurring checks, background work. Separate from the main conversation thread.

### 🧠 Memory
Persistent memory across conversations. Ghali remembers context, user preferences, and past interactions using vector search + conversation history.

### 🔧 Tools
Extensible tool system. Ghali can call external APIs, search documents, generate images, and perform actions in the real world.

*These features will be implemented progressively. Heartbeat and cron are V2 — the MVP focuses on reactive chat with memory and tools.*

---

## Convex Reference Material

- **Convex Agent Component:** https://www.convex.dev/components/agent
- **Agent Docs:** https://docs.convex.dev/agents
- **Agent Usage:** https://docs.convex.dev/agents/agent-usage
- **Threads:** https://docs.convex.dev/agents/threads
- **Tools:** https://docs.convex.dev/agents/tools
- **Context & RAG:** https://docs.convex.dev/agents/context
- **Streaming:** https://docs.convex.dev/agents/streaming
- **Workflows:** https://docs.convex.dev/agents/workflows
- **Usage Tracking:** https://docs.convex.dev/agents/usage-tracking
- **Rate Limiting:** https://docs.convex.dev/agents/rate-limiting
- **RAG Component:** https://www.convex.dev/components/rag
- **Agent GitHub:** https://github.com/get-convex/agent
- **RAG GitHub:** https://github.com/get-convex/rag
- **Convex + Clerk:** https://docs.convex.dev/auth/clerk
- **AI SDK (Vercel):** https://ai-sdk.dev/docs
- **Google AI SDK:** https://ai-sdk.dev/providers/ai-sdk-provider/google
- **Anthropic AI SDK:** https://ai-sdk.dev/providers/ai-sdk-provider/anthropic

---

## Development Approach

- **Strict TDD** — write test first, see it fail, implement, see it pass
- **Vitest** for unit tests
- **Feature-by-feature** — build and test one feature at a time
- **Open source from day one** — Apache 2.0, clean code, documented

---

## Brand

- **Colors:** Navy `hsl(222, 47%, 11%)` + Orange `#f97316`
- **Tagline:** "Your AI on WhatsApp"
- **Domain:** ghali.ae
