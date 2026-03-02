# Skills System — Architecture & Specification

> **Status:** Proposal  
> **Date:** 2026-03-02  
> **Author:** Ghali Team

---

## 1. Overview

Ghali currently has 23 hardcoded tools in `convex/agent.ts` with a monolithic `AGENT_INSTRUCTIONS` string (~4KB). Every user gets every tool and every instruction block, regardless of whether they use or want them.

**The Skills System** turns features into pluggable, user-controllable "skills." Each skill bundles:
- One or more tools
- A prompt fragment (injected only when enabled)
- Metadata (name, icon, category, tier)

**Why:**
- **User control** — users can enable/disable features ("I don't need image generation")
- **Cleaner prompts** — only inject instructions for enabled skills → fewer tokens, less confusion
- **Extensibility** — add new skills without touching the core agent
- **Marketing clarity** — "10 skills included, more coming" is better than a feature list
- **Future monetization** — pro-only skills become natural upsell

**Constraint:** All existing features become default-on basic-tier skills. Nobody loses anything. Zero breaking changes.

---

## 2. Design Principles

1. **Backward-compatible** — existing users experience zero change on day one
2. **Additive only** — new tables, new code paths; no schema migrations on existing tables
3. **Graceful degradation** — if skill check fails, tool still works (fail-open, not fail-closed)
4. **Thin guard layer** — tools check skill status but the guard is a simple function call, not middleware
5. **Convention over configuration** — sensible defaults; users only configure if they want to
6. **Prompt efficiency** — only assemble prompt fragments for enabled skills

---

## 3. Architecture

### 3.1 Skills Registry (`skills` table)

A system-level table seeded on deployment. Not user-editable.

```typescript
// convex/schema.ts — new table
skills: defineTable({
  name: v.string(),          // "Memory"
  slug: v.string(),          // "memory"
  description: v.string(),   // "Remember facts about you across conversations"
  icon: v.string(),          // "🧠"
  category: v.string(),      // "core", "productivity", "creative", "utility"
  tier: v.union(v.literal("basic"), v.literal("pro")),
  tools: v.array(v.string()), // ["appendToMemory", "editMemory", "updatePersonality"]
  promptFragment: v.string(), // Instruction text injected when skill is enabled
  defaultEnabled: v.boolean(),
  sortOrder: v.number(),     // Display ordering
})
  .index("by_slug", ["slug"])
  .index("by_tier", ["tier"])
  .index("by_category", ["category"])
```

### 3.2 User Skills (`userSkills` table)

Per-user overrides. If no row exists for a (userId, skillId) pair, the skill's `defaultEnabled` applies.

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

### 3.3 Tool Guards (Option B — per-tool check)

Each tool calls a shared `checkSkill` helper at the top of its handler. If the skill is disabled, it returns a helpful message instead of executing.

```typescript
// convex/lib/skills.ts

export async function isSkillEnabled(
  ctx: ToolCtx,
  toolName: string
): Promise<{ enabled: boolean; skillName?: string }> {
  // Look up which skill owns this tool
  const skill = await ctx.runQuery(internal.skills.getSkillByTool, { toolName });
  if (!skill) return { enabled: true }; // Unknown tool → allow (fail-open)

  // Check user override
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

**Tool integration** (example for `generateImage`):

```typescript
handler: async (ctx, { prompt, aspectRatio }) => {
  const check = await isSkillEnabled(ctx, "generateImage");
  if (!check.enabled) return skillDisabledMessage(check.skillName!);
  // ... existing logic unchanged
}
```

This is ~2 lines added per tool. No structural changes to existing handlers.

### 3.4 Dynamic Prompt Assembly

Currently `AGENT_INSTRUCTIONS` is a single giant string. We split it into:

1. **Core block** — always included (identity, formatting, credit rules, safety)
2. **Per-skill fragments** — only included when that skill is enabled for the user

```typescript
// convex/agent.ts

export function assembleInstructions(
  enabledSkills: Array<{ slug: string; promptFragment: string }>
): string {
  const skillFragments = enabledSkills
    .map(s => s.promptFragment)
    .join("\n\n");

  return `${CORE_INSTRUCTIONS}\n\n${skillFragments}`;
}
```

The agent builder calls this per-turn with the user's enabled skills. If all 10 default skills are enabled, the assembled prompt is identical to today's monolithic one.

### 3.5 Data Flow

```
Message arrives
  → Load user
  → Load user's enabled skills (query userSkills + skills tables)
  → Assemble instructions (core + enabled skill fragments)
  → Create agent turn with assembled instructions
  → Tool executes → guard checks skill → proceed or return disabled message
  → Response delivered
