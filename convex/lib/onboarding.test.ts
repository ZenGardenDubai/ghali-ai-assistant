import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI SDK and Google provider (used by detectLanguage in systemCommands)
vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({ text: "en" }),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(() => "mock-model"),
}));

// Import after mocking
const { generateText } = await import("ai");
const mockedGenerateText = vi.mocked(generateText);

const {
  isRealQuestion,
  parsePersonalityReply,
  parseLanguageReply,
  buildPersonalityContent,
  buildOnboardingMemory,
  buildDefaultPersonality,
  resolveCityToTimezone,
  formatTimezoneForDisplay,
  handleOnboarding,
} = await import("./onboarding");

// Helper to make a user-like object
const makeUser = (overrides: Record<string, unknown> = {}) => ({
  name: "Ahmad",
  timezone: "Asia/Dubai",
  language: "en",
  credits: 60,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  // Default: detectLanguage returns "en"
  mockedGenerateText.mockResolvedValue({ text: "en" } as ReturnType<
    typeof generateText
  > extends Promise<infer R> ? R : never);
});

// ============================================================================
// isRealQuestion
// ============================================================================

describe("isRealQuestion", () => {
  it("detects questions with question marks", () => {
    expect(isRealQuestion("What's the weather today?")).toBe(true);
    expect(isRealQuestion("How do I cook rice?")).toBe(true);
  });

  it("detects question-starting words", () => {
    expect(isRealQuestion("What is the capital of France")).toBe(true);
    expect(isRealQuestion("How can I learn Python")).toBe(true);
    expect(isRealQuestion("Why is the sky blue")).toBe(true);
    expect(isRealQuestion("Where is Dubai")).toBe(true);
    expect(isRealQuestion("When does the store open")).toBe(true);
    expect(isRealQuestion("Who invented the internet")).toBe(true);
    expect(isRealQuestion("Can you help me")).toBe(true);
    expect(isRealQuestion("Could you explain")).toBe(true);
    expect(isRealQuestion("Tell me about quantum physics")).toBe(true);
    expect(isRealQuestion("Explain how AI works")).toBe(true);
  });

  it("detects imperative requests", () => {
    expect(isRealQuestion("Write me a poem")).toBe(true);
    expect(isRealQuestion("Translate this to Arabic")).toBe(true);
    expect(isRealQuestion("Summarize this article")).toBe(true);
    expect(isRealQuestion("Calculate 25 * 37")).toBe(true);
  });

  it("detects reminder/schedule requests", () => {
    expect(isRealQuestion("remind me to call mom")).toBe(true);
    expect(isRealQuestion("set a reminder for tomorrow at 8")).toBe(true);
    expect(isRealQuestion("schedule a reminder to pay rent")).toBe(true);
  });

  it("returns false for short/simple onboarding replies", () => {
    expect(isRealQuestion("yes")).toBe(false);
    expect(isRealQuestion("no")).toBe(false);
    expect(isRealQuestion("Ahmad")).toBe(false);
    expect(isRealQuestion("call me doc")).toBe(false);
    expect(isRealQuestion("ok")).toBe(false);
    expect(isRealQuestion("sure")).toBe(false);
    expect(isRealQuestion("skip")).toBe(false);
    expect(isRealQuestion("1")).toBe(false);
    expect(isRealQuestion("cheerful")).toBe(false);
    expect(isRealQuestion("English")).toBe(false);
    expect(isRealQuestion("العربية")).toBe(false);
    expect(isRealQuestion("نعم")).toBe(false);
  });

  it("returns false for personality/style picks", () => {
    expect(isRealQuestion("professional")).toBe(false);
    expect(isRealQuestion("brief")).toBe(false);
    expect(isRealQuestion("detailed")).toBe(false);
    expect(isRealQuestion("friendly")).toBe(false);
  });

  it("detects long messages as real questions", () => {
    expect(
      isRealQuestion(
        "I need to prepare a presentation about machine learning for my team next week"
      )
    ).toBe(true);
  });
});

// ============================================================================
// parsePersonalityReply
// ============================================================================

