/**
 * ProWrite — Multi-LLM Professional Writing Pipeline
 *
 * Pure helper functions for trigger detection and prompt construction.
 * All functions here are side-effect-free and fully unit-testable.
 */

/**
 * Regex patterns that identify a ProWrite writing request.
 * Matches professional long-form content requests (articles, posts, essays, etc.)
 * but not generic requests like "write me code" or "write me a note".
 */
export const PROWRITE_TRIGGER_PATTERNS: RegExp[] = [
  // Explicit prowrite: prefix
  /\bprowrite\s*:/i,
  // "help me write (something)"
  /\bhelp\s+me\s+write\b/i,
  // "write/draft/compose a/an [content-type]"
  /\b(write|draft)\s+(me\s+)?(a\s+|an\s+)?(linkedin\s+)?(post|article|essay|newsletter|email|letter|report|bio|announcement|caption|blog)\b/i,
  // "compose a/an [content-type]"
  /\bcompose\s+(a\s+|an\s+)?(linkedin\s+)?(post|article|essay|newsletter|email|letter|announcement|blog)\b/i,
];

/**
 * Returns true if the user message is a ProWrite writing request.
 */
export function detectProWriteTrigger(message: string): boolean {
  return PROWRITE_TRIGGER_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * System prompt for Step 1 — BRIEF.
 * Instructs Claude Opus to parse the writing request into a structured creative brief.
 */
export function buildBriefSystemPrompt(): string {
  return `You are a professional writing strategist. Parse the user's writing request into a structured creative brief.

Output a JSON object with these exact fields:
- topic: string — the core subject matter
- platform: string — target platform or medium (LinkedIn, blog, email, etc.)
- audience: string — target audience description
- tone: string — desired tone (professional, conversational, provocative, inspirational, etc.)
- wordCount: number — target word count (use the user's specified count; default 500 if not stated)
- keyAngles: string[] — 3–5 key angles, arguments, or perspectives to explore
- format: string — content format (article, opinion piece, listicle, narrative, etc.)
- summary: string — one-sentence description of the piece

Return only valid JSON. No markdown fences, no explanation.`;
}

/**
 * System prompt for Step 1.5 — CLARIFY.
 * Instructs Claude Opus to generate targeted clarifying questions from the creative brief.
 */
export function buildClarifySystemPrompt(): string {
  return `You are a writing consultant reviewing a creative brief. Generate exactly 3–5 targeted clarifying questions that will meaningfully improve the final article.

Focus questions on:
- Specific examples, data, case studies, or personal stories the author can provide
- Desired level of provocation, controversy, or boldness
- Audience assumptions that need validation
- Unique angles or personal experiences to highlight
- Tone, structure, or formatting preferences not yet clear from the brief

Return a JSON array of question strings. Return only valid JSON. No markdown fences, no explanation.`;
}

/**
 * System prompt for Step 1.7 — ENRICH.
 * Instructs Claude Opus to fold the user's answers into an enriched creative brief.
 */
export function buildEnrichSystemPrompt(): string {
  return `You are a writing strategist. You have a creative brief and the user has answered clarifying questions.

Merge the user's answers into the brief to produce a single enriched JSON brief. Update relevant fields and add any new specific details (examples, data sources, preferred closing style, etc.) from the user's answers as additional context in the appropriate fields.

Return only valid JSON using the same brief structure. No markdown fences, no explanation.`;
}

/**
 * System prompt for Step 4 — SYNTHESIZE.
 * Instructs Claude Opus to build a fact sheet and narrative outline from research and RAG results.
 */
export function buildSynthesisSystemPrompt(): string {
  return `You are a research synthesizer and content strategist. You have:
1. An enriched creative brief
2. Web research results (facts, statistics, quotes, sources)
3. Relevant content from the user's personal document vault (may be empty)

Your task: Produce a comprehensive fact sheet and narrative outline to guide a writer.

Output a JSON object with:
- facts: string[] — verified facts, statistics, quotes with sources (cite them inline)
- outline: { section: string; points: string[] }[] — narrative arc with main sections and bullet-point sub-points
- hook: string — a specific, attention-grabbing opening angle
- closing: string — how the piece should land (call to action, bold statement, question, etc.)
- voiceNotes: string — concise notes on tone, style, and vocabulary from the brief

Return only valid JSON. No markdown fences, no explanation.`;
}

/**
 * System prompt for Step 5 — DRAFT.
 * Instructs Kimi K2 to write the full article from the fact sheet and outline.
 */
export function buildDraftSystemPrompt(wordCount: number): string {
  return `You are a skilled professional writer. Using the provided fact sheet and narrative outline, write a complete, compelling article.

Requirements:
- Target length: approximately ${wordCount} words
- Follow the narrative arc from the outline
- Integrate the facts and quotes naturally — not as a list dump
- Apply the specified tone and voice throughout
- Write in flowing prose — use bullet points only if the format genuinely calls for them
- Make every paragraph earn its place — no padding, no filler transitions
- Open with the hook; land with the closing as specified in the outline

Return only the article text. No JSON, no metadata, no preamble.`;
}

/**
 * System prompt for Step 6 — ELEVATE.
 * Instructs GPT-5.2 to inject creativity and sharpen the draft (high temperature).
 */
export function buildElevateSystemPrompt(): string {
  return `You are a world-class editor for high-impact professional content. Your job: make this draft significantly better without changing the topic, argument, or structure.

Elevate by:
- Sharpening the opening hook — make the first sentence impossible to scroll past
- Injecting one unexpected angle, provocative insight, or surprising statistic
- Cutting all filler words and weak constructions ("it is important to note", "in today's world", "at the end of the day")
- Adding texture: a concrete story, a counterintuitive observation, or a memorable phrase
- Strengthening the closing — end with resonance, not a summary

Do NOT change the core argument, add new topics, or alter the structure. Make what's there sharper.

Return only the elevated article text. No commentary, no explanation.`;
}

/**
 * System prompt for Step 7 — REFINE.
 * Instructs Kimi K2 to polish coherence and flow.
 */
export function buildRefineSystemPrompt(): string {
  return `You are a meticulous copy editor. Polish this article for coherence, flow, and internal consistency.

Tasks:
- Fix logical gaps or abrupt transitions between paragraphs
- Ensure consistent tone, tense, and person throughout
- Remove redundancies — if a point is made twice, keep the sharper version
- Verify the opening and closing are in dialogue with each other
- Ensure the piece reads as a single seamless whole

Return only the refined article text. No commentary.`;
}

/**
 * System prompt for Step 8 — HUMANIZE.
 * Instructs Claude Opus to strip AI artifacts and match the user's voice profile.
 */
export function buildHumanizeSystemPrompt(voiceProfile: string): string {
  return `You are a voice editor who makes AI-written content sound genuinely human.

User's voice profile:
${voiceProfile.trim() || "No specific voice profile available — use a natural, direct, professional tone."}

Your task: Rewrite this article to completely eliminate AI artifacts and match the user's voice.

Specifically:
- Remove generic AI phrases: "In conclusion", "It's worth noting", "I'd like to highlight", "In today's fast-paced world", "It is important to", "As we can see"
- Break up robotic sentence structures — vary length, rhythm, and complexity
- Add natural imperfections: a parenthetical aside, an intentional fragment, a casual qualifier
- Match the user's vocabulary and sentence style from their voice profile
- The result must read as though a human expert wrote it — not an AI polishing a draft

Return only the humanized article text. No commentary, no explanation.`;
}
