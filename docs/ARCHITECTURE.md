# Ghali Architecture

## Overview

Ghali is a WhatsApp-native AI assistant built on Next.js, Convex, and the Convex Agent component. Smart routing sends each query to the optimal model tier.

## Flow

```
User (WhatsApp)
  → Twilio Webhook
    → Next.js API Route (/api/webhooks/twilio)
      → Convex Mutation (saveMessage + scheduler)
        → Convex Action (generateText/streamText)
          → Smart Router → Model Tier
        → Response saved to thread
      → Twilio API (send reply to WhatsApp)

User (Web Chat)
  → Next.js Frontend (React)
    → Convex Mutation (saveMessage + scheduler)
      → Convex Action (generateText/streamText)
        → Smart Router → Model Tier
      → Response streamed via WebSocket to client
```

## Convex Agent Component

The core of Ghali's AI layer. Handles:
- **Threads** — One per user/conversation. Persistent message history.
- **Messages** — Auto-saved, auto-indexed for vector search.
- **Context** — Conversation history + vector search automatically included in LLM calls.
- **Streaming** — Real-time via WebSockets (web chat). Final result sent to WhatsApp.
- **Tools** — Extensible tool system for external actions.
- **Usage tracking** — Per-model, per-user, per-agent cost tracking via `usageHandler`.
- **Rate limiting** — Via Convex Rate Limiter Component.

### Agent Definitions

Three agents sharing the same embedding model and thread system:

```ts
import { Agent } from "@convex-dev/agent";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";

const sharedConfig = {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  usageHandler: async (ctx, args) => {
    // Track usage per user, model, agent for billing/credits
  },
};

// Primary — 85% of queries
const ghaliFlash = new Agent(components.agent, {
  name: "Ghali Flash",
  languageModel: google.chat("gemini-3-flash"),
  instructions: "You are Ghali, a friendly AI assistant...",
  tools: { /* common tools */ },
  ...sharedConfig,
});

// Reasoning — 10% of queries
const ghaliPro = new Agent(components.agent, {
  name: "Ghali Pro",
  languageModel: google.chat("gemini-3-pro"),
  instructions: "You are Ghali. Use deep reasoning for complex tasks...",
  tools: { /* common + advanced tools */ },
  ...sharedConfig,
});

// Premium — 5% of queries
const ghaliOpus = new Agent(components.agent, {
  name: "Ghali Opus",
  languageModel: anthropic.chat("claude-opus-4-6"),
  instructions: "You are Ghali. Provide the highest quality response...",
  tools: { /* common + advanced tools */ },
  ...sharedConfig,
});
```

### Thread Management

- Each WhatsApp user gets a persistent thread (keyed by phone number)
- Web chat users get threads keyed by Clerk user ID
- Agents can hand off within the same thread:
  ```ts
  // Flash starts, but if complex, Pro continues on the same thread
  const { thread } = await ghaliPro.continueThread(ctx, { threadId });
  ```

### Message Flow (Async Pattern)

```ts
// Step 1: Save user message (mutation — transactional, optimistic UI)
export const sendMessage = mutation({
  args: { threadId: v.id("threads"), prompt: v.string() },
  handler: async (ctx, { threadId, prompt }) => {
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      prompt,
    });
    await ctx.scheduler.runAfter(0, internal.chat.generateResponse, {
      threadId,
      promptMessageId: messageId,
    });
  },
});

// Step 2: Route and generate (action — retryable)
export const generateResponse = internalAction({
  args: { threadId: v.string(), promptMessageId: v.string() },
  handler: async (ctx, { threadId, promptMessageId }) => {
    const tier = await classifyQuery(ctx, threadId, promptMessageId);
    const agent = tier === "pro" ? ghaliPro
                : tier === "opus" ? ghaliOpus
                : ghaliFlash;
    await agent.generateText(ctx, { threadId }, { promptMessageId });
  },
});
```

## Smart Router

Classifies each incoming message to determine the right model tier.

### Classification Logic

```
User message → Gemini 3 Flash (classifier)
  → "simple"   → Ghali Flash   (general chat, Q&A, translations)
  → "complex"  → Ghali Pro     (coding, analysis, multi-step reasoning)
  → "premium"  → Ghali Opus    (nuanced writing, deep research)
  → "image"    → Nano Banana   (image generation via Gemini 3 Pro)
```

### Classification Criteria

| Tier | Triggers |
|------|----------|
| Flash | Greetings, simple Q&A, translations, summaries, casual chat |
| Pro | Code generation, data analysis, document analysis, multi-step tasks |
| Opus | Creative writing, deep research, complex reasoning, sensitive topics |
| Image | Any request for image creation/editing |

## WhatsApp Integration (Twilio)

### Inbound (user → Ghali)
```
Twilio POST /api/webhooks/twilio
  → Parse message (text, image, audio, document)
  → Look up or create user thread
  → Save message to Convex
  → Schedule async response generation
  → Return 200 to Twilio
```

### Outbound (Ghali → user)
```
Response generated in Convex action
  → Fetch from thread
  → Twilio Messages API → WhatsApp
```

### Supported Message Types
- **Text** — Direct processing
- **Voice notes** — Transcribe (Whisper) → process as text → reply
- **Images** — Vision model analysis or image-based Q&A
- **Documents** — Extract text → process → reply

## Web Chat Interface

- Built with Next.js App Router + React
- Real-time updates via Convex `useQuery` subscriptions
- Streaming responses via WebSocket deltas (not HTTP streaming)
- Clerk auth for user identification
- Same thread/agent system as WhatsApp

## Memory & RAG

### Built-in (Convex Agent)
- Message history auto-included as context
- Hybrid vector + text search across thread messages
- Cross-thread search for same user (opt-in)

### Extended (Convex RAG Component)
- Document storage and retrieval
- User-uploaded files indexed and searchable
- Knowledge base for domain-specific answers

## Usage & Credits

### Tracking
- `usageHandler` callback on every LLM call
- Captures: tokens in/out, model, provider, agent, user, thread
- Stored in Convex for real-time billing

### Credit System
- Basic tier: X credits/month (free)
- Premium tier: Y credits/month (paid)
- Different models consume different credit amounts
- Real-time credit balance via Convex queries

## Components Used

| Component | Purpose |
|-----------|---------|
| `@convex-dev/agent` | AI agent framework (threads, messages, tools, RAG) |
| `@convex-dev/tags` | Tagging/categorization for messages and threads |
| `@convex-dev/rate-limiter` | Rate limiting per user |
| `@convex-dev/rag` | Extended RAG for document storage (if needed) |

## AI SDK Providers

| Package | Models |
|---------|--------|
| `@ai-sdk/google` | Gemini 3 Flash, Gemini 3 Pro |
| `@ai-sdk/anthropic` | Claude Opus 4.6 |
| `@ai-sdk/openai` | text-embedding-3-small (embeddings) |
