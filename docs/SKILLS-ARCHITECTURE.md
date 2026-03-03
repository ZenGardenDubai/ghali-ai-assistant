# Skills System — Architecture & Specification

> **Status:** Proposal (v2)  
> **Date:** 2026-03-03  
> **Author:** Ghali Team

---

## 1. Overview

Ghali has **10 built-in features** powered by 23 hardcoded tools in `convex/agent.ts`, with a monolithic `AGENT_INSTRUCTIONS` string (~4KB). These features are **always-on for everyone** — they work today, users love them, and we're not touching them.

**The Skills System is for new additions only.** When we build the next capability — currency conversion, weather, fitness tracking — it gets built as a skill from day one. Skills are pluggable, user-controllable modules that bundle:
- One or more tools
- A prompt fragment (injected only when enabled)
- Metadata (name, icon, category, tier)

**Why:**
- **User control** — users can enable/disable *new* features ("I don't need weather alerts")
- **Cleaner prompts** — only inject instructions for skills the user has enabled → fewer tokens
- **Extensibility** — add new skills without touching the core agent
- **Marketing clarity** — "10 built-in features free for everyone, plus a growing library of skills you can add"
- **Future monetization** — pro-only skills become natural upsell

**Key constraint:** Existing features stay hardcoded, always-on, available to everyone. Zero changes to what works today. The skills system is purely additive — a framework for everything that comes next.

---

## 2. Design Principles

1. **Don't fix what works** — existing 10 features and 23 tools are untouched
2. **Additive only** — new tables and code paths; no changes to existing schema or tools
3. **Skills for new things** — every future capability is a skill from day one
4. **Graceful degradation** — if skill check fails, tool still works (fail-open, not fail-closed)
5. **Convention over configuration** — sensible defaults; users only configure if they want to
6. **Prompt efficiency** — skill fragments are appended to the existing instruction block

---

## 3. Architecture

### 3.1 Skills Registry (`skills` table)

A system-level table for **new skills only**. Seeded on deployment. Not user-editable.

```typescript
// convex/schema.ts — new table
skills: defineTable({
  name: v.string(),          // "Currency Converter"
  slug: v.string(),          // "currency-converter"
  description: v.string(),   // "Convert between currencies in real-time"
  icon: v.string(),          // "💱"
  category: v.string(),      // "utility", "productivity", "creative", "lifestyle"
  tier: v.union(v.literal("basic"), v.literal("pro")),
  tools: v.array(v.string()), // ["convertCurrency"]
  promptFragment: v.string(), // Instruction text injected when skill is enabled
  defaultEnabled: v.boolean(),
  sortOrder: v.number(),     // Display ordering
})
  .index("by_slug", ["slug"])
  .index("by_tier", ["tier"])
  .index("by_category", ["category"])
```

### 3.2 User Skills (`userSkills` table)

Per-user overrides for skills. If no row exists for a (userId, skillId) pair, the skill's `defaultEnabled` applies.

```typescript
// convex/schema.ts — new table
userSkills: defineTable({
  userId: v.id("users"),
  skillId: v.id("skills"),
  enabled: v.boolean(),
  enabledAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_userId_skillId", ["userId", "skillId"])
```

### 3.3 Skill Tool Guards (New Skills Only)

New skill tools include a guard check. **Existing tools are NOT modified** — no guards, no wrappers, no changes whatsoever.

```typescript
// convex/lib/skills.ts

export async function isSkillEnabled(
  ctx: ToolCtx,
  toolName: string
): Promise<{ enabled: boolean; skillName?: string }> {
  const skill = await ctx.runQuery(internal.skills.getSkillByTool, { toolName });
  if (!skill) return { enabled: true }; // Unknown tool → allow (fail-open)

  const override = await ctx.runQuery(internal.skills.getUserSkillOverride, {
    userId: ctx.userId as Id<"users">,
    skillId: skill._id,
  });

  const enabled = override !== null ? override.enabled : skill.defaultEnabled;
  return { enabled, skillName: skill.name };
}

export function skillDisabledMessage(skillName: string): string {
  return JSON.stringify({
    status: "error",
    code: "SKILL_DISABLED",
    message: `The ${skillName} skill is currently disabled. Say "enable ${skillName.toLowerCase()}" to turn it on.`,
  });
}
```

When building a **new** skill tool, include the guard:

```typescript
// Example: new convertCurrency tool
handler: async (ctx, { from, to, amount }) => {
  const check = await isSkillEnabled(ctx, "convertCurrency");
  if (!check.enabled) return skillDisabledMessage(check.skillName!);
  // ... tool logic
}
```

### 3.4 Dynamic Prompt Assembly

