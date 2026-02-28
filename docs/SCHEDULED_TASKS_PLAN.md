# Scheduled Agent Tasks — Implementation Plan

## Context

Issue #71: Replace the existing reminders system with a unified "scheduled agent tasks" system. Instead of sending a static message, scheduled tasks trigger a **full agent turn** — the agent runs with all tools and delivers rich AI-generated results. Reminders become a subset (simple one-off tasks). Heartbeat stays separate.

## Decisions

| Decision | Choice |
|---|---|
| Heartbeat | Keep as-is (separate) |
| Item reminders | Migrate to scheduledTasks |
| Cron runner | Per-task `ctx.scheduler.runAt` |
| Thread | Existing user thread |
| 24h window | Template with truncation |
| Migration | One-time script |
| Task editing | Agent rewrites description |
| Limits | 3 Basic / 24 Pro (paused counts) |
| Out-of-credits | One message total + upgrade link |
| Feature page | /features/scheduled-tasks |

---

## PR 1 — Foundation: Schema, Core Logic, Tests

**Branch:** `feat/scheduled-tasks-foundation`

### 1.1 Add constants — `convex/constants.ts`

```typescript
export const SCHEDULED_TASKS_LIMIT_BASIC = 3;
export const SCHEDULED_TASKS_LIMIT_PRO = 24;
export const SCHEDULED_TASK_MAX_RESULT_LENGTH = 1400; // truncation for template delivery
```

Keep old `MAX_REMINDERS_PER_USER` (heartbeat still uses `scheduledJobs`).

### 1.2 Add `scheduledTasks` table — `convex/schema.ts`

```typescript
scheduledTasks: defineTable({
  userId: v.id("users"),
  title: v.string(),
  description: v.string(),
  schedule: v.union(
    v.object({ kind: v.literal("cron"), expr: v.string() }),
    v.object({ kind: v.literal("once"), runAt: v.number() })
  ),
  timezone: v.string(),
  deliveryFormat: v.optional(v.string()),
  enabled: v.boolean(),
  lastRunAt: v.optional(v.number()),
  lastStatus: v.optional(v.union(
    v.literal("success"),
    v.literal("skipped_no_credits"),
    v.literal("error")
  )),
  creditNotificationSent: v.optional(v.boolean()),
  schedulerJobId: v.optional(v.id("_scheduled_functions")),
  createdAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_userId_enabled", ["userId", "enabled"])
```

Also add `scheduledTaskId: v.optional(v.id("scheduledTasks"))` to the `items` table (alongside existing `reminderJobId` for backward compat).

### 1.3 Create `convex/scheduledTasks.ts` — Core server logic

**Functions to implement:**

| Function | Type | Purpose |
|---|---|---|
| `createScheduledTask` | internalMutation | Validate limits (count ALL tasks, not just enabled), insert record, `ctx.scheduler.runAt`, return taskId |
| `executeScheduledTask` | internalAction | The main runner (see execution flow below) |
| `updateScheduledTask` | internalMutation | Patch title/description/schedule/enabled. Cancel old scheduler + reschedule if needed |
| `deleteScheduledTask` | internalMutation | Cancel scheduler + `ctx.db.delete` |
| `listUserScheduledTasks` | internalQuery | Return all tasks for user (enabled + disabled) |
| `getTask` | internalQuery | Raw task lookup (used by action) |
| `cancelAllUserScheduledTasks` | internalMutation | Bulk cancel + delete (used by clearEverything) |
| `markLastRun` | internalMutation | Update lastRunAt, lastStatus, creditNotificationSent, schedulerJobId |
| `resetCreditNotifications` | internalMutation | Reset `creditNotificationSent` on all user's tasks (called from credit reset) |

**`executeScheduledTask` flow** (mirrors `fireReminder` + `generateResponse` patterns):

