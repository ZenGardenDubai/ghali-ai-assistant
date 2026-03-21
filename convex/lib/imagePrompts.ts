/**
 * Prompt enhancement for image editing mode.
 * Detects style intent from the user's raw prompt and expands it
 * with detailed guidance for better Gemini output quality.
 */

interface StyleMapping {
  pattern: RegExp;
  prompt: string;
}

const STYLE_MAPPINGS: StyleMapping[] = [
  {
    pattern: /ghibli|ジブリ|جيبلي/i,
    prompt:
      "Transform into Studio Ghibli anime style. Preserve the subject's face, likeness, and appearance exactly. Soft warm Ghibli color palette, painterly background, delicate anime line art.",
  },
  {
    pattern: /manga|مانغا/i,
    prompt:
      "Transform into detailed black-and-white manga comic art style. Preserve the subject's face and likeness exactly. High-contrast ink linework, expressive eyes, manga screen-tone shading.",
  },
  {
    pattern: /\banime\b/i,
    prompt:
      "Transform into vibrant anime illustration style. Preserve the subject's face and likeness exactly. Clean cel-shaded colors, expressive anime features.",
  },
  {
    pattern: /pixar|disney/i,
    prompt:
      "Transform into Pixar/Disney 3D animation style. Preserve the subject's face and likeness. Warm studio lighting, polished 3D render.",
  },
  {
    pattern: /watercolor/i,
    prompt:
      "Transform into soft watercolor painting style. Preserve the subject's face and likeness. Delicate washes, painterly strokes, soft edges.",
  },
  {
    pattern: /oil\s*paint(?:ing)?/i,
    prompt:
      "Transform into classical oil painting style. Preserve the subject's face and likeness. Rich colors, visible brushwork, masterful portrait lighting.",
  },
];

const CONSISTENCY_SUFFIX =
  "Keep all other details (background, clothing, pose) consistent with the original.";

/**
 * Enhances a raw user edit prompt with style-specific guidance.
 * Known styles are expanded to detailed transformation instructions.
 * Unknown prompts are wrapped in a fallback template that preserves likeness.
 */
export function enhanceEditPrompt(userPrompt: string): string {
  for (const { pattern, prompt } of STYLE_MAPPINGS) {
    if (pattern.test(userPrompt)) {
      return `${prompt} ${CONSISTENCY_SUFFIX}`;
    }
  }
  return `Transform the image: ${userPrompt}. Preserve the subject's face, likeness, and appearance exactly. ${CONSISTENCY_SUFFIX}`;
}