The existing `AGENT_INSTRUCTIONS` stays as-is — it's the core instruction block that always gets included. New skill prompt fragments are **appended** to it.

```typescript
// convex/agent.ts

export function assembleInstructions(
  enabledSkills: Array<{ slug: string; promptFragment: string }>
): string {
  if (enabledSkills.length === 0) return AGENT_INSTRUCTIONS;

  const skillFragments = enabledSkills
    .map(s => s.promptFragment)
    .join("\n\n");

  return `${AGENT_INSTRUCTIONS}\n\n--- SKILLS ---\n\n${skillFragments}`;
}
```

If a user has no skills enabled, they get exactly today's prompt — identical behavior.

### 3.5 Data Flow

```
Message arrives
  → Load user
  → Load user's enabled skills (query userSkills + skills tables)
  → Assemble instructions (existing AGENT_INSTRUCTIONS + enabled skill fragments)
  → Create agent turn with assembled instructions
  → Tool executes → new skill tools check guard → proceed or return disabled message
  → Response delivered
```

---

## 4. Built-in Features (Unchanged)

These 10 features with 23 tools remain **hardcoded, always-on, available to every user**. They are NOT being converted to skills. They work today and will continue to work exactly as they do now.

| # | Feature | Icon | Tools | Category |
|---|---------|------|-------|----------|
| 1 | Memory | 🧠 | `appendToMemory`, `editMemory`, `updatePersonality` | core |
| 2 | Image Generation | 🎨 | `generateImage` | creative |
| 3 | ProWrite | ✍️ | `proWriteBrief`, `proWriteExecute` | creative |
| 4 | Scheduler | 📅 | `createScheduledTask`, `listScheduledTasks`, `updateScheduledTask`, `deleteScheduledTask` | productivity |
| 5 | Collections | 📦 | `addItem`, `queryItems`, `updateItem`, `manageCollection` | productivity |
| 6 | Search | 🔍 | `webSearch`, `searchDocuments` | utility |
| 7 | Media | 📎 | `resolveMedia`, `reprocessMedia`, `convertFile` | utility |
| 8 | Deep Reasoning | 🤔 | `deepReasoning` | core |
| 9 | Feedback | 💬 | `generateFeedbackLink` | utility |
| 10 | Heartbeat | 💓 | `updateHeartbeat` | core |

These are part of the core agent and are referenced directly in `AGENT_INSTRUCTIONS`. No prompt splitting, no skill wrappers, no tool guards.

---

## 5. Future Skills (New Additions)

Every new capability gets built as a skill from day one. Here's the roadmap:

| Skill | Description | Tier | Priority |
|-------|-------------|------|----------|
| 💱 Currency Converter | Real-time currency conversion | basic | high |
| 🌤️ Weather | Weather forecasts and alerts | basic | high |
| 📰 News Digest | Daily news summary by topic | basic | medium |
| 🔗 URL Summarizer | Summarize any URL/article | basic | medium |
| 💸 Expense Reports | Generate PDF expense reports from Collections data | pro | medium |
| 🏋️ Fitness Tracker | Log workouts, track progress | basic | low |
| 🍳 Recipe Finder | Search and save recipes | basic | low |
| 📧 Email Drafting | Draft professional emails | pro | medium |
| ✈️ Travel Planner | Trip itineraries and checklists | pro | low |
| 📋 Templates | Reusable message/document templates | pro | medium |
| 🧮 Calculator | Advanced math and unit conversion | basic | high |
| 📊 Weekly Summary | Auto-generated weekly recap | pro | medium |

**Each new skill follows the same pattern:** define in `skills` table, implement tool(s) with guard, write prompt fragment. No core changes needed.

---

## 6. User-Facing Commands

### 6.1 View Skills

User says: **"my skills"**, **"/skills"**, or **"what skills do I have"**

Response shows only add-on skills (since built-in features are always-on):
```
🛠️ *Your Skills*

Ghali comes with 10 built-in features — always on, free for everyone.

*Add-on Skills (2/3 enabled):*
💱 Currency Converter — ✅ enabled
🌤️ Weather — ✅ enabled
📰 News Digest — ❌ disabled

Say "enable news digest" or "disable weather" to change.
More skills coming soon!
```

### 6.2 Enable / Disable

User says: **"enable weather"** or **"disable news digest"**

- Fuzzy match on skill name/slug
- Upsert into `userSkills` table
- Confirm: "✅ Weather enabled" / "⏸️ News Digest disabled"

### 6.3 Onboarding Integration

During onboarding step 4 (after name + timezone):
```
You have *10 built-in features* ready to go — memory, image generation, web search, and more.

As new skills become available, say "my skills" to browse and toggle them.
```

---

## 7. Schema Changes