1. Load task → exit if not found or `enabled === false`
2. Load user → exit if not found
3. Check credits via `internal.credits.checkCredit` (pass `"__scheduled__"` as message to skip system command check)
4. **If exhausted:**
   - If `creditNotificationSent !== true`: send one notification with upgrade link (in-session: free-form, out-of-session: `TWILIO_TPL_CREDITS_LOW` or new template). Set flag.
   - Mark `lastStatus: "skipped_no_credits"`
   - Fire `scheduled_task_skipped` analytics
   - If cron: reschedule next run
   - Return
5. Build user context via `buildUserContext` (reuse from `convex/messages.ts`)
6. Get/create thread: `ghaliAgent.createThread(ctx, { userId })`
7. Run agent: `ghaliAgent.generateText(ctx, { threadId }, { prompt: userContext + task description })`
8. Deduct credit: `internal.credits.deductCredit`
9. Deliver via WhatsApp:
   - Check 24h session window (`user.lastMessageAt`)
   - In-session: `internal.twilio.sendMessage` (full text, auto-splits at 1500 chars)
   - Out-of-session: `internal.twilio.sendTemplate` with `TWILIO_TPL_SCHEDULED_TASK`, truncated to 1400 chars
10. Update task: `lastRunAt`, `lastStatus: "success"`, clear `creditNotificationSent`
11. Fire `scheduled_task_executed` analytics
12. If `cron`: `getNextCronRun` → `ctx.scheduler.runAt` → patch `schedulerJobId`
13. If `once`: set `enabled: false`

**Reusable functions from existing code:**
- `getNextCronRun`, `parseDatetimeInTimezone` from `convex/lib/cronParser.ts`
- `buildUserContext`, `getCurrentDateTime` from `convex/messages.ts` (may need to export)
- `ghaliAgent` from `convex/agent.ts`
- Credit check/deduct from `convex/credits.ts`

### 1.4 Write tests (TDD) — `convex/scheduledTasks.test.ts`

Follow `convex/reminders.test.ts` pattern (`convexTest(schema, modules)` + vitest):

- `createScheduledTask`: creates once/cron tasks, enforces basic limit (3), enforces pro limit (24), counts paused tasks toward limit, rejects past `runAt`
- `listUserScheduledTasks`: returns all tasks, user isolation
- `updateScheduledTask`: updates description, pause/resume toggle
- `deleteScheduledTask`: deletes record, rejects wrong userId
- `cancelAllUserScheduledTasks`: bulk cancel, user isolation
- `markLastRun`: updates status fields correctly

### 1.5 Add Twilio template — `convex/admin.ts`

Add to `TEMPLATE_DEFINITIONS`:
```typescript
{ key: "TWILIO_TPL_SCHEDULED_TASK", name: "ghali_scheduled_task", description: "Scheduled Task Result",
  variables: ["result"], preview: "Hi from Ghali! Here's your scheduled task result:\n\n{{1}}\n\nReply to chat." }
```

---

## PR 2 — Agent Tools, Analytics, Instructions

**Branch:** `feat/scheduled-tasks-agent-tools`
**Depends on:** PR 1 merged

### 2.1 Add analytics — `convex/analytics.ts`

5 new `internalAction` event trackers (follow existing pattern):

| Event | Key Properties |
|---|---|
| `scheduled_task_created` | `schedule_kind` (once/cron), `tier` |
| `scheduled_task_executed` | `schedule_kind`, `tier`, `duration_ms` |
| `scheduled_task_skipped` | `reason` (no_credits), `tier` |
| `scheduled_task_updated` | `action` (edited/paused/resumed/deleted), `tier` |
| `scheduled_task_credit_notification` | `tier` |

Add `"scheduled_tasks"` to `ALLOWED_FEATURES` set.

### 2.2 Replace agent tools — `convex/agent.ts`

**Remove:** `scheduleReminder`, `listReminders`, `cancelReminder`

**Add 4 new tools:**

**`createScheduledTask`** — args: `title`, `description`, `schedule` ({kind:"once", datetime} | {kind:"cron", expr}), `timezone?`, `deliveryFormat?`
- Resolve timezone from user if not provided
- For `once`: validate future, `parseDatetimeInTimezone` → `runAt`
- For `cron`: validate expression, `getNextCronRun` → initial `runAt`
- Call `internal.scheduledTasks.createScheduledTask`
- Fire analytics
- Return confirmation with next run time

