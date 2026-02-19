# Ghali غالي

**Your AI assistant on WhatsApp.**

One chat. Every AI. No apps, no accounts — just message.

## What is Ghali?

Ghali is a WhatsApp-native AI assistant that gives you access to the world's best AI models through a simple chat. Smart routing sends each query to the right model — fast and cheap for simple tasks, powerful for complex ones.

## Core Concepts (inspired by [OpenClaw](https://github.com/openclaw/openclaw))

- **🫀 Heartbeat** — Proactive check-ins, not just reactive responses
- **👤 Personality (SOUL)** — Configurable personality and tone
- **⏰ Cron Jobs** — Scheduled tasks, reminders, background work
- **🧠 Memory** — Persistent memory across conversations with vector search
- **🔧 Tools** — Extensible tool system for real-world actions
- **🤖 Smart Routing** — Right model for the right task, automatically

## Architecture

```
WhatsApp (Twilio) → Next.js API → Convex Agent → Smart Router
  ├── 85% → Gemini 3 Flash     (fast, cheap, multilingual)
  ├── 10% → Gemini 3 Pro       (complex reasoning)
  ├──  5% → Claude Opus 4.6    (premium deep reasoning)
  └── Images → Gemini 3 Pro    (Nano Banana Pro generation)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router, TypeScript) |
| **Database** | Convex (real-time serverless) |
| **AI Agents** | Convex Agent Component |
| **Tagging** | Convex Tag Component |
| **Auth** | Clerk |
| **Embeddings** | OpenAI text-embedding-3-small |
| **Messaging** | Twilio WhatsApp Business API |
| **Hosting** | Vercel + Convex Cloud |

## AI Models

| Tier | Model | Cost (in/out per M tokens) | Use Case |
|------|-------|---------------------------|----------|
| Primary | Gemini 3 Flash | $0.50 / $3 | Daily chat, Q&A, translations |
| Reasoning | Gemini 3 Pro | $2 / $12 | Complex analysis, coding |
| Premium | Claude Opus 4.6 | $15 / $75 | Deep reasoning, nuanced writing |
| Images | Gemini 3 Pro | ~$0.13/image | Image generation |

## Status

🚧 Early development — not yet ready for public use.

## License

Apache 2.0

---

*Built in Dubai 🇦🇪*
