/**
 * System message templates — data-accurate, never LLM-generated.
 * Pattern: fill template → detect language → translate if not English.
 */

import { PRO_FEATURES } from "./constants";

const proFeaturesList = PRO_FEATURES.map((f) => `✅ ${f}`).join("\n");

export const TEMPLATES = {
  // === Terms Acceptance ===
  terms_accepted: {
    template: `Thanks for signing up, {{name}}! 🎉

Here's what I can do:
💬 Answer questions and have conversations
📄 Process documents, images, and voice notes
⏰ Set reminders and scheduled tasks
🖼️ Generate and edit images
🔍 Search the web for real-time info
📊 Track expenses, tasks, notes, and more
✍️ Write professional content with ProWrite

*Commands:*
• *help* — see what I can do
• *credits* — check your balance
• *account* — manage your account
• *upgrade* — get more credits
• *stop* / *start* — pause or resume messages
• *delete* — delete your account and data

Just send me a message to get started!`,
    variables: ["name"],
  },

  // === Onboarding ===
  onboarding_welcome: {
    template: `Hey {{name}}! 👋 Ready when you are, just ask me anything, send a file, or say "remind me to..." to start.

(Timezone set to {{timezone}} · say *help* or *account* anytime)`,
    variables: ["name", "timezone"],
  },

  // === Credits ===
  check_credits: {
    template: `*Your Credits* 🪙

*Remaining:* {{credits}}
*Plan:* {{tier}}
*Resets:* {{resetDate}}

Each message uses 1 credit.`,
    variables: ["credits", "tier", "resetDate"],
  },

  credits_low_warning: {
    template: `You have {{credits}} credits remaining this month. Need more? Send "upgrade" to learn about Pro.`,
    variables: ["credits"],
  },

  credits_exhausted_basic: {
    template: `*Credits Used Up* 😅

You've used all {{maxCredits}} credits this month.

*Resets:* {{resetDate}}

Want 10x more? *Ghali Pro* — 600 credits/month for just $9.99/mo.

Say *upgrade* to get started ⭐`,
    variables: ["maxCredits", "resetDate"],
  },

  credits_exhausted_pro: {
    template: `*Credits Used Up* 🪙

You've used all {{maxCredits}} credits this month.

*Resets:* {{resetDate}}

Thanks for being Pro! 💎`,
    variables: ["maxCredits", "resetDate"],
  },

  // === Help ===
  help: {
    template: `*Ghali Quick Guide* 💡

💬 *Chat* — Ask me anything, in any language
💡 *Deep thinking* — Tough questions get escalated to a more powerful AI automatically
🔍 *Web search* — Real-time info (weather, news, prices, sports)
📄 *Documents* — Send PDFs, Word, Excel, or text files — I read and remember them
🖼️ *Images* — Send photos for analysis, or say *generate an image of...*
🎤 *Voice & Video* — Send voice notes, audio, or video — I understand them
🔄 *File conversion* — Convert between formats: PDF↔Word, images, audio (say "convert to PDF" or reply to a file)
🧠 *Memory* — I learn your preferences over time — no need to repeat yourself
⏰ *Scheduled tasks* — One-time or recurring AI tasks: reminders, daily briefings, reports
💓 *Heartbeat* — Proactive check-ins based on your schedule
📊 *Track anything* — Expenses, tasks, contacts, notes, bookmarks — just tell me and I organize it
✍️ *ProWrite* — Say "prowrite" for professional multi-AI writing (articles, emails, reports)

*Commands:*
• *account* — your plan, credits, and settings
• *my memory* — what I know about you
• *clear memory* — forget our conversations
• *clear documents* — delete stored files
• *clear schedules* — delete all scheduled tasks
• *clear everything* — full reset
• *stop* — pause all reminders and proactive messages
• *start* — resume reminders
• *delete* — permanently delete your account and all data
• *upgrade* — get Pro
• *privacy* — how your data is handled
• *help* — this guide

💭 *Feedback* — Say "I have feedback" or "report a bug" to get a feedback form link`,
    variables: [],
  },

  // === Privacy ===
  privacy: {
    template: `*Your Privacy* 🔒

*What I store:*
• Conversations — kept as chat history so I have context
• Documents — extracted text only (the original file is not kept), searchable for future questions
• Memory — facts I learn about you (name, preferences, interests)
• Generated images — stored for 90 days, then automatically deleted

*What I never do:*
• Share your data with other users
• Use your data for ads or training
• Sell your data

*You control everything:*
• *my memory* — see what I know about you
• *clear memory* — erase what I've learned
• *clear documents* — delete all stored documents
• *clear everything* — total reset, like we never met
• *delete* — permanently delete your account and all data

Your data. Your rules.`,
    variables: [],
  },

  // === Upgrade ===
  upgrade: {
    template: `*Ghali Pro* ⭐

*What you get:*
${proFeaturesList}

*$9.99/month* (or $99.48/year — save 17%)

👉 {{upgradeUrl}}`,
    variables: ["upgradeUrl"],
  },
  // === Upgrade (already Pro) ===
  already_pro: {
    template: `*You're already Pro!* 💎

*Credits left:* {{credits}}/{{maxCredits}}
*Resets:* {{renewDate}}

You've got the full package — enjoy! ⭐`,
    variables: ["credits", "maxCredits", "renewDate"],
  },

  // === Account ===
  account: {
    template: `*Your Account* 👤

*Plan:* {{tier}}
*Credits:* {{credits}}/{{maxCredits}}
*Resets:* {{resetDate}}
*Language:* {{language}}
*Timezone:* {{timezone}}{{cancelingNote}}

Type *help* for more commands.`,
    variables: ["tier", "credits", "maxCredits", "resetDate", "language", "timezone", "cancelingNote"],
  },

  // === Memory ===
  memory_summary: {
    template: `*What I Know About You* 🧠

{{memoryContent}}

Want me to forget something? Just say *forget that I...* or *clear memory* for a full reset.`,
    variables: ["memoryContent"],
  },

  // === Clear Data ===
  clear_memory_confirm: {
    template: `*Clear Memory?* 🧠

I'll forget everything I've learned about you — preferences, past conversations, personal details.

Your documents stay safe.

Say *yes* to confirm.`,
    variables: [],
  },

  clear_documents_confirm: {
    template: `*Clear Documents?* 📄

I'll delete all {{docCount}} stored documents.

Your memory and conversations stay safe.

Say *yes* to confirm.`,
    variables: ["docCount"],
  },

  clear_schedules_confirm: {
    template: `*Clear Schedules?* ⏰

This will delete all your scheduled tasks (recurring and one-off).

Say *yes* to confirm.`,
    variables: [],
  },

  clear_everything_confirm: {
    template: `*Clear Everything?* ⚠️

This deletes:
• All memory and preferences
• All stored documents
• Conversation history

Only your account and credits remain.

Say *yes* to confirm.`,
    variables: [],
  },
  // === Clear Data Done ===
  clear_memory_done: {
    template: `*Memory Cleared* ✅

I've forgotten everything I learned about you. We're starting fresh.

Your documents and account are untouched.`,
    variables: [],
  },

  clear_documents_done: {
    template: `*Documents Cleared* ✅

All {{docCount}} stored documents have been deleted.

Your memory and conversations are untouched.`,
    variables: ["docCount"],
  },

  clear_schedules_done: {
    template: `*Schedules Cleared* ✅

All scheduled tasks have been deleted.`,
    variables: [],
  },

  clear_everything_done: {
    template: `*Complete Reset* ✅

Everything has been cleared:
• Memory and preferences
• All stored documents
• Conversation history

Your account and credits remain. Say hi to start fresh 👋`,
    variables: [],
  },

  // === Voice ===
  voice_transcription_failed: {
    template: `Sorry, I couldn't process that voice message. Please try again or send a text message instead.`,
    variables: [],
  },
  // === Documents ===
  document_extraction_failed: {
    template: `Sorry, I couldn't process that file. Please try a different format (PDF, Word, Excel, PowerPoint, CSV, image, or text file) or send it again.`,
    variables: [],
  },

  // === Rate Limiting ===
  rate_limited: {
    template: `You're sending messages too fast. Please wait {{retryAfterSeconds}} seconds and try again.`,
    variables: ["retryAfterSeconds"],
  },
  // === Admin ===
  admin_stats: {
    template: `*Platform Stats* 📊

*Today (Dubai time, UTC+4)*
New: {{newTodayDubai}} | Active: {{activeTodayDubai}}

*Last 24 Hours (rolling)*
New: {{newToday}} | Active: {{activeToday}}

*Last 7 Days (rolling)*
Active: {{activeWeek}}

*Last 30 Days (rolling)*
Active: {{activeMonth}}

*This Week (Dubai, starts Sun)*
Active: {{activeWeekDubai}}

*This Month (Dubai)*
Active: {{activeMonthDubai}}

*All Time*
Users: {{totalUsers}} | Pending Acceptance: {{pendingAcceptance}} | Pro: {{proUsers}}`,
    variables: [
      "newTodayDubai",
      "activeTodayDubai",
      "newToday",
      "activeToday",
      "activeWeek",
      "activeMonth",
      "activeWeekDubai",
      "activeMonthDubai",
      "totalUsers",
      "pendingAcceptance",
      "proUsers",
    ],
  },

  admin_search_result: {
    template: `*User Found* 🔍

*Phone:* {{phone}}
*Name:* {{name}}
*Tier:* {{tier}}
*Credits:* {{credits}}
*Language:* {{language}}
*Timezone:* {{timezone}}
*Admin:* {{isAdmin}}
*Created:* {{createdAt}}
*Last Active:* {{lastActive}}`,
    variables: ["phone", "name", "tier", "credits", "language", "timezone", "isAdmin", "createdAt", "lastActive"],
  },

  admin_search_not_found: {
    template: `*User Not Found* ❌

No user with phone {{phone}}.`,
    variables: ["phone"],
  },

  admin_grant_done: {
    template: `*Grant Applied* ✅

*User:* {{phone}}
*Action:* {{action}}
*Details:* {{details}}`,
    variables: ["phone", "action", "details"],
  },

  admin_broadcast_confirm: {
    template: `*Broadcast Preview* 📢

*Message:* {{message}}
*Recipients:* {{activeCount}} active users (last 24h)

Say *yes* to send.`,
    variables: ["message", "activeCount"],
  },

  admin_broadcast_done: {
    template: `*Broadcast Sent* ✅

Delivered to {{sentCount}} users.`,
    variables: ["sentCount"],
  },

  admin_help: {
    template: `*Admin Commands* 🛠️

• *admin stats* — platform stats
• *admin search +971...* — look up user
• *admin grant +971... pro* — upgrade to Pro
• *admin grant +971... credits 100* — add credits
• *admin broadcast Hello!* — message active users
• *admin help* — this guide`,
    variables: [],
  },

  admin_not_authorized: {
    template: `You don't have admin access.`,
    variables: [],
  },

  // === Account Control ===
  stop_confirmed: {
    template: `*Reminders Paused* ⏸️

All proactive messages and reminders are paused. You can still chat with me anytime.

Send *start* to resume.`,
    variables: [],
  },

  start_confirmed: {
    template: `*Reminders Resumed* ▶️

Your reminders and proactive messages are back on!`,
    variables: [],
  },

  delete_account_confirm: {
    template: `*Delete Account?* ⚠️

This will permanently delete:
• All conversations and memory
• All documents and files
• All scheduled tasks and reminders
• Your account and settings

This cannot be undone.

Say *yes* to confirm.`,
    variables: [],
  },

  delete_account_done: {
    template: `Your account and all data have been permanently deleted. Goodbye, and take care.`,
    variables: [],
  },

  delete_cancel_subscription_first: {
    template: `You have an active Pro subscription. Please cancel it first before deleting your account.

Manage your subscription here:
👉 {{accountUrl}}

Once cancelled, send *delete* again.`,
    variables: ["accountUrl"],
  },
} as const;