```

---

## 4. Default Skills (Existing Features)

All 10 skills are **basic tier, default enabled**. Existing users get them automatically via `defaultEnabled: true` — no data backfill needed.

| # | Skill | Icon | Tools | Category | Tier |
|---|-------|------|-------|----------|------|
| 1 | Memory | 🧠 | `appendToMemory`, `editMemory`, `updatePersonality` | core | basic |
| 2 | Image Generation | 🎨 | `generateImage` | creative | basic |
| 3 | ProWrite | ✍️ | `proWriteBrief`, `proWriteExecute` | creative | basic |
| 4 | Scheduler | 📅 | `createScheduledTask`, `listScheduledTasks`, `updateScheduledTask`, `deleteScheduledTask` | productivity | basic |
| 5 | Collections | 📦 | `addItem`, `queryItems`, `updateItem`, `manageCollection` | productivity | basic |
| 6 | Search | 🔍 | `webSearch`, `searchDocuments` | utility | basic |
| 7 | Media | 📎 | `resolveMedia`, `reprocessMedia`, `convertFile` | utility | basic |
| 8 | Deep Reasoning | 🤔 | `deepReasoning` | core | basic |
| 9 | Feedback | 💬 | `generateFeedbackLink` | utility | basic |
| 10 | Heartbeat | 💓 | `updateHeartbeat` | core | basic |

### Prompt Fragment Example (Memory Skill)

```
MEMORY RULES (critical):
- You have a memory file for this user. It's loaded in your context above.
- After EVERY response, reflect: did you learn anything new about this user?
  - Name, age, birthday, location, timezone → appendToMemory(personal)
  ...
```

Each fragment is extracted verbatim from today's `AGENT_INSTRUCTIONS` — just split into sections.

---

## 5. Future Skill Ideas

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

**New skills follow the same pattern:** define in `skills` table, implement tools, write prompt fragment. No core changes needed.

---

## 6. User-Facing Commands

### 6.1 View Skills

User says: **"my skills"**, **"/skills"**, **"what can you do"**, or **"skills"**

Response:
```
🛠️ *Your Skills (8/10 enabled)*

*Core*
🧠 Memory — ✅ enabled
🤔 Deep Reasoning — ✅ enabled
💓 Heartbeat — ✅ enabled

*Productivity*
📅 Scheduler — ✅ enabled
📦 Collections — ✅ enabled

*Creative*
🎨 Image Generation — ❌ disabled
✍️ ProWrite — ✅ enabled

*Utility*
🔍 Search — ✅ enabled
📎 Media — ✅ enabled
💬 Feedback — ✅ enabled

Say "enable image generation" or "disable scheduler" to change.
```

### 6.2 Enable / Disable

User says: **"enable image generation"** or **"disable scheduler"**

- Fuzzy match on skill name/slug
- Upsert into `userSkills` table
- Confirm: "✅ Image Generation enabled" / "⏸️ Scheduler disabled"

### 6.3 Onboarding Integration

During onboarding step 4 (after name + timezone):
```
You have *10 skills* ready to go — memory, image generation, web search, and more.

Say "my skills" anytime to see what's available or toggle them on/off.
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

The `users`, `userFiles`, `items`, `collections`, and all other existing tables remain unchanged.

---

## 8. Migration Plan

### Phase 1: Schema + Seed (Day 1)
1. Add `skills` and `userSkills` tables to schema
2. Create seed script (`convex/skills/seed.ts`) that populates 10 default skills
3. Run seed on deployment — idempotent (checks slug before inserting)
4. **Zero impact on existing users** — no `userSkills` rows needed; `defaultEnabled: true` means everyone gets everything

### Phase 2: Prompt Split (Day 2-3)
1. Extract `AGENT_INSTRUCTIONS` into core block + 10 skill prompt fragments
2. Implement `assembleInstructions()` function
3. Load enabled skills per-user before each agent turn
4. **Verification:** assembled prompt for a user with all defaults = identical to current monolithic prompt

### Phase 3: Tool Guards (Day 3-4)
1. Implement `isSkillEnabled()` + `skillDisabledMessage()`
2. Add 2-line guard to each tool handler (23 tools across 10 skills)
3. **Verification:** all tools still work identically (all skills default-enabled)

### Phase 4: User Commands (Day 4-5)
1. Add "my skills" / "enable X" / "disable X" to system command handling
2. These are free commands (no credit deduction) — add to `SYSTEM_COMMANDS` set
3. Update onboarding flow to mention skills

### Phase 5: Landing Page (Day 6)
1. Replace "Features" section with "Skills" on marketing site
2. Show skill cards with icons, descriptions, and tier badges

### Rollback
Every phase is independently reversible:
- Phase 1: Tables exist but are unused → no impact
- Phase 2: Revert to monolithic prompt string
- Phase 3: Remove guard calls → tools work as before
- Phase 4: Remove command handlers

---

## 9. Effort Estimate

