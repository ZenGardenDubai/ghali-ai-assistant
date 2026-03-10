import { describe, it, expect } from "vitest";
import {
  extractResponseText,
  stripInlineReflection,
  REFLECTION_TOOL_NAMES,
  parseImageToolResult,
  extractImageFromSteps,
} from "./messages";

// Helper to build a step for tests
function step(
  text: string,
  toolNames: string[] = []
): { text: string; toolCalls: Array<{ toolName: string }> } {
  return { text, toolCalls: toolNames.map((toolName) => ({ toolName })) };
}

describe("REFLECTION_TOOL_NAMES", () => {
  it("includes all silent memory/profile tools", () => {
    expect(REFLECTION_TOOL_NAMES.has("appendToMemory")).toBe(true);
    expect(REFLECTION_TOOL_NAMES.has("editMemory")).toBe(true);
    expect(REFLECTION_TOOL_NAMES.has("updateProfile")).toBe(true);
    expect(REFLECTION_TOOL_NAMES.has("updatePersonality")).toBe(true);
    expect(REFLECTION_TOOL_NAMES.has("updateHeartbeat")).toBe(true);
    expect(REFLECTION_TOOL_NAMES.has("updateLanguageSetting")).toBe(true);
    expect(REFLECTION_TOOL_NAMES.has("updateTimezoneSetting")).toBe(true);
  });

  it("does not include user-facing tools", () => {
    expect(REFLECTION_TOOL_NAMES.has("deepReasoning")).toBe(false);
    expect(REFLECTION_TOOL_NAMES.has("webSearch")).toBe(false);
    expect(REFLECTION_TOOL_NAMES.has("generateImage")).toBe(false);
    expect(REFLECTION_TOOL_NAMES.has("searchDocuments")).toBe(false);
  });
});

