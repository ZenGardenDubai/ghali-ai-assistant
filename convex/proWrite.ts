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

/** Result from a timed LLM call, including usage metadata for analytics */
interface TimedGenerateResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  provider: string;
}

/** Per-step timeout for LLM calls (60s cap per individual call) */
const STEP_TIMEOUT_MS = 60_000;

/** Global pipeline budget (9 min) — leaves headroom under Convex's 10-min action limit */
const PIPELINE_BUDGET_MS = 9 * 60_000;

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
    const BATCH_SIZE = 500;
    const expired = await ctx.db
      .query("proWriteBriefs")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", oneDayAgo))
      .take(BATCH_SIZE);
    for (const brief of expired) {
      await ctx.db.delete(brief._id);
    }
    if (expired.length > 0) {
      console.log(`[ProWrite] Cleaned up ${expired.length} expired briefs`);
      if (expired.length === BATCH_SIZE) {
        console.log("[ProWrite] Cleanup hit batch limit; remaining expired briefs will be cleaned in next run.");
      }
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
    phone: v.optional(v.string()),
    tier: v.optional(v.string()),
  },
  returns: v.object({
    brief: v.string(),
    questions: v.array(v.string()),
  }),
  handler: async (ctx, { request, userId, phone, tier }): Promise<{ brief: string; questions: string[] }> => {
    const prompt = buildBriefPrompt(request);

    const result = await timedGenerate("BRIEF", {
      model: anthropic(MODELS.DEEP_REASONING),
      system: prompt.system,
      prompt: prompt.user,
    });

    // Track LLM usage for the brief step (fire-and-forget — never fail the brief)
    if (phone && tier) {
      try {
        await ctx.scheduler.runAfter(0, internal.analytics.trackAIGeneration, {
          phone,
          model: result.model,
          provider: result.provider,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          tier,
        });
      } catch (error) {
        console.error("[ProWrite] Failed to schedule BRIEF analytics:", error);
      }
    }

    const parsed = parseBriefOutput(result.text);

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

/** Detect provider from model ID string */
function detectProvider(modelId: string): string {
  if (modelId.includes("claude") || modelId.includes("anthropic")) return "anthropic";
  if (modelId.includes("gemini") || modelId.includes("google")) return "google";
  if (modelId.includes("gpt") || modelId.includes("openai")) return "openai";
  if (modelId.includes("/")) return "openrouter"; // e.g. "moonshotai/kimi-k2.5"
  return "unknown";
}

/** Generate text with a per-step timeout, capped by global deadline. */
async function timedGenerate(
  label: string,
  options: Parameters<typeof generateText>[0],
  deadlineMs?: number,
): Promise<TimedGenerateResult> {
  if (deadlineMs) {
    const remaining = deadlineMs - Date.now();
    if (remaining <= 2_000) throw new Error(`[ProWrite] Budget exhausted before ${label}`);
  }
  const timeoutMs = deadlineMs
    ? Math.min(STEP_TIMEOUT_MS, deadlineMs - Date.now() - 2_000)
    : STEP_TIMEOUT_MS;

  const done = stepTimer(label);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await generateText({
      ...options,
      abortSignal: controller.signal,
    });
    done();
    const modelId = result.response?.modelId ?? "unknown";
    return {
      text: result.text,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      model: modelId,
      provider: detectProvider(modelId),
    };
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
    phone: v.optional(v.string()),
    tier: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, { answers, userId, personality, skipClarify, phone, tier }) => {
    const pipelineStart = Date.now();
    const deadlineMs = pipelineStart + PIPELINE_BUDGET_MS;

    // Helper to fire $ai_generation for a pipeline step (never throws — analytics are best-effort)
    const trackStep = async (result: TimedGenerateResult) => {
      if (!phone || !tier) return;
      try {
        await ctx.scheduler.runAfter(0, internal.analytics.trackAIGeneration, {
          phone,
          model: result.model,
          provider: result.provider,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          tier,
        });
      } catch (error) {
        console.error("[ProWrite] Failed to schedule step analytics:", error);
      }
    };

    let stepsCompleted = 0;

    // Load the most recent brief for this user (no ID relay through agent)
    const stored = await ctx.runQuery(internal.proWrite.getLatestBrief, { userId });
    if (!stored) throw new Error(`No ProWrite brief found for user ${userId}`);
    const brief = stored.brief;
    const storedBriefId = stored._id;

    try {
      // STEP 1: ENRICH — fold user answers into brief (skip if no answers)
      let enrichedBrief = brief;
      if (!skipClarify && answers.trim()) {
        const enrichPrompt = buildEnrichPrompt(brief, answers);
        const enrichResult = await timedGenerate("ENRICH", {
          model: anthropic(MODELS.DEEP_REASONING),
          system: enrichPrompt.system,
          prompt: enrichPrompt.user,
        }, deadlineMs);
        enrichedBrief = enrichResult.text;
        await trackStep(enrichResult);
        stepsCompleted++;
      }

      // STEP 2: RESEARCH — web-grounded facts via Flash + Google Search
      let research = "";
      try {
        const researchQuery = buildResearchQuery(enrichedBrief);
        const researchResult = await timedGenerate("RESEARCH", {
          model: google(MODELS.FLASH),
          tools: { google_search: google.tools.googleSearch({}) },
          prompt: researchQuery,
        }, deadlineMs);
        research = researchResult.text;
        await trackStep(researchResult);
        stepsCompleted++;
      } catch (error) {
        console.error("[ProWrite] RESEARCH failed:", error);
      }

      // STEP 3: RAG — search user's stored documents
      let ragContent = "";
      try {
        const ragQuery = buildRagQuery(enrichedBrief);
        const ragTimeoutMs = Math.max(5_000, Math.min(STEP_TIMEOUT_MS, deadlineMs - Date.now() - 2_000));
        ragContent = await Promise.race([
          ctx.runAction(internal.rag.searchDocuments, {
            userId: userId as string,
            query: ragQuery,
          }),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error("[ProWrite] RAG timeout")), ragTimeoutMs)
          ),
        ]);
        console.log("[ProWrite] RAG done");
        stepsCompleted++;
      } catch (error) {
        console.error("[ProWrite] RAG failed:", error);
      }

      // STEP 4: SYNTHESIZE — outline + narrative arc (Opus)
      const synthPrompt = buildSynthesizePrompt(enrichedBrief, research, ragContent);
      const synthResult = await timedGenerate("SYNTHESIZE", {
        model: anthropic(MODELS.DEEP_REASONING),
        system: synthPrompt.system,
        prompt: synthPrompt.user,
      }, deadlineMs);
      await trackStep(synthResult);
      stepsCompleted++;

      // STEP 5: DRAFT — full article (Kimi K2.5 via OpenRouter)
      let draftText: string;
      try {
        const draftPrompt = buildDraftPrompt(synthResult.text);
        const openrouter = getOpenRouter();
        const draftResult = await timedGenerate("DRAFT (Kimi)", {
          model: openrouter(MODELS.PROWRITE_DRAFT),
          system: draftPrompt.system,
          prompt: draftPrompt.user,
        }, deadlineMs);
        draftText = draftResult.text;
        await trackStep(draftResult);
      } catch (error) {
        console.error("[ProWrite] DRAFT via OpenRouter failed, falling back to Opus:", error);
        const draftPrompt = buildDraftPrompt(synthResult.text);
        const draftResult = await timedGenerate("DRAFT (Opus fallback)", {
          model: anthropic(MODELS.DEEP_REASONING),
          system: draftPrompt.system,
          prompt: draftPrompt.user,
        }, deadlineMs);
        draftText = draftResult.text;
        await trackStep(draftResult);
      }
      stepsCompleted++;

      // STEP 6: ELEVATE — sharpen hooks, creativity (GPT-5.2, fallback: Opus)
      let elevatedText: string;
      try {
        const elevatePrompt = buildElevatePrompt(draftText);
        const elevateResult = await timedGenerate("ELEVATE (GPT-5.2)", {
          model: openai(MODELS.PROWRITE_ELEVATE),
          system: elevatePrompt.system,
          prompt: elevatePrompt.user,
        }, deadlineMs);
        elevatedText = elevateResult.text;
        await trackStep(elevateResult);
      } catch (error) {
        console.error("[ProWrite] ELEVATE via OpenAI failed, falling back to Opus:", error);
        const elevatePrompt = buildElevatePrompt(draftText);
        const elevateResult = await timedGenerate("ELEVATE (Opus fallback)", {
          model: anthropic(MODELS.DEEP_REASONING),
          system: elevatePrompt.system,
          prompt: elevatePrompt.user,
        }, deadlineMs);
        elevatedText = elevateResult.text;
        await trackStep(elevateResult);
      }
      stepsCompleted++;

      // STEP 7: REFINE — polish coherence + flow (Kimi K2.5 via OpenRouter)
      let refinedText: string;
      try {
        const refinePrompt = buildRefinePrompt(elevatedText);
        const openrouter = getOpenRouter();
        const refineResult = await timedGenerate("REFINE (Kimi)", {
          model: openrouter(MODELS.PROWRITE_DRAFT),
          system: refinePrompt.system,
          prompt: refinePrompt.user,
        }, deadlineMs);
        refinedText = refineResult.text;
        await trackStep(refineResult);
      } catch (error) {
        console.error("[ProWrite] REFINE via OpenRouter failed, falling back to Opus:", error);
        const refinePrompt = buildRefinePrompt(elevatedText);
        const refineResult = await timedGenerate("REFINE (Opus fallback)", {
          model: anthropic(MODELS.DEEP_REASONING),
          system: refinePrompt.system,
          prompt: refinePrompt.user,
        }, deadlineMs);
        refinedText = refineResult.text;
        await trackStep(refineResult);
      }
      stepsCompleted++;

      // STEP 8: HUMANIZE — strip AI artifacts, match user voice (Opus)
      const humanizePrompt = buildHumanizePrompt(refinedText, personality);
      const humanizeResult = await timedGenerate("HUMANIZE", {
        model: anthropic(MODELS.DEEP_REASONING),
        system: humanizePrompt.system,
        prompt: humanizePrompt.user,
      }, deadlineMs);
      await trackStep(humanizeResult);
      stepsCompleted++;

      const totalMs = Date.now() - pipelineStart;
      const totalSec = (totalMs / 1000).toFixed(1);
      console.log(`[ProWrite] Pipeline complete (${totalSec}s total)`);

      // Track feature_used for the entire pipeline (best-effort)
      if (phone && tier) {
        try {
          await ctx.scheduler.runAfter(0, internal.analytics.trackFeatureUsed, {
            phone,
            feature: "prowrite",
            tier,
            properties: { steps: stepsCompleted, latency_ms: totalMs },
          });
        } catch (error) {
          console.error("[ProWrite] Failed to schedule feature_used analytics:", error);
        }
      }

      return humanizeResult.text;
    } finally {
      // Always clean up stored brief — even on failure
      try {
        await ctx.runMutation(internal.proWrite.deleteBrief, { briefId: storedBriefId });
      } catch {
        // Non-critical — daily cron will catch it
      }
    }
  },
});