describe("parsePersonalityReply", () => {
  it("parses cheerful variants", async () => {
    expect(await parsePersonalityReply("cheerful")).toBe("cheerful");
    expect(await parsePersonalityReply("friendly")).toBe("cheerful");
    expect(await parsePersonalityReply("😊")).toBe("cheerful");
    expect(await parsePersonalityReply("1")).toBe("cheerful");
    expect(await parsePersonalityReply("Cheerful & friendly")).toBe("cheerful");
  });

  it("parses professional variants", async () => {
    expect(await parsePersonalityReply("professional")).toBe("professional");
    expect(await parsePersonalityReply("serious")).toBe("professional");
    expect(await parsePersonalityReply("📋")).toBe("professional");
    expect(await parsePersonalityReply("2")).toBe("professional");
  });

  it("parses brief variants", async () => {
    expect(await parsePersonalityReply("brief")).toBe("brief");
    expect(await parsePersonalityReply("concise")).toBe("brief");
    expect(await parsePersonalityReply("⚡")).toBe("brief");
    expect(await parsePersonalityReply("3")).toBe("brief");
    expect(await parsePersonalityReply("to the point")).toBe("brief");
  });

  it("parses detailed variants", async () => {
    expect(await parsePersonalityReply("detailed")).toBe("detailed");
    expect(await parsePersonalityReply("thorough")).toBe("detailed");
    expect(await parsePersonalityReply("📚")).toBe("detailed");
    expect(await parsePersonalityReply("4")).toBe("detailed");
  });

  it("returns null for unrecognized input", async () => {
    // Mock Flash returning "none" for unrecognized input
    mockedGenerateText.mockResolvedValue({ text: "none" } as never);
    expect(await parsePersonalityReply("banana")).toBeNull();
    expect(await parsePersonalityReply("")).toBeNull();
    expect(await parsePersonalityReply("5")).toBeNull();
  });

  it("handles skip", async () => {
    expect(await parsePersonalityReply("skip")).toBe("skip");
  });

  it("classifies non-English personality via Flash", async () => {
    mockedGenerateText.mockResolvedValue({ text: "brief" } as never);
    expect(await parsePersonalityReply("مختصر")).toBe("brief");
  });
});

// ============================================================================
// parseLanguageReply
// ============================================================================

describe("parseLanguageReply", () => {
  it("parses English variants", () => {
    expect(parseLanguageReply("english")).toBe("en");
    expect(parseLanguageReply("English")).toBe("en");
    expect(parseLanguageReply("🇬🇧")).toBe("en");
    expect(parseLanguageReply("1")).toBe("en");
  });

  it("parses Arabic variants", () => {
    expect(parseLanguageReply("arabic")).toBe("ar");
    expect(parseLanguageReply("العربية")).toBe("ar");
    expect(parseLanguageReply("عربي")).toBe("ar");
    expect(parseLanguageReply("🇦🇪")).toBe("ar");
    expect(parseLanguageReply("2")).toBe("ar");
  });

  it("parses French variants", () => {
    expect(parseLanguageReply("french")).toBe("fr");
    expect(parseLanguageReply("français")).toBe("fr");
    expect(parseLanguageReply("francais")).toBe("fr");
    expect(parseLanguageReply("🇫🇷")).toBe("fr");
    expect(parseLanguageReply("3")).toBe("fr");
  });

  it("returns null for unrecognized input", () => {
    expect(parseLanguageReply("banana")).toBeNull();
    expect(parseLanguageReply("")).toBeNull();
  });
});

// ============================================================================
// buildDefaultPersonality
// ============================================================================

describe("buildDefaultPersonality", () => {
  it("returns default personality with playful tone", () => {
    const content = buildDefaultPersonality();
    expect(content).toContain("Tone: playful, bubbly, and helpful");
  });

  it("includes balanced verbosity by default", () => {
    const content = buildDefaultPersonality();
    expect(content).toContain("Verbosity: balanced");
  });

  it("includes expressive emoji by default", () => {
    const content = buildDefaultPersonality();
    expect(content).toContain("Emoji: expressive and frequent");
  });

  it("includes off-limits field set to none", () => {
    const content = buildDefaultPersonality();
    expect(content).toContain("Off-limits: none specified");
  });

  it("returns a non-empty string", () => {
    expect(buildDefaultPersonality().length).toBeGreaterThan(0);
  });
});

// ============================================================================
// resolveCityToTimezone
// ============================================================================

