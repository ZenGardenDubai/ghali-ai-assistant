# Structured Data Features (Convex-Native)

> Brainstormed 2026-02-26. Not yet specced — for discussion.

## Context

Users already talk to Ghali about structured data (tasks, contacts, expenses, habits, goals) but it all lives in unstructured memory files capped at 10KB. These features give them real queryable tables — managed entirely through WhatsApp.

Originally considered Airtable as backend, but since users never see the UI, Convex is strictly better: no rate limits (Airtable caps at 5 req/sec), no external dependency, transactional mutations, and we already have it.

---

## 1. Expense Tracker (Highest Priority)

**Why:** UAE has high disposable income, lots of dining/shopping, no income tax — people track spending by choice. Photo receipt → structured data via WhatsApp is a killer demo.

**UX:**
- "Spent 450 AED at Zuma" → creates expense record
- Sends receipt photo → Gemini extracts amount, vendor, category, date
- "How much did I spend on dining this month?" → query + sum
- "What did I spend last week?" → filtered list
- "Set my dining budget to 3000 AED" → budget record, agent warns when approaching limit

**Convex tables:**
- `expenses` — userId, amount, currency, category, vendor, date, note, mediaStorageId (receipt)
- `budgets` — userId, category, monthlyLimit, currency

**Agent tools:** `logExpense`, `queryExpenses`, `setBudget`

---

## 2. Task Manager

**Why:** Users already use reminders but have no status tracking, no history, no grouping. This upgrades reminders into a real task system.

**UX:**
- "I need to finish the proposal by Friday and review the contract by Monday" → 2 tasks
- "What's on my plate?" → list by due date
- "Done with the proposal" → marks complete
- "Push the contract review to next week" → updates due date
- "What did I get done last week?" → completed tasks query

**Convex tables:**
- `tasks` — userId, title, status (todo/in_progress/done), dueDate, project, priority, completedAt

**Agent tools:** `createTask`, `listTasks`, `updateTask`

---

## 3. Contacts / Personal CRM

**Why:** Networking is huge in UAE business culture. People meet dozens of contacts at events like GITEX, STEP, etc. and forget details.

**UX:**
- "Add Ahmed — marketing director at Emirates Group, met at GITEX, interested in AI partnerships"
- "Who do I know at Emirates Group?" → query by company
- "When did I last talk to Ahmed?" → checks last interaction
- "Remind me to follow up with Ahmed next Tuesday" → links reminder to contact

**Convex tables:**
- `contacts` — userId, name, company, role, phone, email, notes, tags, lastContactedAt

**Agent tools:** `addContact`, `searchContacts`, `updateContact`

---

## 4. Habit Tracker

**Why:** Ties into the existing heartbeat system. Currently heartbeat asks "did you go to the gym?" but doesn't track the answer anywhere.

**UX:**
- "Track my gym habit — goal is 4x per week"
- Heartbeat check-in: "Did you hit the gym today?" → "Yes" → logs it
- "How's my gym streak?" → calculates from log
- "How many times did I work out this month?" → count query

**Convex tables:**
- `habits` — userId, name, targetFrequency, period (daily/weekly)
- `habitLogs` — userId, habitId, date, completed

**Agent tools:** `createHabit`, `logHabit`, `getHabitStats`

---

## 5. Bookmarks / Reading List

**Why:** Lowest complexity, nice-to-have. Users share links and book recs that currently vanish from context.

**UX:**
- "Save this article" (shares URL) → extracts title via web fetch
- "Add Atomic Habits to my reading list"
- "What's on my reading list?" → filtered by status
- "Finished Atomic Habits, 4 stars" → updates status + rating

**Convex tables:**
- `bookmarks` — userId, title, url, type (book/article/video), status (saved/in_progress/done), rating, notes

**Agent tools:** `saveBookmark`, `listBookmarks`, `updateBookmark`

---

## Trade-offs

### Specialized vs Generic

**Specialized (5 features):** ~12 new tables, ~15 new tools. Agent already has 14 tools — doubling could hurt tool selection accuracy.

**Generic "lists" alternative:** Single `listItems` table with flexible fields (title, value, category, date, status, notes). One set of tools: `addToList`, `queryList`, `updateListItem`. Agent interprets context: "spent 450 at Zuma" → expense list, "finish proposal by Friday" → tasks list. Less precise but much simpler — 80% of the value.

**Hybrid:** Start with generic lists, graduate the most-used list types into specialized features with richer schemas.

### Pricing

These features generate storage and compute cost. Options:
- Pro-only (like heartbeat/reminders)
- Basic gets 1 list type, Pro gets all
- Basic gets limited records (e.g., 100), Pro unlimited

### Implementation Order

If building specialized: Expense Tracker → Task Manager → Contacts → Habit Tracker → Bookmarks (ordered by user value for UAE market).