### New Tables

```typescript
// Add to convex/schema.ts

skills: defineTable({
  name: v.string(),
  slug: v.string(),
  description: v.string(),
  icon: v.string(),
  category: v.string(),
  tier: v.union(v.literal("basic"), v.literal("pro")),
  tools: v.array(v.string()),
  promptFragment: v.string(),
  defaultEnabled: v.boolean(),
  sortOrder: v.number(),
})
  .index("by_slug", ["slug"])
  .index("by_tier", ["tier"])
  .index("by_category", ["category"]),

userSkills: defineTable({
  userId: v.id("users"),
  skillId: v.id("skills"),
  enabled: v.boolean(),
  enabledAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_userId_skillId", ["userId", "skillId"]),
```

### No Changes to Existing Tables

The `users`, `userFiles`, `items`, `collections`, and all other existing tables remain unchanged. The existing `AGENT_INSTRUCTIONS` string remains unchanged.

---

## 8. Implementation Plan

### Phase 1: Schema + Infrastructure (Day 1)
1. Add `skills` and `userSkills` tables to schema
2. Implement `isSkillEnabled()` helper and `assembleInstructions()` function
3. Wire up prompt assembly in agent turn (appends skill fragments after existing instructions)
4. **Zero impact on existing users** — no skills exist yet, so assembled prompt = current prompt

### Phase 2: User Commands (Day 2)
1. Add "my skills" / "enable X" / "disable X" to system command handling
2. These are free commands (no credit deduction) — add to `SYSTEM_COMMANDS` set
3. Update onboarding flow to mention skills

### Phase 3: First Skill (Day 3)
1. Build the first real skill (e.g., Currency Converter) using the full pattern
2. Validate the entire flow end-to-end: registry → guard → prompt fragment → user toggle
3. This proves the architecture works before building more skills

### Phase 4: Landing Page (Day 4)
1. Update marketing site to reflect "10 built-in features + growing skills library"
2. Show skill cards for available add-on skills

### Rollback
Every phase is independently reversible:
- Phase 1: Tables exist but are unused → no impact
- Phase 2: Remove command handlers
- Phase 3: Remove skill entry + tool → back to baseline
- Phase 4: Revert marketing copy

---

## 9. Effort Estimate

| Component | Effort | Notes |
|-----------|--------|-------|
| Schema + seed infrastructure | 2h | Two tables + query functions |
| `isSkillEnabled` helper | 1h | Query + fail-open logic |
| `assembleInstructions` | 1h | Append skill fragments to existing instructions |
| Agent turn integration | 1h | Load skills, pass to assembler |
| User commands (my skills, enable, disable) | 3h | Fuzzy matching, upsert, formatting |
| Onboarding update | 0.5h | Mention skills in step 4 |
| First skill (Currency Converter) | 3h | Tool + guard + prompt fragment + API |
| Landing page update | 2h | Updated messaging + skill cards |
| Testing & QA | 2h | Verify skill toggle, prompt assembly, guard |
| **Total** | **~15.5h** | **~2 dev-days** |

---

## 10. Landing Page Impact

### Before (Features)
```
✨ Features
- AI-powered memory
- Image generation
- Web search
- Document analysis
- ...long list...
```

### After (Built-in + Skills)
```
🚀 10 Built-in Features. Free for Everyone.

Memory • Image Generation • ProWrite • Scheduler • Collections
Search • Media • Deep Reasoning • Feedback • Heartbeat

All included. Always on. No setup needed.

🛠️ Plus a Growing Library of Skills

Add new capabilities as they launch:
[💱 Currency] [🌤️ Weather] [📰 News] [🔗 Summarizer] ...

Toggle skills on and off. Your AI, your way.
Coming soon: Pro skills for power users.
```

**Key messaging:**
- Lead with what's free and included (10 features)
- Skills are the expansion layer — exciting additions, not paywalled basics
- Pro tier feels like an upgrade, not a gate
- "Ghali comes with 10 built-in features — free for everyone. Plus a growing library of skills you can add."

---

## Appendix: Example Skill Definition

```typescript
// Example: first skill to be built

{
  name: "Currency Converter",
  slug: "currency-converter",
  description: "Convert between 170+ currencies with real-time exchange rates",
  icon: "💱",
  category: "utility",
  tier: "basic",
  tools: ["convertCurrency"],
  promptFragment: `CURRENCY CONVERTER:
- When the user asks to convert currency, use the convertCurrency tool.
- Support natural language: "how much is 100 USD in AED", "convert 50 euros to dollars"
- Always show the exchange rate and timestamp.
- Default source: European Central Bank (free, no API key).`,
  defaultEnabled: true,
  sortOrder: 1,
}
```
