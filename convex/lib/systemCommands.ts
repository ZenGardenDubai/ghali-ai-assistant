/**
 * System command handling — template-based responses, no AI generation.
 * Pipeline: detect command → fill template → detect language → translate if needed → return.
 *
 * These are plain async functions (not Convex actions) called within generateResponse.
 */

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { CREDITS_BASIC, CREDITS_PRO } from "../constants";
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
  | "clear_schedules"
  | "clear_everything"
  | "admin_broadcast"
  | "delete_account";

// Immediate action types that execute directly (no confirmation needed)
export type ImmediateActionType = "opt_out" | "opt_in";

// Result from handleSystemCommand — includes optional pendingAction to set
export interface SystemCommandResult {
  response: string;
  pendingAction?: PendingActionType;
  immediateAction?: ImmediateActionType;
}

// User type expected by handleSystemCommand
interface SystemCommandUser {
  phone: string;
  tier: "basic" | "pro";
  credits: number;
  creditsResetAt: number;
  language: string;
  timezone: string;
  subscriptionCanceling?: boolean;
  optedOut?: boolean;
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
    // === Account Control ===
    case "stop": {
      if (user.optedOut) {
        return {
          response: await renderSystemMessage("stop_confirmed", {}, userMessage),
        };
      }
      return {
        response: await renderSystemMessage("stop_confirmed", {}, userMessage),
        immediateAction: "opt_out",
      };
    }

    case "start": {
      if (!user.optedOut) {
        return {
          response: await renderSystemMessage("start_confirmed", {}, userMessage),
        };
      }
      return {
        response: await renderSystemMessage("start_confirmed", {}, userMessage),
        immediateAction: "opt_in",
      };
    }

    case "delete": {
      // Block deletion for active Pro subscribers — must cancel subscription first
      if (user.tier === "pro" && !user.subscriptionCanceling) {
        const base = process.env.BASE_URL ?? "http://localhost:3000";
        const accountUrl = `${base}/account?phone=${encodeURIComponent(user.phone)}`;
        return {
          response: await renderSystemMessage("delete_cancel_subscription_first", { accountUrl }, userMessage),
        };
      }
      return {
        response: await renderSystemMessage("delete_account_confirm", {}, userMessage),
        pendingAction: "delete_account",
      };
    }

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

    case "feedback":
      return { response: await renderSystemMessage("feedback", {}, userMessage) };

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
              maxCredits: CREDITS_PRO,
              renewDate,
            },
            userMessage
          ),
        };
      }
      const base = process.env.BASE_URL ?? "http://localhost:3000";
      const url = `${base}/upgrade?phone=${encodeURIComponent(user.phone)}`;
      return {
        response: await renderSystemMessage("upgrade", { upgradeUrl: url }, userMessage),
      };
    }

    case "my memory": {
      const profileFile = userFiles.find((f) => f.filename === "profile");
      const memoryFile = userFiles.find((f) => f.filename === "memory");
      const parts: string[] = [];
      const cleanProfile = profileFile?.content
        ?.replace(/^##\s.*$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      if (cleanProfile) {
        parts.push(`*Profile:*\n${cleanProfile}`);
      }
      if (memoryFile?.content) {
        parts.push(`*Memory:*\n${memoryFile.content}`);
      }
      const memoryContent =
        parts.length > 0 ? parts.join("\n\n") : "I haven't learned anything about you yet. Let's chat!";
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

    case "clear schedules":
      return {
        response: await renderSystemMessage("clear_schedules_confirm", {}, userMessage),
        pendingAction: "clear_schedules",
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

    case "account": {
      const maxCredits = user.tier === "pro" ? CREDITS_PRO : CREDITS_BASIC;
      const resetDate = new Date(user.creditsResetAt).toLocaleDateString(
        "en-US",
        { month: "long", day: "numeric", year: "numeric" }
      );
      const cancelingNote = user.subscriptionCanceling
        ? "\n\n⚠️ Your Pro plan is set to cancel at the end of this billing period."
        : "";
      return {
        response: await renderSystemMessage(
          "account",
          {
            tier: user.tier === "pro" ? "Pro ⭐" : "Basic (Free)",
            credits: user.credits,
            maxCredits,
            resetDate,
            language: user.language,
            timezone: user.timezone,
            cancelingNote,
          },
          userMessage
        ),
      };
    }

    default:
      return null;
  }
}
