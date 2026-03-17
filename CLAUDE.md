# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ghali is a Telegram-first AI assistant. Users message `@GhaliSmartBot` on Telegram and chat with AI. Web chat (ghali.ae) is secondary. WhatsApp support (360dialog) is dormant — code preserved but not active. Apache 2.0 license.

## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript, Tailwind)
- **UI:** shadcn/ui
- **Database:** Convex (real-time serverless DB)
- **Auth:** Clerk
- **AI Agent:** @convex-dev/agent (threads, messages, tools, streaming, RAG)
- **AI SDK:** Vercel AI SDK + @ai-sdk/google, @ai-sdk/anthropic, @ai-sdk/openai
- **Telegram:** Bot API via Node.js bot server (long polling) + direct API calls from Convex
- **WhatsApp:** 360dialog (dormant — code preserved, account disabled by Meta)
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
- **`deepReasoning` tool → Claude Opus 4.6 (15%)** — complex tasks, coding, analysis, premium writing
- **`generateImage` tool → Gemini 3 Pro** — image generation

Flash decides when to escalate. No separate classifier call needed.

### Message Flow (Async Pattern)

**Telegram (primary):**
```text
User → Telegram servers → Bot server (long polling, Node.js on Hetzner)
  → POST /telegram-message (Bearer auth)
  → Convex HTTP action: validate, dedup, find/create user + thread
  → Save message (mutation, transactional)
  → Schedule async response generation (ctx.scheduler.runAfter)
  → Return 200 immediately
  → Action runs: agent.generateText on user's thread
  → Send reply via api.telegram.org (direct from Convex)
```

**WhatsApp (dormant):**
```text
WhatsApp → 360dialog webhook (POST /whatsapp-webhook)
  → Validate signature + country code blocking
  → Same mutation → action pattern as Telegram
  → Send reply via 360dialog Cloud API
```

Web chat uses the same Convex mutation → action pattern but streams via WebSocket.

### Telegram Bot Infrastructure

- **Bot server:** `/root/clawd/projects/ghali-telegram/index.js` on `ubuntu-16gb-hel1-1` (157.180.120.93)
- **Bots:** `@GhaliSmartBot` (prod), `@GhalDev_Bot` (dev)
- **Local Bot API:** Docker container on port 8081 (removes 20MB file limit, bot server only)
- **Convex sends via:** `api.telegram.org` directly (cannot reach localhost:8081)
- **Formatting:** HTML mode (`<b>`, `<i>`, `<pre>`, `<code>`), 4096 char limit, up to 5 chunks
- **Inline keyboards:** Native buttons on credit exhaustion, help, upgrade prompts
- **Callback queries:** `/telegram-callback` route handles button taps

### Per-User Files (Loaded Every Turn)

Four markdown files per user in `userFiles` table, loaded into agent context on every turn:

- **profile** — identity facts (who the user IS): personal, professional, education, family, location, links, milestones. Never compacted. Section-replace semantics.
- **memory** — soft behavioral observations, preferences, context. Auto-compacted at 38.4KB. Categories: preferences, schedule, interests, general.
- **personality** — two-layer: immutable system block (Ghali's DNA) + editable user block (tone, verbosity, emoji, off-limits)
- **heartbeat** — checklist for proactive check-ins, recurring awareness items, and agent-created follow-ups

Agent updates these via tools: `updateProfile`, `appendToMemory`, `editMemory`, `updatePersonality`, `updateHeartbeat`. The agent silently observes communication patterns and stores them in memory, captures life milestones in profile, and adds proactive follow-ups to heartbeat when users mention notable events.

### Credit System

- All features available to all users — Pro = more credits only
- 1 credit per user-initiated request regardless of model used
- System commands (credits, help, privacy, etc.) are free (0 credits)
- Heartbeat check-ins and reminder deliveries are free (no credit cost)
- Basic: 60/month free, Pro: 600/month ($9.99/mo or $99.48/year via Clerk Billing)
- Monthly reset via Convex cron job

### Template Messages

System messages (credits, help, billing) use pre-defined templates with `{{variable}}` placeholders — never free-form LLM generation. Pipeline: fill template → detect language → translate if not English. Numbers, emoji, and formatting are never translated.

### Key Convex Tables

- **users** — phone, telegramId, channel, name, language, timezone, tier, isAdmin, credits
- **userFiles** — userId + filename (profile/memory/personality/heartbeat) + content (markdown, max 50KB)
- **usage** — per-message tracking: model, tokens, cost
- **scheduledJobs** — heartbeat, reminders, follow-ups
- Threads and messages managed by @convex-dev/agent (no custom tables)
- RAG documents managed by @convex-dev/rag

### Document Processing

Files received via Telegram or WhatsApp: PDF/images → Gemini 3 Flash directly. DOCX/PPTX/XLSX → CloudConvert → PDF → Gemini 3 Flash. Telegram files downloaded via Bot API → Convex storage. Content stored in per-user RAG namespace for future retrieval via `searchDocuments` tool.

## Agent Abilities Document

The `ABILITIES & LIMITATIONS` section in `AGENT_INSTRUCTIONS` (`convex/agent.ts`) tells the agent what it can and cannot do. **When adding, removing, or changing any agent tool or capability, update this section to keep the agent's self-awareness accurate.** The agent uses this to set correct expectations with users (e.g., heartbeat has hourly precision, not minute-exact).

## Workflow

- **Conventional commits** — all commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) format (e.g., `feat:`, `fix:`, `chore:`, `docs:`)
- **No direct pushes to main** — always create a branch and open a PR
- **CI must pass before merge** — typecheck, lint, test, and build jobs must all succeed
- **CodeRabbit review before PR** — run `coderabbit:code-reviewer` agent locally, address issues, then push. CodeRabbit also reviews on the PR itself.
- **release-please** — automated versioning and changelogs based on conventional commits

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
- `docs/POSTHOG.md` — PostHog analytics: all server/client events, properties, dashboard, and architecture
- `docs/TELEGRAM_MIGRATION.md` — Migration plan from WhatsApp to Telegram (Steps 0-11)
- `docs/POST_MIGRATION.md` — Post-migration items (large files, payment flow, streaming)