**`listScheduledTasks`** — args: none
- Call `internal.scheduledTasks.listUserScheduledTasks`
- Format: id, title, schedule summary, enabled, lastRunAt, lastStatus

**`updateScheduledTask`** — args: `taskId`, `updates` ({title?, description?, enabled?, schedule?, deliveryFormat?})
- Call `internal.scheduledTasks.updateScheduledTask`
- Fire analytics with action type (edited/paused/resumed)

**`deleteScheduledTask`** — args: `taskId`
- Call `internal.scheduledTasks.deleteScheduledTask`
- Fire analytics

### 2.3 Update `addItem` tool — `convex/agent.ts`

Change `reminderAt` handler to call `internal.scheduledTasks.createScheduledTask` instead of `internal.reminders.createReminder`. Store `scheduledTaskId` on item instead of `reminderJobId`.

Update `updateItemTool` similarly — `clearReminder` cancels via `internal.scheduledTasks.deleteScheduledTask`.

### 2.4 Update ABILITIES section — `convex/agent.ts` (lines 106-177)

Replace item 1 (Reminders):
```
1. *Scheduled Tasks* — Two systems (available to all users):
   a) *Scheduled Tasks* via createScheduledTask — Ghali runs a full AI turn at the scheduled time.
      Supports one-shot ("at 3pm tomorrow") and recurring ("every weekday at 9am" via cron).
      Use listScheduledTasks / updateScheduledTask / deleteScheduledTask to manage.
      Limits: Basic ${SCHEDULED_TASKS_LIMIT_BASIC}, Pro ${SCHEDULED_TASKS_LIMIT_PRO} (paused tasks count).
      Each execution costs 1 credit. "remind me" = one-shot scheduled task.
   b) *Heartbeat* via updateHeartbeat — hourly awareness for LOOSE recurring notes only (~1h precision).
   Rule: use createScheduledTask for anything with a specific time. Heartbeat for loose awareness only.
```

Update item 8 (Credits) to mention scheduled task executions cost 1 credit.

### 2.5 Update tool list — `convex/agent.ts` (ghaliAgent initialization)

Remove: `scheduleReminder`, `listReminders`, `cancelReminder`
Add: `createScheduledTask`, `listScheduledTasks`, `updateScheduledTask`, `deleteScheduledTask`

### 2.6 Update `clearEverything` — `convex/dataManagement.ts`

Add `cancelAllUserScheduledTasks` call. Keep `cancelAllUserReminders` during transition.

### 2.7 Update help template — `convex/templates.ts`

Update the `help` template to mention scheduled tasks instead of reminders. Update `onboarding_complete` similarly.

### 2.8 Hook credit reset — `convex/credits.ts`

In `resetCredits`, after resetting a user's credits, call:
```typescript
ctx.scheduler.runAfter(0, internal.scheduledTasks.resetCreditNotifications, { userId: user._id });
```

This resets `creditNotificationSent` on all tasks so the next credit exhaustion triggers a fresh notification.

---

## PR 3 — Migration

**Branch:** `feat/scheduled-tasks-migration`
**Depends on:** PR 2 merged & deployed

### 3.1 Create `convex/migrations.ts`

**`migrateRemindersToScheduledTasks`** (internalMutation):
1. Query `scheduledJobs` with `kind: "reminder"` and `status: "pending"`
2. For each: create `scheduledTasks` record, cancel old scheduler job, mark old job "cancelled"
3. Update any `items` referencing old `reminderJobId` to set `scheduledTaskId`
4. Batch by 100 for Convex mutation limits, idempotent (skips already-cancelled)

Run manually via Convex dashboard after PR 2 is deployed.

### 3.2 Future cleanup (separate PR, after monitoring)

