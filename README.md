# Ghali غالي

**WhatsApp-first AI assistant. One chat, best models, zero apps.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

## What is Ghali

Ghali is an open-source AI assistant you talk to on WhatsApp. One agent (Gemini Flash) handles every message and self-escalates to stronger models when needed — Claude Opus for deep reasoning, Gemini Pro for image generation. It remembers you across conversations, adapts to your style, and can proactively check in on things you care about.

## Features

### Core AI
- **Single agent with smart routing** — Flash handles 85% of messages; escalates to Opus for complex reasoning/coding and Gemini Pro for images
- **Google Search grounding** — real-time web data (weather, news, prices, sports)
- **Voice notes** — Whisper transcription, processed as text
- **Image generation** — text-to-image via Gemini Pro, delivered as WhatsApp media

### Media and Files
- **Document processing** — PDF, images, audio, video sent directly to Gemini Flash
- **Office files** — DOCX/PPTX/XLSX converted via CloudConvert, then processed
- **Personal RAG** — uploaded documents chunked, embedded, and stored per-user for future retrieval
- **Reply-to-media** — reply to a previously sent file with a new question

### User Experience
- **Per-user memory** — learns facts, preferences, and history organically through conversation
- **Adaptive personality** — two-layer system: immutable core DNA + editable user preferences
- **Heartbeat** — per-user checklist for proactive reminders and follow-ups (hourly precision, all users)
- **3-step onboarding** — name, language, style preference (skippable)
- **Multilingual templates** — system messages detected, translated, numbers/formatting preserved

### System
- **Credit system** — 60/month free, 600/month Pro ($9.99/mo or $99.48/year). 1 credit per request.
- **System commands** — `credits`, `help`, `privacy`, `upgrade`, `account` — template-based, no LLM cost
- **Rate limiting** — per-user token bucket (30/min sustained, 40 burst)
- **Country code blocking** — configurable blocklist
- **Data management** — `clear memory`, `clear documents`, `clear everything` with confirmation
- **Admin dashboard** — web panel for stats, user management, and template broadcasting

## How It Works

```
WhatsApp message
  → Twilio webhook (Convex HTTP route)
  → Validate signature + check country blocklist
  → Deduplicate (MessageSid check)
  → Find or create user + thread
  → Save message (Convex mutation)
  → Schedule async response (ctx.scheduler.runAfter)
  → Return 200 immediately

Background action:
  → Load user files (memory, personality, heartbeat)
  → Check/deduct credits
  → Gemini Flash generates response (with tools available)
    → deepReasoning tool → Claude Opus (if needed)
    → generateImage tool → Gemini Pro (if needed)
    → googleSearch tool → real-time web data (if needed)
    → searchDocuments tool → user's RAG knowledge base (if needed)
  → Format for WhatsApp + split long messages
  → Send reply via Twilio API
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
| Messaging | Twilio WhatsApp Business API |
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
| Voice transcription | OpenAI Whisper | Voice notes |
| Embeddings | text-embedding-3-small | RAG document storage and search |

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 10+
- [Convex](https://convex.dev) account
- [Twilio](https://twilio.com) account with WhatsApp Business
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

### Convex (set via `npx convex env set`)

| Variable | Description |
|----------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API key (Flash + Pro) |
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude Opus) |
| `OPENAI_API_KEY` | OpenAI API key (Whisper + embeddings) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | Your Twilio WhatsApp number |
| `CONVEX_SITE_URL` | Public-facing Convex HTTP URL (for Twilio signature validation) |
| `INTERNAL_API_SECRET` | Shared secret for Next.js ↔ Convex API auth |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signature secret |
| `CLOUDCONVERT_API_KEY` | CloudConvert API key (Office file conversion) |

## Project Structure

```text
ghali-ai-assistant/
├── app/                    # Next.js App Router
│   ├── account/            # Account management page
│   ├── admin/              # Admin dashboard + template management
│   ├── api/                # Next.js API routes (proxy to Convex)
│   ├── features/           # Feature landing pages
│   ├── upgrade/            # Pro plan upgrade + Clerk billing
│   ├── privacy/            # Privacy policy
│   ├── terms/              # Terms of service
│   └── providers/          # PostHog + Convex providers
├── convex/                 # Convex backend
│   ├── agent.ts            # Ghali agent definition + tools
│   ├── http.ts             # HTTP routes (Twilio + Clerk webhooks, admin API)
│   ├── documents.ts        # Document processing + RAG pipeline
│   ├── rag.ts              # RAG component setup
│   ├── images.ts           # Image generation (Gemini Pro)
│   ├── voice.ts            # Voice transcription (Whisper)
│   ├── twilio.ts           # Outbound WhatsApp messaging
│   ├── credits.ts          # Credit system
│   ├── billing.ts          # Subscription management (Clerk)
│   ├── heartbeat.ts        # Proactive check-ins (Pro)
│   ├── rateLimiting.ts     # Per-user rate limiting
│   ├── admin.ts            # Admin commands + broadcasting
│   ├── dataManagement.ts   # User data export/deletion
│   ├── crons.ts            # Scheduled jobs (credit reset, heartbeat, cleanup)
│   ├── users.ts            # User CRUD + user files
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
- [x] Twilio inbound webhook
- [x] Twilio outbound messaging
- [x] AI agent core (Flash + threads + async flow)
- [x] Escalation tools + search grounding + WhatsApp formatting
- [x] Credit system
- [x] System commands and templates
- [x] Onboarding flow
- [x] Per-user files (memory, personality, heartbeat)
- [x] Voice notes (Whisper)
- [x] Image generation (Gemini Pro)
- [x] Document processing and RAG
- [x] Data management commands
- [x] Rate limiting
- [x] Heartbeat (proactive check-ins)
- [x] Admin commands
- [x] Billing (Clerk subscriptions)
- [x] Landing page (ghali.ae)
- [x] Integration testing
- [x] Deployment and configuration
- [ ] Post-launch hardening (monitoring, backups)

## Documentation

- [SPEC.md](docs/SPEC.md) — Full build specification, architecture, and business rules
- [PLAN.md](docs/PLAN.md) — Step-by-step execution plan with TDD tasks
- [BUSINESS_RULES.md](docs/BUSINESS_RULES.md) — Business rules quick reference
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) — Deployment and configuration guide
- [POSTHOG.md](docs/POSTHOG.md) — Analytics events and dashboard setup
- [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) — Security review
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
