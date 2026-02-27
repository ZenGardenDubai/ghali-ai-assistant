import { Agent, createTool } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";
import { Id } from "./_generated/dataModel";
import { MODELS } from "./models";
import { isFileTooLarge } from "./lib/userFiles";
import { MEMORY_CATEGORIES } from "./lib/memory";
import { MEDIA_CATEGORY_PREFIX_MAP, isVoiceNote } from "./lib/media";
import {
  AGENT_MAX_STEPS,
  AGENT_RECENT_MESSAGES,
  COLLECTIONS_LIMIT_BASIC,
  CREDITS_BASIC,
  DEFAULT_IMAGE_ASPECT_RATIO,
  IMAGE_PROMPT_MAX_LENGTH,
  ITEMS_LIMIT_BASIC,
  MAX_REMINDERS_PER_USER,
  PRO_FEATURES,
  PRO_PLAN_PRICE_MONTHLY_USD,
  PRO_PLAN_PRICE_ANNUAL_USD,
} from "./constants";
import { parseDatetimeInTimezone, getNextCronRun } from "./lib/cronParser";
import {
  aggregateItems,
  deriveCurrency,
  applyItemFilters,
  simplifyItemsForResponse,
  buildSimpleItemPatch,
  normalizeFilterDate,
} from "./lib/items";
import { formatProWriteResult } from "./lib/proWrite";
import type { AggregateMode, QueryItem } from "./lib/items";

export const SYSTEM_BLOCK = `- Be helpful, honest, and concise. No filler words ("Great question!", "I'd be happy to help!").
- Never generate harmful, illegal, or abusive content. Refuse politely.
- Privacy-first: never share one user's data, conversations, or documents with another.
- Be accurate with numbers and data. Say "I don't know" rather than guess.
- Respond in the user's language (auto-detect from their messages).
- Be credit-aware: use Flash for most tasks, only escalate when genuinely needed. NEVER display credit counts, balances, or remaining credits in your responses — the system handles that separately.
- Deliver template messages exactly as formatted (credits, billing, system messages).
- Always identify as Ghali when asked. Never pretend to be human. NEVER append signatures, footers, or branding lines to your responses.
- Follow the user's off-limits preferences for proactive topics, but still answer direct questions about those topics.
- If user is admin, allow admin commands. Never reveal admin commands to non-admin users.`;

