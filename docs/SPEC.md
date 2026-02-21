# Ghali AI Assistant — Build Spec

> This spec is designed to be fed to an LLM (Cursor, Claude Code, etc.) to scaffold and build the app. Keep it concise.

## What to Build

A WhatsApp-first AI assistant. Users message a WhatsApp number and chat with AI. Web chat is secondary. That's it.

- **WhatsApp:** +971582896090 (Twilio Business API)
- **Web:** ghali.ae (landing page only — conversion to WhatsApp)
- **License:** Apache 2.0

---

## Tech Stack

| Layer | Package | Docs |
|-------|---------|------|
| Framework | Next.js 15 (App Router, TypeScript, Tailwind) | https://nextjs.org/docs |
| UI | shadcn/ui | https://ui.shadcn.com |
| Database | Convex | https://docs.convex.dev |
| Auth | Clerk | https://docs.convex.dev/auth/clerk |
| AI Agent | @convex-dev/agent | https://docs.convex.dev/agents |
| RAG | @convex-dev/rag | https://www.convex.dev/components/rag |
| Rate Limit | @convex-dev/rate-limiter | https://www.convex.dev/components/rate-limiter |
| AI SDK | ai + @ai-sdk/google + @ai-sdk/anthropic + @ai-sdk/openai | https://ai-sdk.dev/docs |
| Embeddings | OpenAI text-embedding-3-small (1536d) | https://ai-sdk.dev/providers/ai-sdk-provider/openai |
| WhatsApp | Twilio | https://www.twilio.com/docs/whatsapp |
| Analytics | PostHog | https://posthog.com/docs |
| Testing | Vitest | https://vitest.dev |
| Hosting | Vercel + Convex Cloud | — |

---

## AI Models

| Role | Model | When |
|------|-------|------|
| Primary (85%) | Gemini 3 Flash | Default for all messages |
| Reasoning (10%) | Claude Opus 4.6 | Agent calls `deepReasoning` tool |
| Images | Gemini 3 Pro (image mode) | Agent calls `generateImage` tool |
| Voice → Text | Whisper | Voice notes received via Twilio |

**Routing:** Single Flash agent with one escalation tool (deepReasoning → Opus). No separate classifier. Flash decides when to escalate.

---

## MVP Features

Build these in order. Each one: write test → see fail → implement → see pass → commit.

### 1. New User Onboarding
When a new user messages Ghali for the first time, run a lightweight conversational onboarding.
Max 3 messages. Everything skippable — if user ignores and asks a question, just answer it.

**Step 1 — Name + timezone verification (always, one message):**
```
Hey! 👋 I'm Ghali, your AI assistant.

I see your name is {{whatsappProfileName}} — should I call you that, or something else?

🕐 I've set your timezone to {{detectedTimezone}} based on your number. If you're elsewhere, just tell me your city.

(Skip: just start chatting anytime)
```
- Pull name from Twilio webhook `ProfileName` field
- Detect timezone from phone country code (+971 → Asia/Dubai, +44 → Europe/London, +1 → America/New_York, etc.)
- If they confirm or give a nickname → store in memory
- If they correct timezone ("I'm in London") → update immediately
- If they skip (ask a question instead) → use profile name + detected timezone, move on
- Timezone can be updated anytime: "I'm traveling to Paris" → agent updates timezone
- Affects all scheduled jobs (heartbeat, reminders, active hours)

**Step 2 — Language (only if ambiguous):**
```
What language do you prefer?
🇬🇧 English
🇦🇪 العربية
🇫🇷 Français

Or just reply in your language and I'll match you automatically ✨
```
- SKIP this step if language was already clear from Step 1 reply
- "نعم" → Arabic detected, no need to ask
- Only ask if first reply was mixed/unclear

**Step 3 — Personality style:**
```
Last thing — how would you like me to be?

😊 Cheerful & friendly
📋 Professional & serious
⚡ Brief & to-the-point
📚 Detailed & thorough

Pick one, or say "skip" — you can change this anytime.
```
- Map choice to personality user block (tone + verbosity)
- Cheerful → tone: playful, emoji: lots
- Professional → tone: formal, emoji: minimal
- Brief → verbosity: concise, emoji: minimal
- Detailed → verbosity: detailed, emoji: moderate

