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

// ============================================================================
// resolveCityToTimezone — Extended Tests
// ============================================================================

describe("resolveCityToTimezone - Extended", () => {
  it("handles city names with diacritics", () => {
    expect(resolveCityToTimezone("São Paulo")).toBe("America/Sao_Paulo");
    expect(resolveCityToTimezone("Zürich")).toBe("Europe/Zurich");
  });

  it("handles city names with country suffixes", () => {
    expect(resolveCityToTimezone("Dubai, UAE")).toBe("Asia/Dubai");
    expect(resolveCityToTimezone("London, UK")).toBe("Europe/London");
    expect(resolveCityToTimezone("Paris, France")).toBe("Europe/Paris");
  });

  it("handles city names with trailing whitespace", () => {
    expect(resolveCityToTimezone("  Dubai  ")).toBe("Asia/Dubai");
    expect(resolveCityToTimezone("London   ")).toBe("Europe/London");
  });

  it("handles mixed case input", () => {
    expect(resolveCityToTimezone("DUBAI")).toBe("Asia/Dubai");
    expect(resolveCityToTimezone("lOnDoN")).toBe("Europe/London");
    expect(resolveCityToTimezone("nEw yOrK")).toBe("America/New_York");
  });

  it("handles multiple spaces in city names", () => {
    expect(resolveCityToTimezone("New    York")).toBe("America/New_York");
    expect(resolveCityToTimezone("Los   Angeles")).toBe("America/Los_Angeles");
  });

  it("handles city names with punctuation", () => {
    expect(resolveCityToTimezone("Dubai.")).toBe("Asia/Dubai");
    expect(resolveCityToTimezone("London,")).toBe("Europe/London");
  });

  it("handles city names with 'city' suffix", () => {
    expect(resolveCityToTimezone("Kuwait City")).toBe("Asia/Kuwait");
    expect(resolveCityToTimezone("Mexico City")).toBe("America/Mexico_City");
  });

  it("returns null for very short invalid input", () => {
    expect(resolveCityToTimezone("X")).toBeNull();
    expect(resolveCityToTimezone("AB")).toBeNull();
  });

  it("resolves major cities in different regions", () => {
    // Middle East
    expect(resolveCityToTimezone("Riyadh")).toBe("Asia/Riyadh");
    expect(resolveCityToTimezone("Doha")).toBe("Asia/Qatar");
    expect(resolveCityToTimezone("Manama")).toBe("Asia/Bahrain");

    // Asia
    expect(resolveCityToTimezone("Tokyo")).toBe("Asia/Tokyo");
    expect(resolveCityToTimezone("Singapore")).toBe("Asia/Singapore");
    expect(resolveCityToTimezone("Mumbai")).toBe("Asia/Kolkata");

    // Europe
    expect(resolveCityToTimezone("Berlin")).toBe("Europe/Berlin");
    expect(resolveCityToTimezone("Madrid")).toBe("Europe/Madrid");

    // Americas
    expect(resolveCityToTimezone("Toronto")).toBe("America/Toronto");
    expect(resolveCityToTimezone("Buenos Aires")).toBe("America/Argentina/Buenos_Aires");
  });

  it("canonicalizes IANA timezone inputs", () => {
    // Input may have different casing, output should be canonical
    expect(resolveCityToTimezone("asia/dubai")).toBe("Asia/Dubai");
    expect(resolveCityToTimezone("EUROPE/LONDON")).toBe("Europe/London");
  });
});

// ============================================================================
// normalizeCityInput
// ============================================================================