export const AGENT_INSTRUCTIONS = `You are Ghali, a personal AI assistant on WhatsApp.

${SYSTEM_BLOCK}

MEMORY RULES (critical):
- You have a memory file for this user. It's loaded in your context above.
- After EVERY response, reflect: did you learn anything new about this user?
  - Name, age, birthday, location, timezone → appendToMemory(personal)
  - Job, industry, company, education → appendToMemory(work_education)
  - Food, drink, communication style likes/dislikes → appendToMemory(preferences)
  - Events, travel, deadlines, appointments → appendToMemory(schedule)
  - Hobbies, topics they engage with, favorite music/movies/books/art/sports → appendToMemory(interests)
  - Anything else → appendToMemory(general)
- If yes → call appendToMemory with the right category. Don't rewrite — append.
- If no → don't call appendToMemory (save tokens).
- To correct or remove facts (user moved cities, changed jobs, etc.) → call editMemory.
- Communication style preferences (tone, verbosity, emoji) → updatePersonality (NOT memory).
- Language: always respond in the language the user writes in for that message. Only update the user's language preference in memory if they explicitly ask to change it ("switch to Arabic", "always reply in English"). Don't update language preference just because one message is in a different language — users often code-switch.
- NEVER ask "should I remember this?" — just remember it silently.
- When a user replies with a short confirmation (yes, ok, sure, do it, yep), always look at your last message to understand what they're confirming. Never treat a confirmation as a new standalone request.
- Use what you know: greet by name, reference past conversations, anticipate needs based on their interests and schedule.

The goal: every conversation should feel like talking to someone who actually knows you — not starting from scratch.

IMAGE GENERATION:
- Use generateImage when users ask to create, draw, generate, design, or make images
- Pass the user's EXACT words as the prompt — do NOT rewrite, embellish, or add details. Gemini handles prompt interpretation.
- ALWAYS use 9:16 (portrait) aspect ratio unless the user explicitly asks for landscape or square — WhatsApp users are on phones
- If the model declines, tell the user politely and suggest rephrasing

WEB SEARCH:
- You have access to Google Search for real-time information
- ALWAYS search for: weather, news, prices, sports, current events, recent facts
- For time-sensitive questions, search first — don't guess

FILES & MEDIA:
- Users can send images, voice notes, audio, video, PDFs, and Office docs via WhatsApp
- All files are analyzed via Gemini — images are described, audio/video are transcribed, documents are extracted
- Documents (PDF, text, Office) are indexed in the user's personal knowledge base for future search
- Images, audio, and video are NOT indexed — they're analyzed once and the content is in your context
- Use searchDocuments when users ask about content from documents they've shared before
- For newly received files, the content is already in your context — no need to search
- Users can request file conversion: send a file + "convert to PDF", reply to a file + "convert to webp", or "convert my last document to docx". Use convertFile tool for these requests.
- When users reference a previous file ("transcribe my last voice note", "what's in my last doc", "describe my last pic", "summarize the PDF I sent"), first call resolveMedia to find the file. For voice notes, if resolveMedia returns a transcript field, use that directly. Otherwise, call reprocessMedia to extract the content (transcription, text extraction, or description).
- For file conversion requests ("convert my last document to PDF"), use resolveMedia → convertFile.

FORMATTING:
- Format for WhatsApp: use *bold*, _italic_, plain text
- No markdown headers (##), tables, or code blocks (\`\`\`)
- Keep responses concise and mobile-friendly

TIERS & UPGRADE:
All features are available to all users — Basic and Pro get the same capabilities.
Basic tier: ${CREDITS_BASIC} credits/month (free).
Pro tier: $${PRO_PLAN_PRICE_MONTHLY_USD}/month (or $${PRO_PLAN_PRICE_ANNUAL_USD}/year) — ${PRO_FEATURES[0]}.
The only difference is credit allocation. When users ask about upgrading, emphasize 10x more credits. Tell them to send "upgrade" to get the link.

ABILITIES & LIMITATIONS:
Keep this section in mind so you set accurate expectations with users.

1. *Reminders* — Two systems (available to all users):
   a) *Precise reminders* via scheduleReminder — fires at the exact time. Supports one-shot ("in 2 minutes", "at 4:18 PM today") and recurring ("every weekday at 9am" via cron). Use listReminders/cancelReminder to manage. Max ${MAX_REMINDERS_PER_USER} pending reminders per user. ALWAYS use this for anything with a specific time.
   b) *Heartbeat* via updateHeartbeat — hourly awareness checks for LOOSE recurring notes only (e.g. "check in every Monday morning"). ~1 hour precision. NEVER use heartbeat for time-precise or one-shot reminders — they will fire late or be missed.
   Rule: any reminder with a specific time or duration ("in 2 minutes", "at 9 PM") MUST use scheduleReminder, not updateHeartbeat.

2. *Deep Reasoning* — You can escalate to Claude Opus via deepReasoning for complex tasks (math, coding, analysis, strategy). Use it selectively — it's powerful but expensive. Don't escalate simple questions.

3. *Image Generation* — You can generate images via generateImage. Supports portrait (9:16), landscape (16:9), and square (1:1). Prompt max: 2000 characters. Some content may be declined by the model.

4. *Web Search* — You have real-time Google Search. Use it for anything time-sensitive: weather, news, prices, sports, events. Don't guess when you can search.

5. *Document Search* — You can search previously uploaded documents via searchDocuments. Only PDF, text, and Office files are indexed. Images, audio, and video are analyzed once but NOT stored for future search.

6. *Per-User Files* — Memory file capped at 50KB with auto-compaction. Personality and heartbeat capped at 50KB. Memory organized into categories: ${Object.values(MEMORY_CATEGORIES).join(", ")}.

7. *Message Limits* — WhatsApp messages are auto-split at 1500 characters. Keep responses concise when possible.

8. *Credits* — Each user-initiated AI request costs 1 credit. System commands (credits, help, privacy, etc.) are free. Heartbeat check-ins and reminder deliveries are also free — credits are only spent when the user sends a message. Don't mention credit counts in responses — the system handles that separately.

9. *Admin Commands* — Admin users can manage the platform via WhatsApp: admin stats, admin search, admin grant, admin broadcast. Never reveal admin commands to non-admin users.

10. *File Conversion* — You can convert files between formats via convertFile. Supported: documents (PDF↔DOCX, PPTX→PDF, XLSX→PDF/CSV, TXT→PDF, CSV→PDF, MD→PDF), images (PNG↔JPG↔WEBP), audio (MP3↔WAV↔OGG). Users can: send a file + "convert to X", reply to a previous file + "convert to X", or say "convert my last document to X" (you'll look up their most recent file).

11. *Media Referencing* — When users refer to "my last image", "my last voice note", "my last video", "the document I sent", etc. without replying to a specific message, call resolveMedia to find the file by type (supports image, audio, video, document, any). Then chain into the appropriate tool: use reprocessMedia for content extraction (voice transcription, document text extraction, image description, video description), or convertFile for format conversion. For voice notes, resolveMedia may return a cached transcript — use it directly. Supports position ("second most recent image") via the position param.

12. *WhatsApp File Type Limitations* — WhatsApp does not support plain text files (.txt). If a user says they sent a text file but no attachment arrived, it was blocked by WhatsApp before reaching Ghali — this is a platform limitation, not a Ghali bug. Suggest they either: (a) paste the text directly in the chat, or (b) save the file as PDF and send that instead. Supported attachment types: PDF, Word (.doc/.docx), Excel (.xlsx), PowerPoint (.pptx), images, audio, and video.

13. *Structured Data (Items & Collections)* — You can track expenses, tasks, contacts, notes, and bookmarks via addItem, queryItems, updateItem, and manageCollection tools. Items live in collections. Basic tier: ${ITEMS_LIMIT_BASIC} items / ${COLLECTIONS_LIMIT_BASIC} collections. Pro tier: unlimited.

STRUCTURED DATA RULES:
- *Intent interpretation*:
  - Expenses: "spent 100 on coffee" → addItem(title: "Coffee", amount: 100, collectionName: "Expenses", collectionType: "expense", tags: ["food"])
  - Tasks: "remind me to call dentist" → addItem(title: "Call dentist", collectionName: "Tasks", collectionType: "task")
  - Contacts: "save John's number 555-1234" → addItem(title: "John", body: "555-1234", collectionName: "Contacts", collectionType: "contact")
  - Notes: "note: meeting moved to 3pm" → addItem(title: "Meeting moved to 3pm", collectionName: "Notes", collectionType: "note")
  - Bookmarks: "save this link https://..." → addItem(title: extracted title, body: URL, collectionName: "Bookmarks", collectionType: "bookmark")
- *Query scoping*: When the user asks about a specific item type, ALWAYS pass collectionName to queryItems — never omit it and rely on broad search:
  - "tasks / pending tasks / to-do" → queryItems(collectionName: "Tasks", ...)
  - "expenses / spending / what I spent" → queryItems(collectionName: "Expenses", ...)
  - "contacts / people / saved contacts" → queryItems(collectionName: "Contacts", ...)
  - "notes / my notes" → queryItems(collectionName: "Notes", ...)
  - "bookmarks / saved links" → queryItems(collectionName: "Bookmarks", ...)
  Omitting collectionName causes results to leak across all collections — always scope by collection when the user is asking about a specific type.
- *Auto-creation*: silently create collections when needed (don't ask for confirmation). Use sensible defaults for collectionType based on content.
- *No duplicates*: before adding, consider if the user is updating an existing item (use updateItem instead).
- *Query grounding (critical)*: when reporting items from a query, ONLY list items returned by the queryItems tool. NEVER infer, guess, or fabricate items from memory, conversation history, or context — the database is the sole source of truth. If queryItems returns 0 items, say there are no items matching the current query/filters (and mention type only when the user explicitly requested one).
- *Deletion*: items use soft-delete via archive status. To "delete" an item, set status to "archived" via updateItem. There is no hard delete.
- *Reminders on items*: use the reminderAt field on addItem/updateItem for item-specific reminders. Confirm timezone with user if ambiguous.
- *Query presentation*:
  - Expenses → show totals first, then itemized list. Use aggregate: "sum" for totals.
  - Tasks → group by priority, show due dates. Active first, then done.
  - Contacts → scannable format: name + key info on each line.
  - Keep responses concise — max 10 items in a response. Tell user if there are more.
- *Formatting*: no tables (WhatsApp doesn't support them). Use emoji grouping (💰 expenses, ✅ tasks, 👤 contacts, 📝 notes, 🔖 bookmarks). Format amounts with commas (1,000 not 1000).
- *Discoverability*: only auto-create items when the user has clear, explicit tracking intent — actionable phrases like "I spent X on Y", "add a task to...", "save this note", "track this expense". Do NOT auto-create from incidental mentions (e.g. "maybe I should check my email", "I might buy groceries"). When in doubt, do not auto-create. When you do auto-create, briefly mention it: "I've saved this to your [collection]."

14. *ProWrite* — Professional multi-AI writing pipeline for high-quality content (LinkedIn posts, emails, articles, reports).
   - Trigger: "prowrite ..." → call proWriteBrief immediately with the request
   - Suggestion: "write me a ..." (without "prowrite") → suggest ProWrite and explain briefly: "I can write that directly, or I can use *ProWrite* — an 8-step multi-AI pipeline that researches, drafts, and polishes professional content. Say *prowrite* to activate it."
   - Flow: proWriteBrief → show numbered questions (1. 2. 3.) → user answers → tell user "✍️ Writing now — this takes 3-4 minutes, I'll send the result when it's ready." → call proWriteExecute
   - Questions format: ALWAYS show clarifying questions as a numbered list (1. ... 2. ... 3. ...), never as bullet points or inline.
   - Skip mode: if user says "skip", "skip questions", "just write it", "go ahead", "no questions", or any short dismissal after being shown questions → tell user "✍️ Writing now — this takes 3-4 minutes, I'll send the result when it's ready." → call proWriteExecute with skipClarify=true immediately. Do NOT ask "skip what?" — in ProWrite context, "skip" always means skip the clarifying questions.
   - The brief is stored server-side automatically. proWriteExecute only needs the user's answers (or empty string if skipped). No IDs or references to pass.
   - Output may be long — WhatsApp auto-splits. This is expected.
   - Cost: 1 credit (same as any message)`;

