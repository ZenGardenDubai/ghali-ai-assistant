/**
 * ProWrite — multi-LLM professional writing pipeline.
 *
 * Pipeline (8 steps):
 *   1. BRIEF      — Claude Opus: parse request → creative brief
 *   1.5 CLARIFY   — Claude Opus: generate targeted questions from brief
 *   1.7 ENRICH    — Claude Opus: fold user answers into enriched brief
 *   2. RESEARCH   — Gemini Flash + Google Search grounding: web research
 *   3. RAG        — Memory Vault search: user's own documents
 *   4. SYNTHESIZE — Claude Opus: fact sheet + narrative arc + outline
 *   5. DRAFT      — Kimi K2 (OpenRouter) or Opus fallback: write full article
 *   6. ELEVATE    — GPT-4o (OpenRouter) or Opus fallback: sharpen hooks (temp 0.9)
 *   7. REFINE     — Kimi K2 (OpenRouter) or Opus fallback: polish coherence + flow
 *   8. HUMANIZE   — Claude Opus: strip AI artifacts, match voice profile
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { MODELS } from "./constants";
import {
  extractKeywordsFromBrief,
  formatArticleForWhatsApp,
} from "./lib/proWrite";

// ─── OpenRouter Helper ─────────────────────────────────────────────────────

/**
 * Returns an OpenRouter-backed model, or null if OPENROUTER_API_KEY is not set.
 * Falls back to Claude Opus when unavailable.
 */
function getOpenRouterModel(modelId: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const client = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });
  return client(modelId);
}

// ─── Step Functions ────────────────────────────────────────────────────────

/** Step 1: Generate a creative brief from the user's request. */
export async function generateBrief(request: string): Promise<string> {
  const result = await generateText({
    model: anthropic(MODELS.DEEP_REASONING),
    temperature: 0.7,
    system: `You are a senior content strategist and editor. Parse the user's writing request and create a detailed creative brief.

Return a brief with these sections:
- *Topic & Core Argument*
- *Platform & Format* (LinkedIn post, blog article, email, etc.)
- *Target Audience*
- *Tone & Voice*
- *Target Word Count*
- *Key Angles* (3-4 specific angles to explore)
- *Data/Evidence Needed*
- *Headline Options* (2-3 options)

Be specific and commit to a clear direction. Format for WhatsApp: use *bold* for section names, plain text for content.`,
    prompt: request,
  });
  return result.text;
}

/** Step 1.5: Generate targeted clarifying questions from the brief. */
export async function generateClarifyingQuestions(
  request: string,
  brief: string
): Promise<string> {
  const result = await generateText({
    model: anthropic(MODELS.DEEP_REASONING),
    temperature: 0.7,
    system: `You are a content strategist. Based on the writing request and creative brief, generate 3-5 targeted clarifying questions that will significantly improve the final article.

Focus on:
- Specific data, examples, or personal stories to include
- Desired level of controversy or provocation
- Audience nuances and context
- Brand voice or personal style preferences
- Topics to avoid or highlight

Return a numbered list. Keep questions concise and specific — not generic.`,
    prompt: `Request: ${request}\n\nBrief:\n${brief}`,
  });
  return result.text;
}

/** Step 1.7: Enrich the brief with the user's answers. */
export async function enrichBrief(
  request: string,
  brief: string,
  answers: string
): Promise<string> {
  const result = await generateText({
    model: anthropic(MODELS.DEEP_REASONING),
    temperature: 0.5,
    system: `You are a content strategist. Update the creative brief by folding in the user's answers to the clarifying questions. Add all specific details, examples, data, and preferences they mentioned. Return the full updated brief in the same structured format.`,
    prompt: `Original request: ${request}\n\nOriginal brief:\n${brief}\n\nUser answers:\n${answers}`,
  });
  return result.text;
}

/** Step 2: Research with Gemini + Google Search grounding. */
export async function researchTopic(brief: string): Promise<string> {
  try {
    const result = await generateText({
      model: google(MODELS.FLASH),
      tools: { google_search: google.tools.googleSearch({}) },
      system: `You are a research analyst. Based on the creative brief, find current and accurate:
- Recent statistics and data (last 2 years)
- Expert quotes or published studies
- Real-world case studies or examples
- Counterarguments or opposing views to address

Format your findings as a structured research summary with source references.`,
      prompt: `Creative brief:\n${brief}\n\nConduct web research to support this article.`,
    });
    return result.text;
  } catch {
    return "Research step unavailable. Proceeding with the model's existing knowledge.";
  }
}

/** Step 4: Synthesize research + RAG into a fact sheet, narrative arc, and outline. */
export async function synthesizeResearch(
  brief: string,
  research: string,
  ragResults: string
): Promise<string> {
  const result = await generateText({
    model: anthropic(MODELS.DEEP_REASONING),
    temperature: 0.6,
    system: `You are a senior editor and narrative architect. Synthesize the provided research and personal documents into a writing plan:

1. *Key Facts & Stats* — vetted claims and data to use
2. *Narrative Arc* — the emotional and logical journey for the reader
3. *Detailed Outline* — section by section with key points and transitions
4. *Opening Hook Options* — 2-3 options for the first paragraph
5. *Closing Punch* — how to end with maximum impact

Make strong editorial decisions. Avoid hedging.`,
    prompt: `Creative brief:\n${brief}\n\nWeb research:\n${research}\n\nUser's personal documents:\n${ragResults || "No relevant documents found."}`,
  });
  return result.text;
}

