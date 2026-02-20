/**
 * System message templates — data-accurate, never LLM-generated.
 * Pattern: fill template → detect language → translate if not English.
 */

export const TEMPLATES = {
  // === Credits ===
  check_credits: {
    template: `*Your Credits* 🪙

*Remaining:* {{credits}}
*Plan:* {{tier}}
*Resets:* {{resetDate}}

Each message uses 1 credit.`,
    variables: ["credits", "tier", "resetDate"],
  },

  credits_exhausted_basic: {
    template: `*Credits Used Up* 😅

You've used all {{maxCredits}} credits this month.

*Resets:* {{resetDate}}

Want 10x more? *Ghali Pro* — 600 credits/month for just $19.

Say "upgrade" to get started ⭐`,
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

💬 *Chat* — Ask anything
📄 *Documents* — Send PDFs, Word, PowerPoint
🖼️ *Images* — Send photos or say "generate an image of..."
🎤 *Voice* — Send voice notes
🧠 *Memory* — I remember our conversations

*Commands:*
• "credits" — check your balance
• "my memory" — what I know about you
• "clear memory" — forget our conversations
• "clear documents" — delete stored files
• "clear everything" — full reset
• "upgrade" — get Pro
• "privacy" — how your data is handled
• "help" — this guide`,
    variables: [],
  },

  // === Privacy ===
  privacy: {
    template: `*Your Privacy* 🔒

*What I store:*
• Our conversations (so I remember context)
• Documents you send (for future reference)
• What I learn about you (preferences, interests)

*What I never do:*
• Share your data with anyone
• Use it for ads
• Sell it

*You control everything:*
• "clear memory" — forget conversations
• "clear documents" — delete files
• "clear everything" — total reset

Your data. Your rules.`,
    variables: [],
  },

  // === Upgrade ===
  upgrade: {
    template: `*Ghali Pro* ⭐

*What you get:*
✅ 600 credits/month (10x Basic)
✅ 500MB document storage (5x Basic)
✅ Priority responses
✅ Heartbeat — proactive check-ins

*$19/month*

👉 {{upgradeUrl}}`,
    variables: ["upgradeUrl"],
  },
  // === Upgrade (already Pro) ===
  already_pro: {
    template: `*You're Pro!* ⭐

*Credits:* {{credits}}/600
*Storage:* {{storageUsed}} of 500MB
*Renews:* {{renewDate}}

Thanks for being a Pro member 💎`,
    variables: ["credits", "storageUsed", "renewDate"],
  },

  // === Memory ===
  memory_summary: {
    template: `*What I Know About You* 🧠

{{memoryContent}}

Want me to forget something? Just say "forget that I..." or "clear memory" for a full reset.`,
    variables: ["memoryContent"],
  },

  // === Clear Data ===
  clear_memory_confirm: {
    template: `*Clear Memory?* 🧠

I'll forget everything I've learned about you — preferences, past conversations, personal details.

Your documents stay safe.

Say "yes" to confirm.`,
    variables: [],
  },

  clear_documents_confirm: {
    template: `*Clear Documents?* 📄

I'll delete all {{docCount}} stored documents.

Your memory and conversations stay safe.

Say "yes" to confirm.`,
    variables: ["docCount"],
  },

  clear_everything_confirm: {
    template: `*Clear Everything?* ⚠️

This deletes:
• All memory and preferences
• All stored documents
• Conversation history

Only your account and credits remain.

Say "yes" to confirm.`,
    variables: [],
  },
} as const;
