# Structured Data Spec — Ghali Items System

> Final spec. Based on STRUCTURED_DATA_IDEAS.md + discussion 2026-02-26.

## Overview

A universal, conversational data system inside WhatsApp. Users track anything — expenses, tasks, contacts, notes, bookmarks, habits — through natural language. No UI, no forms. The agent interprets intent and manages structured records in Convex.

**Design principles:**
- One schema fits all use cases
- Agent carries 100% of the UX
- Flat collections + tags (no nesting)
- Metadata JSON bag for extensibility
- Top-level fields only for things that need DB-level queries
- Vector search across everything
- 1 credit per write, reads free

---

## Schema

### `collections`

Grouping layer. A named bucket that gives items context.

```ts
collections: defineTable({
  userId: v.id("users"),
  name: v.string(),                    // "Expenses", "Work Tasks", "GITEX Contacts"
  icon: v.optional(v.string()),        // emoji: "💰", "✅", "👤"
  description: v.optional(v.string()), // "Monthly expense tracking"
  type: v.optional(v.string()),        // hint: "expenses", "tasks", "contacts", "notes", "general"
  archived: v.optional(v.boolean()),
})
  .index("by_userId", ["userId"])
  .index("by_userId_name", ["userId", "name"])
```

**`type` field:** Not enforced — it's a hint the agent uses to decide presentation format. An "expenses" collection gets summaries with totals. A "tasks" collection gets grouped by status. A "contacts" collection shows names + companies. The agent infers type from content if not set.

### `items`

The universal record. Every trackable thing is an item.

```ts
items: defineTable({
  userId: v.id("users"),
  collectionId: v.optional(v.id("collections")), // null = uncategorized
  
  // Core fields (always present)
  title: v.string(),                              // "Finish proposal" / "450 AED at Zuma" / "Ahmed - Emirates Group"
  body: v.optional(v.string()),                   // longer description, notes, context
  status: v.string(),                             // "active" | "done" | "archived"
  
  // Queryable typed fields (optional, top-level for DB-level operations)
  priority: v.optional(v.string()),               // "high" | "normal" | "low"
  dueDate: v.optional(v.number()),                // timestamp — enables "what's due this week?"
  amount: v.optional(v.number()),                 // enables SUM, AVG, range queries on expenses
  currency: v.optional(v.string()),               // "AED", "USD", etc.
  reminderAt: v.optional(v.number()),             // timestamp — triggers precise cron reminder
  completedAt: v.optional(v.number()),            // when status changed to "done"
  
  // Flexible fields
  tags: v.optional(v.array(v.string())),          // ["dining", "client", "urgent", "GITEX"]
  metadata: v.optional(v.any()),                  // JSON bag: { phone, email, company, url, rating, ... }
  mediaStorageId: v.optional(v.id("_storage")),   // attached receipt, voice memo, document
  
  // Search
  embedding: v.optional(v.array(v.float64())),    // vector of title + body + tags for semantic search
  
  // Reminder tracking
  reminderCronId: v.optional(v.string()),         // cron job ID, cleaned up after firing
})
  .index("by_userId", ["userId"])
  .index("by_collectionId", ["collectionId"])
  .index("by_userId_status", ["userId", "status"])
  .index("by_userId_dueDate", ["userId", "dueDate"])
  .index("by_userId_reminderAt", ["userId", "reminderAt"])
  .index("by_userId_tags", ["userId", "tags"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["userId", "collectionId", "status"],
  })
```

---

## Agent Tools (5 total)

### 1. `addItem`

Create an item. Auto-creates collection if needed.

```ts
const addItem = createTool({
  description: "Add an item to the user's data. Can be a task, expense, note, contact, bookmark, or anything. Auto-creates a collection if one is implied but doesn't exist.",
  args: z.object({
    title: z.string(),
    body: z.string().optional(),
    collectionName: z.string().optional().describe("Name of collection to add to. Created if it doesn't exist. Omit for uncategorized."),
    collectionType: z.string().optional().describe("Hint for new collections: 'expenses', 'tasks', 'contacts', 'notes', 'general'"),
    status: z.enum(["active", "done", "archived"]).default("active"),
    priority: z.enum(["high", "normal", "low"]).optional(),
    dueDate: z.string().optional().describe("Natural language date: 'Friday', 'March 15', 'next week'"),
    amount: z.number().optional(),
    currency: z.string().optional().describe("Default AED if amount is set"),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.string()).optional().describe("Flexible key-value pairs: phone, email, company, url, rating, etc."),
    reminderAt: z.string().optional().describe("When to remind: 'tomorrow 9am', 'Friday 3pm', 'in 2 hours'"),
  }),
});
```

