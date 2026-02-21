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
  describe("step 1 — welcome", () => {
    it("returns welcome message with name and timezone", async () => {
      const result = await handleOnboarding(1, "hi", makeUser());
      expect(result.response).toContain("Ghali");
      expect(result.response).toContain("Ahmad");
      expect(result.response).toContain("Dubai");
      expect(result.nextStep).toBe(2);
      expect(result.skipToAI).toBeUndefined();
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

  describe("step 2 — parse name/timezone + detect language", () => {
    it("accepts name confirmation and skips to personality if English", async () => {
      // detectLanguage returns "en" by default
      const result = await handleOnboarding(2, "yes", makeUser());
      expect(result.nextStep).toBe(3); // ambiguous language → ask
      expect(result.response).toContain("language");
    });

    it("accepts a new name", async () => {
      const result = await handleOnboarding(2, "call me doc", makeUser());
      expect(result.updates?.name).toBe("doc");
      expect(result.nextStep).toBe(3);
    });

    it("detects non-English reply and skips language step", async () => {
      mockedGenerateText.mockResolvedValueOnce({ text: "ar" } as never);
      const result = await handleOnboarding(2, "نعم اسمي أحمد", makeUser());
      expect(result.nextStep).toBe(4); // skip language, go to personality
      expect(result.updates?.language).toBe("ar");
    });

    it("accepts timezone correction", async () => {
      const result = await handleOnboarding(
        2,
        "I'm in London",
        makeUser()
      );
      expect(result.updates?.timezone).toBe("Europe/London");
    });

    it("skips to AI if message is a real question", async () => {
      const result = await handleOnboarding(
        2,
        "Can you help me write an email?",
        makeUser()
      );
      expect(result.skipToAI).toBe(true);
      expect(result.nextStep).toBeNull();
    });
  });

  describe("step 3 — language selection", () => {
    it("parses English selection", async () => {
      const result = await handleOnboarding(3, "English", makeUser());
      expect(result.updates?.language).toBe("en");
      expect(result.nextStep).toBe(4);
    });

    it("parses Arabic selection", async () => {
      const result = await handleOnboarding(3, "العربية", makeUser());
      expect(result.updates?.language).toBe("ar");
      expect(result.nextStep).toBe(4);
    });

    it("parses number selection", async () => {
      const result = await handleOnboarding(3, "2", makeUser());
      expect(result.updates?.language).toBe("ar");
      expect(result.nextStep).toBe(4);
    });

    it("defaults to English for unrecognized and moves on", async () => {
      const result = await handleOnboarding(3, "skip", makeUser());
      expect(result.nextStep).toBe(4);
    });

    it("skips to AI if message is a real question", async () => {
      const result = await handleOnboarding(
        3,
        "Tell me about quantum computing",
        makeUser()
      );
      expect(result.skipToAI).toBe(true);
      expect(result.nextStep).toBeNull();
    });
  });

  describe("step 4 — personality style", () => {
    it("parses cheerful style and completes onboarding", async () => {
      const result = await handleOnboarding(4, "cheerful", makeUser());
      expect(result.nextStep).toBeNull(); // done
      expect(result.fileUpdates?.personality).toContain("Tone: playful");
      expect(result.fileUpdates?.memory).toContain("Ahmad");
      expect(result.response).toContain("*You're all set!*");
    });

    it("parses professional style by number", async () => {
      const result = await handleOnboarding(4, "2", makeUser());
      expect(result.nextStep).toBeNull();
      expect(result.fileUpdates?.personality).toContain("Tone: formal");
    });

    it("handles skip — completes with no personality", async () => {
      const result = await handleOnboarding(4, "skip", makeUser());
      expect(result.nextStep).toBeNull();
      expect(result.fileUpdates?.personality).toBeUndefined();
      expect(result.fileUpdates?.memory).toContain("Ahmad");
      expect(result.response).toContain("*You're all set!*");
    });

    it("skips to AI if message is a real question", async () => {
      const result = await handleOnboarding(
        4,
        "Explain how neural networks work",
        makeUser()
      );
      expect(result.skipToAI).toBe(true);
      expect(result.nextStep).toBeNull();
    });

    it("handles unrecognized input as skip", async () => {
      mockedGenerateText.mockResolvedValueOnce({ text: "none" } as never);
      const result = await handleOnboarding(4, "banana", makeUser());
      expect(result.nextStep).toBeNull();
      expect(result.response).toContain("*You're all set!*");
    });
  });
});