describe("normalizeCityInput", () => {
  const { normalizeCityInput } = require("./onboarding");

  it("converts to lowercase", () => {
    expect(normalizeCityInput("DUBAI")).toBe("dubai");
    expect(normalizeCityInput("LoNdOn")).toBe("london");
  });

  it("trims whitespace", () => {
    expect(normalizeCityInput("  Dubai  ")).toBe("dubai");
    expect(normalizeCityInput("\tLondon\n")).toBe("london");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeCityInput("New    York")).toBe("new york");
    expect(normalizeCityInput("Los   Angeles")).toBe("los angeles");
  });

  it("removes diacritics", () => {
    expect(normalizeCityInput("São Paulo")).toBe("sao paulo");
    expect(normalizeCityInput("Zürich")).toBe("zurich");
  });

  it("removes punctuation (commas, dots)", () => {
    expect(normalizeCityInput("Dubai, UAE")).toBe("dubai uae");
    expect(normalizeCityInput("London.")).toBe("london");
  });

  it("removes common suffixes (city, province, state, country)", () => {
    expect(normalizeCityInput("Kuwait City")).toBe("kuwait");
    expect(normalizeCityInput("New York State")).toBe("new york");
    expect(normalizeCityInput("Dubai Province")).toBe("dubai");
  });

  it("handles empty string", () => {
    expect(normalizeCityInput("")).toBe("");
  });

  it("handles input with only whitespace", () => {
    expect(normalizeCityInput("   ")).toBe("");
  });
});

// ============================================================================
// isRealQuestion — Extended Tests
// ============================================================================

describe("isRealQuestion - Extended", () => {
  it("detects questions with multiple question marks", () => {
    expect(isRealQuestion("What is this???")).toBe(true);
  });

  it("detects imperative coding/technical requests", () => {
    expect(isRealQuestion("Debug this code")).toBe(true);
    expect(isRealQuestion("Create a function to parse JSON")).toBe(true);
  });

  it("rejects very short words without question indicators", () => {
    expect(isRealQuestion("Hi")).toBe(false);
    expect(isRealQuestion("OK")).toBe(false);
    expect(isRealQuestion("Bye")).toBe(false);
  });

  it("detects questions in Arabic", () => {
    expect(isRealQuestion("ما الطقس اليوم؟")).toBe(true);
    expect(isRealQuestion("كيف حالك؟")).toBe(true);
  });

  it("detects questions in French", () => {
    expect(isRealQuestion("Quel temps fait-il?")).toBe(true);
    expect(isRealQuestion("Comment ça va?")).toBe(true);
  });

  it("rejects single digits", () => {
    expect(isRealQuestion("1")).toBe(false);
    expect(isRealQuestion("2")).toBe(false);
    expect(isRealQuestion("5")).toBe(false);
  });

  it("rejects emoji-only responses", () => {
    expect(isRealQuestion("😊")).toBe(false);
    expect(isRealQuestion("👍")).toBe(false);
  });

  it("detects complex multi-sentence questions", () => {
    expect(
      isRealQuestion(
        "I'm working on a project. Can you help me with the database schema?"
      )
    ).toBe(true);
  });

  it("handles mixed language input", () => {
    // Long message in any language is considered a real question
    expect(
      isRealQuestion("مرحبا how are you today ça va bien")
    ).toBe(true);
  });
});

// ============================================================================
// parsePersonalityReply — Extended Tests
// ============================================================================

describe("parsePersonalityReply - Extended", () => {
  it("handles skip in multiple languages", async () => {
    mockedGenerateText.mockResolvedValue({ text: "skip" } as never);
    expect(await parsePersonalityReply("تخطي")).toBe("skip");
    expect(await parsePersonalityReply("passer")).toBe("skip");
    expect(await parsePersonalityReply("saltar")).toBe("skip");
  });

  it("handles personality keywords with extra text", async () => {
    expect(await parsePersonalityReply("I like cheerful tone")).toBe("cheerful");
    expect(await parsePersonalityReply("Please be professional")).toBe("professional");
    expect(await parsePersonalityReply("Keep it brief please")).toBe("brief");
  });

  it("returns null for empty string", async () => {
    expect(await parsePersonalityReply("")).toBeNull();
  });

  it("returns null for whitespace-only input", async () => {
    mockedGenerateText.mockResolvedValue({ text: "none" } as never);
    expect(await parsePersonalityReply("   ")).toBeNull();
  });

  it("handles Flash classification fallback for unknown input", async () => {
    mockedGenerateText.mockResolvedValue({ text: "cheerful" } as never);
    expect(await parsePersonalityReply("سعيد")).toBe("cheerful");
  });
});

// ============================================================================
// parseLanguageReply — Extended Tests
// ============================================================================

