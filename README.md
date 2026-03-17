# Ghali غالي

**AI assistant on Telegram (formerly WhatsApp). One chat, best models, zero apps.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

## What is Ghali

Ghali is an open-source AI assistant you talk to on Telegram (`@GhaliSmartBot`). One agent (Gemini Flash) handles every message and self-escalates to stronger models when needed — Claude Opus for deep reasoning, Gemini Pro for image generation. It remembers you across conversations, adapts to your style, and can proactively check in on things you care about.

## Features

### Core AI
- **Single agent with smart routing** — Flash handles 85% of messages; escalates to Opus for complex reasoning/coding and Gemini Pro for images
- **Google Search grounding** — real-time web data (weather, news, prices, sports)
- **Voice notes** — Whisper transcription, processed as text
- **Image generation** — text-to-image via Gemini Pro, delivered as media
- **ProWrite** — multi-LLM professional writing pipeline (Opus brief/synthesis/humanize, Kimi K2.5 draft/refine, GPT-5.2 elevate, Flash research)

### Media and Files
- **Document processing** — PDF, images, audio, video sent directly to Gemini Flash
- **Office files** — DOCX/PPTX/XLSX converted via CloudConvert, then processed
- **File conversion** — convert between 200+ formats: documents (PDF↔DOCX, PPTX→PDF), images (PNG↔JPG↔WEBP), audio (MP3↔WAV↔OGG)
- **Personal RAG** — uploaded documents chunked, embedded, and stored per-user for future retrieval
- **Reply-to-media** — reply to a previously sent file with a new question

### User Experience
- **Per-user profile** — permanent identity facts (name, job, family, location) organized by section, never compacted
- **Per-user memory** — learns preferences, behavioral observations, and context organically through conversation
- **Behavioral learning** — silently observes communication patterns (message length, emoji usage, language switching) and adapts over time
- **Milestones** — permanent record of significant life events (job changes, visa approvals, moves) that Ghali references naturally
- **Adaptive personality** — two-layer system: immutable core DNA + editable user preferences (tone, verbosity, emoji, off-limits topics)
- **Scheduled Tasks** — AI-powered tasks that run on schedule (one-time or recurring), each triggering a full agent turn
- **Heartbeat** — per-user checklist for proactive check-ins, recurring awareness items, and agent-created follow-ups (hourly precision)
- **Proactive follow-ups** — when you mention an interview or deadline, Ghali adds a follow-up and checks in days later
- **Onboarding** — 5-step guided setup: welcome, name, timezone, personality style, language (skippable)
- **Multilingual templates** — system messages detected, translated, numbers/formatting preserved
- **Feedback system** — Telegram Mini App + web form, admin review panel, rate-limited (3/day)

### Structured Data
- **Items & Collections** — track expenses, tasks, contacts, notes, bookmarks, habits via natural language
- **Hybrid search** — text scoring + semantic vector search (OpenAI embeddings)
- **Smart aggregation** — sum, count, group by tag or collection
- **Collections** — organize items into named groups with emoji and descriptions
- **Item reminders** — attach due dates and scheduled tasks to any item

### System
- **Credit system** — 60/month free, 600/month Pro ($9.99/mo or $99.48/year). 1 credit per request.
- **System commands** — `credits`, `help`, `privacy`, `upgrade`, `account`, `feedback` — template-based, no LLM cost
- **Rate limiting** — per-user token bucket (30/min sustained, 40 burst)
- **Country code blocking** — configurable blocklist
- **Data management** — `clear memory`, `clear documents`, `clear everything` with confirmation
- **Admin dashboard** — web panel for stats, user management, template broadcasting, feedback review, and onboarding config
- **Arabic website** — full Arabic mirror of all marketing and feature pages

## How It Works