/** Step 5: Draft the full article — Kimi K2 (OpenRouter) or Claude Opus fallback. */
export async function draftArticle(
  brief: string,
  outline: string
): Promise<string> {
  const kimiModel = getOpenRouterModel("moonshotai/kimi-k2");
  const model = kimiModel ?? anthropic(MODELS.DEEP_REASONING);

  const result = await generateText({
    model,
    temperature: 0.8,
    system: `You are a talented writer and journalist. Write the full article following the creative brief and outline exactly.

Rules:
- Follow the outline's structure strictly
- Use the provided opening hook and closing
- Write in a natural, human, engaging style — not corporate speak
- Vary sentence length and rhythm for readability
- Include all specified data, examples, and quotes
- Hit the target word count specified in the brief`,
    prompt: `Creative brief:\n${brief}\n\nOutline:\n${outline}`,
  });
  return result.text;
}

/** Step 6: Elevate creativity and sharpen hooks — GPT-4o (OpenRouter) or Claude Opus fallback. */
export async function elevateArticle(
  draft: string,
  brief: string
): Promise<string> {
  const gptModel = getOpenRouterModel("openai/gpt-4o");
  const model = gptModel ?? anthropic(MODELS.DEEP_REASONING);

  const result = await generateText({
    model,
    temperature: 0.9,
    system: `You are a world-class creative editor known for transforming good writing into exceptional writing. Elevate the draft by:

1. Sharpening the opening hook — make the first paragraph impossible to ignore
2. Adding 1-2 unexpected metaphors or analogies that illuminate the core idea
3. Strengthening important arguments with bolder, more confident language
4. Punching up weak verbs and passive constructions
5. Ensuring the closing lands with maximum impact

Do not rewrite entirely — elevate what is already there. Return the full improved article.`,
    prompt: `Creative brief:\n${brief}\n\nDraft to elevate:\n${draft}`,
  });
  return result.text;
}

/** Step 7: Polish coherence and flow — Kimi K2 (OpenRouter) or Claude Opus fallback. */
export async function refineArticle(elevated: string): Promise<string> {
  const kimiModel = getOpenRouterModel("moonshotai/kimi-k2");
  const model = kimiModel ?? anthropic(MODELS.DEEP_REASONING);

  const result = await generateText({
    model,
    temperature: 0.4,
    system: `You are a meticulous copy editor. Polish the article for:

1. Coherence — does each paragraph flow logically to the next?
2. Consistency — same voice, tense, and terminology throughout
3. Clarity — cut any confusing or redundant sentences
4. Word count — stay within 10% of the target (trim or expand as needed)
5. Grammar and style

Return the full polished article.`,
    prompt: elevated,
  });
  return result.text;
}

/** Step 8: Humanize — strip AI artifacts, match the user's voice profile. */
export async function humanizeArticle(
  refined: string,
  voiceProfile: string
): Promise<string> {
  const result = await generateText({
    model: anthropic(MODELS.DEEP_REASONING),
    temperature: 0.6,
    system: `You are an expert at making AI-written content sound completely human and authentic.

Remove all AI-typical patterns:
- Transition phrases like "In conclusion", "Furthermore", "Moreover", "It is worth noting"
- Overly balanced statements ("While X, it's also important to consider Y")
- Generic superlatives ("groundbreaking", "revolutionary", "transformative")
- Passive voice constructions
- Hedging language ("it could be argued that", "some might say")

Match the user's voice profile:
${voiceProfile || "No specific voice profile — use a natural, confident, professional human tone."}

Add authentic human touches:
- Specific, confident opinions
- Direct address where natural
- Conversational rhythm without being informal

Return the humanized article only — no commentary.`,
    prompt: refined,
  });
  return result.text;
}

// ─── Main Pipeline Action ──────────────────────────────────────────────────

/**
 * Execute the full 8-step ProWrite pipeline.
 * Called asynchronously from the proWriteExecute agent tool.
 * Sends the finished article (and follow-up prompt) directly to the user via Twilio.
 */
export const executePipeline = internalAction({
  args: {
    userId: v.string(),
    phone: v.string(),
    enrichedBrief: v.string(),
    voiceProfile: v.string(),
    originalRequest: v.string(),
  },
  handler: async (
    ctx,
    { userId, phone, enrichedBrief, voiceProfile }
  ) => {
    try {
      // Step 2: Research
      const research = await researchTopic(enrichedBrief);

      // Step 3: RAG — search user's own documents
      const keywords = extractKeywordsFromBrief(enrichedBrief);
      let ragResults = "";
      if (keywords) {
        try {
          ragResults = (await ctx.runAction(internal.rag.searchDocuments, {
            userId,
            query: keywords,
            limit: 5,
          })) as string;
        } catch {
          ragResults = "";
        }
      }

      // Step 4: Synthesize
      const outline = await synthesizeResearch(enrichedBrief, research, ragResults);

      // Step 5: Draft
      const draft = await draftArticle(enrichedBrief, outline);

      // Step 6: Elevate
      const elevated = await elevateArticle(draft, enrichedBrief);

      // Step 7: Refine
      const refined = await refineArticle(elevated);

      // Step 8: Humanize
      const article = await humanizeArticle(refined, voiceProfile);

      // Deliver the article
      const formatted = formatArticleForWhatsApp(article);
      await ctx.runAction(internal.twilio.sendMessage, {
        to: phone,
        body: formatted,
      });

      // Prompt for adjustments
      await ctx.runAction(internal.twilio.sendMessage, {
        to: phone,
        body: "Want any adjustments? (shorter, different tone, more examples, different angle)",
      });
    } catch (error) {
      console.error("[ProWrite] Pipeline failed:", error);
      await ctx.runAction(internal.twilio.sendMessage, {
        to: phone,
        body: "Sorry, the writing pipeline ran into an issue. Please try your request again.",
      });
    }
  },
});