**Behavior:**
- If `collectionName` provided and doesn't exist → create it, confirm to user
- If `amount` set and no `currency` → default "AED"
- If `reminderAt` set → parse to timestamp, create one-shot cron job, store cronId on item
- Embed title + body + tags asynchronously after creation
- Deduct 1 credit

### 2. `queryItems`

Search and retrieve items. Supports structured filters and semantic search.

```ts
const queryItems = createTool({
  description: "Search the user's items. Use for: 'what's due this week?', 'how much did I spend on dining?', 'find anything about GITEX', 'show my tasks', 'what's in my reading list?'",
  args: z.object({
    query: z.string().optional().describe("Semantic search query for fuzzy matching"),
    collectionName: z.string().optional(),
    status: z.enum(["active", "done", "archived", "all"]).optional().default("active"),
    tags: z.array(z.string()).optional().describe("Filter by any of these tags"),
    dueBefore: z.string().optional().describe("Items due before this date"),
    dueAfter: z.string().optional().describe("Items due after this date"),
    dateFrom: z.string().optional().describe("Items created after this date"),
    dateTo: z.string().optional().describe("Items created before this date"),
    hasAmount: z.boolean().optional().describe("Filter to items with amounts (expenses)"),
    limit: z.number().optional().default(20),
    aggregate: z.enum(["none", "sum", "count", "group_by_tag", "group_by_collection"]).optional().default("none"),
  }),
});
```

**Behavior:**
- If `query` provided → vector search with optional filters
- If no `query` → structured filter query
- If `aggregate: "sum"` → sum amounts, group by tag or collection
- Format results based on collection type (see Query Presentation below)
- Reads are free (no credit deduction)

### 3. `updateItem`

Modify an existing item.

```ts
const updateItem = createTool({
  description: "Update an item: mark done, change priority, reschedule, add notes, move to a collection, update any field.",
  args: z.object({
    itemQuery: z.string().describe("How the user referenced the item: 'the proposal task', 'my lunch at Zuma', 'Ahmed's contact'"),
    updates: z.object({
      title: z.string().optional(),
      body: z.string().optional(),
      status: z.enum(["active", "done", "archived"]).optional(),
      priority: z.enum(["high", "normal", "low"]).optional(),
      dueDate: z.string().optional(),
      amount: z.number().optional(),
      tags: z.array(z.string()).optional(),
      metadata: z.record(z.string()).optional().describe("Merged with existing metadata"),
      collectionName: z.string().optional().describe("Move to this collection"),
      reminderAt: z.string().optional().describe("Set/update reminder"),
      clearReminder: z.boolean().optional().describe("Remove existing reminder"),
    }),
  }),
});
```