```
Telegram message
  → Bot server (long polling, Node.js on Hetzner)
  → POST /telegram-message (Bearer auth)
  → Convex HTTP action: validate, dedup, find/create user + thread
  → Save message (Convex mutation)
  → Schedule async response (ctx.scheduler.runAfter)
  → Return 200 immediately

Background action:
  → Load user files (profile, memory, personality, heartbeat)
  → Check/deduct credits
  → Gemini Flash generates response (25 tools available):
    → deepReasoning → Claude Opus (complex tasks)
    → generateImage → Gemini Pro (image generation)
    → webSearch → real-time Google Search
    → searchDocuments → user's RAG knowledge base
    → addItem/queryItems/updateItem → structured data
    → proWriteBrief/proWriteExecute → multi-LLM writing pipeline
    → createScheduledTask → one-time or recurring AI tasks
    → updateProfile/appendToMemory/editMemory/updatePersonality/updateHeartbeat → user files
    → resolveMedia/reprocessMedia/convertFile → media handling
  → Format for Telegram (HTML) + split long messages (4096 char chunks)
  → Send reply via api.telegram.org
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | Convex (real-time serverless) |
| Auth | Clerk (auth + billing) |
| AI Agent | @convex-dev/agent |
| AI SDK | Vercel AI SDK v5 |
| RAG | @convex-dev/rag + OpenAI embeddings |
| Messaging | Telegram Bot API (primary), 360dialog WhatsApp (dormant) |
| UI | Tailwind v4 + shadcn/ui |
| Analytics | PostHog |
| Testing | Vitest + convex-test |
| Hosting | Vercel + Convex Cloud |

## Models

| Role | Model | When |
|------|-------|------|
| Primary | Gemini 3 Flash | Every message (fast, cheap) |
| Deep reasoning | Claude Opus 4.6 | Complex tasks, coding, analysis |
| Image generation | Gemini 3 Pro | Text-to-image requests |
| ProWrite draft/refine | Kimi K2.5 (via OpenRouter) | Long-form writing pipeline |
| ProWrite elevate | GPT-5.2 | Creative sharpening in writing pipeline |
| Voice transcription | OpenAI Whisper | Voice notes |
| Embeddings | text-embedding-3-small | RAG document storage and search |

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 10+
- [Convex](https://convex.dev) account
- Telegram bot token (via [@BotFather](https://t.me/BotFather))
- API keys: Google AI, Anthropic, OpenAI
- Optional: [Clerk](https://clerk.com) (auth + billing), [PostHog](https://posthog.com) (analytics), [CloudConvert](https://cloudconvert.com) (Office files)

### Setup

```bash
git clone https://github.com/ZenGardenDubai/ghali-ai-assistant.git
cd ghali-ai-assistant
pnpm install
cp .env.example .env.local    # Fill in your keys
pnpm dev                      # Starts Next.js + Convex dev servers
```

## Environment Variables

Environment variables are split between two runtimes. `.env.example` lists all variables for reference, but Convex-side variables must be set separately via the Convex CLI.

### Next.js (.env.local)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex HTTP endpoint base URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `INTERNAL_API_SECRET` | Shared secret for Next.js ↔ Convex API auth |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingest host |
| `POSTHOG_PERSONAL_API_KEY` | PostHog personal API key (server-side) |
| `POSTHOG_PROJECT_ID` | PostHog project ID |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (for Mini App initData verification) |

### Convex (set via `npx convex env set`)

| Variable | Description |
|----------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API key (Flash + Pro) |
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude Opus) |
| `OPENAI_API_KEY` | OpenAI API key (Whisper + embeddings) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (from BotFather) |
| `CONVEX_SITE_URL` | Public-facing Convex HTTP URL |
| `INTERNAL_API_SECRET` | Shared secret for Next.js ↔ Convex API auth |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signature secret |
| `CLOUDCONVERT_API_KEY` | CloudConvert API key (Office file conversion) |
| `OPENROUTER_API_KEY` | OpenRouter API key (Kimi K2.5 for ProWrite) |

## Project Structure

```text
ghali-ai-assistant/
├── app/                    # Next.js App Router
│   ├── (en)/               # English pages
│   │   ├── account/        # Account management (Clerk auth)
│   │   ├── admin/          # Admin dashboard, feedback, templates, onboarding
│   │   ├── features/       # Feature landing pages (11 pages)
│   │   ├── feedback/       # Feedback form (token + Clerk auth)
│   │   ├── upgrade/        # Pro plan upgrade + Clerk billing
│   │   ├── privacy/        # Privacy policy
│   │   └── terms/          # Terms of service
│   ├── (ar)/               # Arabic pages (full mirror)
│   ├── tg/                 # Telegram Mini Apps (upgrade, feedback)
│   ├── api/                # Next.js API routes (proxy to Convex)
│   └── providers/          # PostHog + Convex providers
├── convex/                 # Convex backend (25 agent tools)
│   ├── agent.ts            # Ghali agent definition + all tools
│   ├── http.ts             # HTTP routes (Telegram + Clerk webhooks, admin API)
│   ├── messages.ts         # Message processing + async response generation
│   ├── documents.ts        # Document processing + RAG pipeline
│   ├── items.ts            # Structured data (items + collections + embeddings)
│   ├── rag.ts              # RAG component setup
│   ├── proWrite.ts         # ProWrite multi-LLM writing pipeline
│   ├── images.ts           # Image generation (Gemini Pro)
│   ├── voice.ts            # Voice transcription (Whisper)
│   ├── telegram.ts         # Outbound Telegram messaging + Mini App helpers
│   ├── credits.ts          # Credit system + monthly reset
│   ├── billing.ts          # Subscription management (Clerk)
│   ├── scheduledTasks.ts   # Scheduled agent tasks (one-time & recurring)
│   ├── heartbeat.ts        # Proactive check-ins + follow-ups
│   ├── feedback.ts         # Feedback tokens + submissions
│   ├── rateLimiting.ts     # Per-user rate limiting
│   ├── admin.ts            # Admin commands + broadcasting + templates
│   ├── dataManagement.ts   # User data export/deletion
│   ├── mediaStorage.ts     # Media download, storage, caching, expiry
│   ├── memoryCompaction.ts # Auto-compress memory at 75% capacity
│   ├── crons.ts            # Scheduled jobs (credit reset, heartbeat, cleanup)
│   ├── users.ts            # User CRUD + user files (profile, memory, personality, heartbeat)
│   ├── constants.ts        # All business rules (single source of truth)
│   ├── schema.ts           # Database schema
│   └── lib/                # Pure utilities (formatting, templates, etc.)
├── components/             # React components (shadcn/ui)
├── docs/                   # Project documentation
├── lib/                    # Shared frontend utilities
└── public/                 # Static assets (logos, favicons)
```

## Development

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js + Convex dev servers |
| `pnpm dev:web` | Start Next.js only |
| `pnpm dev:convex` | Start Convex dev server only |
| `pnpm build` | Production build |
| `pnpm test` | Run all tests |
| `pnpm test:convex` | Run Convex function tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | TypeScript type checking |

### Testing

The project follows strict TDD. Tests live alongside source files in `convex/` and use `vitest` + `convex-test` with the Edge runtime. Run Convex tests from the `convex/` directory:

```bash
cd convex && npx vitest run
```

## Roadmap

- [x] Project scaffolding and infrastructure
- [x] Database schema
- [x] User management
- [x] Pure utility functions
- [x] Telegram inbound webhook + bot server
- [x] Telegram outbound messaging
- [x] AI agent core (Flash + threads + async flow)
- [x] Escalation tools + search grounding + Telegram formatting
- [x] Credit system
- [x] System commands and templates
- [x] Onboarding flow
- [x] Per-user files (profile, memory, personality, heartbeat)
- [x] Voice notes (Whisper)
- [x] Image generation (Gemini Pro)
- [x] Document processing and RAG
- [x] File conversion (CloudConvert — PDF, DOCX, images, audio)
- [x] Data management commands
- [x] Rate limiting
- [x] Heartbeat (proactive check-ins)
- [x] Admin commands + web dashboard
- [x] Billing (Clerk subscriptions + Telegram Mini App upgrade flow)
- [x] Feedback system (Telegram Mini App + web form + admin panel)
- [x] Landing page (ghali.ae) + Arabic mirror
- [x] Integration testing
- [x] Deployment and configuration
- [x] Structured data (items, collections, embeddings, vector search)
- [x] ProWrite (multi-LLM professional writing pipeline)
- [x] Scheduled agent tasks (one-time & recurring AI tasks)
- [x] Personalization Phase 1 (default personality, language/timezone, bootstrap)
- [x] Personalization Phase 2 (behavioral learning, milestones, proactive follow-ups)
- [x] Telegram migration (bot server, inline keyboards, Mini App upgrade + feedback)
- [ ] Post-launch hardening (monitoring, backups)

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture
- [STACK.md](docs/STACK.md) — Tech stack and project structure
- [STRUCTURED_DATA_SPEC.md](docs/STRUCTURED_DATA_SPEC.md) — Items & collections design
- [SPEC.md](docs/SPEC.md) — Full build specification, architecture, and business rules
- [PLAN.md](docs/PLAN.md) — Step-by-step execution plan with TDD tasks
- [BUSINESS_RULES.md](docs/BUSINESS_RULES.md) — Business rules quick reference
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) — Deployment and configuration guide
- [POSTHOG.md](docs/POSTHOG.md) — Analytics events and dashboard setup
- [TELEGRAM_MIGRATION.md](docs/TELEGRAM_MIGRATION.md) — WhatsApp to Telegram migration plan
- [POST_MIGRATION.md](docs/POST_MIGRATION.md) — Post-migration enhancements
- [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) — Security review
- [PHASE2_PLAN.md](docs/PHASE2_PLAN.md) — Personalization Phase 2 implementation plan
- [Convex Agent docs](https://docs.convex.dev/agents) — Agent framework documentation
- [Convex RAG docs](https://www.convex.dev/components/rag) — Document search component

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Write tests first (TDD)
4. Implement until tests pass
5. Run `pnpm test && pnpm type-check && pnpm lint`
6. Open a pull request

## License

Apache 2.0 — see [LICENSE](LICENSE).

Built by [Zen Garden Dubai](https://github.com/ZenGardenDubai).
