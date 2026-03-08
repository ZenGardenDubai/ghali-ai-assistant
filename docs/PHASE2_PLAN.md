# Phase 2 — Behavioral Learning Implementation Plan

**Goal:** Make Ghali more knowledgeable about users and more useful through silent observation, permanent milestone tracking, and proactive follow-ups.

**Two PRs now, one deferred:**

| PR | Item | Type | Effort | Status |
|----|------|------|--------|--------|
| PR A | Behavioral reflection + Milestones | Prompt + small code | 1–2 hours | TODO |
| PR B | Ghali-initiated follow-ups (heartbeat) | Prompt change only | 30 min | TODO |
| PR C | Re-engagement for inactive users | New code + template | 1 day | Deferred → POST_MVP.md |

---

## PR A — Behavioral Reflection + Milestones

### A1: Behavioral Reflection (Agent Instructions Only)

**What:** Tell the agent to silently observe communication patterns and store them in memory.

**Why:** The agent already has `appendToMemory` with categories (preferences, schedule, interests, general). It just isn't told to proactively observe patterns. This is a prompt problem, not a code problem.

**Change:** Add to `AGENT_INSTRUCTIONS` in `convex/agent.ts`, after the existing memory rules:

```
BEHAVIORAL OBSERVATION:
After every response, silently assess if you noticed a communication pattern worth remembering:
- Message length patterns → note in preferences ("prefers concise responses")
- Emoji usage → note in preferences ("rarely uses emoji — match their style")
- Language switching → note in preferences ("uses Arabic for serious topics, English casually")
- Time-of-day habits → note in schedule ("typically active late evening 11pm–1am")
- Recurring topics or workflows → note in interests
- Response preferences → note in preferences ("always asks for bullet points")

Rules:
- Do this SILENTLY — never tell the user you're observing.
- Only store genuinely notable patterns, not every interaction.
- Don't duplicate — check if a similar observation already exists in memory.
- These observations inform how you communicate with this user over time.
```

**Files changed:**
- `convex/agent.ts` — add behavioral observation block to AGENT_INSTRUCTIONS

**Tests:** None needed (prompt-only change).

---

### A2: Milestones (New Profile Category)

**What:** Add `milestones` as a profile category — permanent, never-compacted records of significant life events with dates.

**Why:** Currently, life events like "started new job" or "visa approved" go into memory's `general` category and get compacted away at 38.4KB. Profile is never compacted — milestones belong there.

**How profile works:** Section-replace semantics. Agent reads current section, adds new milestone, writes full section back. Same as all other profile categories.

**Example content:**
```
## Milestones
- Started new job at Acme Corp → March 2026
- Visa approved → February 2026
- Daughter born → January 2026
```

**Files changed:**

1. **`convex/lib/profile.ts`**
   - Add `milestones: "Milestones"` to `PROFILE_CATEGORIES` (after `links`)
   - Add `"milestones"` to `PROFILE_CATEGORY_ORDER` array (after `"links"`)

2. **`convex/agent.ts`**
   - Add `"milestones"` to `updateProfile` tool's category enum
   - Add milestones instruction to AGENT_INSTRUCTIONS profile section:
     ```
     Profile category: milestones — significant life events with approximate dates.
     Examples: "Started new job at X → March 2026", "Visa approved → Feb 2026",
     "Moved to Dubai → Jan 2026". Only meaningful transitions and achievements.
     Do NOT store routine events. These are permanent — reference them naturally
     in future conversations ("How's the new job going?").
     ```
   - Update ABILITIES section to mention milestones

3. **`convex/lib/profile.test.ts`**
   - Add test: milestones section appears in correct canonical order
   - Add test: milestones section can be created and replaced

**Migration:** None needed. Existing users have no milestones section — it gets created on first use.

---

## PR B — Ghali-Initiated Follow-ups (Heartbeat)

### What

Tell the agent to add follow-up items to the heartbeat file when users mention notable events worth checking in on later.

### Why

The heartbeat cron already runs hourly, evaluates all items via AI, and sends messages (using `TWILIO_TPL_HEARTBEAT` template for out-of-window users). We just need the agent to populate it with follow-up items.

### How

**Agent instruction addition** in `convex/agent.ts`:

```
PROACTIVE FOLLOW-UPS:
When a user mentions a notable upcoming or recent event worth following up on
(interview, deadline, trip, doctor visit, exam, application, important meeting),
add a follow-up item to the heartbeat file using updateHeartbeat:

  Format: "Follow up: ask about [topic] — around [approximate date]"
  Example: "Follow up: ask how the job interview went — around March 15"

The heartbeat cron evaluates all items hourly and will fire when appropriate.
After firing, the heartbeat processor removes one-shot follow-ups automatically.

Rules:
- Be selective — only events the user would genuinely appreciate being asked about.
- Don't add follow-ups for trivial mentions ("I had coffee" → no follow-up).
- Don't add follow-ups if the user already resolved the topic in conversation.
- When adding a follow-up, preserve ALL existing heartbeat items (read current file first).
- Space follow-ups appropriately (not the same day as the event — give 2-3 days).
```

**Files changed:**
- `convex/agent.ts` — add follow-up instruction to AGENT_INSTRUCTIONS heartbeat section

**Tests:** None needed (prompt-only change).

**Why this works with existing infrastructure:**
- Heartbeat file already contains items the AI evaluates hourly
- `processUserHeartbeat` already checks 24h window and uses `sendTemplate` when outside
- `TWILIO_TPL_HEARTBEAT` template body is `{{1}}` — fully flexible for any message
- Agent already manages heartbeat file content via `updateHeartbeat`
- Follow-up items are just another type of heartbeat item

---

## PR C — Re-engagement (DEFERRED)

Moved to `docs/POST_MVP.md`. See full design there.

Rationale: Most complex PR, hardest to measure value. Better to let behavioral learning (PR A) and follow-ups (PR B) run first, then add outreach when Ghali has richer context to draw from.

---

## Key File Reference

| File | Role |
|------|------|
| `convex/agent.ts` | Agent instructions + tool definitions (lines 56–1822) |
| `convex/lib/profile.ts` | Profile categories + section-replace logic |
| `convex/lib/profile.test.ts` | Profile unit tests |
| `convex/lib/memory.ts` | Memory categories + append/edit/compaction |
| `convex/lib/userFiles.ts` | `buildUserContext()` — injects all user files into agent |
| `convex/heartbeat.ts` | Heartbeat cron + processor |
| `convex/constants.ts` | Size limits, session window, thresholds |

---

## PR Order

```
PR A (behavioral reflection + milestones)  →  PR B (follow-up items in heartbeat)
```

These are independent and could ship in parallel, but A first is cleaner since milestones give the agent richer context for deciding what's worth following up on.

---

## What Success Looks Like

1. **By message 5:** Ghali has silently noted the user's communication style
2. **By message 20:** Ghali has stored meaningful milestones and references them naturally
3. **After a user mentions an interview:** Ghali adds a follow-up and asks about it 3 days later via heartbeat

The user never has to configure any of this. It just happens.