**After onboarding (or skip):**
```
All set! Ask me anything 💬
```

- Store all answers in personality user block + memory
- Don't ask: location, interests (learn organically)
- Timezone: auto-detect from country code, soft-confirm in Step 1, updatable anytime
- Track onboarding state: `onboardingStep` field on user record (null = done)
- If user messages mid-onboarding with a real question → answer it, mark onboarding done

### 2. Twilio Webhook
- `POST /api/whatsapp/webhook` receives messages from Twilio
- Validates Twilio signature
- **Country code blocking (fraud prevention):** Before any processing, check sender's number against blocked list. If blocked → log, return 200 OK silently. No response, no processing, no credits used.
  ```typescript
  const BLOCKED_COUNTRY_CODES = [
    "+91",  // India
    "+92",  // Pakistan
    "+880", // Bangladesh
    "+234", // Nigeria
    "+62",  // Indonesia
    "+263", // Zimbabwe
  ];
  // Block check: BLOCKED_COUNTRY_CODES.some(code => from.startsWith(code))
  ```
  - Configurable: store in constants, easy to add/remove countries
  - Prevents SMS traffic pumping attacks and spam
- Extracts: sender phone, message body, media URLs
- Returns 200 immediately, processes async

### 3. User Management
- Find or create user by phone number
- Store: phone, name (from WhatsApp profile), language, timezone, createdAt
- Convex `users` table

### 4. Conversation Threads
- One thread per user (Convex Agent threads)
- All messages stored with role, content, timestamp, model used, token counts
- Thread history auto-included in agent context

### 5. AI Agent (Core)
- Define agent with `@convex-dev/agent`:
  ```typescript
  const ghali = new Agent(components.agent, {
    name: "Ghali",
    model: google("gemini-3-flash"),
    instructions: "...", // base personality (warm, concise, multilingual)
    tools: {
      deepReasoning, generateImage, searchDocuments,
      updateMemory, updatePersonality, updateHeartbeat,
    },
  });
  ```
- On each turn: load user's 3 files (memory, personality, heartbeat) and prepend to context
- If personality file exists, it overrides/extends the base instructions for this user
- Process incoming message → run agent on user's thread → send reply via Twilio

### 6. Escalation Tool
- `deepReasoning`: Calls Claude Opus 4.6 for complex tasks (coding, analysis, deep reasoning, nuanced writing). Returns result to Flash.
- Flash formats and delivers the final response.
- Only one escalation tier — keeps it simple.

### 7. Image Generation
- `generateImage`: Calls Gemini 3 Pro in image mode
- Returns image URL/buffer → send as WhatsApp media message

### 8. Voice Notes
- Twilio delivers voice as media URL
- Download → transcribe with Whisper API → process as text message
- Reply as text (TTS is V2)

### 9. Credit System
- **Basic (free):** 60 credits/month
- **Pro ($9.99/month or $99.48/year):** 600 credits/month
- **1 credit per request** — regardless of model used (Flash, Pro, or Opus escalation)
- **Free (0 credits):** system commands — "credits", "help", "privacy", "my memory", "clear memory", "upgrade", "account", admin commands
- Usage tracking (model, tokens, cost) handled by PostHog, not stored in Convex
- When credits run out → friendly message, upgrade CTA for Basic users, reset date for Pro
- **Monthly reset:** Convex cron job runs daily, resets credits for users whose `creditsResetAt` has passed
- **Billing:** Clerk Billing for Pro subscriptions. Webhook at `POST /api/clerk/webhook`:
  - `subscription.created` → upgrade user to Pro (600 credits)
  - `subscription.cancelled` → downgrade to Basic at period end
  - `subscription.updated` → handle plan changes
  - Verify webhook signature with Clerk signing secret
- ~~Convex `usage` table~~ *(removed — usage/cost tracking deferred to PostHog)*

### 10. Document Processing + RAG
When a user sends any file, two things happen simultaneously:
1. **Immediate processing** — extract content, answer the user's question about it
2. **Store in personal knowledge base** — chunk, embed, store for future retrieval