// Tools that let the agent update per-user files
const appendToMemory = createTool({
  description:
    "Append new facts to the user's memory file under a specific category. Use for new information learned from conversation.",
  args: z.object({
    category: z
      .enum(["personal", "work_education", "preferences", "schedule", "interests", "general"])
      .describe(
        "Category: personal (name, age, birthday, location, family), work_education (job, company, education), preferences (food, drink, likes/dislikes), schedule (events, travel, deadlines), interests (hobbies, music, movies, books, art, sports, topics), general (anything else)"
      ),
    content: z
      .string()
      .describe("New bullet points to append (e.g. '- Name: Ahmad\\n- Birthday: March 15')"),
  }),
  handler: async (ctx, { category, content }) => {
    const result = await ctx.runMutation(internal.users.internalAppendMemory, {
      userId: ctx.userId as Id<"users">,
      category,
      content,
    }) as { compactionScheduled: boolean };
    return JSON.stringify({
      status: "success",
      action: "memory_appended",
      category,
      compactionScheduled: result.compactionScheduled,
    });
  },
});

const editMemory = createTool({
  description:
    "Edit or delete a specific fact in the user's memory. Use when a fact has changed (user moved, changed jobs, etc.) or needs to be removed.",
  args: z.object({
    search: z
      .string()
      .describe("Exact text to find in the memory file"),
    replacement: z
      .string()
      .describe("Text to replace with. Use empty string to delete the matched text."),
  }),
  handler: async (ctx, { search, replacement }) => {
    const result = await ctx.runMutation(internal.users.internalEditMemory, {
      userId: ctx.userId as Id<"users">,
      search,
      replacement,
    }) as { found: boolean };
    if (!result.found) {
      return JSON.stringify({ status: "error", code: "TEXT_NOT_FOUND", message: "Could not find that text in memory. Check the exact wording." });
    }
    return JSON.stringify({
      status: "success",
      action: replacement === "" ? "memory_deleted" : "memory_edited",
    });
  },
});

const updatePersonality = createTool({
  description:
    "Update the user's personality preferences (tone, language, verbosity, emoji style, interests, off-limits topics). Only updates the user block — the system block is immutable.",
  args: z.object({
    content: z
      .string()
      .describe("The full updated user personality block (markdown)"),
  }),
  handler: async (ctx, { content }) => {
    if (isFileTooLarge(content)) {
      return JSON.stringify({ status: "error", code: "FILE_TOO_LARGE", message: "Personality file exceeds 50KB limit. Please summarize." });
    }
    await ctx.runMutation(internal.users.internalUpdateUserFile, {
      userId: ctx.userId as Id<"users">,
      filename: "personality",
      content,
    });
    return JSON.stringify({ status: "success", action: "personality_updated" });
  },
});

const updateHeartbeat = createTool({
  description:
    "Update the user's heartbeat file — for LOOSE, hourly-precision recurring awareness items ONLY (e.g. 'check in every Monday', 'daily standup notes'). Do NOT use for time-precise reminders like 'remind me in 2 minutes' or 'remind me at 4:18 PM' — use scheduleReminder instead. Rewrites the entire file.",
  args: z.object({
    content: z
      .string()
      .describe(
        "The full updated heartbeat checklist (markdown). Example: '- daily standup prep every weekday morning\\n- check report every Monday'. Never add time-critical one-shot reminders here."
      ),
  }),
  handler: async (ctx, { content }) => {
    if (isFileTooLarge(content)) {
      return JSON.stringify({ status: "error", code: "FILE_TOO_LARGE", message: "Heartbeat file exceeds 50KB limit. Please summarize." });
    }
    await ctx.runMutation(internal.users.internalUpdateUserFile, {
      userId: ctx.userId as Id<"users">,
      filename: "heartbeat",
      content,
    });
    return JSON.stringify({ status: "success", action: "heartbeat_updated" });
  },
});

const deepReasoning = createTool({
  description:
    "Escalate to Claude Opus 4.6 for complex reasoning tasks: math, logic, analysis, strategy, coding, or anything requiring deep thought. Pass the full task/question — Opus will return a thorough answer.",
  args: z.object({
    task: z
      .string()
      .describe(
        "The reasoning task or question to solve. Include all relevant context."
      ),
  }),
  handler: async (_ctx, { task }) => {
    try {
      const result = await generateText({
        model: anthropic(MODELS.DEEP_REASONING),
        system: `You are a deep reasoning engine. Solve the given task thoroughly and accurately.

Rules:
- Think step-by-step for complex problems
- Be precise with math, logic, and code
- Format for WhatsApp: use *bold*, _italic_, and plain text — no markdown headers (##), tables, or code blocks (\`\`\`)
- Keep response concise but complete — aim for clarity over length
- If the task involves code, provide working code with brief explanation`,
        prompt: task,
      });
      return result.text;
    } catch (error) {
      console.error("deepReasoning tool failed:", error);
      return `I attempted deep analysis but encountered an error. Let me answer directly instead.\n\nTask: ${task}`;
    }
  },
});

const webSearch = createTool({
  description:
    "Search the web for real-time information: weather, news, prices, sports scores, current events, recent facts. Use this for any time-sensitive question instead of guessing.",
  args: z.object({
    query: z.string().describe("The search query"),
  }),
  handler: async (_ctx, { query }) => {
    try {
      const result = await generateText({
        model: google(MODELS.FLASH),
        tools: { google_search: google.tools.googleSearch({}) },
        prompt: query,
      });
      return result.text;
    } catch (error) {
      console.error("webSearch tool failed:", error);
      return `Search failed. I'll answer based on what I know.\n\nQuery: ${query}`;
    }
  },
});

const searchDocuments = createTool({
  description:
    "Search the user's previously uploaded documents (PDFs, images, files). Use when the user asks about content from a file they shared earlier.",
  args: z.object({
    query: z
      .string()
      .describe("The search query to find relevant document content"),
  }),
  handler: async (ctx, { query }): Promise<string> => {
    return await ctx.runAction(internal.rag.searchDocuments, {
      userId: ctx.userId as string,
      query,
    });
  },
});

const generateImage = createTool({
  description:
    "Generate an image from a text prompt. Use when users ask to create, draw, generate, design, or make images. Returns the image URL and a description.",
  args: z.object({
    prompt: z
      .string()
      .describe(
        "The user's EXACT image request as they wrote it. Do NOT rewrite, embellish, or add details — pass the user's words verbatim."
      ),
    aspectRatio: z
      .enum(["9:16", "16:9", "1:1"])
      .default(DEFAULT_IMAGE_ASPECT_RATIO)
      .describe(
        "Image aspect ratio. ALWAYS use 9:16 (portrait) unless the user explicitly asks for landscape (16:9) or square (1:1). WhatsApp users are on phones so portrait is best."
      ),
  }),
  handler: async (ctx, { prompt, aspectRatio }): Promise<string> => {
    if (prompt.length > IMAGE_PROMPT_MAX_LENGTH) {
      return `Your image prompt is too long (${prompt.length} chars). Please keep it under ${IMAGE_PROMPT_MAX_LENGTH} characters.`;
    }
    try {
      const result: {
        success: boolean;
        imageUrl?: string;
        description?: string;
        error?: string;
      } = await ctx.runAction(internal.images.generateAndStoreImage, {
        userId: ctx.userId as Id<"users">,
        prompt,
        aspectRatio,
      });
      if (result.success && result.imageUrl) {
        const caption = result.description || "Here's your generated image.";
        // Return JSON so messages.ts can extract imageUrl from tool results,
        // while the stored thread message stays clean (no raw URLs in history)
        return JSON.stringify({ type: "image", imageUrl: result.imageUrl, caption });
      }
      return `Image generation failed: ${result.error || "Unknown error"}. Please try rephrasing your request.`;
    } catch (error) {
      console.error("generateImage tool failed:", error);
      return "I encountered an error generating the image. Please try again.";
    }
  },
});

