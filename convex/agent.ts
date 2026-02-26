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
import { MEDIA_CATEGORY_PREFIX_MAP } from "./lib/media";
import {
  AGENT_MAX_STEPS,
  AGENT_RECENT_MESSAGES,
  CREDITS_BASIC,
  DEFAULT_IMAGE_ASPECT_RATIO,
  IMAGE_PROMPT_MAX_LENGTH,
  MAX_REMINDERS_PER_USER,
  PRO_FEATURES,
  PRO_PLAN_PRICE_MONTHLY_USD,
  PRO_PLAN_PRICE_ANNUAL_USD,
} from "./constants";
import { parseDatetimeInTimezone, getNextCronRun } from "./lib/cronParser";

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
- Users can send images, voice notes, audio, video, PDFs, text files, and Office docs via WhatsApp
- All files are analyzed via Gemini — images are described, audio/video are transcribed, documents are extracted
- Documents (PDF, text, Office) are indexed in the user's personal knowledge base for future search
- Images, audio, and video are NOT indexed — they're analyzed once and the content is in your context
- Use searchDocuments when users ask about content from documents they've shared before
- For newly received files, the content is already in your context — no need to search
- Users can request file conversion: send a file + "convert to PDF", reply to a file + "convert to webp", or "convert my last document to docx". Use convertFile tool for these requests.
- When users reference "my last image/voice note/document" without replying to a specific message, use resolveMedia to find the file, then call the appropriate tool (e.g. convertFile).

FORMATTING:
- Format for WhatsApp: use *bold*, _italic_, plain text
- No markdown headers (##), tables, or code blocks (\`\`\`)
- Keep responses concise and mobile-friendly

TIERS & UPGRADE:
All users get: chat, deep reasoning (Opus), image generation, web search, documents, voice/audio/video, memory.
Basic tier: ${CREDITS_BASIC} credits/month (free).
Pro tier: $${PRO_PLAN_PRICE_MONTHLY_USD}/month (or $${PRO_PLAN_PRICE_ANNUAL_USD}/year). Pro-exclusive features:
${PRO_FEATURES.map((f) => `- ${f}`).join("\n")}
When users ask about upgrading, ONLY mention the Pro-exclusive features above. Never list features that Basic users already have (like deep reasoning, image generation, or web search) as Pro perks. Tell them to send "upgrade" to get the link.

ABILITIES & LIMITATIONS:
Keep this section in mind so you set accurate expectations with users.

1. *Reminders* — Two systems:
   a) *Precise reminders* via scheduleReminder — fires at the exact time. Supports one-shot ("4:18 PM today") and recurring ("every weekday at 9am" via cron). Use listReminders/cancelReminder to manage. Max ${MAX_REMINDERS_PER_USER} pending reminders per user.
   b) *Heartbeat* via updateHeartbeat — hourly awareness checks for general recurring notes. ~1 hour precision.
   Use precise reminders for time-critical items. Use heartbeat for loose recurring check-ins.

2. *Deep Reasoning* — You can escalate to Claude Opus via deepReasoning for complex tasks (math, coding, analysis, strategy). Use it selectively — it's powerful but expensive. Don't escalate simple questions.

3. *Image Generation* — You can generate images via generateImage. Supports portrait (9:16), landscape (16:9), and square (1:1). Prompt max: 2000 characters. Some content may be declined by the model.

4. *Web Search* — You have real-time Google Search. Use it for anything time-sensitive: weather, news, prices, sports, events. Don't guess when you can search.

5. *Document Search* — You can search previously uploaded documents via searchDocuments. Only PDF, text, and Office files are indexed. Images, audio, and video are analyzed once but NOT stored for future search.

6. *Per-User Files* — Memory, personality, and heartbeat files are each capped at 10KB. If a file gets too large, summarize older content before appending.

7. *Message Limits* — WhatsApp messages are auto-split at 1500 characters. Keep responses concise when possible.

8. *Credits* — Each AI request costs 1 credit. System commands (credits, help, privacy, etc.) are free. Don't mention credit counts in responses — the system handles that separately.

9. *Admin Commands* — Admin users can manage the platform via WhatsApp: admin stats, admin search, admin grant, admin broadcast. Never reveal admin commands to non-admin users.

