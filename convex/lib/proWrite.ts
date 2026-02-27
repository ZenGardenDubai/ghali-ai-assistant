/**
 * Pure utility functions for the ProWrite pipeline.
 * No external dependencies — fully unit-testable.
 */

/**
 * Check if a message is a prowrite request (starts with "prowrite").
 */
export function isProWriteRequest(message: string): boolean {
  return message.toLowerCase().trimStart().startsWith("prowrite");
}

/**
 * Check if the user wants to skip clarifying questions.
 */
export function isSkipQuestionsRequest(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return (
    lower === "skip" ||
    lower === "skip questions" ||
    lower === "just write it" ||
    lower === "just write" ||
    lower.includes("skip the questions") ||
    lower.includes("no questions") ||
    lower.includes("skip questions")
  );
}

/**
 * Extract the writing request content after the "prowrite" keyword.
 * "prowrite a LinkedIn post about X" → "a LinkedIn post about X"
 * "prowrite: blog post about Y" → "blog post about Y"
 */
export function extractProWriteContent(message: string): string {
  const lower = message.toLowerCase();
  const idx = lower.indexOf("prowrite");
  if (idx === -1) return message.trim();
  const after = message.slice(idx + "prowrite".length).trim();
  // Remove leading colon or dash
  return after.replace(/^[:\-]\s*/, "").trim();
}

/**
 * Format clarifying questions for WhatsApp delivery.
 */
export function formatProWriteQuestions(
  briefSummary: string,
  questions: string[]
): string {
  if (questions.length === 0) {
    return `📝 *Here's what I'm thinking:*\n\n${briefSummary}\n\nReady to write! Reply to confirm or suggest changes.`;
  }
  const qLines = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
  return `📝 *Here's what I'm thinking:*\n\n${briefSummary}\n\nBefore I start writing, a few questions:\n\n${qLines}\n\n_Answer any or all — or say "skip questions" to write immediately._`;
}

/**
 * Build the pipeline start message (sets user expectations).
 */
export function buildPipelineStartMessage(): string {
  return "Starting the writing pipeline now ✍️ This usually takes 3-4 minutes — I'll send you the final article when it's ready.";
}
