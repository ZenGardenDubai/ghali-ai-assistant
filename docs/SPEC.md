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
| UI Components | shadcn/ui |
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

Ghali borrows key architectural ideas from [OpenClaw](https://github.com/openclaw/openclaw). Below is how OpenClaw implements each concept and how Ghali will adapt it.

---

### 🧠 Memory

**How OpenClaw does it:**

OpenClaw memory is **plain Markdown files** in the agent workspace. The model only "remembers" what's written to disk — there is no hidden state.

**Two layers:**
- `memory/YYYY-MM-DD.md` — Daily log files. Append-only. Read today + yesterday at session start.
- `MEMORY.md` — Curated long-term memory. Distilled insights, not raw logs. Only loaded in private sessions (never in group chats for privacy).

**Vector search:** OpenClaw indexes all memory files using embeddings (OpenAI, Gemini, or local GGUF models) stored in SQLite. Two tools are exposed:
- `memory_search` — semantic search across all memory files. Uses hybrid search: vector similarity (finds paraphrased matches) + BM25 keyword search (finds exact IDs, code, names). Returns snippets with file path + line numbers.
- `memory_get` — read specific lines from a memory file.

**Auto memory flush:** Before session context is compacted (hitting token limits), OpenClaw triggers a silent turn asking the model to write durable notes to memory files. This prevents context loss.

**Ghali adaptation:**
- Conversation memory handled by **Convex Agent component** (auto-includes thread history + vector search across messages).
- Document/knowledge memory handled by **Convex RAG component** (per-user namespace, semantic search).
- Long-term user preferences stored in the **users table** (language, timezone, tone, name).
- No filesystem — everything in Convex database (serverless, real-time).

---

### 🫀 Heartbeat

**How OpenClaw does it:**

Heartbeat runs **periodic agent turns** in the main session at a configurable interval (default: 30 minutes). The model receives a prompt and can either surface something important or reply `HEARTBEAT_OK` (which is silently discarded).

**Key mechanics:**
- **Interval:** Configurable (`every: "30m"`). Can be different per agent.
- **Prompt:** Sent verbatim as a user message. Default: *"Read HEARTBEAT.md if it exists. Follow it strictly. If nothing needs attention, reply HEARTBEAT_OK."*
- **HEARTBEAT.md:** Optional checklist file the agent reads each heartbeat. Kept tiny to minimize token burn. The agent can update it. Example:
  ```md
  # Heartbeat checklist
  - Quick scan: anything urgent in inboxes?
  - If daytime, lightweight check-in if nothing pending.
  ```
- **Response contract:** `HEARTBEAT_OK` = nothing to report (silently dropped). Any other response = alert, delivered to the configured channel.
- **Target:** Where to deliver alerts — `last` (last used channel), a specific channel (`whatsapp`, `telegram`), or `none` (run but don't deliver).
- **Active hours:** Can restrict heartbeats to e.g. 08:00–22:00 in user's timezone. Outside the window, heartbeats are skipped.
- **Cost awareness:** Each heartbeat is a full agent turn. Shorter intervals = more tokens. Use a cheaper model for heartbeats if needed.

**Ghali adaptation:**
- Use **Convex scheduled functions** (`ctx.scheduler.runAfter`) to implement periodic heartbeat checks.
- Store heartbeat config per user (interval, active hours, checklist).
- On each heartbeat: check reminders, upcoming events, pending follow-ups.
- If something needs attention → send WhatsApp message.
- If nothing → skip silently.
- V2 feature — not in MVP.

---

### 👤 Personality (SOUL)

**How OpenClaw does it:**

Personality is defined through **workspace files** that are injected into the system prompt on every turn:

- **`SOUL.md`** — The agent's core persona and tone. *"You're not a chatbot. You're becoming someone."* Defines:
  - How to communicate (concise, opinionated, not sycophantic)
  - Boundaries (private things stay private, ask before acting externally)
  - Vibe ("Be the assistant you'd actually want to talk to")
  - The agent can evolve this file over time.

- **`IDENTITY.md`** — Name, emoji, avatar, creature type. Created during first-run bootstrap.

- **`USER.md`** — Who the user is: name, timezone, birthday, family, work context, preferences, communication style. The agent uses this to personalize every response.

- **`AGENTS.md`** — Operating instructions: how to use memory, when to speak in group chats, safety rules, tool usage guidelines.

- **`TOOLS.md`** — Notes about available tools, local configs, API details.

All these files are **injected into context** on every turn (capped at 20KB per file, 150KB total). They're editable by both the user and the agent.

**Key principle:** The personality is in the files, not hardcoded. Different users can have completely different agent personalities by editing these files.

**Ghali adaptation:**
- Agent personality defined in the `instructions` field of the Convex Agent definition.
- Per-user personalization stored in the **users table** (language, tone, name, timezone).
- System prompt adapts based on user preferences (formal vs casual, Arabic vs English).
- Future: allow users to customize Ghali's personality via commands ("be more formal", "speak Arabic only").

---

### ⏰ Cron Jobs

**How OpenClaw does it:**

Cron jobs are scheduled tasks that run independently from the main conversation. Two types:
- **`systemEvent`** — Injects a message into the main session (like a reminder).
- **`agentTurn`** — Runs a full agent turn in an isolated session (for background work).

Cron supports: one-shot (`at`), recurring interval (`every`), and cron expressions (`cron`). Jobs can target the main session or spawn isolated sessions.

**Ghali adaptation:**
- Use **Convex scheduled functions** for reminders and recurring tasks.
- Store scheduled tasks in a `scheduledJobs` table per user.
- V2 feature — not in MVP.

---

### 🔧 Tools

**How OpenClaw does it:**

Tools are the agent's hands. OpenClaw provides built-in tools (file read/write, exec, web search, browser control, memory search, messaging) and supports custom tools via skills.

Skills are modular packages with a `SKILL.md` file. The agent reads the skill file on demand and follows its instructions.

**Ghali adaptation:**
- Tools defined as Convex Agent `createTool()` — deeply integrated with the database.
- Built-in tools: `deepReasoning`, `premiumReasoning`, `generateImage`, `searchDocuments`.
- Extensible: add new tools without changing the routing logic.
- The AI SDK tool format is compatible with any function — web search, calendar, email, etc.

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
