# Batched Background Reflection Agent

> **Status:** Approved — ready to build
> **Issue:** #225, #218 (reflection suppression removed), POST_MVP.md entry
> **Author:** Hesham + Claude

## Problem

The main agent currently handles both user responses AND silent memory/profile observations in a single `generateText()` call. This causes:

1. **Reflection leaks** — LLM emits internal narration ("Reflecting on behavioral patterns...") in the response text
2. **Slower responses** — memory tool calls add latency to every turn
3. **Response swallowing** — previous suppression code (#189, #204) tried to strip reflection text but ended up dropping real replies (#218)

## Solution: Separate Reflection Agent

Split the agent's work into two concerns:

- **Main agent** — responds to the user immediately. Handles explicit user requests for profile/memory/personality changes.
- **Reflection agent** — runs in the background every N messages. Reviews recent conversation history and silently updates user files with behavioral observations.

## Architecture

```
User message
  → Main agent: generateText() with response tools only
  → Send result.text immediately
  → Increment messagesSinceReflection counter
  → If counter >= threshold:
      → ctx.scheduler.runAfter(0, reflection.runReflection, { userId })
      → Reset counter
```

### Main Agent (Immediate — Per Message)

Keeps these tools for **explicit user requests**:

| Tool | When it fires |
|------|---------------|
| `updateProfile` | User explicitly shares identity facts ("I'm an engineer", "my birthday is March 5") |
| `appendToMemory` | User explicitly asks to remember something ("remember that I like sushi") |
| `editMemory` | User asks to correct/remove a memory |
| `updatePersonality` | User asks to change tone/style ("be more formal") |
| `updateLanguageSetting` | User asks to change language preference |
| `updateTimezoneSetting` | User mentions relocating |
| `updateHeartbeat` | Proactive follow-up scheduling |

The key change: **the agent instructions no longer tell it to silently observe after every response.** The "After EVERY response, reflect: did you learn anything new?" instruction is removed. The agent only calls memory tools when the user explicitly requests it.

### Reflection Agent (Background — Every N Messages)

A separate agent that runs periodically:

| Aspect | Detail |
|--------|--------|
| **Model** | Gemini Flash (cheap, good enough for pattern recognition) |
| **Trigger** | Every N user messages (configurable threshold) |
| **Input** | Last N messages from thread + current user files |
| **Tools** | `appendToMemory`, `editMemory`, `updateProfile`, `updatePersonality` |
| **Output** | None sent to user — tool calls only |
| **Cost** | ~1 Flash call per N messages instead of tool calls on every message |

#### Reflection Agent Prompt (Draft)

```
You are reviewing the last {N} messages from a conversation between Ghali (AI assistant) and a user.
Your job is to identify patterns and facts worth remembering. You have access to the user's current
profile, memory, and personality files.

OBSERVE AND UPDATE:
- Identity facts the user revealed casually (job change, moved cities, new hobby) → updateProfile
- Behavioral patterns across multiple messages (prefers short answers, asks follow-ups, code-switches
  between languages, active times of day) → appendToMemory
- Communication style shifts (became more formal, started using emoji, prefers bullet points) → updatePersonality
- Corrections to existing facts (moved to a new city, changed jobs) → editMemory / updateProfile

DO NOT:
- Duplicate facts already in the user's files
- Store trivial observations ("user said hello")
- Store time-specific events (reminders, appointments) — those use scheduled tasks
- Generate any user-facing text — your output is tool calls only

Current user files are provided below for context. Only update what's new or changed.
```

## Data Model Changes

### `users` table — new fields

```typescript
messagesSinceReflection: v.optional(v.number()),  // Counter, default 0
lastReflectionAt: v.optional(v.number()),          // Timestamp of last reflection run
```

### New file: `convex/reflection.ts`

- `incrementReflectionCounter` — mutation, called after each successful AI response
- `runReflection` — internalAction, the background reflection agent
- `reflectionAgent` — separate Agent instance with reflection-only tools

## Trigger Mechanism

```typescript
// In messages.ts generateResponse, after sending the response:
const newCount = await ctx.runMutation(internal.reflection.incrementReflectionCounter, {
  userId: typedUserId,
});
if (newCount >= REFLECTION_THRESHOLD) {
  await ctx.scheduler.runAfter(0, internal.reflection.runReflection, {
    userId: typedUserId,
  });
}
```

## Decisions (Finalized)

### D1: Trigger threshold — Adaptive

- **First 30 messages:** reflect every **5** user messages (new users share identity-rich info early)
- **After 30 messages:** reflect every **15** user messages

```typescript
const threshold = (user.totalMessages ?? 0) < 30 ? 5 : 15;
```

Requires a `totalMessages` lifetime counter on the user record (or derive from existing data).

### D2: Messages the reflection agent sees

User + assistant messages, **excluding tool calls** (`excludeToolMessages: true`). The agent responses provide crucial context for understanding what was discussed.

### D3: Main agent keeps memory tools (Option B)

Keep `appendToMemory`, `editMemory`, `updateProfile`, `updatePersonality` in the main agent. **Remove the obsessive instructions** ("After EVERY response, reflect...", "BEHAVIORAL OBSERVATION: after every response..."). The agent can still note things when it naturally wants to, but isn't told to do it on every turn. The reflection agent catches everything else in batches.

### D4: Heartbeat stays in main agent

`updateHeartbeat` stays in the main agent. Heartbeat updates are time-sensitive ("Follow up: ask about interview — around March 15") and a poor fit for batched processing.

### D5: Time-based fallback — Piggyback on heartbeat cron

If a user has unreflected messages older than 4 hours, trigger reflection. Check is added to the existing hourly heartbeat cron — no new infrastructure.

```typescript
// In heartbeat.processHeartbeats, for each user:
if (user.messagesSinceReflection > 0 && user.lastMessageAt &&
    Date.now() - user.lastMessageAt > 4 * 60 * 60 * 1000) {
  await ctx.scheduler.runAfter(0, internal.reflection.runReflection, { userId });
}
```

### D6: Transition — Natural accumulation

No migration needed. Existing user files are preserved. The reflection agent starts observing from deployment onward — it reads current files to avoid duplicating existing facts.

### D7: Cost impact

Current: ~1-2 memory tool calls per message (Flash). ~100 messages/day = 100-200 extra tool rounds.

With reflection at every 15 messages: ~7 reflection calls/day, each processing ~15 messages with ~2-4 tool calls.

**Net effect**: roughly neutral or slightly cheaper, with faster response latency as the main benefit.

## UX Impact Analysis

### Good for Experience

1. **Faster responses** — no memory tool call overhead on every turn
2. **No more reflection leaks** — impossible since main agent doesn't have observation instructions
3. **No more swallowed responses** — no suppression code needed
4. **Better pattern recognition** — reviewing 10-15 messages at once catches patterns that single-message observation misses ("user always asks about weather in the morning" only visible across messages)
5. **Predictable behavior** — users won't see random "Reflecting on..." text

### Potentially Bad for Experience

1. **Delayed personalization for new users** — if threshold is 15, user must send 15 messages before any implicit observations are stored. First ~15 messages feel "generic" compared to current behavior where the agent starts personalizing from message 2
2. **Missed time-sensitive observations** — user casually mentions "I have an interview tomorrow" in message 3. Current agent might add a heartbeat follow-up immediately. Reflection agent won't see it until message 15+ (possibly days later)
3. **Explicit-only memory feels less magical** — part of Ghali's charm is that it "just knows" things without being told. Moving to explicit-only in the main agent makes it feel less attentive
4. **Edge case: user sends 14 messages then goes quiet for weeks** — those 14 messages never get reflected on. Need a time-based fallback

### Mitigations

| Risk | Mitigation |
|------|------------|
| Delayed personalization for new users | Lower threshold for first 30 messages (every 5 instead of 15) |
| Missed time-sensitive observations | Keep heartbeat tool in main agent for follow-up scheduling |
| Less "magical" feeling | Keep `appendToMemory` in main agent but remove the obsessive "reflect after EVERY response" instruction (Q3 option B) |
| Quiet users with unreflected messages | Add time-based fallback: if 4+ hours since last reflection AND messagesSinceReflection > 0, trigger reflection |

## Implementation Plan

### Phase 1: Infrastructure
- [ ] Add `messagesSinceReflection` and `lastReflectionAt` fields to users table
- [ ] Create `convex/reflection.ts` with counter mutation and reflection action
- [ ] Define separate reflection agent with limited tool set
- [ ] Add thread message reading via `components.agent.listMessagesByThreadId`

### Phase 2: Reflection Agent
- [ ] Write reflection agent prompt
- [ ] Implement `runReflection` action (read messages, build context, run agent)
- [ ] Add trigger in `messages.ts` after successful response
- [ ] Add time-based fallback trigger (optional cron or check in heartbeat)

### Phase 3: Main Agent Cleanup
- [ ] Remove "After EVERY response, reflect" instruction from agent prompt
- [ ] Remove "BEHAVIORAL OBSERVATION" instruction
- [ ] Keep all tools but update instructions to clarify: only call memory tools for explicit requests or very notable observations
- [ ] Test that responses no longer contain reflection text

### Phase 4: Token Usage & Analytics
- [ ] Track token usage from reflection agent calls in the `usage` table (model, promptTokens, completionTokens, cost)
- [ ] PostHog events (see below)
- [ ] Log reflection agent tool calls for debugging
- [ ] Monitor response latency improvement

## Token Usage Tracking

Token usage is already tracked via the `usageHandler` on agent definitions, which fires `trackAIGeneration` to PostHog. The reflection agent gets its own agent definition with a `usageHandler` that adds `source: "reflection"` to distinguish from user-facing calls:

```typescript
const reflectionAgent = new Agent(components.agent, {
  // ...
  usageHandler: async (ctx, { userId, usage, model, provider }) => {
    // Same as main agent's usageHandler, but with source: "reflection"
    await ctx.scheduler.runAfter(0, internal.analytics.trackAIGeneration, {
      phone: user.phone,
      model,
      provider,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      source: "reflection",  // <-- distinguishes from "chat"
    });
  },
});
```

**Important:** Reflection calls consume tokens but do NOT cost the user credits — they're a background system operation, not a user-initiated request. No `deductCredit` call.

## PostHog Events

### `reflection_agent_ran`

Fired after every reflection agent execution.

| Property | Type | Description |
|----------|------|-------------|
| `phone` | string | User phone (PostHog distinct_id) |
| `tier` | string | "basic" or "pro" |
| `messages_reviewed` | number | Number of messages in the batch |
| `tools_called` | string[] | Which tools the reflection agent called (e.g. ["appendToMemory", "updateProfile"]) |
| `tools_called_count` | number | Total number of tool calls made |
| `prompt_tokens` | number | Input tokens consumed |
| `completion_tokens` | number | Output tokens consumed |
| `trigger` | string | "counter" or "time_fallback" — how the reflection was triggered |
| `threshold` | number | The threshold that was used (5 or 15) |
| `duration_ms` | number | Total execution time |

### `reflection_agent_skipped`

Fired when reflection is triggered but skipped (user opted out, etc.).

| Property | Type | Description |
|----------|------|-------------|
| `phone` | string | User phone |
| `reason` | string | "opted_out" or "error" |

### Dashboard Queries

Useful PostHog insights to create:

- **Reflection cost over time** — sum of `prompt_tokens + completion_tokens` grouped by day
- **Average tools called per reflection** — are reflections productive or mostly no-ops?
- **Counter vs fallback trigger ratio** — are users hitting the message threshold or mostly falling back to time-based?
- **Reflection frequency by tier** — Pro users message more, so they should trigger more reflections
