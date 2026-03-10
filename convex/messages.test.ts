import { describe, it, expect } from "vitest";
import {
  extractResponseText,
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

  it("handles a single step with only reflection tools and text (edge case: should return the text since i=0)", () => {
    // Only one step, can't be a reflection leak (no preceding step to check)
    const steps = [step("Some text.", ["appendToMemory"])];
    expect(extractResponseText(steps)).toBe("Some text.");
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
