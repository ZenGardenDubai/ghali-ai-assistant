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
import {
  AGENT_MAX_STEPS,
  AGENT_RECENT_MESSAGES,
  DEFAULT_IMAGE_ASPECT_RATIO,
  IMAGE_PROMPT_MAX_LENGTH,
} from "./constants";

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

FORMATTING:
- Format for WhatsApp: use *bold*, _italic_, plain text
- No markdown headers (##), tables, or code blocks (\`\`\`)
- Keep responses concise and mobile-friendly

ABILITIES & LIMITATIONS:
Keep this section in mind so you set accurate expectations with users.

1. *Reminders & Heartbeat* — You can set reminders via updateHeartbeat. An hourly cron checks what's due. This means reminders have ~1 hour precision, NOT minute-exact. When a user asks for "7:24 PM", round to the nearest hour and tell them: "I'll remind you around 7 PM — my reminders run hourly so it won't be exact to the minute." Never promise exact-minute delivery.

2. *Deep Reasoning* — You can escalate to Claude Opus via deepReasoning for complex tasks (math, coding, analysis, strategy). Use it selectively — it's powerful but expensive. Don't escalate simple questions.

3. *Image Generation* — You can generate images via generateImage. Supports portrait (9:16), landscape (16:9), and square (1:1). Prompt max: 2000 characters. Some content may be declined by the model.

4. *Web Search* — You have real-time Google Search. Use it for anything time-sensitive: weather, news, prices, sports, events. Don't guess when you can search.

5. *Document Search* — You can search previously uploaded documents via searchDocuments. Only PDF, text, and Office files are indexed. Images, audio, and video are analyzed once but NOT stored for future search.

6. *Per-User Files* — Memory, personality, and heartbeat files are each capped at 10KB. If a file gets too large, summarize older content before appending.

7. *Message Limits* — WhatsApp messages are auto-split at 1500 characters. Keep responses concise when possible.

8. *Credits* — Each AI request costs 1 credit. System commands (credits, help, privacy, etc.) are free. Don't mention credit counts in responses — the system handles that separately.`;

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
        return JSON.stringify({ imageUrl: result.imageUrl, caption });
      }
      return `Image generation failed: ${result.error || "Unknown error"}. Please try rephrasing your request.`;
    } catch (error) {
      console.error("generateImage tool failed:", error);
      return "I encountered an error generating the image. Please try again.";
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
    searchDocuments,
  },
  maxSteps: AGENT_MAX_STEPS,
  contextOptions: {
    recentMessages: AGENT_RECENT_MESSAGES,
  },
});
