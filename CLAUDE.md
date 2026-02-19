# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ghali is a WhatsApp-first AI assistant. Users message a WhatsApp number (+971582896090 via Twilio) and chat with AI. Web chat (ghali.ae) is secondary. Apache 2.0 license.

## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript, Tailwind)
- **UI:** shadcn/ui
- **Database:** Convex (real-time serverless DB)
- **Auth:** Clerk
- **AI Agent:** @convex-dev/agent (threads, messages, tools, streaming, RAG)
- **AI SDK:** Vercel AI SDK + @ai-sdk/google, @ai-sdk/anthropic, @ai-sdk/openai
- **WhatsApp:** Twilio Business API
- **Analytics:** PostHog
- **Testing:** Vitest
- **Hosting:** Vercel + Convex Cloud
- **Package Manager:** pnpm (always use pnpm, never npm/yarn)

## Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start Next.js + Convex dev servers
pnpm build                # Production build
pnpm test                 # Run all tests (Vitest)
pnpm test -- path/to/file # Run a single test file
npx convex dev            # Start Convex dev server (if separate)
npx convex deploy         # Deploy Convex functions
```

## Architecture

### Single Agent with Escalation Tools

No multi-agent system or external classifier. One agent (Gemini 3 Flash) handles all messages and self-escalates via tool calls:

- **Flash (85%)** — handles directly (fast, cheap)
- **`deepReasoning` tool → Gemini 3 Pro (10%)** — complex tasks, coding, analysis
- **`premiumReasoning` tool → Claude Opus 4.6 (5%)** — premium writing, deep research
- **`generateImage` tool → Gemini 3 Pro** — image generation

Flash decides when to escalate. No separate classifier call needed.

### Message Flow (Async Pattern)

```
WhatsApp → Twilio webhook (POST /api/whatsapp/webhook)
  → Validate signature + country code blocking
  → Find/create user + thread
  → Save message (mutation, transactional)
  → Schedule async response generation (ctx.scheduler.runAfter)
  → Return 200 immediately
  → Action runs: agent.generateText on user's thread
  → Send reply via Twilio API
```

Web chat uses the same Convex mutation → action pattern but streams via WebSocket.

### Per-User Files (Loaded Every Turn)

Three markdown files per user in `userFiles` table, loaded into agent context on every turn:

- **memory** — facts, preferences, history the agent learns organically
- **personality** — two-layer: immutable system block (Ghali's DNA) + editable user block (tone, language, style)
- **heartbeat** — checklist for proactive scheduled messages

Agent updates these via tools: `updateMemory`, `updatePersonality`, `updateHeartbeat`. Users edit naturally through conversation ("remember I like coffee at 7am", "be more casual").

### Credit System

- 1 credit per request regardless of model used
- System commands (credits, help, privacy, etc.) are free (0 credits)
- Basic: 60/month free, Pro: 600/month ($19/mo via Clerk Billing)
- Monthly reset via Convex cron job

### Template Messages

System messages (credits, help, billing) use pre-defined templates with `{{variable}}` placeholders — never free-form LLM generation. Pipeline: fill template → detect language → translate if not English. Numbers, emoji, and formatting are never translated.

### Key Convex Tables

- **users** — phone, name, language, timezone, tier, isAdmin, credits
- **userFiles** — userId + filename (memory/personality/heartbeat) + content (markdown, max 10KB)
- **usage** — per-message tracking: model, tokens, cost
- **scheduledJobs** — heartbeat, reminders, follow-ups
- Threads and messages managed by @convex-dev/agent (no custom tables)
- RAG documents managed by @convex-dev/rag

### Document Processing

Files received via WhatsApp: PDF/images → Gemini 3 Flash directly. DOCX/PPTX/XLSX → CloudConvert → PDF → Gemini 3 Flash. Content stored in per-user RAG namespace for future retrieval via `searchDocuments` tool.

## Development Rules

- **Strict TDD** — write test first, see it fail, implement, see it pass, commit
- **Build features in SPEC.md order** — each feature builds on the previous
- **Extract pure functions** for testability (e.g., `canAfford()`, `calculateCost()`, `splitMessage()`)
- **Country code blocking** — check sender's number against `BLOCKED_COUNTRY_CODES` before any processing

## Key Docs

- `docs/SPEC.md` — Full build spec with all 15 MVP features in build order
- `docs/ARCHITECTURE.md` — System architecture, code patterns, component details
- `docs/STACK.md` — Tech stack details and project structure
- `docs/TEMPLATES.md` — Template message system design
