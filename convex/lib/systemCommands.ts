/**
 * System command handling — template-based responses, no AI generation.
 * Pipeline: detect command → fill template → detect language → translate if needed → return.
 *
 * These are plain async functions (not Convex actions) called within generateResponse.
 */

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { MODELS } from "../models";
import { TEMPLATES } from "../templates";
import { fillTemplate } from "./utils";

// Supported languages for translation
const SUPPORTED_LANGUAGES = new Set(["en", "ar", "fr", "es", "hi", "ur"]);

/**
 * Validate and normalize a language code.
 * Returns "en" for unsupported or invalid codes.
 */
export function validateLanguageCode(code: string): string {
  const normalized = code.toLowerCase().trim().slice(0, 2);
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : "en";
}

/**
 * Detect the language of a user message using Flash.
 * Returns ISO 639-1 code from the supported set.
 */
export async function detectLanguage(message: string): Promise<string> {
  try {
    const result = await generateText({
      model: google(MODELS.FLASH),
      temperature: 0,
      system: `You are a language detector. Return ONLY the ISO 639-1 language code (2 letters) for the given text. Supported codes: en, ar, fr, es, hi, ur. If unsure or the language is not in the supported list, return "en". Return ONLY the 2-letter code, nothing else.`,
      prompt: message,
    });
    return validateLanguageCode(result.text);
  } catch (error) {
    console.error("detectLanguage failed:", error);
    return "en";
  }
}

/**
 * Translate a filled template to the target language using Flash.
 * Skips translation if targetLang is "en" (saves tokens).
 * Preserves numbers, emoji, *bold*, and URLs.
 */
export async function translateMessage(
  filledTemplate: string,
  targetLang: string
): Promise<string> {
  if (targetLang === "en") {
    return filledTemplate;
  }

  try {
    const result = await generateText({
      model: google(MODELS.FLASH),
      temperature: 0,
      system: `Translate the following message to ${targetLang}. Rules:
- Preserve all numbers exactly as they are
- Preserve all emoji exactly as they are
- Preserve *bold* formatting (asterisks around words)
- Preserve all URLs exactly as they are
- Translate naturally, not word-for-word
- Return ONLY the translated message, nothing else`,
      prompt: filledTemplate,
    });
    return result.text;
  } catch (error) {
    console.error("translateMessage failed:", error);
    return filledTemplate; // Fall back to English
  }
}

/**
 * Full pipeline: fill template → detect language → translate if not English.
 */
export async function renderSystemMessage(
  templateKey: keyof typeof TEMPLATES,
  variables: Record<string, string | number>,
  userMessage: string
): Promise<string> {
  const filled = fillTemplate(TEMPLATES[templateKey].template, variables);
  const lang = await detectLanguage(userMessage);
  return translateMessage(filled, lang);
}

// Pending action types that can be set from a system command or admin command
export type PendingActionType =
  | "clear_memory"
  | "clear_documents"
  | "clear_everything"
  | "admin_broadcast";

// Result from handleSystemCommand — includes optional pendingAction to set
export interface SystemCommandResult {
  response: string;
  pendingAction?: PendingActionType;
}

// User type expected by handleSystemCommand
interface SystemCommandUser {
  tier: "basic" | "pro";
  credits: number;
  creditsResetAt: number;
}

// UserFile type expected by handleSystemCommand
interface UserFile {
  filename: string;
  content: string;
}

/**
 * Route a system command to its template response.
 * Returns { response, pendingAction? } or null to fall through to AI.
 */
export async function handleSystemCommand(
  command: string,
  user: SystemCommandUser,
  userFiles: UserFile[],
  userMessage: string,
  docCount?: number
): Promise<SystemCommandResult | null> {
  const normalized = command.toLowerCase().trim();

  switch (normalized) {
    case "credits": {
      const resetDate = new Date(user.creditsResetAt).toLocaleDateString(
        "en-US",
        { month: "long", day: "numeric", year: "numeric" }
      );
      return {
        response: await renderSystemMessage(
          "check_credits",
          {
            credits: user.credits,
            tier: user.tier === "pro" ? "Pro" : "Basic",
            resetDate,
          },
          userMessage
        ),
      };
    }

    case "help":
      return { response: await renderSystemMessage("help", {}, userMessage) };

    case "privacy":
      return { response: await renderSystemMessage("privacy", {}, userMessage) };

    case "upgrade": {
      if (user.tier === "pro") {
        const renewDate = new Date(user.creditsResetAt).toLocaleDateString(
          "en-US",
          { month: "long", day: "numeric", year: "numeric" }
        );
        return {
          response: await renderSystemMessage(
            "already_pro",
            {
              credits: user.credits,
              storageUsed: "0 KB",
              renewDate,
            },
            userMessage
          ),
        };
      }
      const upgradeUrl =
        process.env.UPGRADE_URL ?? "https://ghali.ae/upgrade";
      return {
        response: await renderSystemMessage("upgrade", { upgradeUrl }, userMessage),
      };
    }

    case "my memory": {
      const memoryFile = userFiles.find((f) => f.filename === "memory");
      const memoryContent =
        memoryFile?.content || "I haven't learned anything about you yet. Let's chat!";
      return {
        response: await renderSystemMessage(
          "memory_summary",
          { memoryContent },
          userMessage
        ),
      };
    }

    case "clear memory":
      return {
        response: await renderSystemMessage("clear_memory_confirm", {}, userMessage),
        pendingAction: "clear_memory",
      };

    case "clear documents":
      return {
        response: await renderSystemMessage(
          "clear_documents_confirm",
          { docCount: docCount ?? 0 },
          userMessage
        ),
        pendingAction: "clear_documents",
      };

    case "clear everything":
      return {
        response: await renderSystemMessage(
          "clear_everything_confirm",
          {},
          userMessage
        ),
        pendingAction: "clear_everything",
      };

    case "account":
      // No SPEC template — let AI handle conversationally
      return null;

    default:
      return null;
  }
}