describe("parseLanguageReply - Extended", () => {
  it("handles language names with extra text", () => {
    expect(parseLanguageReply("I prefer English")).toBe("en");
    expect(parseLanguageReply("Arabic please")).toBe("ar");
  });

  it("handles emoji flags", () => {
    expect(parseLanguageReply("🇬🇧")).toBe("en");
    expect(parseLanguageReply("🇦🇪")).toBe("ar");
    expect(parseLanguageReply("🇫🇷")).toBe("fr");
  });

  it("is case-insensitive", () => {
    expect(parseLanguageReply("ENGLISH")).toBe("en");
    expect(parseLanguageReply("Arabic")).toBe("ar");
    expect(parseLanguageReply("FRENCH")).toBe("fr");
  });

  it("handles whitespace", () => {
    expect(parseLanguageReply("  english  ")).toBe("en");
    expect(parseLanguageReply("\tarabic\n")).toBe("ar");
  });

  it("returns null for numbers", () => {
    expect(parseLanguageReply("5")).toBeNull();
    expect(parseLanguageReply("10")).toBeNull();
  });

  it("handles language codes directly", () => {
    expect(parseLanguageReply("en")).toBe("en");
    expect(parseLanguageReply("ar")).toBe("ar");
    expect(parseLanguageReply("fr")).toBe("fr");
  });
});

// ============================================================================
// buildPersonalityContent — Extended Tests
// ============================================================================

describe("buildPersonalityContent - Extended", () => {
  it("returns different content for each style", () => {
    const cheerful = buildPersonalityContent("cheerful");
    const professional = buildPersonalityContent("professional");
    const brief = buildPersonalityContent("brief");
    const detailed = buildPersonalityContent("detailed");

    expect(cheerful).not.toBe(professional);
    expect(professional).not.toBe(brief);
    expect(brief).not.toBe(detailed);
  });

  it("all styles contain Preferences header", () => {
    const styles = ["cheerful", "professional", "brief", "detailed"];
    for (const style of styles) {
      const content = buildPersonalityContent(style);
      expect(content).toContain("# Preferences");
    }
  });

  it("all styles contain Tone field", () => {
    const styles = ["cheerful", "professional", "brief", "detailed"];
    for (const style of styles) {
      const content = buildPersonalityContent(style);
      expect(content).toContain("Tone:");
    }
  });

  it("returns empty string for null input", () => {
    expect(buildPersonalityContent(null as unknown as string)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    expect(buildPersonalityContent(undefined as unknown as string)).toBe("");
  });
});

// ============================================================================
// formatTimezoneForDisplay — Extended Tests
// ============================================================================

describe("formatTimezoneForDisplay - Extended", () => {
  it("formats various timezones with GMT offsets", () => {
    const timezones = [
      "Asia/Dubai",
      "Europe/London",
      "America/New_York",
      "America/Los_Angeles",
      "Asia/Tokyo",
    ];

    for (const tz of timezones) {
      const result = formatTimezoneForDisplay(tz);
      expect(result).toMatch(/GMT[+-]\d/);
    }
  });

  it("removes underscores from city names", () => {
    expect(formatTimezoneForDisplay("America/New_York")).toContain("New York");
    expect(formatTimezoneForDisplay("America/Los_Angeles")).toContain("Los Angeles");
  });

  it("extracts city name from IANA timezone", () => {
    expect(formatTimezoneForDisplay("Asia/Dubai")).toContain("Dubai");
    expect(formatTimezoneForDisplay("Europe/Paris")).toContain("Paris");
    expect(formatTimezoneForDisplay("America/Chicago")).toContain("Chicago");
  });

  it("handles UTC specially", () => {
    expect(formatTimezoneForDisplay("UTC")).toBe("UTC (GMT+0)");
  });

  it("handles timezones with multiple path segments", () => {
    const result = formatTimezoneForDisplay("America/Argentina/Buenos_Aires");
    expect(result).toContain("Buenos Aires");
  });

  it("handles invalid timezone gracefully", () => {
    const result = formatTimezoneForDisplay("Invalid/Timezone");
    // Should return at least the city part without crashing
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});