describe("extractResponseText", () => {
  it("returns text from a single-step response with no tools", () => {
    const steps = [step("Good morning! Here is your briefing.")];
    expect(extractResponseText(steps)).toBe("Good morning! Here is your briefing.");
  });

  it("returns text from a step that also calls reflection tools (Pattern: main response + reflection tool in same step)", () => {
    // Step 0: main response text + appendToMemory call
    // Step 1: reflection text (should be suppressed)
    const steps = [
      step("Good morning! Here is your briefing.", ["appendToMemory"]),
      step("Reflecting on Hesham's profile: Professional: Still ED at UAE PMO."),
    ];
    expect(extractResponseText(steps)).toBe("Good morning! Here is your briefing.");
  });

  it("suppresses reflection text after reflection-only tool calls (Pattern C: search -> response -> reflection)", () => {
    // Step 0: webSearch (no text)
    // Step 1: actual response + appendToMemory
    // Step 2: reflection text (should be suppressed)
    const steps = [
      step("", ["webSearch"]),
      step("Here is the weather: 25°C. Have a great day!", ["appendToMemory"]),
      step("Reflecting on Hesham's profile: Personality: Playful/Bubbly tone used."),
    ];
    expect(extractResponseText(steps)).toBe("Here is the weather: 25°C. Have a great day!");
  });

  it("handles empty final step (model silent after reflection tools)", () => {
    // Step 0: main response + appendToMemory
    // Step 1: empty (model done after tool results)
    const steps = [
      step("Good morning! Here is your briefing.", ["appendToMemory"]),
      step(""),
    ];
    expect(extractResponseText(steps)).toBe("Good morning! Here is your briefing.");
  });

  it("returns empty string when there are no steps", () => {
    expect(extractResponseText([])).toBe("");
  });

  it("returns empty string when all steps are empty", () => {
    const steps = [step("", ["webSearch"]), step("")];
    expect(extractResponseText(steps)).toBe("");
  });

  it("does not suppress text when previous step had non-reflection tools", () => {
    // Step 0: deepReasoning (non-reflection tool, no text)
    // Step 1: response text (no tool calls) — should NOT be suppressed
    const steps = [step("", ["deepReasoning"]), step("Here is the analysis.")];
    expect(extractResponseText(steps)).toBe("Here is the analysis.");
  });

  it("does not suppress text when previous step had mixed tools (reflection + non-reflection)", () => {
    // Step 0: webSearch + appendToMemory (mixed)
    // Step 1: response text — should NOT be suppressed (prev had non-reflection tool)
    const steps = [
      step("", ["webSearch", "appendToMemory"]),
      step("Here is what I found."),
    ];
    expect(extractResponseText(steps)).toBe("Here is what I found.");
  });

  it("suppresses reflection even with multiple reflection tools in previous step", () => {
    const steps = [
      step("Morning briefing.", ["appendToMemory", "updateProfile"]),
      step("Reflecting on profile and memory updates."),
    ];
    expect(extractResponseText(steps)).toBe("Morning briefing.");
  });

  it("returns last user-facing text when there are multiple response steps", () => {
    // Step 0: empty (webSearch)
    // Step 1: partial response (no tool calls — user-facing)
    // Step 2: follow-up response with reflection tool
    // Step 3: reflection text (suppressed)
    const steps = [
      step("", ["webSearch"]),
      step("Let me look that up..."),
      step("Here is the full answer!", ["appendToMemory"]),
      step("Noted the user's interest in weather."),
    ];
    expect(extractResponseText(steps)).toBe("Here is the full answer!");
  });

  it("does not suppress reply when real tool preceded reflection-only step (addItem → appendToMemory → reply)", () => {
    // Step 0: addItem (real tool, no text)
    // Step 1: appendToMemory only (reflection, no text)
    // Step 2: reply text (no tool calls) — should NOT be suppressed
    const steps = [
      step("", ["addItem"]),
      step("", ["appendToMemory"]),
      step("I've added your Apple TV subscription — 250 AED."),
    ];
    expect(extractResponseText(steps)).toBe(
      "I've added your Apple TV subscription — 250 AED."
    );
  });

  it("does not suppress reply when real tool + reflection in same step preceded reflection-only step", () => {
    // Step 0: addItem + updateProfile (mixed, no text)
    // Step 1: appendToMemory only (reflection, no text)
    // Step 2: reply text — should NOT be suppressed
    const steps = [
      step("", ["addItem", "updateProfile"]),
      step("", ["appendToMemory"]),
      step("Done! Expense tracked."),
    ];
    expect(extractResponseText(steps)).toBe("Done! Expense tracked.");
  });

  it("still suppresses reflection when no real tool was called in any earlier step", () => {
    // Step 0: appendToMemory only (reflection, with response text)
    // Step 1: updateProfile only (reflection, no text)
    // Step 2: reflection text (should be suppressed)
    const steps = [
      step("Good morning!", ["appendToMemory"]),
      step("", ["updateProfile"]),
      step("Reflecting on Hesham's morning greeting pattern."),
    ];
    expect(extractResponseText(steps)).toBe("Good morning!");
  });

  it("handles a single step with only reflection tools and text (edge case: should return the text since i=0)", () => {
    // Only one step, can't be a reflection leak (no preceding step to check)
    const steps = [step("Some text.", ["appendToMemory"])];
    expect(extractResponseText(steps)).toBe("Some text.");
  });

  it("strips inline reflection from response text", () => {
    const steps = [
      step(
        "Here are your cars!\n\n• BMW X5\n• Nissan Patrol\n\n**Reflecting on behavioral patterns...**\n• The user tracks cars",
        ["addItem"]
      ),
    ];
    expect(extractResponseText(steps)).toBe(
      "Here are your cars!\n\n• BMW X5\n• Nissan Patrol"
    );
  });
});

