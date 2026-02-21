# Post-MVP Items

Issues, improvements, and tech debt to revisit after MVP completion.

## UX

- **Revisit clear\* commands** — Evaluate whether to route the clear memory/documents/everything confirmation and completion messages through our template message system (fill template → detect language → translate) so responses are auto-translated to the user's language. Enhance the overall flow (e.g. cancellation feedback, better confirmation prompts).

## Heartbeat

- **WhatsApp template fallback for heartbeat** — Currently heartbeat messages are skipped if the user hasn't messaged within 24 hours (WhatsApp session window). Create a pre-approved Twilio Content Template (utility category) for heartbeat reminders so they can be delivered outside the 24h window. Template example: `"Hi {{1}}, here's your reminder: {{2}}"`. Requires Twilio Content Template approval. Then update `processUserHeartbeat` to fall back to the template when outside the session window instead of skipping.
- **Precise-time reminders** — The hourly cron only supports ~1 hour precision. For exact-time reminders (e.g. "remind me at 4:18 PM"), add a new agent tool that calls `ctx.scheduler.runAt()` to schedule a one-off action at the precise timestamp. The heartbeat file stays for recurring items; `scheduler.runAt` handles one-shot exact-time reminders.
