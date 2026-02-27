# Tech Stack

## Core Technologies

| Layer | Technology | Role |
|-------|-----------|------|
| Framework | Next.js 16 (App Router) | Web frontend + API routes |
| Language | TypeScript | End-to-end type safety |
| Database | Convex | Real-time serverless DB + backend |
| Auth | Clerk | Authentication + billing (subscriptions) |
| AI Agent | @convex-dev/agent | Threads, messages, tools, streaming, RAG |
| AI SDK | Vercel AI SDK v5 | Model provider abstraction |
| RAG | @convex-dev/rag | Document chunking + search |
| Messaging | Twilio WhatsApp Business API | Inbound/outbound WhatsApp |
| UI | Tailwind v4 + shadcn/ui | Styling + components |
| Analytics | PostHog | Server + client event tracking |
| Testing | Vitest + convex-test | Unit + integration tests |
| Hosting | Vercel + Convex Cloud | Frontend + backend hosting |
| Package Manager | pnpm | Dependency management |

## AI Models

| Role | Model | Package |
|------|-------|---------|
| Primary agent | Gemini 3 Flash | @ai-sdk/google |
| Deep reasoning | Claude Opus 4.6 | @ai-sdk/anthropic |
| Image generation | Gemini 3 Pro | @ai-sdk/google |
| Voice transcription | OpenAI Whisper | openai (REST) |
| Embeddings | text-embedding-3-small | @ai-sdk/openai |

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
│   ├── providers/          # PostHog + Convex providers
│   └── components/         # React components (landing page, etc.)
├── convex/                 # Convex backend
│   ├── agent.ts            # Ghali agent definition + all tools
│   ├── http.ts             # HTTP routes (Twilio + Clerk webhooks, admin API)
│   ├── schema.ts           # Database schema (all tables)
│   ├── items.ts            # Structured data (items + collections + embeddings)
│   ├── documents.ts        # Document processing + RAG pipeline
│   ├── rag.ts              # RAG component setup
│   ├── images.ts           # Image generation (Gemini Pro)
│   ├── voice.ts            # Voice transcription (Whisper)
│   ├── twilio.ts           # Outbound WhatsApp messaging
│   ├── credits.ts          # Credit system
│   ├── billing.ts          # Subscription management (Clerk)
│   ├── heartbeat.ts        # Proactive check-ins (all users)
│   ├── rateLimiting.ts     # Per-user rate limiting
│   ├── admin.ts            # Admin commands + broadcasting
│   ├── dataManagement.ts   # User data export/deletion
│   ├── crons.ts            # Scheduled jobs (credit reset, heartbeat, cleanup)
│   ├── users.ts            # User CRUD + user files
│   ├── constants.ts        # All business rules (single source of truth)
│   └── lib/                # Pure utilities (formatting, templates, etc.)
├── components/             # Shared React components (shadcn/ui)
├── docs/                   # Project documentation
├── lib/                    # Shared frontend utilities
└── public/                 # Static assets (logos, favicons)
```

## Key Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `convex` | 1.x | Convex client + server runtime |
| `@convex-dev/agent` | 0.3.x | Agent framework (threads, tools, streaming) |
| `@convex-dev/rag` | 0.7.x | RAG document search component |
| `ai` | 5.x | Vercel AI SDK core |
| `@ai-sdk/google` | 2.x | Google AI provider (v2 for LanguageModelV2) |
| `@ai-sdk/anthropic` | 2.x | Anthropic provider (v2) |
| `@ai-sdk/openai` | 2.x | OpenAI provider (v2, embeddings) |
| `@clerk/nextjs` | latest | Clerk auth + React components |
| `zod` | 3.x | Schema validation (must be v3 for AI SDK v2) |