describe("stripInlineReflection", () => {
  it("returns text unchanged when no reflection is present", () => {
    expect(stripInlineReflection("Hello! How are you?")).toBe(
      "Hello! How are you?"
    );
  });

  it("strips 'Reflecting on' block", () => {
    const text =
      "I've added your expense!\n\n**Reflecting on behavioral patterns...**\n• Noticed the user tracks expenses";
    expect(stripInlineReflection(text)).toBe("I've added your expense!");
  });

  it("strips 'Silent reflection' block", () => {
    const text =
      "Here are your cars!\n\n**Silent reflection: Identity and memory updates...**\n• Profile: No new milestones.";
    expect(stripInlineReflection(text)).toBe("Here are your cars!");
  });

  it("strips at the earliest matching pattern", () => {
    const text =
      "Your list is ready.\n\n**Reflecting on behavioral patterns...**\n• bullet\n\n**Silent reflection: Identity and memory updates...**\n• more";
    expect(stripInlineReflection(text)).toBe("Your list is ready.");
  });

  it("handles patterns without bold markers", () => {
    const text =
      "Done!\n\nReflecting on the user's preferences...\n• prefers bullet points";
    expect(stripInlineReflection(text)).toBe("Done!");
  });

  it("handles Memory update pattern (with newline after colon)", () => {
    const text = "All set!\n\nMemory update:\n• Added preference for dark mode";
    expect(stripInlineReflection(text)).toBe("All set!");
  });

  it("does NOT strip Memory update in a legitimate reply (no newline after colon)", () => {
    const text =
      "Here's what changed:\n\nMemory update: your preference for dark mode was saved.";
    expect(stripInlineReflection(text)).toBe(text);
  });

  it("handles Profile update pattern (with newline after colon)", () => {
    const text = "Done!\n\nProfile update:\n• Updated job title";
    expect(stripInlineReflection(text)).toBe("Done!");
  });

  it("does NOT strip Profile update in a legitimate reply (no newline after colon)", () => {
    const text = "Sure thing!\n\nProfile update: your name has been changed.";
    expect(stripInlineReflection(text)).toBe(text);
  });

  it("handles Behavioral pattern header", () => {
    const text =
      "Here you go!\n\nBehavioral pattern observations:\n• User prefers short answers";
    expect(stripInlineReflection(text)).toBe("Here you go!");
  });

  it("handles Internal note pattern", () => {
    const text = "Here you go!\n\nInternal note: user likes concise replies";
    expect(stripInlineReflection(text)).toBe("Here you go!");
  });

  it("returns empty string unchanged", () => {
    expect(stripInlineReflection("")).toBe("");
  });

  it("returns text with reflection at the very start after newline", () => {
    // Edge case: reflection is the entire text (preceded by newline)
    const text = "\nReflecting on the user's message...";
    expect(stripInlineReflection(text)).toBe("");
  });

  it("does not strip when reflection appears without leading newline", () => {
    // First line — no \n prefix — should NOT be matched
    const text = "Reflecting on your question, here's what I think...";
    expect(stripInlineReflection(text)).toBe(text);
  });

  it("handles indented reflection with leading whitespace", () => {
    const text = "Your answer:\n   **Reflecting on behavioral patterns...**\n• stuff";
    expect(stripInlineReflection(text)).toBe("Your answer:");
  });
});

describe("parseImageToolResult", () => {
  it("parses a valid image JSON result", () => {
    const json = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/img.png",
      caption: "A beautiful sunset",
    });
    expect(parseImageToolResult(json)).toEqual({
      imageUrl: "https://example.com/img.png",
      caption: "A beautiful sunset",
    });
  });

  it("returns null for non-JSON input", () => {
    expect(parseImageToolResult("not json")).toBeNull();
  });

  it("returns null for wrong type", () => {
    const json = JSON.stringify({ type: "text", imageUrl: "x", caption: "y" });
    expect(parseImageToolResult(json)).toBeNull();
  });
});

describe("extractImageFromSteps", () => {
  it("finds an image result in tool results", () => {
    const imageJson = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/img.png",
      caption: "A sunset",
    });
    const steps = [
      {
        toolResults: [{ output: imageJson }],
      },
    ];
    expect(extractImageFromSteps(steps)).toEqual({
      imageUrl: "https://example.com/img.png",
      caption: "A sunset",
    });
  });

  it("returns null when no image result exists", () => {
    const steps = [{ toolResults: [{ output: '{"type":"text","content":"hello"}' }] }];
    expect(extractImageFromSteps(steps)).toBeNull();
  });

  it("returns null for empty steps", () => {
    expect(extractImageFromSteps([])).toBeNull();
  });
});