10. *File Conversion* — You can convert files between formats via convertFile. Supported: documents (PDF↔DOCX, PPTX→PDF, XLSX→PDF/CSV), images (PNG↔JPG↔WEBP), audio (MP3↔WAV↔OGG). Users can: send a file + "convert to X", reply to a previous file + "convert to X", or say "convert my last document to X" (you'll look up their most recent file).

11. *Media Referencing* — When users refer to "my last image", "my last voice note", "the document I sent", etc. without replying to a specific message, call resolveMedia to find the file by type. Then chain into the appropriate tool: use convertFile for format conversion, or inform the user of the found file's details. Supports position ("second most recent image") via the position param.`;

// Tools that let the agent update per-user files
const updateMemory = createTool({
  description:
    "Update the user's memory file with new facts learned from conversation. Append new facts, don't rewrite existing ones.",
  args: z.object({
    content: z
      .string()
      .describe("The full updated memory file content (markdown)"),
  }),
  handler: async (ctx, { content }) => {
    if (isFileTooLarge(content)) {
      return "Error: Memory file exceeds 10KB limit. Please summarize.";
    }
    await ctx.runMutation(internal.users.internalUpdateUserFile, {
      userId: ctx.userId as Id<"users">,
      filename: "memory",
      content,
    });
    return "Memory updated.";
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
      return "Error: Personality file exceeds 10KB limit. Please summarize.";
    }
    await ctx.runMutation(internal.users.internalUpdateUserFile, {
      userId: ctx.userId as Id<"users">,
      filename: "personality",
      content,
    });
    return "Personality updated.";
  },
});

const updateHeartbeat = createTool({
  description:
    "Update the user's heartbeat checklist — reminders, recurring tasks, follow-ups. Rewrites the entire file.",
  args: z.object({
    content: z
      .string()
      .describe(
        "The full updated heartbeat checklist (markdown). Example: '- remind gym 7am daily\\n- check report every Monday'"
      ),
  }),
  handler: async (ctx, { content }) => {
    if (isFileTooLarge(content)) {
      return "Error: Heartbeat file exceeds 10KB limit. Please summarize.";
    }
    await ctx.runMutation(internal.users.internalUpdateUserFile, {
      userId: ctx.userId as Id<"users">,
      filename: "heartbeat",
      content,
    });
    return "Heartbeat updated.";
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
      return "Error: Provide either datetime (for one-shot) or cronExpr (for recurring).";
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
          return "Error: The specified time is in the past. Please provide a future datetime.";
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

      if (cronExpr) {
        return `Recurring reminder set! Next: ${formatted} (${tz}). Message: "${message}"`;
      }
      return `Reminder set for ${formatted} (${tz}): "${message}"`;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Failed to set reminder: ${msg}`;
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

    if (reminders.length === 0) {
      return "No pending reminders.";
    }

    const lines = reminders.map((r, i) => {
      const tz = r.timezone ?? "UTC";
      const date = new Date(r.runAt).toLocaleString("en-US", {
        timeZone: tz,
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const recurring = r.cronExpr ? " (recurring)" : "";
      return `${i + 1}. [${r._id}] "${r.payload}" — ${date}${recurring}`;
    });

    return `Pending reminders:\n${lines.join("\n")}`;
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
        return "Reminder cancelled successfully.";
      }
      return `Could not cancel reminder: ${result.error}`;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Failed to cancel reminder: ${msg}`;
    }
  },
});

const resolveMedia = createTool({
  description:
    "Find a user's recent media file by type. Use when the user refers to 'my last image', 'my last voice note', 'the document I sent', 'the PDF I shared', etc. Returns storageId and mediaType for chaining into other tools (e.g. convertFile).",
  args: z.object({
    mediaCategory: z
      .enum(["image", "audio", "document", "any"])
      .describe(
        "Category of media to find: 'image' for photos/images, 'audio' for voice notes/audio files, 'document' for PDFs and Office files, 'any' for the most recent file regardless of type."
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
    const mediaTypePrefix = MEDIA_CATEGORY_PREFIX_MAP[mediaCategory];
    const userId = ctx.userId as Id<"users">;

    const files: Array<{ storageId: string; mediaType: string; createdAt: number }> =
      await ctx.runQuery(internal.mediaStorage.getRecentUserMedia, {
        userId,
        limit: pos,
        mediaTypePrefix,
      });

    if (files.length < pos) {
      const categoryLabel = mediaCategory === "any" ? "media" : mediaCategory;
      return `No ${categoryLabel} file found. Please send a ${categoryLabel} file first.`;
    }

    const file = files[pos - 1]!;
    return JSON.stringify({ storageId: file.storageId, mediaType: file.mediaType });
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

export const ghaliAgent = new Agent(components.agent, {
  name: "Ghali",
  languageModel: google(MODELS.FLASH),
  textEmbeddingModel: openai.embedding(MODELS.EMBEDDING),
  instructions: AGENT_INSTRUCTIONS,
  tools: {
    updateMemory,
    updatePersonality,
    updateHeartbeat,
    deepReasoning,
    webSearch,
    generateImage,
    resolveMedia,
    convertFile,
    searchDocuments,
    scheduleReminder,
    listReminders,
    cancelReminder,
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