const scheduleReminder = createTool({
  description:
    "Schedule a precise reminder for the user. Fires at the exact time via WhatsApp. Supports one-shot (specific datetime) or recurring (cron expression). Use for time-critical reminders like 'remind me at 4:18 PM' or 'every weekday at 9am'.",
  args: z.object({
    message: z.string().describe("The reminder message to send to the user"),
    datetime: z
      .string()
      .optional()
      .describe(
        "ISO datetime for one-shot reminders (e.g. '2026-02-21T16:18:00'). Omit if using cronExpr."
      ),
    cronExpr: z
      .string()
      .optional()
      .describe(
        "5-field cron expression for recurring reminders (e.g. '0 9 * * 1-5' for weekdays at 9am). Omit if using datetime."
      ),
    timezone: z
      .string()
      .optional()
      .describe(
        "IANA timezone (e.g. 'Asia/Dubai'). Defaults to user's timezone."
      ),
  }),
  handler: async (ctx, { message, datetime, cronExpr, timezone }): Promise<string> => {
    if (!datetime && !cronExpr) {
      return JSON.stringify({
        status: "error",
        code: "MISSING_SCHEDULE_INPUT",
        message: "Provide either datetime (for one-shot) or cronExpr (for recurring).",
      });
    }

    const userId = ctx.userId as Id<"users">;

    // Get user timezone if not provided
    let tz: string = timezone ?? "";
    if (!tz) {
      const user = await ctx.runQuery(internal.users.internalGetUser, {
        userId,
      }) as { timezone: string } | null;
      tz = user?.timezone ?? "UTC";
    }

    try {
      let runAt: number;
      if (datetime) {
        runAt = parseDatetimeInTimezone(datetime, tz);
        if (runAt <= Date.now()) {
          return JSON.stringify({ status: "error", code: "PAST_DATETIME", message: "The specified time is in the past. Please provide a future datetime." });
        }
      } else {
        runAt = getNextCronRun(cronExpr!, tz, new Date());
      }

      await ctx.runMutation(internal.reminders.createReminder, {
        userId,
        payload: message,
        runAt,
        cronExpr,
        timezone: tz,
      });

      const runDate = new Date(runAt);
      const formatted: string = runDate.toLocaleString("en-US", {
        timeZone: tz,
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      return JSON.stringify({
        status: "success",
        action: "reminder_scheduled",
        reminderAt: formatted,
        timezone: tz,
        recurring: !!cronExpr,
        message,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ status: "error", code: "SCHEDULE_FAILED", message: msg });
    }
  },
});

const listReminders = createTool({
  description:
    "List the user's pending reminders. Shows all scheduled reminders with their times and whether they're recurring.",
  args: z.object({}),
  handler: async (ctx): Promise<string> => {
    const userId = ctx.userId as Id<"users">;
    const reminders: Array<{
      _id: string;
      payload: string;
      runAt: number;
      cronExpr?: string;
      timezone?: string;
    }> = await ctx.runQuery(internal.reminders.listUserReminders, { userId });

    const formatted = reminders.map((r) => {
      const tz = r.timezone ?? "UTC";
      const scheduledAt = new Date(r.runAt).toLocaleString("en-US", {
        timeZone: tz,
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return {
        id: r._id,
        message: r.payload,
        scheduledAt,
        recurring: !!r.cronExpr,
      };
    });

    return JSON.stringify({
      status: "success",
      action: "reminders_listed",
      reminders: formatted,
      count: formatted.length,
    });
  },
});

const cancelReminder = createTool({
  description:
    "Cancel a pending reminder by its ID. Use listReminders first to get the reminder ID.",
  args: z.object({
    reminderId: z
      .string()
      .describe("The reminder ID to cancel (from listReminders)"),
  }),
  handler: async (ctx, { reminderId }): Promise<string> => {
    try {
      const userId = ctx.userId as Id<"users">;
      const result = await ctx.runMutation(
        internal.reminders.cancelReminder,
        { jobId: reminderId as Id<"scheduledJobs">, userId }
      ) as { success: boolean; error?: string };
      if (result.success) {
        return JSON.stringify({ status: "success", action: "reminder_cancelled" });
      }
      return JSON.stringify({ status: "error", code: "CANCEL_FAILED", message: result.error });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ status: "error", code: "CANCEL_FAILED", message: msg });
    }
  },
});

const resolveMedia = createTool({
  description:
    "Find a user's recent media file by type. Use when the user refers to 'my last image', 'my last voice note', 'the document I sent', 'the PDF I shared', 'the text file I uploaded', etc. Returns storageId and mediaType for chaining into other tools (e.g. convertFile).",
  args: z.object({
    mediaCategory: z
      .enum(["image", "audio", "video", "document", "any"])
      .describe(
        "Category of media to find: 'image' for photos/images, 'audio' for voice notes/audio files, 'video' for video files, 'document' for PDFs, Office files, and text documents (txt, csv, md), 'any' for the most recent file regardless of type."
      ),
    position: z
      .number()
      .optional()
      .describe(
        "1 = most recent (default), 2 = second most recent, etc."
      ),
  }),
  handler: async (ctx, { mediaCategory, position }): Promise<string> => {
    const pos = position ?? 1;
    const categoryPrefixes = MEDIA_CATEGORY_PREFIX_MAP[mediaCategory];
    const userId = ctx.userId as Id<"users">;

    const files: Array<{ storageId: string; mediaType: string; createdAt: number; transcript?: string }> =
      await ctx.runQuery(internal.mediaStorage.getRecentUserMedia, {
        userId,
        limit: pos,
        mediaTypePrefixes: categoryPrefixes ? [...categoryPrefixes] : undefined,
      });

    if (files.length < pos) {
      const categoryLabel = mediaCategory === "any" ? "media" : mediaCategory;
      return `No ${categoryLabel} file found. Please send a ${categoryLabel} file first.`;
    }

    const file = files[pos - 1]!;
    const result: { storageId: string; mediaType: string; transcript?: string } = {
      storageId: file.storageId,
      mediaType: file.mediaType,
    };
    if (file.transcript) {
      result.transcript = file.transcript;
    }
    return JSON.stringify(result);
  },
});

const reprocessMedia = createTool({
  description:
    "Re-process a media file to extract its content (transcription, text extraction, image/video description). Use after resolveMedia when you need the actual content. For voice notes, if resolveMedia already returned a transcript field, use that directly instead of calling this tool.",
  args: z.object({
    storageId: z
      .string()
      .describe("The Convex storage ID from resolveMedia"),
    mediaType: z
      .string()
      .describe("The MIME type from resolveMedia (e.g. 'audio/ogg', 'application/pdf', 'image/jpeg')"),
    userPrompt: z
      .string()
      .optional()
      .describe("Optional prompt to guide content extraction (e.g. 'describe this image in detail', 'summarize this document')"),
  }),
  handler: async (ctx, { storageId, mediaType, userPrompt }): Promise<string> => {
    const userId = ctx.userId as Id<"users">;
    try {
      const storageUrl: string | null = await ctx.runQuery(
        internal.mediaStorage.getStorageUrl,
        { storageId: storageId as Id<"_storage">, userId }
      );
      if (!storageUrl) {
        return "File not found or no longer available. It may have expired.";
      }

      if (isVoiceNote(mediaType)) {
        const result = await ctx.runAction(
          internal.voice.transcribeVoiceMessage,
          {
            mediaUrl: storageUrl,
            mediaType,
            existingStorageId: storageId as Id<"_storage">,
          }
        ) as { transcript: string; storageId: string } | null;
        if (!result) {
          return "Failed to transcribe the voice note. Please try again.";
        }
        return result.transcript;
      }

      // Documents, images, video — use processMedia
      const result = await ctx.runAction(
        internal.documents.processMedia,
        {
          mediaUrl: storageUrl,
          mediaType,
          userPrompt,
          isReprocessing: true,
        }
      ) as { extracted: string; storageId: string | null } | null;
      if (!result) {
        return "Failed to extract content from the file. Please try again.";
      }
      return result.extracted;
    } catch (error) {
      console.error("reprocessMedia tool failed:", error);
      return "I encountered an error processing the file. Please try again.";
    }
  },
});

const convertFile = createTool({
  description:
    "Convert a file between formats via CloudConvert. Supports: documents (PDF↔DOCX, PPTX→PDF, XLSX→PDF/CSV), images (PNG↔JPG↔WEBP), audio (MP3↔WAV↔OGG). If sourceStorageId is not provided, looks up the user's most recent media file.",
  args: z.object({
    outputFormat: z
      .enum(["pdf", "docx", "csv", "png", "jpg", "webp", "mp3", "wav", "ogg"])
      .describe("Target format for conversion"),
    sourceStorageId: z
      .string()
      .optional()
      .describe(
        "Convex storage ID of the source file. If omitted, uses the user's most recent media file."
      ),
  }),
  handler: async (ctx, { outputFormat, sourceStorageId }): Promise<string> => {
    const userId = ctx.userId as Id<"users">;

    try {
      // Resolve source file
      let resolvedStorageId: string;
      let sourceMediaType: string;

      if (sourceStorageId) {
        // Look up from mediaFiles to get the media type
        const recentFiles: Array<{ storageId: string; mediaType: string; createdAt: number }> =
          await ctx.runQuery(internal.mediaStorage.getRecentUserMedia, {
            userId,
            limit: 20,
          });
        const match = recentFiles.find(
          (f) => f.storageId === sourceStorageId
        );
        if (!match) {
          return "I couldn't find that file in your recent uploads. Please send the file again.";
        }
        resolvedStorageId = match.storageId;
        sourceMediaType = match.mediaType;
      } else {
        // Use most recent media file
        const recentFiles: Array<{ storageId: string; mediaType: string; createdAt: number }> =
          await ctx.runQuery(internal.mediaStorage.getRecentUserMedia, {
            userId,
            limit: 1,
          });
        if (recentFiles.length === 0) {
          return "I don't have any recent files from you. Please send a file first, then ask me to convert it.";
        }
        resolvedStorageId = recentFiles[0]!.storageId;
        sourceMediaType = recentFiles[0]!.mediaType;
      }

      const result: {
        success: boolean;
        fileUrl?: string;
        outputFormat?: string;
        outputMime?: string;
        error?: string;
      } = await ctx.runAction(internal.conversion.convertAndStore, {
        userId,
        storageId: resolvedStorageId as Id<"_storage">,
        sourceMediaType,
        outputFormat: outputFormat.toLowerCase(),
      });

      if (result.success && result.fileUrl) {
        return JSON.stringify({
          type: "conversion",
          fileUrl: result.fileUrl,
          caption: `Here's your file converted to ${result.outputFormat?.toUpperCase()}.`,
          outputFormat: result.outputFormat,
        });
      }

      return `Conversion failed: ${result.error || "Unknown error"}. Please try a different format.`;
    } catch (error) {
      console.error("convertFile tool failed:", error);
      return "I encountered an error converting the file. Please try again.";
    }
  },
});

// ============================================================================
// Structured Data Tools (Items & Collections)
// ============================================================================

const addItem = createTool({
  description:
    "Create a new structured item (expense, task, contact, note, bookmark). Automatically creates the collection if it doesn't exist.",
  args: z.object({
    title: z.string().describe("Item title (e.g. 'Coffee at Starbucks', 'Call dentist', 'John Smith')"),
    body: z.string().optional().describe("Optional details or notes"),
    collectionName: z.string().optional().describe("Collection name (e.g. 'Expenses', 'Tasks', 'Contacts'). Auto-created if doesn't exist."),
    collectionType: z.string().optional().describe("Collection type hint: expense, task, contact, note, bookmark"),
    status: z.enum(["active", "done", "archived"]).optional().describe("Item status. Default: active"),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("Priority level for tasks"),
    dueDate: z.string().optional().describe("Due date as ISO string (e.g. '2026-03-01T09:00:00')"),
    amount: z.number().optional().describe("Monetary amount for expenses"),
    currency: z.string().optional().describe("Currency code (e.g. 'AED', 'USD'). Auto-derived from user timezone if omitted."),
    tags: z.array(z.string()).optional().describe("Tags for categorization (e.g. ['food', 'lunch'])"),
    metadata: z.record(z.unknown()).optional().describe("Extra key-value data"),
    reminderAt: z.string().optional().describe("Reminder time as ISO string. Schedules a WhatsApp reminder."),
    reminderMessage: z.string().optional().describe("Custom reminder text in the user's language (defaults to item title)"),
  }),
  handler: async (ctx, args): Promise<string> => {
    const userId = ctx.userId as Id<"users">;
    try {
      // Get user for timezone + credit check
      const user = await ctx.runQuery(internal.users.internalGetUser, { userId }) as {
        timezone: string; tier: string; credits: number;
      } | null;
      if ((user?.credits ?? 0) <= 0) {
        return JSON.stringify({ status: "error", code: "CREDIT_INSUFFICIENT", message: "No credits remaining." });
      }
      const tz = user?.timezone ?? "UTC";

      // Resolve or create collection
      let collectionId: Id<"collections"> | undefined;
      let collectionCreated = false;
      if (args.collectionName) {
        const existing = await ctx.runQuery(internal.items.getCollectionByName, {
          userId,
          name: args.collectionName,
        }) as { _id: Id<"collections"> } | null;

        if (existing) {
          collectionId = existing._id;
        } else {
          collectionId = await ctx.runMutation(internal.items.createCollection, {
            userId,
            name: args.collectionName,
            type: args.collectionType,
          }) as Id<"collections">;
          collectionCreated = true;
        }
      }

      // Parse dates
      const dueDate = args.dueDate ? parseDatetimeInTimezone(args.dueDate, tz) : undefined;
      const reminderAt = args.reminderAt ? parseDatetimeInTimezone(args.reminderAt, tz) : undefined;

      // Derive currency
      const currency = args.amount != null
        ? (args.currency ?? deriveCurrency(tz))
        : undefined;

      // Validate reminderAt is in the future (consistent with updateItemTool)
      if (reminderAt && reminderAt <= Date.now()) {
        return JSON.stringify({
          status: "error",
          code: "PAST_REMINDER_AT",
          message: "Reminder time must be in the future.",
        });
      }

      // Schedule reminder first so we can pass jobId to createItem in one write
      let reminderSet = false;
      let reminderJobId: Id<"scheduledJobs"> | undefined;
      if (reminderAt) {
        reminderJobId = await ctx.runMutation(internal.reminders.createReminder, {
          userId,
          payload: args.reminderMessage ?? args.title,
          runAt: reminderAt,
          timezone: tz,
        }) as Id<"scheduledJobs">;
        reminderSet = true;
      }

      // Create item (with reminderJobId if reminder was scheduled)
      let itemId: Id<"items">;
      try {
        itemId = await ctx.runMutation(internal.items.createItem, {
          userId,
          collectionId,
          title: args.title,
          body: args.body,
          status: args.status,
          priority: args.priority,
          dueDate,
          amount: args.amount,
          currency,
          tags: args.tags,
          metadata: args.metadata,
          reminderAt,
          reminderJobId,
        }) as Id<"items">;
      } catch (error) {
        // Clean up orphaned reminder job if item creation fails
        if (reminderJobId) {
          try {
            await ctx.runMutation(internal.reminders.cancelReminder, {
              jobId: reminderJobId,
              userId,
            });
          } catch {
            // Best-effort cleanup
          }
        }
        throw error; // Re-throw to be caught by outer catch
      }

      // Schedule async embedding (non-blocking, best-effort)
      await ctx.scheduler.runAfter(0, internal.items.embedItem, { itemId, userId });

      return JSON.stringify({
        status: "success",
        action: "item_created",
        item: { id: itemId, title: args.title, collection: args.collectionName, amount: args.amount, currency },
        collectionCreated,
        reminderSet,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ status: "error", code: "CREATE_FAILED", message: msg });
    }
  },
});

const queryItemsTool = createTool({
  description:
    "Query and search the user's items (expenses, tasks, contacts, notes). Supports text search, filters, and aggregation (sum, count, group by tag/collection).",
  args: z.object({
    query: z.string().optional().describe("Text search query to find items by title/body/tags"),
    collectionName: z.string().optional().describe("Filter by collection name (e.g. 'Tasks', 'Expenses', 'Contacts', 'Notes', 'Bookmarks'). Always pass this when the user is asking about a specific item type — omitting it searches across all collections and can return unrelated items."),
    status: z.enum(["active", "done", "archived", "all"]).optional().describe("Filter by status. Default: active+done (excludes archived)"),
    tags: z.array(z.string()).optional().describe("Filter by tags (items matching ANY tag)"),
    dueBefore: z.string().optional().describe("ISO date — items due before this date"),
    dueAfter: z.string().optional().describe("ISO date — items due after this date"),
    dateFrom: z.string().optional().describe("ISO date — items created after this date"),
    dateTo: z.string().optional().describe("ISO date — items created before this date"),
    hasAmount: z.boolean().optional().describe("Filter to items with monetary amounts (expenses)"),
    limit: z.number().optional().describe("Max items to return (default 20, max 50)"),
    aggregate: z.enum(["sum", "count", "group_by_tag", "group_by_collection"]).optional().describe("Aggregate results instead of listing items"),
  }),
  handler: async (ctx, args): Promise<string> => {
    const userId = ctx.userId as Id<"users">;
    try {
      const user = await ctx.runQuery(internal.users.internalGetUser, { userId }) as {
        timezone: string;
      } | null;
      const tz = user?.timezone ?? "UTC";

      // Resolve collection
      let collectionId: Id<"collections"> | undefined;
      if (args.collectionName) {
        const col = await ctx.runQuery(internal.items.getCollectionByName, {
          userId,
          name: args.collectionName,
        }) as { _id: Id<"collections"> } | null;
        if (!col) {
          return JSON.stringify({ status: "success", action: "items_queried", items: [], count: 0 });
        }
        collectionId = col._id;
      }

      // Parse dates (accept both "YYYY-MM-DD" and full datetime)
      const dueBefore = args.dueBefore ? parseDatetimeInTimezone(normalizeFilterDate(args.dueBefore, true), tz) : undefined;
      const dueAfter = args.dueAfter ? parseDatetimeInTimezone(normalizeFilterDate(args.dueAfter, false), tz) : undefined;
      const dateFrom = args.dateFrom ? parseDatetimeInTimezone(normalizeFilterDate(args.dateFrom, false), tz) : undefined;
      const dateTo = args.dateTo ? parseDatetimeInTimezone(normalizeFilterDate(args.dateTo, true), tz) : undefined;

      // Fetch items
      let items: Array<{
        _id: string; title: string; body?: string; status: string;
        priority?: string; dueDate?: number; amount?: number; currency?: string;
        tags?: string[]; collectionId?: string; _creationTime: number;
        completedAt?: number; metadata?: unknown;
      }>;

      if (args.query) {
        // Text search first (instant, always works)
        const raw = await ctx.runQuery(internal.items.findItemByText, {
          userId,
          query: args.query,
          limit: 50,
        });
        const textResults = applyItemFilters(raw as QueryItem[], {
          collectionId,
          status: args.status,
          tags: args.tags,
          dueBefore,
          dueAfter,
          dateFrom,
          dateTo,
          hasAmount: args.hasAmount,
          limit: args.limit,
        });

        // Hybrid search: if best text score < 60 (no substring+ match), try vector fallback
        // Use best score from filtered results, not raw (raw top match may have been filtered out)
        const bestFilteredScore = (textResults as Array<{ _score?: number }>)[0]?._score ?? 0;
        const bestRawScore = (raw as Array<{ _score: number }>)[0]?._score ?? 0;
        const bestTextScore = textResults.length > 0 ? bestFilteredScore : bestRawScore;
        if (bestTextScore >= 60 || (textResults.length > 0 && bestTextScore >= 40)) {
          items = textResults;
        } else {
          try {
            const vectorResults = await ctx.runAction(internal.items.vectorSearchItems, {
              userId,
              query: args.query,
              limit: args.limit ?? 20,
              collectionId,
              status: args.status,
            }) as typeof items;
            items = vectorResults.length > 0 ? vectorResults : textResults;
          } catch {
            // Vector search failure is non-critical — fall back to text results
            items = textResults;
          }
        }
      } else {
        items = await ctx.runQuery(internal.items.queryItems, {
          userId,
          status: args.status,
          collectionId,
          tags: args.tags,
          dueBefore,
          dueAfter,
          dateFrom,
          dateTo,
          hasAmount: args.hasAmount,
          limit: args.limit,
        });
      }

      // Aggregate if requested
      if (args.aggregate) {
        // For group_by_collection, resolve collection names
        let collectionNames: Map<string, string> | undefined;
        if (args.aggregate === "group_by_collection") {
          const collections = await ctx.runQuery(internal.items.listCollections, {
            userId,
            includeArchived: true,
          }) as Array<{ _id: string; name: string }>;
          collectionNames = new Map(collections.map((c) => [c._id, c.name]));
        }

        const agg = aggregateItems(
          items.map((i) => ({
            title: i.title,
            body: i.body,
            tags: i.tags,
            amount: i.amount,
            currency: i.currency,
            collectionId: i.collectionId,
            status: i.status,
          })),
          args.aggregate as AggregateMode,
          collectionNames,
        );

        return JSON.stringify({
          status: "success",
          action: "items_aggregated",
          count: agg.totalCount,
          aggregation: agg,
        });
      }

      // Return items
      const simplified = simplifyItemsForResponse(items as QueryItem[]);

      return JSON.stringify({
        status: "success",
        action: "items_queried",
        items: simplified,
        count: simplified.length,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ status: "error", code: "QUERY_FAILED", message: msg });
    }
  },
});

const updateItemTool = createTool({
  description:
    "Update an existing item found by text search. Can change title, status, priority, amount, tags, collection, due date, or set/clear reminders.",
  args: z.object({
    itemQuery: z.string().describe("Text to find the item (searches title, body, tags)"),
    updates: z.object({
      title: z.string().optional(),
      body: z.string().optional(),
      status: z.enum(["active", "done", "archived"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      dueDate: z.string().optional().describe("New due date as ISO string"),
      amount: z.number().optional(),
      currency: z.string().optional().describe("Currency code (e.g. 'AED', 'USD')"),
      tags: z.array(z.string()).optional(),
      metadata: z.record(z.unknown()).optional(),
      collectionName: z.string().optional().describe("Move to a different collection (auto-created if needed)"),
      reminderAt: z.string().optional().describe("Set a new reminder (ISO string)"),
      reminderMessage: z.string().optional().describe("Custom reminder text (defaults to item title)"),
      clearReminder: z.boolean().optional().describe("Cancel the item's scheduled reminder"),
    }),
  }),
  handler: async (ctx, { itemQuery, updates }): Promise<string> => {
    const userId = ctx.userId as Id<"users">;
    try {
      const user = await ctx.runQuery(internal.users.internalGetUser, { userId }) as {
        timezone: string; credits: number;
      } | null;
      if ((user?.credits ?? 0) <= 0) {
        return JSON.stringify({ status: "error", code: "CREDIT_INSUFFICIENT", message: "No credits remaining." });
      }
      const tz = user?.timezone ?? "UTC";

      // Find item by text
      let matches = await ctx.runQuery(internal.items.findItemByText, {
        userId,
        query: itemQuery,
        limit: 3,
      }) as Array<{ _id: string; _score: number; title: string; status: string; reminderAt?: number; reminderJobId?: Id<"scheduledJobs">; collectionId?: string }>;

      // Hybrid search: if no text matches or top score < 40, try vector fallback
      if (matches.length === 0 || matches[0]!._score < 40) {
        try {
          const vectorResults = await ctx.runAction(internal.items.vectorSearchItems, {
            userId,
            query: itemQuery,
            limit: 3,
          }) as typeof matches;
          if (vectorResults.length > 0) {
            matches = vectorResults;
          }
        } catch {
          // Vector search failure — continue with text results
        }
      }

      if (matches.length === 0) {
        return JSON.stringify({ status: "error", code: "NOT_FOUND", message: `No item found matching "${itemQuery}".` });
      }

      const top = matches[0]!;
      // Ambiguity check: top must score ≥80 (exact/prefix match) or be ≥1.5x the runner-up
      if (top._score < 80 && matches.length > 1 && top._score < matches[1]!._score * 1.5) {
        const options = matches.map((m) => m.title).join(", ");
        return JSON.stringify({ status: "error", code: "AMBIGUOUS_MATCH", message: `Multiple items match "${itemQuery}": ${options}. Be more specific.` });
      }

      // Build patch from simple fields
      const { patch, changes } = buildSimpleItemPatch(updates);

      if (updates.dueDate) {
        patch.dueDate = parseDatetimeInTimezone(updates.dueDate, tz);
        changes.push("dueDate");
      }

      // Resolve collection move
      if (updates.collectionName) {
        const col = await ctx.runQuery(internal.items.getCollectionByName, {
          userId,
          name: updates.collectionName,
        }) as { _id: Id<"collections"> } | null;

        if (col) {
          patch.collectionId = col._id;
        } else {
          const newColId = await ctx.runMutation(internal.items.createCollection, {
            userId,
            name: updates.collectionName,
          }) as Id<"collections">;
          patch.collectionId = newColId;
        }
        changes.push("collection");
      }

      // Handle reminders — cancel old job before setting a new one to avoid ghost reminders
      if ((updates.clearReminder || updates.reminderAt) && top.reminderJobId) {
        try {
          await ctx.runMutation(internal.reminders.cancelReminder, {
            jobId: top.reminderJobId,
            userId,
          });
        } catch {
          // Reminder may already have fired — not critical
        }
      }
      if (updates.clearReminder) {
        patch.clearReminder = true; // signals updateItem mutation to strip reminder fields
        changes.push("reminderCleared");
      }

      if (updates.reminderAt) {
        const reminderAt = parseDatetimeInTimezone(updates.reminderAt, tz);
        if (reminderAt <= Date.now()) {
          return JSON.stringify({
            status: "error",
            code: "PAST_REMINDER_AT",
            message: "Reminder time must be in the future.",
          });
        }
        patch.reminderAt = reminderAt;
        const jobId = await ctx.runMutation(internal.reminders.createReminder, {
          userId,
          payload: updates.reminderMessage ?? updates.title ?? top.title,
          runAt: reminderAt,
          timezone: tz,
        }) as Id<"scheduledJobs">;
        patch.reminderJobId = jobId;
        changes.push("reminderSet");
      }

      // Apply update
      await ctx.runMutation(internal.items.updateItem, {
        itemId: top._id as Id<"items">,
        userId,
        updates: patch as {
          title?: string; body?: string; status?: string; priority?: string;
          dueDate?: number; amount?: number; currency?: string;
          reminderAt?: number; tags?: string[]; metadata?: unknown;
          collectionId?: Id<"collections">; reminderJobId?: Id<"scheduledJobs">;
          reminderCronId?: string; mediaStorageId?: Id<"_storage">;
          clearReminder?: boolean;
        },
      });

      // Re-embed if title, body, or tags changed
      const needsReEmbed = changes.some((c) => ["title", "body", "tags"].includes(c));
      if (needsReEmbed) {
        await ctx.scheduler.runAfter(0, internal.items.embedItem, {
          itemId: top._id as Id<"items">,
          userId,
        });
      }

      return JSON.stringify({
        status: "success",
        action: "item_updated",
        item: { id: top._id, title: updates.title ?? top.title },
        changes,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ status: "error", code: "UPDATE_FAILED", message: msg });
    }
  },
});

const manageCollection = createTool({
  description:
    "Manage collections: list all, create new, rename, archive, or update description/icon/type.",
  args: z.object({
    action: z.enum(["list", "create", "rename", "archive", "update"]).describe("Action to perform"),
    name: z.string().optional().describe("Collection name (required for create/rename/archive/update)"),
    newName: z.string().optional().describe("New name (for rename action)"),
    icon: z.string().optional().describe("Emoji icon for the collection"),
    type: z.string().optional().describe("Collection type: expense, task, contact, note, bookmark"),
    description: z.string().optional().describe("Collection description"),
  }),
  handler: async (ctx, args): Promise<string> => {
    const userId = ctx.userId as Id<"users">;
    try {
      if (args.action === "list") {
        const collections = await ctx.runQuery(internal.items.listCollections, {
          userId,
          includeArchived: true,
        }) as Array<{ _id: string; name: string; icon?: string; type?: string; description?: string; archived?: boolean; itemCount: number }>;

        return JSON.stringify({
          status: "success",
          action: "collections_listed",
          collections: collections.map((c) => ({
            id: c._id,
            name: c.name,
            icon: c.icon,
            type: c.type,
            description: c.description,
            archived: c.archived ?? false,
            itemCount: c.itemCount,
          })),
          count: collections.length,
        });
      }

      // Credit check for write operations (list is free)
      const user = await ctx.runQuery(internal.users.internalGetUser, { userId }) as {
        credits: number;
      } | null;
      if ((user?.credits ?? 0) <= 0) {
        return JSON.stringify({ status: "error", code: "CREDIT_INSUFFICIENT", message: "No credits remaining." });
      }

      if (!args.name) {
        return JSON.stringify({ status: "error", code: "MISSING_NAME", message: "Collection name is required." });
      }

      if (args.action === "create") {
        const colId = await ctx.runMutation(internal.items.createCollection, {
          userId,
          name: args.name,
          icon: args.icon,
          type: args.type,
          description: args.description,
        }) as Id<"collections">;

        return JSON.stringify({
          status: "success",
          action: "collection_created",
          collection: { id: colId, name: args.name },
        });
      }

      // For rename, archive, update — look up by name first
      const col = await ctx.runQuery(internal.items.getCollectionByName, {
        userId,
        name: args.name,
      }) as { _id: Id<"collections">; name: string } | null;

      if (!col) {
        return JSON.stringify({ status: "error", code: "NOT_FOUND", message: `Collection "${args.name}" not found.` });
      }

      if (args.action === "rename") {
        if (!args.newName) {
          return JSON.stringify({ status: "error", code: "MISSING_NEW_NAME", message: "New name is required for rename." });
        }
        await ctx.runMutation(internal.items.updateCollection, {
          collectionId: col._id,
          userId,
          name: args.newName,
        });
        return JSON.stringify({
          status: "success",
          action: "collection_renamed",
          collection: { id: col._id, oldName: col.name, newName: args.newName },
        });
      }

      if (args.action === "archive") {
        await ctx.runMutation(internal.items.updateCollection, {
          collectionId: col._id,
          userId,
          archived: true,
        });
        return JSON.stringify({
          status: "success",
          action: "collection_archived",
          collection: { id: col._id, name: col.name },
        });
      }

      if (args.action === "update") {
        const updateFields: { collectionId: Id<"collections">; userId: Id<"users">; description?: string; icon?: string; type?: string } = {
          collectionId: col._id,
          userId,
        };
        if (args.description) updateFields.description = args.description;
        if (args.icon) updateFields.icon = args.icon;
        if (args.type) updateFields.type = args.type;

        await ctx.runMutation(internal.items.updateCollection, updateFields);
        return JSON.stringify({
          status: "success",
          action: "collection_updated",
          collection: { id: col._id, name: col.name },
        });
      }

      return JSON.stringify({ status: "error", code: "INVALID_ACTION", message: `Unknown action: ${args.action}` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ status: "error", code: "COLLECTION_ERROR", message: msg });
    }
  },
});

// ---------------------------------------------------------------------------
// ProWrite — multi-LLM professional writing pipeline
// ---------------------------------------------------------------------------

const proWriteBrief = createTool({
  description:
    "Start the ProWrite professional writing pipeline. Parses the user's writing request into a creative brief and returns clarifying questions. Use when the user says 'prowrite ...' to trigger the pipeline.",
  args: z.object({
    request: z
      .string()
      .describe("The user's full writing request — what they want written, any context they provided"),
  }),
  handler: async (ctx, { request }): Promise<string> => {
    if (request.length > 5000) {
      return JSON.stringify({
        status: "error",
        message: "Your writing request is too long. Please keep it under 5000 characters.",
      });
    }
    try {
      const result = await ctx.runAction(internal.proWrite.generateBrief, {
        request,
        userId: ctx.userId as Id<"users">,
      });
      return JSON.stringify({
        status: "success",
        brief: result.brief,
        questions: result.questions,
        instructions: "Show the user a brief summary of what you understood, then ask these questions as a numbered list (1. 2. 3.). Tell them they can say 'skip' to proceed without answering. When the user answers or skips, FIRST send '✍️ Writing now — this takes 3-4 minutes, I'll send the result when it's ready.' THEN call proWriteExecute.",
      });
    } catch (error) {
      console.error("proWriteBrief tool failed:", error);
      return JSON.stringify({
        status: "error",
        message: "ProWrite pipeline failed to start. Please try again.",
      });
    }
  },
});

const proWriteExecute = createTool({
  description:
    "Execute the ProWrite pipeline after the user has answered (or skipped) the clarifying questions. The brief is stored server-side automatically — no need to pass it. Runs 8 sequential AI steps and returns the finished article.",
  args: z.object({
    answers: z
      .string()
      .optional()
      .describe("The user's answers to clarifying questions, concatenated. Omit or empty string if skipped."),
    skipClarify: z
      .boolean()
      .optional()
      .describe("True if the user skipped the clarifying questions"),
  }),
  handler: async (ctx, { answers, skipClarify }): Promise<string> => {
    const safeAnswers = answers ?? "";
    try {
      // Get user's personality file for voice matching
      let personality = "";
      try {
        const file = await ctx.runQuery(internal.users.getUserFile, {
          userId: ctx.userId as Id<"users">,
          filename: "personality",
        });
        if (file) personality = file.content;
      } catch {
        // No personality file — will use default voice
      }

      const result = await ctx.runAction(internal.proWrite.executePipeline, {
        answers: safeAnswers,
        userId: ctx.userId as Id<"users">,
        personality,
        skipClarify: skipClarify ?? false,
      });

      return formatProWriteResult(result);
    } catch (error) {
      console.error("proWriteExecute tool failed:", error);
      return "The ProWrite pipeline encountered an error. Please try again with 'prowrite'.";
    }
  },
});

export const ghaliAgent = new Agent(components.agent, {
  name: "Ghali",
  languageModel: google(MODELS.FLASH),
  textEmbeddingModel: openai.embedding(MODELS.EMBEDDING),
  instructions: AGENT_INSTRUCTIONS,
  tools: {
    appendToMemory,
    editMemory,
    updatePersonality,
    updateHeartbeat,
    deepReasoning,
    webSearch,
    generateImage,
    resolveMedia,
    reprocessMedia,
    convertFile,
    searchDocuments,
    scheduleReminder,
    listReminders,
    cancelReminder,
    addItem,
    queryItems: queryItemsTool,
    updateItem: updateItemTool,
    manageCollection,
    proWriteBrief,
    proWriteExecute,
  },
  maxSteps: AGENT_MAX_STEPS,
  contextOptions: {
    recentMessages: AGENT_RECENT_MESSAGES,
  },
  usageHandler: async (ctx, { userId, usage, providerMetadata, model, provider }) => {
    if (!userId) return;
    try {
      const user = await ctx.runQuery(internal.users.internalGetUser, {
        userId: userId as Id<"users">,
      }) as { phone: string; tier: string } | null;
      if (!user) return;

      const reasoningTokens =
        (providerMetadata?.anthropic?.reasoningTokens as number | undefined) ??
        (providerMetadata?.google?.reasoningTokens as number | undefined) ??
        0;
      const cachedInputTokens =
        (providerMetadata?.openai?.cachedPromptTokens as number | undefined) ??
        (providerMetadata?.anthropic?.cacheReadInputTokens as number | undefined) ??
        0;

      // Use runMutation → scheduler (non-blocking) instead of runAction (blocking)
      await ctx.runMutation(internal.analyticsHelper.scheduleTrackAIGeneration, {
        phone: user.phone,
        model,
        provider,
        promptTokens: usage.inputTokens ?? 0,
        completionTokens: usage.outputTokens ?? 0,
        reasoningTokens: reasoningTokens || undefined,
        cachedInputTokens: cachedInputTokens || undefined,
        tier: user.tier,
      });
    } catch (error) {
      console.error("[Analytics] usageHandler failed:", error);
    }
  },
});