| Component | Effort | Notes |
|-----------|--------|-------|
| Schema + seed script | 2h | Two tables + seed data |
| Prompt splitting | 3h | Extract 10 fragments from monolith, verify equivalence |
| `isSkillEnabled` helper | 1h | Query + cache logic |
| Tool guards (23 tools) | 2h | ~5 min per tool, mechanical |
| `assembleInstructions` | 1h | String concatenation + query |
| Agent turn integration | 2h | Load skills, pass to assembler |
| User commands (my skills, enable, disable) | 3h | Fuzzy matching, upsert, formatting |
| Onboarding update | 1h | Add skills mention to step 4 |
| Landing page update | 3h | New skills section with cards |
| Testing & QA | 4h | Verify all tools, prompt equivalence, edge cases |
| **Total** | **~22h** | **~3 dev-days** |

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

### After (Skills)
```
🛠️ 10 Skills. Your AI, Your Way.

Each skill is a superpower you can toggle on or off.

[🧠 Memory] [🎨 Images] [✍️ ProWrite] [📅 Scheduler]
[📦 Collections] [🔍 Search] [📎 Media] [🤔 Deep Think]
[💬 Feedback] [💓 Heartbeat]

All included free. More skills coming soon.
```

**Key messaging shifts:**
- "Features" → "Skills" (more tangible, game-like)
- Static list → interactive skill cards with icons
- "What Ghali can do" → "What *you* can customize"
- Future pro skills create natural upgrade path: "Unlock 5 more skills with Pro"

---

## Appendix: Skill Seed Data

```typescript
// convex/skills/seed.ts — initial skill definitions

export const DEFAULT_SKILLS = [
  {
    name: "Memory",
    slug: "memory",
    description: "Remember facts, preferences, and context across conversations",
    icon: "🧠",
    category: "core",
    tier: "basic",
    tools: ["appendToMemory", "editMemory", "updatePersonality"],
    defaultEnabled: true,
    sortOrder: 1,
  },
  {
    name: "Image Generation",
    slug: "image-generation",
    description: "Create images from text descriptions using AI",
    icon: "🎨",
    category: "creative",
    tier: "basic",
    tools: ["generateImage"],
    defaultEnabled: true,
    sortOrder: 2,
  },
  {
    name: "ProWrite",
    slug: "prowrite",
    description: "Professional multi-AI writing pipeline for polished content",
    icon: "✍️",
    category: "creative",
    tier: "basic",
    tools: ["proWriteBrief", "proWriteExecute"],
    defaultEnabled: true,
    sortOrder: 3,
  },
  {
    name: "Scheduler",
    slug: "scheduler",
    description: "Schedule tasks, reminders, and recurring AI actions",
    icon: "📅",
    category: "productivity",
    tier: "basic",
    tools: ["createScheduledTask", "listScheduledTasks", "updateScheduledTask", "deleteScheduledTask"],
    defaultEnabled: true,
    sortOrder: 4,
  },
  {
    name: "Collections",
    slug: "collections",
    description: "Track expenses, tasks, contacts, notes, and bookmarks",
    icon: "📦",
    category: "productivity",
    tier: "basic",
    tools: ["addItem", "queryItems", "updateItem", "manageCollection"],
    defaultEnabled: true,
    sortOrder: 5,
  },
  {
    name: "Search",
    slug: "search",
    description: "Search the web and your uploaded documents",
    icon: "🔍",
    category: "utility",
    tier: "basic",
    tools: ["webSearch", "searchDocuments"],
    defaultEnabled: true,
    sortOrder: 6,
  },
  {
    name: "Media",
    slug: "media",
    description: "Find, reprocess, and convert your media files",
    icon: "📎",
    category: "utility",
    tier: "basic",
    tools: ["resolveMedia", "reprocessMedia", "convertFile"],
    defaultEnabled: true,
    sortOrder: 7,
  },
  {
    name: "Deep Reasoning",
    slug: "deep-reasoning",
    description: "Escalate complex problems to advanced AI for thorough analysis",
    icon: "🤔",
    category: "core",
    tier: "basic",
    tools: ["deepReasoning"],
    defaultEnabled: true,
    sortOrder: 8,
  },
  {
    name: "Feedback",
    slug: "feedback",
    description: "Submit feedback, bug reports, and feature requests",
    icon: "💬",
    category: "utility",
    tier: "basic",
    tools: ["generateFeedbackLink"],
    defaultEnabled: true,
    sortOrder: 9,
  },
  {
    name: "Heartbeat",
    slug: "heartbeat",
    description: "Loose recurring awareness and proactive check-ins",
    icon: "💓",
    category: "core",
    tier: "basic",
    tools: ["updateHeartbeat"],
    defaultEnabled: true,
    sortOrder: 10,
  },
];
```
