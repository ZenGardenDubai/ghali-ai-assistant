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

### Agent Definition

Single agent with escalation tools. See [Routing Strategy](#routing-strategy-hybrid-single-agent--escalation-tools) for full details.

### Thread Management

- Each WhatsApp user gets a persistent thread (keyed by phone number)
- Web chat users get threads keyed by Clerk user ID
- Single agent per thread — no handoff complexity

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

// Step 2: Generate response (action — retryable)
// No classifier needed — Flash handles directly or escalates via tools
export const generateResponse = internalAction({
  args: { threadId: v.string(), promptMessageId: v.string() },
  handler: async (ctx, { threadId, promptMessageId }) => {
    await ghali.generateText(ctx, { threadId }, { promptMessageId });
  },
});
```

## Routing Strategy: Hybrid (Single Agent + Escalation Tools)

Instead of multiple agents with an external classifier, Ghali uses a **single primary agent (Gemini 3 Flash)** that can escalate to more powerful models via tool calls. This saves one LLM call per message and keeps the codebase simple.

### How It Works

```
User message → Ghali Agent (Gemini 3 Flash)
  → Handles directly (85% of queries — fast, cheap)
  → OR calls `deepReasoning` tool → Gemini 3 Pro (complex tasks)
  → OR calls `premiumReasoning` tool → Claude Opus 4.6 (premium tasks)
  → OR calls `generateImage` tool → Gemini 3 Pro / Nano Banana Pro
```

The LLM itself decides when a task requires escalation — no separate classifier needed.

### Agent Definition

```ts
const ghali = new Agent(components.agent, {
  name: "Ghali",
  languageModel: google.chat("gemini-3-flash"),
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  instructions: `You are Ghali, a friendly and helpful AI assistant on WhatsApp.
    You speak Arabic and English fluently.
    For complex reasoning, coding, or analysis — use the deepReasoning tool.
    For premium quality writing or deep research — use the premiumReasoning tool.
    For image generation — use the generateImage tool.
    Handle everything else directly.`,
  tools: {
    deepReasoning: createTool({
      description: "Use for complex tasks: coding, data analysis, multi-step reasoning, document analysis. Routes to a more powerful model.",
      args: z.object({ prompt: z.string() }),
      handler: async (ctx, args): Promise<string> => {
        // Calls Gemini 3 Pro internally
        const result = await generateWithModel("gemini-3-pro", args.prompt, ctx);
        return result.text;
      },
    }),
    premiumReasoning: createTool({
      description: "Use for the highest quality: nuanced creative writing, deep research, complex multi-domain reasoning. Most expensive — use sparingly.",
      args: z.object({ prompt: z.string() }),
      handler: async (ctx, args): Promise<string> => {
        // Calls Claude Opus 4.6 internally
        const result = await generateWithModel("claude-opus-4-6", args.prompt, ctx);
        return result.text;
      },
    }),
    generateImage: createTool({
      description: "Generate an image from a text description.",
      args: z.object({ prompt: z.string(), aspectRatio: z.string().optional() }),
      handler: async (ctx, args): Promise<string> => {
        // Calls Gemini 3 Pro image generation (Nano Banana Pro)
        return await generateImage(args.prompt, args.aspectRatio);
      },
    }),
    // More tools: web search, calculator, file handling, etc.
  },
  stopWhen: stepCountIs(5),
  ...sharedConfig,
});
```

### Benefits of This Approach

| Benefit | Detail |
|---------|--------|
| **No classifier cost** | No extra LLM call to classify each message |
| **Simple codebase** | One agent definition, not three |
| **Smart escalation** | Flash decides when it needs help — it knows its own limits |
| **Cost control** | Tool descriptions guide the LLM on when to escalate |
| **Shared thread** | All responses in one thread, seamless conversation |
| **Extensible** | Add new tools (web search, calendar, etc.) without changing routing |

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

### Conversation Memory (Convex Agent — built-in)
- Message history auto-included as context per thread
- Hybrid vector + text search across thread messages
- Cross-thread search for same user (opt-in)
- No extra setup needed — comes with the Agent component

### Document Memory / Knowledge Base (Convex RAG Component)

Users can upload documents via WhatsApp or web chat. These are chunked, embedded, and stored per-user for retrieval.

```ts
import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";

const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
  filterNames: ["category", "contentType"],
});
```

#### Adding Documents

```ts
// When user uploads a document via WhatsApp or web
export const ingestDocument = action({
  args: { userId: v.string(), text: v.string(), title: v.string(), contentType: v.string() },
  handler: async (ctx, { userId, text, title, contentType }) => {
    await rag.add(ctx, {
      namespace: userId,  // Per-user isolation
      text,
      title,
      filterValues: [
        { name: "contentType", value: contentType },
      ],
    });
  },
});
```

#### Search as Agent Tool

```ts
// Inside ghali agent tools:
searchDocuments: createTool({
  description: "Search the user's uploaded documents and knowledge base for relevant information.",
  args: z.object({ query: z.string() }),
  handler: async (ctx, args): Promise<string> => {
    const { text } = await rag.search(ctx, {
      namespace: userId,
      query: args.query,
      chunkContext: { before: 2, after: 1 },  // Include surrounding chunks
      limit: 10,
      vectorScoreThreshold: 0.5,
    });
    return text || "No relevant documents found.";
  },
}),
```

#### Key Features
| Feature | Detail |
|---------|--------|
| **Per-user namespaces** | Each user's documents are isolated and only searchable by them |
| **Filtered search** | Filter by content type (PDF, image, note, etc.) |
| **Chunk context** | Returns surrounding chunks for better answers, not just the match |
| **Importance weighting** | Prioritize key documents (0-1 score) |
| **Graceful migrations** | Re-embed all content without disruption if we change models |

#### Supported Document Types (via WhatsApp)
| Type | Processing |
|------|-----------|
| **Text messages** | Direct storage |
| **PDFs** | Extract text → chunk → embed |
| **Images** | Vision model OCR → text → embed |
| **Voice notes** | Whisper transcription → text → embed |
| **Documents (DOCX, XLSX)** | Extract text → chunk → embed |

This replaces the "Memory Vault" concept from hub.ae with a cleaner, component-based architecture.

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