**Supported formats:**
| Format | Method |
|--------|--------|
| PDF | Gemini 3 Flash (native PDF support) |
| Images (jpg/png/webp) | Gemini 3 Flash (vision) |
| Word (.docx) | CloudConvert → PDF → Gemini 3 Flash |
| PowerPoint (.pptx) | CloudConvert → PDF → Gemini 3 Flash |
| Excel (.xlsx) | CloudConvert → PDF → Gemini 3 Flash |

**Flow:**
- Twilio delivers media URL → download file → detect type
- PDF/Images → send directly to Gemini 3 Flash
- Word/PowerPoint/Excel → CloudConvert API → PDF → Gemini 3 Flash
- Pass extracted content to agent for immediate response
- Async: chunk text (500 tokens, 100 overlap) → embed with OpenAI → store in `@convex-dev/rag`
- Per-user namespace — each user's docs are isolated
- `searchDocuments` tool: agent searches user's documents when relevant in future conversations

**Image handling:**
- Gemini Flash describes/OCRs the image → text description stored in RAG
- Original image stored in Convex file storage, linked to RAG entry
- Future queries about past images work via text search on descriptions

**Limits:**
- Max file size: 20MB per file (Twilio limit)
- Files auto-expire after 90 days (TTL policy)
- Supported via WhatsApp media messages only (no web upload in MVP)

**User experience:**
- Send a contract PDF → "What are the payment terms?" → instant answer
- 2 weeks later → "What was the deadline in that contract?" → agent searches RAG, finds it

### 11. System Message Templates
Templates guarantee data accuracy (numbers, credits, dates). LLM only translates text.
Pattern: fill template with data → detect user language → translate if not English.

**Translation:** Detect language from user's message (Flash, zero-temp). Supports en, ar, fr, es, hi, ur.
Critical: never let LLM change numbers, emoji, or *bold* formatting — only translate words.

**Templates:**

```typescript
export const TEMPLATES = {
  // === Onboarding ===
  welcome: {
    template: `*Hey!* 👋 I'm Ghali, your AI assistant on WhatsApp.

Send me anything:
💬 Questions — I'll find answers
📄 Documents — PDFs, Word, PowerPoint
🖼️ Images — I'll describe, read, or analyze them
🎤 Voice notes — I understand those too
🎨 "Generate an image of..." — I'll create it

The more we talk, the better I get to know you ✨

You have *{{credits}} credits* this month. Say "credits" anytime to check.`,
    variables: ["credits"],
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

  credits_exhausted_basic: {
    template: `*Credits Used Up* 😅

You've used all {{maxCredits}} credits this month.

*Resets:* {{resetDate}}

Want 10x more? *Ghali Pro* — 600 credits/month for just $9.99/mo.

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
✅ Priority responses
✅ Heartbeat — proactive check-ins

*$9.99/month* (or $99.48/year — save 17%)

👉 {{upgradeUrl}}`,
    variables: ["upgradeUrl"],
  },

  already_pro: {
    template: `*You're Pro!* ⭐

*Credits:* {{credits}}/600
*Renews:* {{renewDate}}

Thanks for being a Pro member 💎`,
    variables: ["credits", "renewDate"],
  },

  // === Memory ===
  memory_summary: {
    template: `*What I Know About You* 🧠

{{memoryContent}}

Want me to forget something? Just say "forget that I..." or "clear memory" for a full reset.`,
    variables: ["memoryContent"],
  },

  memory_updated: {
    template: `Got it ✅`,
    variables: [],
  },

  // === Documents ===
  document_stored: {
    template: `*Saved* 📄

"{{docName}}" is in your knowledge base. Ask me about it anytime.`,
    variables: ["docName"],
  },

  // === Clear Data ===
  clear_memory_confirm: {
    template: `*Clear Memory?* 🧠

I'll forget everything I've learned about you — preferences, past conversations, personal details.

Your documents stay safe.

Say "yes" to confirm.`,
    variables: [],
  },

  clear_memory_done: {
    template: `*Memory Cleared* 🧹

Fresh start. I don't remember our past conversations.

