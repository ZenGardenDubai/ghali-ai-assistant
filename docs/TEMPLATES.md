# Template Messages System

## Overview

System messages (account info, help, credits, errors, etc.) use **pre-defined templates** with variable placeholders. These are translated to the user's language on-the-fly using LLM translation.

This ensures:
- **Consistent formatting** — WhatsApp-friendly (*bold*, emoji, structure)
- **Accurate data** — Numbers, dates, links never get hallucinated
- **Multilingual** — Auto-detected language, translated on demand
- **Fast** — Templates render instantly, translation is one cheap LLM call
- **Maintainable** — All system messages in one place, easy to update

## Architecture

```
User sends "check my credits"
  → Ghali detects: system command (not free-form chat)
  → Fetches data (credits, storage, etc.)
  → Fills template with variables
  → Detects user language (from message or preference)
  → If not English → translates filled template
  → Sends to user
```

## Template Structure

```ts
interface MessageTemplate {
  readonly template: string;       // Message with {{variable}} placeholders
  readonly variables: string[];    // List of expected variables
}

// Example
const TEMPLATES = {
  check_credits: {
    template: `*Your Credits* 🪙

*Text:* {{textCredits}} remaining
*Media:* {{mediaCredits}} remaining
*Reset:* {{resetDate}}`,
    variables: ["textCredits", "mediaCredits", "resetDate"],
  },
};
```

## Template Categories

### Account Templates
| Template | Purpose |
|----------|---------|
| `welcome_new_user` | First message to new users |
| `check_credits` | Credit balance |
| `check_storage` | Storage usage |
| `account_status` | Full account overview |
| `show_help` | Quick help guide |
| `list_tools` | Full capabilities list |
| `show_privacy` | Privacy information |
| `show_models` | AI models info |

### Preference Templates
| Template | Purpose |
|----------|---------|
| `update_language_prompt` | Language selection |
| `update_language_confirm` | Language changed confirmation |
| `update_timezone_prompt` | Timezone selection |
| `update_timezone_confirm` | Timezone changed confirmation |
| `update_tone_prompt` | Tone selection |
| `update_tone_confirm` | Tone changed confirmation |

### Billing Templates
| Template | Purpose |
|----------|---------|
| `upgrade_link` | Pro upgrade offer |
| `already_pro` | Already on Pro plan |
| `credits_exhausted_upgrade` | Credits used up (Basic) |
| `text_credits_exhausted_basic` | Text credits gone (Basic) |
| `text_credits_exhausted_pro` | Text credits gone (Pro) |
| `media_credits_exhausted_basic` | Media credits gone (Basic) |
| `media_credits_exhausted_pro` | Media credits gone (Pro) |
| `subscription_canceled` | Subscription canceled |
| `payment_failed` | Payment issue |

### Data Management Templates
| Template | Purpose |
|----------|---------|
| `clear_media_request` | Confirm media deletion |
| `clear_media_confirm` | Media deleted |
| `clear_memory_request` | Confirm memory wipe |
| `clear_memory_confirm` | Memory wiped |
| `clear_productivity_request` | Confirm tasks/notes deletion |
| `clear_productivity_confirm` | Tasks/notes deleted |
| `clear_all_request` | Confirm full reset |
| `clear_all_confirm` | Full reset done |

### Productivity Templates
| Template | Purpose |
|----------|---------|
| `task_created` | Task added confirmation |
| `task_completed` | Task marked done |
| `task_deleted` | Task removed |
| `task_list` | Show all tasks |
| `no_pending_tasks` | No tasks message |

## Translation System

### Language Detection

```ts
// Auto-detect from user's message using cheap LLM call
const language = await detectLanguage(userMessage);
// Returns: "en", "ar", "fr", "es", "hi", "ur"
```

### Translation Rules (Critical)

The translator MUST preserve:
- ✅ Numbers (45, 6, dates)
- ✅ Emoji (🪙, ✅, 📋)
- ✅ WhatsApp formatting (*bold*, _italic_)
- ✅ URLs and links
- ✅ Variable values (already filled)
- ✅ Structure and line breaks

Only translate the **text content** — everything else stays exactly as-is.

### Supported Languages
- English (en) — default, no translation needed
- Arabic (ar) — العربية
- French (fr) — Français
- Spanish (es) — Español
- Hindi (hi) — हिंदी
- Urdu (ur) — اردو

### Translation Model
Use the cheapest/fastest model available (Gemini 3 Flash) — translation is simple and doesn't need reasoning power.

## Helper Functions

```ts
// Get template by name
function getTemplate(name: string): MessageTemplate;

// Fill template with variables
function fillTemplate(
  template: string,
  variables: Record<string, string | number>
): string;

// Full pipeline: fill + detect language + translate if needed
async function renderSystemMessage(
  templateName: string,
  variables: Record<string, string | number>,
  userMessage: string,         // For language detection
  userLanguagePreference?: string  // Override detection
): Promise<string>;
```

## Usage Example

```ts
// User sends "كم رصيدي؟" (Arabic: "How many credits do I have?")

// 1. Detect: system command → check_credits
// 2. Fetch data
const credits = await getUserCredits(userId);

// 3. Fill template
const filled = fillTemplate(TEMPLATES.check_credits.template, {
  textCredits: credits.text,
  mediaCredits: credits.media,
  resetDate: credits.resetDate,
});

// 4. Detect language → "ar"
// 5. Translate to Arabic
const translated = await translateMessage(filled, "ar");

// 6. Send via WhatsApp
// Result:
// *رصيدك* 🪙
//
// *نصي:* 45 متبقي
// *وسائط:* 18 متبقي
// *التجديد:* 1 مارس 2026
```

## Design Decisions

1. **Templates over free-form LLM** — System messages must be accurate. Templates guarantee correct data, LLM only handles translation.
2. **Fill first, translate second** — Variables are inserted before translation to avoid LLM inventing numbers.
3. **WhatsApp formatting** — All templates use WhatsApp markdown (*bold*, emoji) not HTML or standard markdown.
4. **Language preference stored** — After first detection, save user's language preference to avoid re-detecting every time.