**Behavior:**
- Uses semantic search to find the item matching `itemQuery`
- If ambiguous (multiple matches) → ask user to clarify
- If `status` → "done" → set `completedAt`
- If `clearReminder` → delete associated cron job
- If metadata provided → shallow merge with existing (doesn't overwrite unmentioned keys)
- Re-embed if title/body/tags changed
- Deduct 1 credit

### 4. `manageCollection`

Create, rename, list, or archive collections.

```ts
const manageCollection = createTool({
  description: "Manage collections: list all, create, rename, set icon, or archive.",
  args: z.object({
    action: z.enum(["list", "create", "rename", "archive", "describe"]),
    name: z.string().optional(),
    newName: z.string().optional(),
    icon: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
  }),
});
```

**Behavior:**
- `list` → show all collections with item counts, free
- `create` → 1 credit
- `rename`, `archive`, `describe` → 1 credit

### 5. `setReminder`

Attach a precise reminder to any item, or create a standalone reminder.

```ts
const setReminder = createTool({
  description: "Set a precise reminder. Can be attached to an existing item or standalone.",
  args: z.object({
    itemQuery: z.string().optional().describe("Reference to existing item. Omit for standalone reminder."),
    reminderText: z.string().describe("What to remind about"),
    when: z.string().describe("When to remind: 'tomorrow 9am', 'Friday 3pm', 'in 2 hours', 'March 15 at 10am'"),
  }),
});
```

**Behavior:**
- Parse `when` to timestamp (respect user timezone from profile)
- Create one-shot cron job targeting user's WhatsApp
- If `itemQuery` → find item, attach cronId to it
- If standalone → create an item with title=reminderText, status="active", reminderAt set
- Cron job self-cleans: fires → marks item done → deletes cron
- Cap: 20 active reminders (Basic), 100 (Pro)
- Deduct 1 credit

---

## Agent Instructions Addition

Add to the ABILITIES section in `convex/agent.ts`:

```
## Structured Data (Items System)

You manage the user's personal data through items and collections. Items can be anything: tasks, expenses, contacts, notes, bookmarks, habits — there's no fixed type. You interpret what the user means and use the right fields.

### How to interpret user intent:

**Expenses** — user mentions spending, cost, price, payment, receipt:
- Set `amount` and `currency` (default AED)
- Auto-assign to "Expenses" collection (create if needed, icon 💰, type "expenses")
- Extract vendor/category as tags
- If receipt photo attached → link via mediaStorageId

**Tasks** — user mentions doing, finishing, completing, deadline, due date:
- Set `dueDate` if mentioned
- Set `priority` if implied ("urgent" → high, "when you can" → low)
- Auto-assign to relevant project collection or "Tasks" (icon ✅, type "tasks")

**Contacts** — user mentions a person with details (company, role, phone, email):
- Title = "Name — Company" or just name
- Body = context ("met at GITEX, interested in AI partnerships")
- Metadata: { phone, email, company, role, linkedin }
- Auto-assign to "Contacts" collection (icon 👤, type "contacts")

**Notes** — user says "note", "remember", or shares unstructured info:
- Title = short summary
- Body = full content
- Tags from context
- Collection only if topic matches existing one, otherwise uncategorized

**Bookmarks** — user shares URL or says "save this":
- Title = extracted page title or user description
- Metadata: { url }
- Tags: ["article", "video", "book"] as appropriate

### Auto-creation rules:
- If user implies a collection that doesn't exist, create it and confirm: "Logged 200 AED groceries. I started an Expenses tracker for you 💰"
- Don't ask permission to create collections — just do it and tell them
- If an item clearly belongs to an existing collection, add it there silently
- Uncategorized is fine for one-off items

### Reminder rules:
- Always create precise cron-based reminders (not heartbeat-dependent)
- Confirm reminder time in user's timezone
- When reminder fires, send the item title + body + collection context
- After firing, mark the reminder as done (don't delete the item)

### Never:
- Create duplicate collections with slightly different names ("Expenses" vs "My Expenses")
- Ask "which collection?" if context makes it obvious
- Return raw JSON or IDs to the user
- Show more than 10 items without summarizing first
```

---

## Query Presentation Rules

The agent must format results based on context. Add to instructions:

```
### How to present query results:

**Expenses** ("how much did I spend?"):
- Show total first: "You spent 3,450 AED this month"
- Then breakdown by category/tag:
  • Dining: 1,200 AED (8 transactions)
  • Shopping: 950 AED (3 transactions)  
  • Transport: 800 AED (12 transactions)
  • Other: 500 AED (4 transactions)
- If single category asked: show individual items with dates
- Always include currency

**Tasks** ("what's on my plate?"):
- Group by priority or collection:
  🔴 High:
  • Finish proposal — due Friday
  • Review contract — due Monday
  ✅ Done this week:
  • Updated budget spreadsheet
- Show due dates relative: "due tomorrow", "overdue by 2 days"
- If >10 items, summarize: "You have 23 active tasks across 4 projects. Here are the urgent ones:"

**Contacts** ("who do I know at Emirates?"):
- Name — Role at Company
  Context notes
  📞 phone | ✉️ email
- Keep it scannable

**Notes** ("what do I have about ZB?"):
- Title + first 2 lines of body
- Group by collection if multiple
- Show creation date

**Mixed results** (semantic search hits across types):
- Group by collection, show the most relevant snippet
- "Found 5 items matching 'GITEX':
  📋 Contacts: Ahmed (Emirates Group), Sara (Dubai Digital)
  📝 Notes: GITEX 2025 takeaways
  ✅ Tasks: Follow up on GITEX leads"

**Aggregations:**
- Sum: "Total: 12,450 AED across 47 expenses"
- Count: "You have 23 active tasks, 8 done this week"
- Group by tag: list each tag with count/sum
- Group by collection: list each collection with count/sum

### Formatting rules (WhatsApp):
- No markdown tables — use bullet lists
- Use emoji for visual grouping (💰📋✅👤📝)
- Bold for headers and totals
- Keep responses under 15 items — summarize and offer "want to see more?"
- Numbers always formatted with commas: 1,200 not 1200
```

---

## Discoverability

### Onboarding (first interaction or after feature launch)

When a new user completes onboarding OR when this feature launches for existing users, the agent mentions it naturally — not as a feature dump:

```
### Introducing structured data to users:

Don't announce features like a changelog. Introduce them when relevant:

**On first use:** When the user says something trackable for the first time:
"Done ✅ I started tracking your expenses. You can just tell me whenever you spend something and I'll keep a running total. Try 'how much did I spend this month?' anytime."

**After a few interactions:** 
"By the way — I can track anything you throw at me: tasks, contacts, expenses, notes, reading lists. Just talk naturally and I'll organize it."

**On heartbeat (once, early):**
If user has no collections yet after 3+ days: "Quick tip — I can be your personal tracker. Tell me things like 'spent 50 on coffee', 'call Ahmed tomorrow', 'note: great restaurant on Sheikh Zayed Road' and I'll keep it all organized and searchable."

**Discovery through use:**
- User mentions a person → "Want me to save Ahmed as a contact? I can remember his details for next time."
- User sets 3+ reminders → "I can also track these as tasks with due dates if you want — then you can ask 'what's due this week?' anytime."
- User sends a receipt photo → "I can log this as an expense if you tell me the amount."
```

### Help / What can you do?

When user asks what the items system can do:

```
I can track anything for you — just talk naturally:

💰 **Expenses** — "Spent 200 at Carrefour" → I'll track it. Ask "how much did I spend this month?" anytime.

✅ **Tasks** — "Finish the report by Thursday" → I'll remind you. "What's on my plate?" shows everything.

👤 **Contacts** — "Save Ahmed, marketing at Emirates Group, met at GITEX" → searchable later.

📝 **Notes** — "Note about the meeting: agreed on March launch" → I'll remember.

🔖 **Bookmarks** — Send me a link + "save this" → your reading list.

Everything is searchable. Try "find anything about GITEX" or "what did I track last week?"
```

---

## Pricing

| Action | Credit cost |
|--------|-----------|
| Add item | 1 |
| Update item | 1 |
| Set/update reminder | 1 |
| Create collection | 1 |
| Query/search items | 0 (free) |
| List collections | 0 (free) |

### Limits

| | Basic (free) | Pro |
|--|-------------|-----|
| Active items | 200 | Unlimited |
| Collections | 10 | Unlimited |
| Active reminders | 20 | 100 |
| Embedding storage | Included | Included |

---

## Implementation Plan

### Phase 1 — Core (MVP)
1. Add `collections` and `items` tables to schema
2. Implement 5 agent tools
3. Add agent instructions (interpretation, presentation, discoverability)
4. Embedding pipeline (async, on item create/update)
5. Reminder integration (cron creation/cleanup)
6. Credit deduction on writes
7. Tests: tool unit tests, query aggregation tests, embedding search tests

### Phase 2 — Polish
1. Collection type inference (auto-detect from item patterns)
2. Smart suggestions ("You've logged 10 expenses this week but no budget set — want one?")
3. Export: "Export my expenses as CSV" → generate file, send via WhatsApp
4. Recurring items: "Add 'gym' every Monday and Thursday" → auto-create items on schedule

### Phase 3 — Power Features
1. Cross-item relationships: "Link Ahmed's contact to the GITEX project"
2. Templates: "Every time I log a restaurant expense, ask me for a rating"
3. Dashboards via web: optional web view at ghali.ae/dashboard (future)

---

## Migration

No migration from existing memory files. Items system is additive:
- Memory files continue to work for personality, preferences, general context
- Items system handles all *trackable, queryable* data
- Over time, users naturally move to items as they discover the capability
- Agent doesn't proactively migrate old memory content

---

## Technical Notes

- **Embedding model:** text-embedding-3-small (1536 dimensions), same as existing RAG
- **Embedding cost:** ~$0.0001 per item, negligible
- **Embedding content:** Concatenation of `title + " " + body + " " + tags.join(" ")`
- **Cron reminders:** One-shot `at` schedule, `systemEvent` payload, auto-delete after firing
- **Reminder cap enforcement:** Check count before creating, return friendly error if at limit
- **Amount queries:** Use Convex's `.filter()` on `amount` field for range/existence checks, aggregate in-code (Convex doesn't have SQL-style SUM, agent computes from fetched results)
- **Tags query:** Fetch by userId, filter in-code (Convex array indexes are exact-match only)
- **Timezone:** All dates stored as UTC timestamps, converted to user timezone (from profile) on display
