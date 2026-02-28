# Twilio WhatsApp Content Templates

WhatsApp requires pre-approved **Content Templates** for messages sent outside the 24-hour session window (i.e., when the user hasn't messaged us recently). Inside the window, free-form messages work fine.

## When Templates Are Needed

| Scenario | Currently | Template needed? |
|---|---|---|
| **Reminders** | Skipped if outside 24h window | Yes — users expect these regardless |
| **Heartbeat** | Skipped if outside 24h window | Yes — available to all users |
| **Admin broadcast** | Only sent to active users | Yes — for announcements to all users |
| **Credit reset** | No notification sent | Nice-to-have — re-engagement |
| **Credits low** | No warning sent | Nice-to-have — reduces surprise |
| **Subscription active** | Silent | Nice-to-have — confirmation |
| **Subscription ended** | Silent | Nice-to-have — retention |

## How to Create Templates

Templates are created via the [Twilio Content API](https://www.twilio.com/docs/content/create-templates-with-the-content-api) or the Twilio Console under **Content Template Builder**. Each template gets a Content SID (`HXxxxxxxxxx`) after Meta approval.

### API: Create a template

```bash
curl -X POST "https://content.twilio.com/v1/Content" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '<JSON payload below>'
```

### API: Send a template message

```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  -d "From=whatsapp:+14155238886" \
  -d "To=whatsapp:+971500000000" \
  -d "ContentSid=HXxxxxxxxxx" \
  -d 'ContentVariables={"1":"value1","2":"value2"}'
```

In code (`convex/lib/twilioSend.ts`), template messages use `ContentSid` + `ContentVariables` instead of `Body`:

```typescript
async function twilioTemplateCall(
  options: TwilioSendOptions,
  contentSid: string,
  variables: Record<string, string>
): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${options.accountSid}/Messages.json`;

  const params = new URLSearchParams({
    From: `whatsapp:${options.from}`,
    To: `whatsapp:${options.to}`,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(variables),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${options.accountSid}:${options.authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio template API error (${response.status}): ${error}`);
  }
}
```

---

## Templates

### 1. `ghali_reminder` — Scheduled Reminder

**Category:** Utility
**Used by:** `convex/reminders.ts` — when a reminder fires outside the 24h window
**Variables:** `{{1}}` = reminder text

```json
{
  "friendly_name": "ghali_reminder",
  "language": "en",
  "types": {
    "twilio/text": {
      "body": "⏰ Reminder: {{1}}"
    }
  }
}
```

**Example:** `⏰ Reminder: Drink water`

---

### 2. `ghali_heartbeat` — Proactive Check-in

**Category:** Utility
**Used by:** `convex/heartbeat.ts` — hourly cron for all users outside the 24h window
**Variables:** `{{1}}` = personalized message from the agent

```json
{
  "friendly_name": "ghali_heartbeat",
  "language": "en",
  "types": {
    "twilio/text": {
      "body": "{{1}}"
    }
  }
}
```

**Note:** The heartbeat message is AI-generated and personalized per user. A single `{{1}}` variable gives the agent full flexibility. If Meta rejects this as too generic, fall back to a structured format like `"Hi {{1}}, here's your check-in: {{2}}"`.

---

### 3. `ghali_broadcast` — Admin Announcement

**Category:** Utility
**Used by:** `convex/admin.ts` — admin broadcast to all users
**Variables:** `{{1}}` = announcement message

```json
{
  "friendly_name": "ghali_broadcast",
  "language": "en",
  "types": {
    "twilio/text": {
      "body": "📢 {{1}}"
    }
  }
}
```

---

### 4. `ghali_credits_reset` — Monthly Credit Refresh

**Category:** Utility
**Used by:** `convex/credits.ts` — after the daily cron resets a user's credits
**Variables:** `{{1}}` = credit amount (e.g. "60"), `{{2}}` = tier name (e.g. "Basic")

```json
{
  "friendly_name": "ghali_credits_reset",
  "language": "en",
  "types": {
    "twilio/text": {
      "body": "🔄 Your {{2}} credits have been refreshed! You now have {{1}} credits for this month."
    }
  }
}
```

---

### 5. `ghali_credits_low` — Low Credit Warning

**Category:** Utility
**Used by:** `convex/messages.ts` — after credit deduction when balance drops below threshold
**Variables:** `{{1}}` = remaining credits

```json
{
  "friendly_name": "ghali_credits_low",
  "language": "en",
  "types": {
    "twilio/text": {
      "body": "⚠️ You have {{1}} credits remaining this month. Need more? Send \"upgrade\" to learn about Pro."
    }
  }
}
```

**Note:** This one is sent right after a user interaction (within the 24h window), so a template isn't strictly required. But having it as a template ensures delivery even if the credit check runs asynchronously after the window closes.

---

### 6. `ghali_subscription_active` — Pro Plan Activated

**Category:** Utility
**Used by:** `convex/billing.ts` — after `handleSubscriptionActive`
**Variables:** `{{1}}` = credit amount (e.g. "600")

```json
{
  "friendly_name": "ghali_subscription_active",
  "language": "en",
  "types": {
    "twilio/text": {
      "body": "🎉 Your Pro plan is now active! You have {{1}} credits this month — 10× more than Basic. Enjoy!"
    }
  }
}
```

---

### 7. `ghali_subscription_ended` — Pro Plan Ended

**Category:** Utility
**Used by:** `convex/billing.ts` — after `handleSubscriptionEnded`
**Variables:** `{{1}}` = basic credit amount (e.g. "60")

```json
{
  "friendly_name": "ghali_subscription_ended",
  "language": "en",
  "types": {
    "twilio/text": {
      "body": "Your Pro plan has ended. You're now on the Basic plan with {{1}} credits/month. Send \"upgrade\" anytime to resubscribe."
    }
  }
}
```

---

### 8. `ghali_scheduled_task` — Scheduled Task Result

**Category:** Utility
**Used by:** `convex/scheduledTasks.ts` — when a scheduled task fires outside the 24h window
**Variables:** `{{1}}` = task result (truncated to 1400 chars)

```json
{
  "friendly_name": "ghali_scheduled_task",
  "language": "en",
  "types": {
    "twilio/text": {
      "body": "📋 Scheduled Task Result:\n\n{{1}}\n\nReply to chat with your AI assistant."
    }
  }
}
```

---

## Implementation Priority

### Phase 1 — Must-have (users actively expect these)
1. `ghali_reminder` — reminders are broken without this
2. `ghali_heartbeat` — proactive check-in for all users, currently skipped outside 24h window

### Phase 2 — Nice-to-have (improves UX)
3. `ghali_broadcast` — enables admin announcements to all users
4. `ghali_subscription_active` — confirms payment worked
5. `ghali_subscription_ended` — transparent offboarding

### Phase 3 — Growth (re-engagement)
6. `ghali_credits_reset` — monthly re-engagement touchpoint
7. `ghali_credits_low` — drives upgrades

---

## Env Vars

After creating each template in Twilio, store the Content SIDs:

```env
# Twilio Content Template SIDs
TWILIO_TPL_REMINDER=HXxxxxxxxxx
TWILIO_TPL_HEARTBEAT=HXxxxxxxxxx
TWILIO_TPL_BROADCAST=HXxxxxxxxxx
TWILIO_TPL_CREDITS_RESET=HXxxxxxxxxx
TWILIO_TPL_CREDITS_LOW=HXxxxxxxxxx
TWILIO_TPL_SUB_ACTIVE=HXxxxxxxxxx
TWILIO_TPL_SUB_ENDED=HXxxxxxxxxx
TWILIO_TPL_SCHEDULED_TASK=HXxxxxxxxxx
```

These will be read by the `sendWhatsAppTemplate` function in `convex/lib/twilioSend.ts`.

---

## Approval Notes

- **Category must be `utility`** — marketing templates have stricter rules and lower delivery rates
- Meta typically approves utility templates within minutes
- Templates with a single `{{1}}` catch-all variable may be rejected — if so, add a fixed prefix/suffix to give Meta enough context
- Test in Twilio sandbox first (sandbox doesn't require approval)