- Remove `reminderJobId`, `reminderCronId` from items schema
- Remove old reminder tool code from `convex/agent.ts`
- Remove `convex/reminders.ts` (keep only if heartbeat references it — it doesn't, heartbeat has its own file)

---

## PR 4 — Frontend & Documentation

**Branch:** `feat/scheduled-tasks-frontend`
**Depends on:** PR 2 merged

### 4.1 Create `/features/scheduled-tasks` page — `app/features/scheduled-tasks/page.tsx`

Use `FeaturePage`, `FeatureSection`, `FeatureCard` from `app/components/landing/feature-page.tsx`. **Use frontend-design agent.**

Content: badge "Scheduled Tasks", title, subtitle, sections for examples, management commands, credits/limits.

### 4.2 Update `/features/reminders` — `app/features/reminders/page.tsx`

Redirect or update to point to scheduled tasks. **Use frontend-design agent.**

### 4.3 Update features index — `app/features/page.tsx`

Update FEATURES array entry: icon "⏰", title "Scheduled Tasks", href "/features/scheduled-tasks".

### 4.4 Update landing page — `app/page.tsx`

Update any mentions of "reminders" in Strengths/Capabilities grids. **Use frontend-design agent.**

### 4.5 Update documentation

| File | Changes |
|---|---|
| `README.md` | Add "Scheduled Tasks" to feature list, replace "Reminders" |
| `docs/BUSINESS_RULES.md` | Add scheduled tasks limits (3/24), credit cost, out-of-credits behavior |
| `docs/ARCHITECTURE.md` | Add scheduledTasks table, execution flow, deprecate reminders section |
| `docs/POSTHOG.md` | Add 5 new events + `scheduled_tasks` in `feature_used` |

---

## Key Files Summary

| File | Action | PR |
|---|---|---|
| `convex/constants.ts` | Add 3 constants | 1 |
| `convex/schema.ts` | Add `scheduledTasks` table, add `scheduledTaskId` to items | 1 |
| `convex/scheduledTasks.ts` | **Create** — all mutations/queries/actions | 1 |
| `convex/scheduledTasks.test.ts` | **Create** — TDD tests | 1 |
| `convex/admin.ts` | Add `TWILIO_TPL_SCHEDULED_TASK` | 1 |
| `convex/analytics.ts` | Add 5 event trackers + ALLOWED_FEATURES | 2 |
| `convex/agent.ts` | Replace tools, update addItem/updateItem, update ABILITIES | 2 |
| `convex/dataManagement.ts` | Add cancelAllUserScheduledTasks | 2 |
| `convex/templates.ts` | Update help + onboarding_complete | 2 |
| `convex/credits.ts` | Hook resetCreditNotifications | 2 |
| `convex/migrations.ts` | **Create** — one-time migration | 3 |
| `app/features/scheduled-tasks/page.tsx` | **Create** — feature page | 4 |
| `app/features/reminders/page.tsx` | Update/redirect | 4 |
| `app/features/page.tsx` | Update FEATURES array | 4 |
| `app/page.tsx` | Update grids | 4 |
| `README.md` | Update feature list | 4 |
| `docs/BUSINESS_RULES.md` | Add scheduled tasks rules | 4 |
| `docs/ARCHITECTURE.md` | Add scheduled tasks architecture | 4 |
| `docs/POSTHOG.md` | Add 5 events | 4 |

---

## Verification

1. **Tests**: `cd convex && npx vitest run scheduledTasks.test.ts` — all pass
2. **Type check**: `pnpm build` passes (schema + all references)
3. **Manual test**: Create a one-off task via WhatsApp ("remind me to test in 2 minutes"), verify it fires and delivers
4. **Recurring test**: Create a cron task ("every 5 minutes, tell me a joke"), verify it reschedules
5. **Credit exhaustion**: Set credits to 0, verify task skips + sends one notification with upgrade link
6. **Limit test**: Try creating more than 3 tasks on basic tier, verify rejection
7. **Migration**: Run migration script on dev, verify old reminders converted
8. **Frontend**: Visit /features/scheduled-tasks, verify page renders correctly
