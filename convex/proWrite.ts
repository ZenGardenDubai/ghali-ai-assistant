/**
 * ProWrite — Multi-LLM professional writing pipeline.
 *
 * Two internalActions:
 * - generateBrief: Opus parses request → brief + clarifying questions
 * - executePipeline: ENRICH → RESEARCH → RAG → SYNTHESIZE → DRAFT → ELEVATE → REFINE → HUMANIZE
 */

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { MODELS } from "./constants";
import {
  buildBriefPrompt,
  buildEnrichPrompt,
  buildResearchQuery,
  buildRagQuery,
  buildSynthesizePrompt,
  buildDraftPrompt,
  buildElevatePrompt,
  buildRefinePrompt,
  buildHumanizePrompt,
  parseBriefOutput,
} from "./lib/proWrite";

/** Per-step timeout for LLM calls (60s — keeps 8-step pipeline under Convex's 10-min action limit) */
const STEP_TIMEOUT_MS = 60_000;

function getOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");
  return createOpenRouter({ apiKey });
}

function stepTimer(label: string) {
  const start = Date.now();
  return () => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[ProWrite] ${label} done (${elapsed}s)`);
  };
}

// ---------------------------------------------------------------------------
// Brief storage — persist brief so the agent passes a reference ID, not raw text
// ---------------------------------------------------------------------------

export const storeBrief = internalMutation({
  args: {
    userId: v.id("users"),
    brief: v.string(),
    questions: v.array(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, { userId, brief, questions }): Promise<string> => {
    // Only one active brief per user — delete any prior ones
    const existing = await ctx.db
      .query("proWriteBriefs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const old of existing) {
      await ctx.db.delete(old._id);
    }

    const id = await ctx.db.insert("proWriteBriefs", {
      userId,
      brief,
      questions,
      createdAt: Date.now(),
    });
    return id as string;
  },
});

export const deleteBrief = internalMutation({
  args: { briefId: v.id("proWriteBriefs") },
  handler: async (ctx, { briefId }) => {
    await ctx.db.delete(briefId);
  },
});

export const cleanupExpiredBriefs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const expired = await ctx.db
      .query("proWriteBriefs")
      .filter((q) => q.lt(q.field("createdAt"), oneDayAgo))
      .collect();
    for (const brief of expired) {
      await ctx.db.delete(brief._id);
    }
    if (expired.length > 0) {
      console.log(`[ProWrite] Cleaned up ${expired.length} expired briefs`);
    }
  },
});

export const getLatestBrief = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("proWriteBriefs"),
      brief: v.string(),
      questions: v.array(v.string()),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, { userId }) => {
    const doc = await ctx.db
      .query("proWriteBriefs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
    if (!doc) return null;
    return {
      _id: doc._id,
      brief: doc.brief,
      questions: doc.questions,
      createdAt: doc.createdAt,
    };
  },
});

// ---------------------------------------------------------------------------
// generateBrief — Opus parses user request into creative brief + questions
// ---------------------------------------------------------------------------

export const generateBrief = internalAction({
  args: {
    request: v.string(),
    userId: v.id("users"),
  },
  returns: v.object({
    brief: v.string(),
    questions: v.array(v.string()),
  }),
  handler: async (ctx, { request, userId }): Promise<{ brief: string; questions: string[] }> => {
    const prompt = buildBriefPrompt(request);

    const text = await timedGenerate("BRIEF", {
      model: anthropic(MODELS.DEEP_REASONING),
      system: prompt.system,
      prompt: prompt.user,
    });

    const parsed = parseBriefOutput(text);

    // Persist brief so executePipeline can retrieve by userId
    await ctx.runMutation(internal.proWrite.storeBrief, {
      userId,
      brief: parsed.brief,
      questions: parsed.questions,
    });

    return parsed;
  },
});

// ---------------------------------------------------------------------------
// executePipeline — Runs all remaining steps after brief + user answers
// ---------------------------------------------------------------------------

/** Generate text with a per-step timeout. */
async function timedGenerate(
  label: string,
  options: Parameters<typeof generateText>[0],
): Promise<string> {
  const done = stepTimer(label);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STEP_TIMEOUT_MS);
  try {
    const result = await generateText({
      ...options,
      abortSignal: controller.signal,
    });
    done();
    return result.text;
  } finally {
    clearTimeout(timeout);
  }
}

export const executePipeline = internalAction({
  args: {
    answers: v.string(),
    userId: v.id("users"),
    personality: v.string(),
    skipClarify: v.optional(v.boolean()),
  },
  returns: v.string(),
  handler: async (ctx, { answers, userId, personality, skipClarify }) => {
    const pipelineStart = Date.now();
    const openrouter = getOpenRouter();

    // Load the most recent brief for this user (no ID relay through agent)
    const stored = await ctx.runQuery(internal.proWrite.getLatestBrief, { userId });
    if (!stored) throw new Error(`No ProWrite brief found for user ${userId}`);
    const brief = stored.brief;
    const storedBriefId = stored._id;

    // STEP 1: ENRICH — fold user answers into brief (skip if no answers)
    let enrichedBrief = brief;
    if (!skipClarify && answers.trim()) {
      const enrichPrompt = buildEnrichPrompt(brief, answers);
      enrichedBrief = await timedGenerate("ENRICH", {
        model: anthropic(MODELS.DEEP_REASONING),
        system: enrichPrompt.system,
        prompt: enrichPrompt.user,
      });
    }

    // STEP 2: RESEARCH — web-grounded facts via Flash + Google Search
    let research = "";
    try {
      const researchQuery = buildResearchQuery(enrichedBrief);
      research = await timedGenerate("RESEARCH", {
        model: google(MODELS.FLASH),
        tools: { google_search: google.tools.googleSearch({}) },
        prompt: researchQuery,
      });
    } catch (error) {
      console.error("[ProWrite] RESEARCH failed:", error);
    }

    // STEP 3: RAG — search user's stored documents
    let ragContent = "";
    try {
      const ragQuery = buildRagQuery(enrichedBrief);
      ragContent = await ctx.runAction(internal.rag.searchDocuments, {
        userId: userId as string,
        query: ragQuery,
      });
      console.log("[ProWrite] RAG done");
    } catch (error) {
      console.error("[ProWrite] RAG failed:", error);
    }

    // STEP 4: SYNTHESIZE — outline + narrative arc (Opus)
    const synthPrompt = buildSynthesizePrompt(enrichedBrief, research, ragContent);
    const synthesis = await timedGenerate("SYNTHESIZE", {
      model: anthropic(MODELS.DEEP_REASONING),
      system: synthPrompt.system,
      prompt: synthPrompt.user,
    });

    // STEP 5: DRAFT — full article (Kimi K2.5 via OpenRouter)
    let draft: string;
    try {
      const draftPrompt = buildDraftPrompt(synthesis);
      draft = await timedGenerate("DRAFT (Kimi)", {
        model: openrouter(MODELS.PROWRITE_DRAFT),
        system: draftPrompt.system,
        prompt: draftPrompt.user,
      });
    } catch (error) {
      console.error("[ProWrite] DRAFT via OpenRouter failed, falling back to Opus:", error);
      const draftPrompt = buildDraftPrompt(synthesis);
      draft = await timedGenerate("DRAFT (Opus fallback)", {
        model: anthropic(MODELS.DEEP_REASONING),
        system: draftPrompt.system,
        prompt: draftPrompt.user,
      });
    }

    // STEP 6: ELEVATE — sharpen hooks, creativity (GPT-5.2, fallback: Opus)
    let elevated: string;
    try {
      const elevatePrompt = buildElevatePrompt(draft);
      elevated = await timedGenerate("ELEVATE (GPT-5.2)", {
        model: openai(MODELS.PROWRITE_ELEVATE),
        system: elevatePrompt.system,
        prompt: elevatePrompt.user,
      });
    } catch (error) {
      console.error("[ProWrite] ELEVATE via OpenAI failed, falling back to Opus:", error);
      const elevatePrompt = buildElevatePrompt(draft);
      elevated = await timedGenerate("ELEVATE (Opus fallback)", {
        model: anthropic(MODELS.DEEP_REASONING),
        system: elevatePrompt.system,
        prompt: elevatePrompt.user,
      });
    }

    // STEP 7: REFINE — polish coherence + flow (Kimi K2.5 via OpenRouter)
    let refined: string;
    try {
      const refinePrompt = buildRefinePrompt(elevated);
      refined = await timedGenerate("REFINE (Kimi)", {
        model: openrouter(MODELS.PROWRITE_DRAFT),
        system: refinePrompt.system,
        prompt: refinePrompt.user,
      });
    } catch (error) {
      console.error("[ProWrite] REFINE via OpenRouter failed, falling back to Opus:", error);
      const refinePrompt = buildRefinePrompt(elevated);
      refined = await timedGenerate("REFINE (Opus fallback)", {
        model: anthropic(MODELS.DEEP_REASONING),
        system: refinePrompt.system,
        prompt: refinePrompt.user,
      });
    }

    // STEP 8: HUMANIZE — strip AI artifacts, match user voice (Opus)
    const humanizePrompt = buildHumanizePrompt(refined, personality);
    const finalText = await timedGenerate("HUMANIZE", {
      model: anthropic(MODELS.DEEP_REASONING),
      system: humanizePrompt.system,
      prompt: humanizePrompt.user,
    });

    // Clean up stored brief — no longer needed
    try {
      await ctx.runMutation(internal.proWrite.deleteBrief, { briefId: storedBriefId });
    } catch {
      // Non-critical — daily cron will catch it
    }

    const totalSec = ((Date.now() - pipelineStart) / 1000).toFixed(1);
    console.log(`[ProWrite] Pipeline complete (${totalSec}s total)`);

    return finalText;
  },
});
