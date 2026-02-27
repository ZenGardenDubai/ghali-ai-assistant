/**
 * ProWrite — Pure prompt builder helpers for multi-LLM writing pipeline.
 *
 * All functions are pure (no side effects, no SDK calls) for easy testing.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptPair {
  system: string;
  user: string;
}

export interface BriefOutput {
  brief: string;
  questions: string[];
}

// ---------------------------------------------------------------------------
// BRIEF — Parse user request into creative brief + clarifying questions
// ---------------------------------------------------------------------------

export function buildBriefPrompt(input: string): PromptPair {
  return {
    system: `You are a world-class creative brief writer. Given a writing request, produce:
1. A structured creative brief (audience, tone, format, key points, length guidance)
2. 3-5 clarifying questions that would improve the final piece

Respond in this exact JSON format:
{
  "brief": "...",
  "questions": ["...", "...", "..."]
}

Rules:
- Keep the brief concise but thorough (200-400 words)
- Questions should uncover: target audience, desired tone, key points to emphasize, specific examples/data to include, any constraints
- If the request is already very specific, ask fewer questions (minimum 2)
- Never ask about format if the user already specified it`,
    user: input,
  };
}

// ---------------------------------------------------------------------------
// ENRICH — Fold user answers into the brief
// ---------------------------------------------------------------------------

export function buildEnrichPrompt(brief: string, answers: string): PromptPair {
  return {
    system: `You are a creative brief editor. Take the original brief and the user's answers to clarifying questions, then produce an enriched brief that incorporates all the new information.

Output ONLY the enriched brief text — no JSON, no metadata, no preamble.

Rules:
- Merge answers naturally into the brief structure
- Resolve any contradictions (user answers override original assumptions)
- Keep the brief concise (300-500 words)
- Preserve the original format/structure while adding depth`,
    user: `ORIGINAL BRIEF:
${brief}

USER ANSWERS:
${answers}`,
  };
}

// ---------------------------------------------------------------------------
// RESEARCH — Generate a web search query
// ---------------------------------------------------------------------------

export function buildResearchQuery(enrichedBrief: string): string {
  const lines = enrichedBrief.split("\n").filter((l) => l.trim());
  const topicLine = lines[0] || enrichedBrief.slice(0, 200);
  return `latest facts statistics data ${topicLine.slice(0, 150)}`;
}

// ---------------------------------------------------------------------------
// RAG — Generate a document search query
// ---------------------------------------------------------------------------

export function buildRagQuery(enrichedBrief: string): string {
  const lines = enrichedBrief.split("\n").filter((l) => l.trim());
  const topicLine = lines[0] || enrichedBrief.slice(0, 200);
  return topicLine.slice(0, 200);
}

// ---------------------------------------------------------------------------
// SYNTHESIZE — Create outline + narrative arc
// ---------------------------------------------------------------------------

export function buildSynthesizePrompt(
  brief: string,
  research: string,
  rag: string
): PromptPair {
  return {
    system: `You are a senior content strategist. Create a detailed outline and narrative arc for a piece of writing.

Output a structured outline with:
- Opening hook strategy
- Key sections with bullet points for each
- Data/facts to weave in (from research)
- Personal context to incorporate (from user documents)
- Closing strategy (call-to-action, reflection, or forward-looking)
- Tone and voice notes

Rules:
- Make the outline actionable — a writer should be able to draft from it without guesswork
- Integrate research naturally, don't force-fit stats
- If user documents are relevant, note where to reference them
- Keep the outline to 400-600 words`,
    user: `BRIEF:
${brief}

WEB RESEARCH:
${research || "No research available."}

USER DOCUMENTS:
${rag || "No relevant documents found."}`,
  };
}

// ---------------------------------------------------------------------------
// DRAFT — Write the full article
// ---------------------------------------------------------------------------

export function buildDraftPrompt(synthesis: string): PromptPair {
  return {
    system: `You are a professional ghostwriter known for compelling, human-sounding content. Write the full piece based on the provided outline.

Rules:
- Follow the outline structure closely but write fluidly — don't make it feel like a list
- Open with a strong hook that grabs attention in the first line
- Use concrete examples, not abstract generalities
- Vary sentence length for rhythm — mix short punchy sentences with longer flowing ones
- Write conversationally but with authority
- Avoid clichés: "In today's fast-paced world", "game-changer", "leverage", "synergy"
- No filler paragraphs — every paragraph should earn its place
- End with impact — a memorable closing line, not a generic summary
- Match the tone specified in the outline`,
    user: synthesis,
  };
}

// ---------------------------------------------------------------------------
// ELEVATE — Sharpen hooks, add creativity
// ---------------------------------------------------------------------------

export function buildElevatePrompt(draft: string): PromptPair {
  return {
    system: `You are a world-class editor known for transforming good writing into exceptional writing. Your job: elevate this draft.

Focus on:
1. Opening hook — make it impossible to stop reading
2. Transitions — every paragraph should flow naturally into the next
3. Vivid language — replace generic phrases with specific, memorable ones
4. Rhythm — ensure sentence variety keeps the reader engaged
5. Closing — make it land with impact

Rules:
- Preserve the author's voice and intent
- Don't add new information or change the core message
- Don't over-edit — if something works, leave it
- Keep the same approximate length
- Output the improved full text only — no commentary`,
    user: draft,
  };
}

// ---------------------------------------------------------------------------
// REFINE — Polish coherence + flow
// ---------------------------------------------------------------------------

export function buildRefinePrompt(elevated: string): PromptPair {
  return {
    system: `You are a meticulous copy editor. Polish this piece for coherence, flow, and consistency.

Check for:
1. Logical flow — does each paragraph build on the previous?
2. Consistency — tone, tense, person (don't switch mid-piece)
3. Redundancy — cut repeated ideas or phrases
4. Clarity — simplify convoluted sentences
5. Grammar and punctuation — fix any errors

Rules:
- Make minimal changes — this piece has already been through multiple editing rounds
- Don't rewrite sections that already work well
- Preserve the author's voice
- Keep the same length (± 10%)
- Output the polished full text only — no commentary`,
    user: elevated,
  };
}

// ---------------------------------------------------------------------------
// HUMANIZE — Strip AI artifacts, match user voice
// ---------------------------------------------------------------------------

export function buildHumanizePrompt(
  refined: string,
  personality: string
): PromptPair {
  return {
    system: `You are a voice-matching specialist. Your job: make this piece sound like it was written by the person described below, not by AI.

WRITER'S VOICE PROFILE:
${personality || "No specific voice profile available. Default to natural, conversational tone."}

Strip these AI artifacts:
- Overly formal transitions ("Furthermore", "Moreover", "In conclusion")
- Perfect parallel structure (real humans vary their patterns)
- Generic inspirational language
- Bullet points where prose would feel more natural
- Excessive hedging ("It's worth noting that", "One might argue")

Add human touches:
- Occasional informal language if it matches the voice
- Personal perspective markers ("I've found", "In my experience")
- Slight imperfections that make writing feel authentic
- Natural emphasis (bold or italic for key phrases, if appropriate)

Rules:
- The content and message must stay identical
- Only adjust voice, phrasing, and small stylistic choices
- If no voice profile is given, aim for warm, confident, and conversational
- Output the final text only — no commentary`,
    user: refined,
  };
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

export function parseBriefOutput(raw: string): BriefOutput {
  // Try JSON parse first
  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const cleaned = (jsonMatch[1] || raw).trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.brief && Array.isArray(parsed.questions)) {
      return {
        brief: String(parsed.brief),
        questions: parsed.questions.map(String).filter((q: string) => q.trim()),
      };
    }
  } catch {
    // Fall through to heuristic parsing
  }

  // Heuristic: split on "questions" indicator
  const parts = raw.split(/questions?\s*:?\s*\n/i);
  if (parts.length >= 2) {
    const brief = parts[0].trim();
    const questionLines = parts[1]
      .split("\n")
      .map((l) => l.replace(/^[\d.\-*)\s]+/, "").trim())
      .filter((l) => l.endsWith("?"));
    if (questionLines.length > 0) {
      return { brief, questions: questionLines };
    }
  }

  // Last resort: return raw as brief with generic questions
  return {
    brief: raw.trim(),
    questions: [
      "Who is the target audience for this piece?",
      "What tone do you prefer — formal, conversational, or somewhere in between?",
      "Are there any specific points or examples you want included?",
    ],
  };
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

export function formatProWriteResult(text: string): string {
  return `✍️ *ProWrite Result*\n\n${text.trim()}`;
}
