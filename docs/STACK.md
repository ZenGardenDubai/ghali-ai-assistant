# Ghali Tech Stack

## Framework
- **Next.js 15** — App router, React Server Components
- **TypeScript** — Strict mode

## Backend & Database
- **Convex** — Real-time database, serverless functions
  - **Convex Agent Component** — AI agent framework (memory, threads, tool use)
  - **Convex Tag Component** — Tagging/categorization system
  - Other components TBD as needed

## Auth
- **Clerk** — User authentication & management

## AI Models

### Text Generation (3-tier routing)
| Tier | Model | Use Case | Cost/M tokens (in/out) |
|------|-------|----------|----------------------|
| Primary (85%) | Gemini 3 Flash | Daily chat, Q&A, translations | $0.50 / $3 |
| Reasoning (10%) | Gemini 3 Pro | Complex analysis, coding | $2 / $12 |
| Premium (5%) | Claude Opus 4.6 | Deep reasoning, nuanced writing | $15 / $75 |

### Embeddings
- **OpenAI text-embedding-3-small** — $0.02/M tokens, 1536 dims

### Image Generation
- **Gemini 3 Pro** (Nano Banana Pro) — ~$0.13/image

## Messaging
- **Twilio** — WhatsApp Business API (existing account from hub.ae)
  - Same number: +971582896090 (Ghali)
  - Webhooks → Next.js API routes → Convex

## Hosting
- **Vercel** — Next.js deployment
- **Convex Cloud** — Database & serverless

## Project Structure (planned)
```
ghali-ai-assistant/
├── app/                    # Next.js app router
│   ├── api/
│   │   └── webhooks/
│   │       └── twilio/     # WhatsApp incoming messages
│   ├── chat/               # Web chat interface
│   └── dashboard/          # Admin dashboard
├── convex/
│   ├── agents/             # Convex Agent definitions
│   ├── messages/           # Message handling
│   ├── memory/             # User memory/context
│   └── schema.ts           # Database schema
├── lib/
│   ├── ai/                 # Model routing logic
│   ├── twilio/             # WhatsApp integration
│   └── embeddings/         # Embedding utilities
├── docs/
└── public/
```