describe("resolveCityToTimezone", () => {
  it("resolves Dubai to Asia/Dubai", () => {
    expect(resolveCityToTimezone("Dubai")).toBe("Asia/Dubai");
    expect(resolveCityToTimezone("dubai")).toBe("Asia/Dubai");
  });

  it("resolves London to Europe/London", () => {
    expect(resolveCityToTimezone("London")).toBe("Europe/London");
  });

  it("resolves New York to America/New_York", () => {
    expect(resolveCityToTimezone("New York")).toBe("America/New_York");
  });

  it("accepts valid IANA timezone strings directly", () => {
    expect(resolveCityToTimezone("Asia/Tokyo")).toBe("Asia/Tokyo");
    expect(resolveCityToTimezone("Europe/Paris")).toBe("Europe/Paris");
  });

  it("returns null for unknown city", () => {
    expect(resolveCityToTimezone("Gotham City")).toBeNull();
    expect(resolveCityToTimezone("not-a-city")).toBeNull();
  });
});



// ============================================================================
// buildPersonalityContent
// ============================================================================

describe("buildPersonalityContent", () => {
  it("builds cheerful personality", () => {
    const content = buildPersonalityContent("cheerful");
    expect(content).toContain("Tone: playful");
    expect(content).toContain("Emoji: lots");
  });

  it("builds professional personality", () => {
    const content = buildPersonalityContent("professional");
    expect(content).toContain("Tone: formal");
    expect(content).toContain("Emoji: minimal");
  });

  it("builds brief personality", () => {
    const content = buildPersonalityContent("brief");
    expect(content).toContain("Verbosity: concise");
    expect(content).toContain("Emoji: minimal");
  });

  it("builds detailed personality", () => {
    const content = buildPersonalityContent("detailed");
    expect(content).toContain("Verbosity: detailed");
    expect(content).toContain("Emoji: moderate");
  });

  it("returns empty string for unknown style", () => {
    expect(buildPersonalityContent("unknown")).toBe("");
  });
});

// ============================================================================
// buildOnboardingMemory
// ============================================================================

describe("buildOnboardingMemory", () => {
  it("builds memory with name only", () => {
    const memory = buildOnboardingMemory("Ahmad");
    expect(memory).toContain("Name: Ahmad");
  });

  it("does not include language or timezone (stored in users table)", () => {
    const memory = buildOnboardingMemory("Ahmad");
    expect(memory).not.toContain("Language");
    expect(memory).not.toContain("Timezone");
  });

  it("omits name entry when no name provided", () => {
    const memory = buildOnboardingMemory();
    expect(memory).toBe("# User Memory");
    expect(memory).not.toContain("Name");
  });

  it("omits name entry when undefined", () => {
    const memory = buildOnboardingMemory(undefined);
    expect(memory).toBe("# User Memory");
  });
});

// ============================================================================
// formatTimezoneForDisplay
// ============================================================================

describe("formatTimezoneForDisplay", () => {
  it("formats Dubai timezone", () => {
    const result = formatTimezoneForDisplay("Asia/Dubai");
    expect(result).toContain("Dubai");
    expect(result).toMatch(/GMT[+-]\d/);
  });

  it("formats London timezone", () => {
    const result = formatTimezoneForDisplay("Europe/London");
    expect(result).toContain("London");
  });

  it("formats New York timezone", () => {
    const result = formatTimezoneForDisplay("America/New_York");
    expect(result).toContain("New York");
  });

  it("handles UTC", () => {
    const result = formatTimezoneForDisplay("UTC");
    expect(result).toContain("UTC");
  });
});

// ============================================================================
// handleOnboarding — state machine
// ============================================================================

describe("handleOnboarding", () => {
  describe("step 1 — single welcome message", () => {
    it("returns welcome message with name and timezone, completes onboarding", async () => {
      const result = await handleOnboarding(1, "hi", makeUser());
      expect(result.response).toContain("Ahmad");
      expect(result.response).toContain("Dubai");
      expect(result.nextStep).toBeNull(); // done after one message
      expect(result.skipToAI).toBeUndefined();
    });

    it("writes initial memory on welcome", async () => {
      const result = await handleOnboarding(1, "hi", makeUser());
      expect(result.fileUpdates?.memory).toContain("Ahmad");
    });

    it("seeds default personality file on welcome", async () => {
      const result = await handleOnboarding(1, "hi", makeUser());
      expect(result.fileUpdates?.personality).toContain("Tone: playful, bubbly, and helpful");
    });

    it("skips to AI if message is a real question", async () => {
      const result = await handleOnboarding(
        1,
        "What's the weather in Dubai?",
        makeUser()
      );
      expect(result.skipToAI).toBe(true);
      expect(result.nextStep).toBeNull();
    });
  });
});
