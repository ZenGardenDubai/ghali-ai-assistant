# Post-MVP Items

Issues, improvements, and tech debt to revisit after MVP completion.

## UX

- **Revisit clear\* commands** — Evaluate whether to route the clear memory/documents/everything confirmation and completion messages through our template message system (fill template → detect language → translate) so responses are auto-translated to the user's language. Enhance the overall flow (e.g. cancellation feedback, better confirmation prompts).

## Account Command

- **Revamp "account" command** — Currently falls through to AI with no template. Should return a structured account summary: tier (Basic/Pro), credits remaining/total, next credit reset date, admin status. Consider also adding sub-commands like "account delete" (full account deletion) and "account export" (data export).

## File Conversion Service

- **Expose CloudConvert as a user-facing tool** — We already have CloudConvert API integrated for document processing (DOCX/PPTX/XLSX → PDF). Offer this as a standalone feature: users send a file and say "convert to PDF" (or other formats). CloudConvert supports 200+ formats — PDF, DOCX, PNG, JPG, MP3, MP4, etc. Could be a Pro perk or cost extra credits for heavy conversions.

## Heartbeat

- **WhatsApp template fallback for heartbeat** — Currently heartbeat messages are skipped if the user hasn't messaged within 24 hours (WhatsApp session window). Create a pre-approved Twilio Content Template (utility category) for heartbeat reminders so they can be delivered outside the 24h window. Template example: `"Hi {{1}}, here's your reminder: {{2}}"`. Requires Twilio Content Template approval. Then update `processUserHeartbeat` to fall back to the template when outside the session window instead of skipping.