Let's get to know each other again ✨`,
    variables: [],
  },

  clear_documents_confirm: {
    template: `*Clear Documents?* 📄

I'll delete all {{docCount}} stored documents.

Your memory and conversations stay safe.

Say "yes" to confirm.`,
    variables: ["docCount"],
  },

  clear_documents_done: {
    template: `*Documents Cleared* 🧹

All files deleted. Send me new ones anytime.`,
    variables: [],
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

  clear_everything_done: {
    template: `*Complete Reset* 🧹

Everything cleared. Your account and credits are still here.

Fresh start! 👋`,
    variables: [],
  },

  // === Heartbeat ===
  heartbeat_alert: {
    template: `{{message}}`,
    variables: ["message"],
  },

  // === Billing ===
  payment_failed: {
    template: `*Payment Issue* ⚠️

Couldn't process your Pro payment. You still have Pro access while we retry.

Update your payment method:
{{updateUrl}}`,
    variables: ["updateUrl"],
  },

  subscription_canceled: {
    template: `*Subscription Canceled* 📋

You'll keep Pro until *{{endDate}}*.

After that: Basic plan (60 credits/month).

Changed your mind? Say "upgrade" anytime 💫`,
    variables: ["endDate"],
  },

  // === Language ===
  language_detected: {
    template: `{{confirmMessage}} ✅`,
    variables: ["confirmMessage"],
  },
} as const;
```

### 12. Landing Page (ghali.ae)
- Single-page, no web chat — WhatsApp is the only product
- Goal: convert visitors → WhatsApp conversation (CTA: "Message Ghali on WhatsApp")
- Elegant, minimalist design. Mobile-first.
- SEO optimized: meta tags, Open Graph, structured data, fast load (<2s)
- Colors: Navy `hsl(222, 47%, 11%)` + Orange `#f97316`
- Sections: Hero (tagline + WhatsApp CTA) → What Ghali Can Do (3-4 bullets) → How It Works (3 steps) → FAQ → Footer
- **Legal pages (required):**
  - `/privacy` — Privacy Policy
  - `/terms` — Terms of Service
  - Both branded under **SAHEM DATA TECHNOLOGY** (registered in Dubai, UAE)
  - Address: Villa 49, Street 38B, Barsha 2, Dubai, UAE
  - Contact: support@ghali.ae
  - Governing law: UAE, disputes in Dubai courts
  - Privacy covers: data collected (phone, messages, documents, usage), AI processing (Google, Anthropic, OpenAI), no selling data, user rights (access, delete, export), PostHog analytics, data retention
  - Terms covers: credit system (Basic/Pro), acceptable use, AI limitations disclaimer, content ownership (user owns their content + AI output), third-party services, limitation of liability
  - Footer links to both pages from landing page
- No Clerk auth needed. No dashboard. No web chat.
- Static/SSG — minimal client-side JS (just PostHog + WhatsApp link)
- **PostHog analytics:** page views, CTA clicks, UTM tracking, conversion funnel

