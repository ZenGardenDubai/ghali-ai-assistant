/**
 * ProWrite — Multi-LLM professional writing pipeline.
 *
 * Phase 1 (BRIEF + CLARIFY): Claude Opus generates brief + questions
 * Phase 2 (WRITE): 8-step pipeline: Enrich → Research → RAG → Synthesize → Draft → Elevate → Refine → Humanize
 * Phase 3 (DELIVER): Send final article via Twilio
 *
 * Triggered by keyword "prowrite" in user messages.
 * 1 credit per article (standard message cost).
 */

import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { MODELS } from "./models";
import { formatProWriteQuestions, buildPipelineStartMessage } from "./lib/proWrite";

// ─── OpenRouter provider (for Kimi K2.5 and GPT-5.2 fallback) ────────────────
const openRouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

// ─── Internal Mutations ───────────────────────────────────────────────────────

export const createPipeline = internalMutation({
  args: {
    userId: v.id("users"),
    originalRequest: v.string(),
    brief: v.optional(v.string()),
    questions: v.optional(v.string()),
  },
  handler: async (ctx, { userId, originalRequest, brief, questions }) => {
    return await ctx.db.insert("proWritePipelines", {
      userId,
      status: "pending_answers",
      originalRequest,
      brief,
      questions,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updatePipeline = internalMutation({
  args: {
    pipelineId: v.id("proWritePipelines"),
    updates: v.any(),
  },
  handler: async (ctx, { pipelineId, updates }) => {
    await ctx.db.patch(pipelineId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// ─── Internal Queries ─────────────────────────────────────────────────────────

export const getPipeline = internalQuery({
  args: { pipelineId: v.id("proWritePipelines") },
  handler: async (ctx, { pipelineId }) => {
    return await ctx.db.get(pipelineId);
  },
});

// ─── Phase 1: BRIEF + CLARIFY ─────────────────────────────────────────────────

/**
 * Start the ProWrite pipeline. Called from the proWrite agent tool.
 * Generates brief + clarifying questions, stores state, sets pendingAction.
 * Returns the formatted questions string (or pipeline start message if skipping).
 */
export const startPipeline = internalAction({
  args: {
    userId: v.id("users"),
    request: v.string(),
    skipQuestions: v.boolean(),
  },
  handler: async (ctx, { userId, request, skipQuestions }): Promise<string> => {
    // Step 1: BRIEF — Parse request into creative brief using Claude Opus
    const briefResult = await generateText({
      model: anthropic(MODELS.DEEP_REASONING),
      system: `You are a professional content strategist. Parse the user's writing request and create a structured creative brief.

Return a JSON object with these exact fields:
{
  "topic": "the main subject",
  "platform": "e.g. LinkedIn, blog, newsletter, Twitter/X, email",
  "audience": "target audience description",
  "tone": "e.g. professional, conversational, provocative, direct",
  "wordCount": 400,
  "keyAngles": ["angle 1", "angle 2"],
  "briefSummary": "1-2 sentence plain text summary for user preview"
}

Return ONLY valid JSON, no other text. Default wordCount to 400 if not specified.`,
      prompt: request,
      temperature: 0.3,
    });

    let brief: {
      topic: string;
      platform: string;
      audience: string;
      tone: string;
      wordCount: number;
      keyAngles: string[];
      briefSummary: string;
    };

    try {
      brief = JSON.parse(briefResult.text);
    } catch {
      brief = {
        topic: request,
        platform: "general",
        audience: "general audience",
        tone: "professional",
        wordCount: 400,
        keyAngles: [],
        briefSummary: request.slice(0, 200),
      };
    }

    let formattedResponse = "";

    if (!skipQuestions) {
      // Step 1.5: CLARIFY — Generate targeted questions using Claude Opus
      const clarifyResult = await generateText({
        model: anthropic(MODELS.DEEP_REASONING),
        system: `You are a professional writing consultant. Based on the creative brief, generate 3-5 targeted clarifying questions that will significantly improve the final article.

Focus on:
- Specific examples, data, or personal experiences to include
- Desired level of boldness or controversy
- Key angles to emphasize or avoid
- Audience-specific nuances

Return ONLY a JSON array of question strings, no other text.
Example: ["Question 1?", "Question 2?", "Question 3?"]`,
        prompt: JSON.stringify(brief),
        temperature: 0.3,
      });

      let questions: string[] = [];
      try {
        questions = JSON.parse(clarifyResult.text);
        if (!Array.isArray(questions)) questions = [];
      } catch {
        questions = [];
      }

      formattedResponse = formatProWriteQuestions(brief.briefSummary, questions);
    }

    // Create pipeline record in DB
    const pipelineId = await ctx.runMutation(internal.proWrite.createPipeline, {
      userId,
      originalRequest: request,
      brief: JSON.stringify(brief),
      questions: formattedResponse || undefined,
    });

    if (skipQuestions) {
      // Skip questions — schedule full pipeline immediately
      await ctx.runMutation(internal.proWrite.updatePipeline, {
        pipelineId,
        updates: { status: "writing" },
      });
      await ctx.scheduler.runAfter(0, internal.proWrite.runFullPipeline, {
        pipelineId,
        userId,
        userAnswers: "",
      });
      return buildPipelineStartMessage();
    }

    // Set pending action to capture user's answers on next message
    await ctx.runMutation(internal.users.setPendingAction, {
      userId,
      action: "prowrite_clarify",
      payload: pipelineId,
    });

    return formattedResponse;
  },
});

// ─── Phase 2: Full Writing Pipeline ──────────────────────────────────────────

/**
 * Run the full 8-step writing pipeline. Scheduled as a background action.
 * Steps: Enrich → Research → RAG → Synthesize → Draft → Elevate → Refine → Humanize
 */
export const runFullPipeline = internalAction({
  args: {
    pipelineId: v.id("proWritePipelines"),
    userId: v.id("users"),
    userAnswers: v.string(),
  },
  handler: async (ctx, { pipelineId, userId, userAnswers }) => {
    try {
      const pipeline = await ctx.runQuery(internal.proWrite.getPipeline, {
        pipelineId,
      });
      if (!pipeline) {
        console.error("[ProWrite] Pipeline not found:", pipelineId);
        return;
      }

      await ctx.runMutation(internal.proWrite.updatePipeline, {
        pipelineId,
        updates: { status: "writing" },
      });

      const user = await ctx.runQuery(internal.users.internalGetUser, { userId });
      if (!user) return;

      // Load personality file for HUMANIZE step (voice matching)
      const userFiles = await ctx.runQuery(internal.users.internalGetUserFiles, {
        userId,
      });
      const personalityFile = userFiles.find(
        (f: { filename: string; content: string }) => f.filename === "personality"
      );
      const voiceProfile =
        personalityFile?.content ||
        "Professional, clear, and direct writing style.";

      const briefStr = pipeline.brief ?? pipeline.originalRequest;

      // ─── Step 1.7: ENRICH ────────────────────────────────────────────────────
      // Fold user answers into an enriched brief using Claude Opus
      let enrichedBrief = briefStr;
      if (userAnswers.trim()) {
        try {
          const enrichResult = await generateText({
            model: anthropic(MODELS.DEEP_REASONING),
            system: `You are a content strategist. Incorporate the user's answers to clarifying questions into the creative brief.

Return an enhanced JSON brief with the same structure as the input, updated to reflect all new information. Return ONLY valid JSON.`,
            prompt: `Original brief: ${briefStr}\n\nUser's answers: ${userAnswers}`,
            temperature: 0.3,
          });
          enrichedBrief = enrichResult.text;
        } catch (error) {
          console.error("[ProWrite] Enrich step failed:", error);
          enrichedBrief = briefStr;
        }
        await ctx.runMutation(internal.proWrite.updatePipeline, {
          pipelineId,
          updates: { userAnswers, enrichedBrief },
        });
      }

      // ─── Step 2: RESEARCH ────────────────────────────────────────────────────
      // Gemini Flash with Google Search grounding
      let researchData = "";
      try {
        const researchResult = await generateText({
          model: google(MODELS.FLASH),
          tools: { google_search: google.tools.googleSearch({}) },
          system: `You are a research assistant. Find relevant facts, statistics, quotes, and recent developments about the topic.

Provide:
- Key facts and statistics (with sources)
- Recent relevant trends or events
- Expert quotes or perspectives
- Relevant data points`,
          prompt: `Research for article: ${enrichedBrief}`,
        });
        researchData = researchResult.text;
      } catch (error) {
        console.error("[ProWrite] Research step failed:", error);
        researchData = "Research unavailable — proceeding with general knowledge.";
      }
      await ctx.runMutation(internal.proWrite.updatePipeline, {
        pipelineId,
        updates: { researchData },
      });

      // ─── Step 3: RAG ─────────────────────────────────────────────────────────
      // Search user's Memory Vault for relevant documents
      let ragResults = "";
      try {
        ragResults = (await ctx.runAction(internal.rag.searchDocuments, {
          userId: userId as string,
          query: enrichedBrief.slice(0, 200),
          limit: 5,
        })) as string;
      } catch (error) {
        console.error("[ProWrite] RAG step failed:", error);
        ragResults = "No relevant documents found.";
      }
      await ctx.runMutation(internal.proWrite.updatePipeline, {
        pipelineId,
        updates: { ragResults },
      });

      // ─── Step 4: SYNTHESIZE ──────────────────────────────────────────────────
      // Claude Opus creates fact sheet + narrative arc + outline
      const synthesisResult = await generateText({
        model: anthropic(MODELS.DEEP_REASONING),
        system: `You are a master content strategist. Create a detailed content synthesis blueprint for the article.

Include:
1. Core argument / thesis statement
2. Supporting facts and data (from research)
3. Personal examples or anecdotes (from user context if available)
4. Narrative arc: hook → development → conclusion
5. Detailed section-by-section outline with key points

Be specific and thorough — this is the blueprint the writer will follow exactly.`,
        prompt: `Brief: ${enrichedBrief}\n\nResearch: ${researchData}\n\nUser documents: ${ragResults}`,
        temperature: 0.4,
      });
      const synthesis = synthesisResult.text;
      await ctx.runMutation(internal.proWrite.updatePipeline, {
        pipelineId,
        updates: { synthesis },
      });

      // ─── Step 5: DRAFT ───────────────────────────────────────────────────────
      // Kimi K2.5 writes the full article (fallback: Claude Opus)
      let draft = "";
      try {
        const draftResult = await generateText({
          model: openRouter("moonshotai/kimi-k2"),
          system: `You are an expert professional writer. Write a complete, publication-ready article based on the synthesis blueprint.

Rules:
- Natural, human voice — no AI clichés or filler phrases
- Follow the narrative arc exactly as specified
- Include all key facts and data points from the synthesis
- Match the platform's style (LinkedIn post vs blog article vs newsletter)
- Hit the target word count
- Create a compelling headline and strong opening hook`,
          prompt: `Brief: ${enrichedBrief}\n\nSynthesis blueprint: ${synthesis}`,
          temperature: 0.7,
        });
        draft = draftResult.text;
      } catch (error) {
        console.error("[ProWrite] Draft step (Kimi K2.5) failed, falling back to Claude:", error);
        const draftFallback = await generateText({
          model: anthropic(MODELS.DEEP_REASONING),
          system: `You are an expert professional writer. Write a complete, publication-ready article based on the synthesis blueprint. Natural voice, compelling hook, no AI clichés.`,
          prompt: `Brief: ${enrichedBrief}\n\nSynthesis blueprint: ${synthesis}`,
          temperature: 0.7,
        });
        draft = draftFallback.text;
      }
      await ctx.runMutation(internal.proWrite.updatePipeline, {
        pipelineId,
        updates: { draft },
      });

      // ─── Step 6: ELEVATE ─────────────────────────────────────────────────────
      // GPT-5.2 injects creativity and sharpens hooks (fallback: OpenRouter GPT-4o)
      let elevated = draft;
      try {
        const elevateResult = await generateText({
          model: openai("gpt-5.2"),
          system: `You are a creative writing genius. Elevate this article — sharpen the hooks, inject unexpected angles, make the opening irresistible, give the conclusion a bold punch.

Do not change the facts or structure. Make it brilliant.`,
          prompt: draft,
          temperature: 0.9,
        });
        elevated = elevateResult.text;
      } catch {
        // Fallback to OpenRouter
        try {
          const elevateResult = await generateText({
            model: openRouter("openai/gpt-4o"),
            system: `You are a creative writing genius. Elevate this article — sharpen the hooks, inject unexpected angles, make the opening irresistible, give the conclusion a bold punch.`,
            prompt: draft,
            temperature: 0.9,
          });
          elevated = elevateResult.text;
        } catch (error) {
          console.error("[ProWrite] Elevate step failed, using draft:", error);
          elevated = draft;
        }
      }
      await ctx.runMutation(internal.proWrite.updatePipeline, {
        pipelineId,
        updates: { elevated },
      });

      // ─── Step 7: REFINE ──────────────────────────────────────────────────────
      // Kimi K2.5 polishes coherence + flow (fallback: Claude Opus)
      let refined = elevated;
      try {
        const refineResult = await generateText({
          model: openRouter("moonshotai/kimi-k2"),
          system: `You are a meticulous editor. Polish this article for coherence, flow, and readability.

Tasks:
- Smooth transitions between paragraphs
- Ensure logical flow from intro to conclusion
- Eliminate repetition and redundancy
- Tighten sentences — cut unnecessary words
- Consistent voice throughout
- Final word count check`,
          prompt: elevated,
          temperature: 0.4,
        });
        refined = refineResult.text;
      } catch (error) {
        console.error("[ProWrite] Refine step (Kimi K2.5) failed, falling back to Claude:", error);
        const refineFallback = await generateText({
          model: anthropic(MODELS.DEEP_REASONING),
          system: `You are a meticulous editor. Polish this article for coherence, flow, and readability. Tighten sentences, smooth transitions, eliminate repetition.`,
          prompt: elevated,
          temperature: 0.4,
        });
        refined = refineFallback.text;
      }
      await ctx.runMutation(internal.proWrite.updatePipeline, {
        pipelineId,
        updates: { refined },
      });

      // ─── Step 8: HUMANIZE ────────────────────────────────────────────────────
      // Claude Opus strips ALL AI artifacts and matches user's voice profile
      const humanizeResult = await generateText({
        model: anthropic(MODELS.DEEP_REASONING),
        system: `You are an expert at making AI-written text sound completely human.

Your task:
1. Remove ALL AI artifacts: "In conclusion", "It's worth noting", "Delve into", "It is important to", "Certainly", "Absolutely", "I'd like to", "In today's world"
2. Match the user's voice profile exactly (tone, sentence style, vocabulary)
3. Add natural variation: vary sentence length, include conversational asides where fitting
4. Ensure the text reads as if written by a real person with opinions and personality
5. Keep all facts, structure, and arguments intact — only change the voice

User's voice profile:
${voiceProfile}`,
        prompt: refined,
        temperature: 0.5,
      });
      const finalArticle = humanizeResult.text;

      await ctx.runMutation(internal.proWrite.updatePipeline, {
        pipelineId,
        updates: { finalArticle, status: "done" },
      });

      // ─── Phase 3: DELIVER ────────────────────────────────────────────────────
      // Send final article via Twilio (auto-split at 1500 chars)
      await ctx.runAction(internal.twilio.sendMessage, {
        to: user.phone,
        body: finalArticle,
      });

      // Ask for adjustments
      await ctx.runAction(internal.twilio.sendMessage, {
        to: user.phone,
        body: "✅ Your article is ready!\n\nWant any adjustments? (shorter, different tone, more data, different angle)",
      });
    } catch (error) {
      console.error("[ProWrite] runFullPipeline failed:", error);

      await ctx.runMutation(internal.proWrite.updatePipeline, {
        pipelineId,
        updates: {
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      // Best-effort error notification
      try {
        const user = await ctx.runQuery(internal.users.internalGetUser, { userId });
        if (user) {
          await ctx.runAction(internal.twilio.sendMessage, {
            to: user.phone,
            body: "Sorry, the writing pipeline encountered an error. Please try again with 'prowrite [your request]'.",
          });
        }
      } catch {
        // Ignore notification failure
      }
    }
  },
});

