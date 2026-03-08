# Architecture

System architecture overview for Ghali. See [SPEC.md](SPEC.md) for full build specification.

## Message Flow

```text
WhatsApp message
  → Twilio webhook (Convex HTTP route, POST /twilio/webhook)
  → Validate signature (Web Crypto HMAC-SHA1) + check country blocklist
  → Deduplicate (MessageSid check)
  → Find or create user + thread
  → Save message (Convex mutation, transactional)
  → Schedule async response (ctx.scheduler.runAfter)
  → Return 200 + empty TwiML immediately

Background action:
  → Load user files (profile, memory, personality, heartbeat)
  → Check/deduct credits (1 credit per user-initiated request)
  → Gemini Flash generates response (with tools available):
      → deepReasoning → Claude Opus (complex tasks)
      → generateImage → Gemini Pro (image generation)
      → googleSearch → real-time web data
      → searchDocuments → user's RAG knowledge base
      → addItem/queryItems/updateItem → structured data
      → updateMemory/updatePersonality/updateHeartbeat → user files
  → Format for WhatsApp + split long messages (1500 char limit)
  → Send reply via Twilio API
```

Web chat uses the same mutation → action pattern but streams via Convex WebSocket.

## Single Agent with Escalation

No multi-agent system or external classifier. One agent (Gemini 3 Flash) handles all messages and self-escalates via tool calls:

| Route | Model | Usage |
|-------|-------|-------|
| Primary (85%) | Gemini 3 Flash | Fast, cheap, handles most messages |
| Deep reasoning (15%) | Claude Opus 4.6 | Complex tasks, coding, analysis, premium writing |
| Image generation | Gemini 3 Pro | Text-to-image requests |

Flash decides when to escalate. No separate classifier call needed.

## Per-User Files

Four markdown files per user in `userFiles` table, loaded into agent context every turn:

- **profile** — identity facts (who the user IS), organized by section: personal, professional, education, family, location, links, milestones. Never compacted. Section-replace semantics.
- **memory** — soft behavioral observations, preferences, and context. Auto-compacted at 38.4KB. Categories: preferences, schedule, interests, general.
- **personality** — immutable system block (Ghali DNA) + editable user block (tone, verbosity, emoji, off-limits topics)
- **heartbeat** — checklist for proactive check-ins, recurring awareness items, and agent-created follow-ups

Agent updates via tools: `updateProfile`, `updateMemory`, `updatePersonality`, `updateHeartbeat`. Users edit naturally through conversation.

### Behavioral Learning

The agent silently observes communication patterns and stores them in memory:
- Message length, emoji usage, language switching → preferences
- Time-of-day habits → schedule
- Recurring topics → interests

Notable life events (job changes, visa approvals, moves) are captured as permanent milestones in the profile — never compacted.

When users mention notable upcoming events (interviews, deadlines, trips), the agent adds follow-up items to the heartbeat file. The hourly cron evaluates these and fires personalized check-ins when the date arrives.

## Items & Collections

Structured data system for tracking expenses, tasks, contacts, notes, and bookmarks. See [STRUCTURED_DATA_SPEC.md](STRUCTURED_DATA_SPEC.md) for full design.

### Schema

- **items** — type, title, amount, currency, tags, dueDate, reminderTime, status, notes, collectionId, embeddingId
- **collections** — name, emoji, description, per-user
- **itemEmbeddings** — vector embeddings (1536-dim, text-embedding-3-small) for semantic search

### Embedding Pipeline

1. Build text representation from item fields (type, title, amount, tags, notes, collection)
2. Generate embedding via OpenAI text-embedding-3-small
3. Store in `itemEmbeddings` table with vector index
4. Re-embed on item update if content changed

### Hybrid Search

Queries use both text scoring and vector similarity:

1. **Text search** — exact/fuzzy match on title, tags, notes, type, collection name
2. **Vector search** — cosine similarity on query embedding vs stored embeddings
3. **Combine** — weighted merge (0.4 text + 0.6 vector), deduplicated, top-K results
4. **Fallback** — if vector search unavailable, text-only results returned

## Credit System

- All features available to all users — Pro = more credits
- 1 credit per user-initiated request regardless of model
- System commands and heartbeat check-ins are free
- Scheduled task executions cost 1 credit each
- Basic: 60/month free, Pro: 600/month ($9.99/mo or $99.48/year)
- Monthly reset via Convex cron job

## Document Processing & RAG

Files received via WhatsApp:
- PDF/images/audio/video → sent directly to Gemini 3 Flash
- DOCX/PPTX/XLSX → CloudConvert → PDF → Gemini 3 Flash
- Content chunked, embedded (text-embedding-3-small), stored per-user in RAG namespace
- Future retrieval via `searchDocuments` tool

Uses `@convex-dev/rag` with pre-computed embeddings via `ai@5` to avoid version conflicts.

## Key Convex Tables

| Table | Purpose |
|-------|---------|
| `users` | Phone, name, language, timezone, tier, isAdmin, credits |
| `userFiles` | Per-user markdown files (profile/memory/personality/heartbeat) |
| `items` | Structured data items (expenses, tasks, contacts, etc.) |
| `collections` | Named groups for organizing items |
| `itemEmbeddings` | Vector embeddings for semantic item search |
| `usage` | Per-message tracking: model, tokens, cost |
| `scheduledTasks` | AI-powered scheduled tasks (one-time & recurring) |
| `scheduledJobs` | Heartbeat and legacy reminders |
| `feedback` | User feedback, bug reports, feature requests |
| `feedbackTokens` | Short-lived tokens for WhatsApp feedback links |

Threads and messages managed by `@convex-dev/agent`. RAG documents managed by `@convex-dev/rag`.

## Scheduled Agent Tasks

Scheduled tasks replace the old reminders system. Each task triggers a full agent turn at the scheduled time.

```text
Task fires (ctx.scheduler.runAt)
  → Load task + user
  → Check credits (skip if exhausted, send one notification per cycle)
  → Build user context (memory, personality)
  → Get/create thread
  → Run agent (ghaliAgent.generateText with task description as prompt)
  → Deduct 1 credit
  → Deliver result via WhatsApp:
    → In-session (24h window): free-form message
    → Out-of-session: template message (truncated to 1400 chars)
  → If cron: compute next run → reschedule
  → If once: set enabled = false
```

Limits: 3 tasks (Basic), 24 tasks (Pro). Paused tasks count toward limit.

## Feedback System

Two entry points, both free (no credit deduction):

1. **WhatsApp link** — user says "I have feedback" → agent generates tokenized link → user opens `/feedback?token=xxx` → web form
2. **Web** — signed-in user on `/account` → "Give Feedback" → `/feedback` with Clerk auth

Token-based links expire in 15 minutes and are single-use. Rate limit: 3 feedbacks/day per user. Admin panel at `/admin/feedback` for viewing, filtering, status management, notes, and WhatsApp replies.

## Template Messages

System messages (credits, help, billing) use pre-defined templates with `{{variable}}` placeholders — never free-form LLM generation. Pipeline: fill template → detect language → translate if not English. Numbers, emoji, and formatting are never translated.

See [POSTHOG.md](POSTHOG.md) for analytics architecture.