### 13. Heartbeat (Proactive Check-ins)
- Convex scheduled function runs periodically per user (configurable interval, default 24h)
- Checks: pending reminders, follow-ups, anything the agent noted to revisit
- If something needs attention → send WhatsApp message
- If nothing → skip silently
- Respect active hours (don't message at 3am)
- Store heartbeat config per user: interval, activeHoursStart, activeHoursEnd, timezone

### 14. Personality (SOUL) + User Files
- **Per-user files** (stored in `userFiles` table, loaded every turn):
  - `memory` — agent writes facts, preferences, history ("prefers Arabic", "works in finance")
  - `personality` — two-layer system (see below)
  - `heartbeat` — checklist for periodic proactive messages ("remind gym 7am", "check report Mondays")
- **Agent tools** to update files:
  - `updateMemory(content)` — rewrite memory file
  - `updatePersonality(content)` — update user layer of personality file only
  - `updateHeartbeat(content)` — rewrite heartbeat file
- Users edit naturally: "remember I like coffee at 7am" → agent calls `updateMemory`
- Web UI: markdown editor for each file (direct editing)
- Max 10KB per file — keeps context small

### 15. Admin Access

**WhatsApp admin (MVP — build first):**
- `isAdmin: boolean` field on users table
- Set manually in Convex dashboard (or via seed script) for specific phone numbers
- Agent checks admin flag before allowing admin commands
- Add to system block: "If user is admin, allow admin commands. Never reveal admin commands to non-admin users."

**Admin commands (via WhatsApp):**
- `admin stats` → total users, active today/week/month, new signups today
- `admin revenue` → Pro subscribers count, MRR, upgrades/cancellations this month
- `admin credits` → credits consumed today, breakdown by model (via PostHog)
- `admin top users` → 10 most active users this week (anonymized or by name)
- `admin search +971...` → specific user: credits, tier, last active, signup date
- `admin grant +971... pro` → manually upgrade a user
- `admin grant +971... credits 100` → add bonus credits
- `admin broadcast "message"` → send message to all users (with confirmation)

**Web dashboard (V2 — after MVP):**
- `/admin` route on ghali.ae, Clerk auth + admin role check
- PostHog embeds for visual analytics
- User management table with search
- Revenue and usage charts (powered by PostHog)

**Personality: Two-Layer Architecture**

The personality file has two blocks. System block loads first (hardcoded, never shown to user, can't be overridden). User block layers on top (customizable via conversation).

**SYSTEM BLOCK (readonly — Ghali's core DNA):**
```
- Be helpful, honest, and concise. No filler words ("Great question!", "I'd be happy to help!").
- Never generate harmful, illegal, or abusive content. Refuse politely.
- Privacy-first: never share one user's data, conversations, or documents with another.
- Be accurate with numbers and data. Say "I don't know" rather than guess.
- Respond in the user's language (auto-detect from their messages).
- Be credit-aware: use Flash for most tasks, only escalate when genuinely needed.
- Deliver template messages exactly as formatted (credits, billing, system messages).
- Always identify as Ghali when asked. Never pretend to be human.
- Follow the user's off-limits preferences for proactive topics, but still answer
  direct questions about those topics. ("Don't bring up diet" means don't proactively
  mention it, but if they ask "what should I eat before a marathon?" — answer normally.)
```

**USER BLOCK (editable — their Ghali, their way):**
```
# Preferences
- Tone: casual
- Name: call me Abu Ahmad
- Language: always Arabic
- Verbosity: keep it brief
- Expertise: explain like I'm an expert
- Emoji: minimal

# Interests
- Cooking, football (Al Ain fan), Python programming

# Off-limits (don't bring up proactively)
- Politics, diet advice
```

**How users customize — through conversation, not forms:**
- "Be more formal with me" → agent updates tone in user block
- "Call me doc" → agent updates name
- "Stop using so many emojis" → agent updates emoji preference
- "Don't bring up politics" → agent adds to off-limits
- "Actually, you can talk about politics" → agent removes from off-limits

The user never sees "personality file" — it just feels like training a person.
The system block is invisible. Users only see their preferences in "my settings" on web UI.

**Proactive memory capture (critical for user retention):**
- The agent doesn't wait to be told "remember this" — it actively listens and captures:
  - **Name** — first mention, store immediately
  - **Language** — detect from first message, adapt instantly
  - **Age/birthday** — if mentioned in conversation
  - **Location/timezone** — from context clues or when asked
  - **Interests** — topics they ask about repeatedly (cooking, football, coding, etc.)
  - **Work/role** — what they do, industry, company
  - **Family** — kids, spouse, if naturally shared
  - **Preferences** — communication style, favorite topics, things they dislike
- After every conversation, the agent reviews what it learned and updates the memory file
- Next conversation starts with full context — user feels *known*, not like starting over
- This is Ghali's competitive advantage: the more you use it, the better it gets

**Implementation — Agent Instructions (include in system prompt):**
```
You are Ghali, a personal AI assistant on WhatsApp.

MEMORY RULES (critical):
- You have a memory file for this user. It's loaded in your context above.
- After EVERY response, reflect: did you learn anything new about this user?
  - Their name, age, birthday, location, timezone
  - Their language preference (detect from how they write)
  - Their job, industry, company
  - Their interests (topics they ask about)
  - Their family (spouse, kids, if naturally shared)
  - Their preferences (formal/casual, topics they like/dislike)
  - Upcoming events, travel plans, deadlines they mention
- If yes → call updateMemory to append the new facts. Don't rewrite — append.
- If no → don't call updateMemory (save tokens).
- NEVER ask "should I remember this?" — just remember it silently.
- Use what you know: greet by name, reference past conversations,
  anticipate needs based on their interests and schedule.

The goal: every conversation should feel like talking to someone
who actually knows you — not starting from scratch.
```

**Memory file format (example after 5 conversations):**
```markdown
# User Memory
- Name: Ahmad
- Language: Arabic (Gulf dialect), comfortable in English too
- Location: Abu Dhabi, UAE (GMT+4)
- Work: Software engineer at ADNOC
- Interests: football (Al Ain fan), cooking, Python programming
- Family: married, 2 kids (daughter 5, son 3)
- Preferences: casual tone, prefers Arabic for personal topics
- Travel: planning Türkiye trip in April 2026
- Notes: asked about intermittent fasting twice — likely trying it
```

---

## Database Schema (Convex)

```typescript
// users table
{
  phone: string,          // +971XXXXXXXXX
  name?: string,          // WhatsApp profile name
  language: string,       // "en" | "ar" | auto-detected
  timezone: string,       // "Asia/Dubai"
  tier: string,           // "basic" | "pro"
  isAdmin: boolean,       // admin access for reports + user management
  credits: number,        // remaining credits this cycle
  creditsResetAt: number, // next reset timestamp
  createdAt: number,
}

// userFiles table — per-user markdown files (OpenClaw-inspired)
// Each user gets 3 files. The agent reads them every turn and can update them via tools.
// Max 10KB per file. Raw markdown — flexible, no schema migrations needed.
{
  userId: Id<"users">,
  filename: string,       // "memory" | "personality" | "heartbeat"
  content: string,        // raw markdown
  updatedAt: number,
}
// "memory" — long-term memory. Agent writes: preferences, facts, history.
//   e.g. "Prefers Arabic. Works in finance. Has 2 kids. Reminded about dentist."
// "personality" — how the agent behaves with this user.
//   e.g. "Formal tone. Always greet with السلام عليكم. Use Arabic for replies."
//   Defaults to Ghali's base personality if empty.
// "heartbeat" — what to check on periodic heartbeats.
//   e.g. "- Remind about gym at 7am\n- Check if quarterly report is due"
//
// Users edit via natural language:
//   "remember I like coffee at 7am" → agent updates memory file
//   "be more casual with me" → agent updates personality file
//   "remind me every Monday to call mom" → agent updates heartbeat file
// Web UI: direct markdown editor for each file.

// usage table — removed (tracking deferred to PostHog)

// scheduledJobs table (for heartbeat + reminders)
{
  userId: Id<"users">,
  kind: "heartbeat" | "reminder" | "followup",
  payload: string,
  runAt: number,
  status: "pending" | "done" | "cancelled",
}
```

Agent threads and messages are managed by `@convex-dev/agent` (no custom tables needed).
RAG documents managed by `@convex-dev/rag`.

---

## Convex Reference Links

Read these before building:

- **Agent quickstart:** https://docs.convex.dev/agents
- **Agent usage & patterns:** https://docs.convex.dev/agents/agent-usage
- **Threads:** https://docs.convex.dev/agents/threads
- **Tools:** https://docs.convex.dev/agents/tools
- **Context & RAG:** https://docs.convex.dev/agents/context
- **Streaming:** https://docs.convex.dev/agents/streaming
- **Usage tracking:** https://docs.convex.dev/agents/usage-tracking *(not used — deferred to PostHog)*
- **Rate limiting:** https://docs.convex.dev/agents/rate-limiting
- **RAG component:** https://www.convex.dev/components/rag
- **Agent GitHub:** https://github.com/get-convex/agent
- **RAG GitHub:** https://github.com/get-convex/rag
- **Convex + Clerk:** https://docs.convex.dev/auth/clerk
- **Convex scheduled functions:** https://docs.convex.dev/scheduling/scheduled-functions
- **Convex cron jobs:** https://docs.convex.dev/scheduling/cron-jobs

---

## Development Rules

1. **pnpm** — use pnpm for all package management (not npm/yarn)
2. **Strict TDD** — write test first, see it fail, implement, see it pass, commit
3. **Feature-by-feature** — build in the order listed above
4. **Extract pure functions** for testability (`canAfford()`, `calculateCost()`, `splitMessage()`)
5. **Vitest** for all tests
6. **No premature optimization** — get it working, then improve

---

## Environment Variables

```
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=+971582896090
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
CLERK_WEBHOOK_SIGNING_SECRET=
CLOUDCONVERT_API_KEY=
```
