import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateLanguageCode } from "./systemCommands";

// Mock the AI SDK generateText — we don't want real LLM calls in tests
vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({ text: "en" }),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(() => "mock-model"),
}));

// Import after mocking
const { generateText } = await import("ai");
const { detectLanguage, translateMessage, handleSystemCommand } =
  await import("./systemCommands");

const mockedGenerateText = vi.mocked(generateText);

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  tier: "basic" as const,
  credits: 45,
  creditsResetAt: new Date("2026-03-20").getTime(),
  ...overrides,
});

const makeUserFiles = (memory?: string) => {
  const files = [];
  if (memory !== undefined) {
    files.push({ filename: "memory", content: memory });
  }
  return files;
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: detectLanguage returns "en", so no translation happens
  mockedGenerateText.mockResolvedValue({ text: "en" } as ReturnType<
    typeof generateText
  > extends Promise<infer R> ? R : never);
});

describe("validateLanguageCode", () => {
  it("returns supported codes as-is", () => {
    expect(validateLanguageCode("en")).toBe("en");
    expect(validateLanguageCode("ar")).toBe("ar");
    expect(validateLanguageCode("fr")).toBe("fr");
    expect(validateLanguageCode("es")).toBe("es");
    expect(validateLanguageCode("hi")).toBe("hi");
    expect(validateLanguageCode("ur")).toBe("ur");
  });

  it("falls back to 'en' for unsupported codes", () => {
    expect(validateLanguageCode("de")).toBe("en");
    expect(validateLanguageCode("zh")).toBe("en");
    expect(validateLanguageCode("ja")).toBe("en");
  });

  it("handles uppercase and whitespace", () => {
    expect(validateLanguageCode("AR")).toBe("ar");
    expect(validateLanguageCode("  en  ")).toBe("en");
  });

  it("handles longer strings by taking first 2 chars", () => {
    expect(validateLanguageCode("english")).toBe("en");
  });
});

describe("detectLanguage", () => {
  it("returns language code from LLM", async () => {
    mockedGenerateText.mockResolvedValueOnce({ text: "ar" } as never);
    const lang = await detectLanguage("كم رصيدي؟");
    expect(lang).toBe("ar");
  });

  it("falls back to 'en' on error", async () => {
    mockedGenerateText.mockRejectedValueOnce(new Error("API error"));
    const lang = await detectLanguage("some text");
    expect(lang).toBe("en");
  });

  it("falls back to 'en' for unsupported language", async () => {
    mockedGenerateText.mockResolvedValueOnce({ text: "zh" } as never);
    const lang = await detectLanguage("你好");
    expect(lang).toBe("en");
  });
});

describe("translateMessage", () => {
  it("skips translation for English", async () => {
    const result = await translateMessage("*Credits:* 45", "en");
    expect(result).toBe("*Credits:* 45");
    expect(mockedGenerateText).not.toHaveBeenCalled();
  });

  it("calls LLM for non-English", async () => {
    mockedGenerateText.mockResolvedValueOnce({
      text: "*الرصيد:* 45",
    } as never);
    const result = await translateMessage("*Credits:* 45", "ar");
    expect(result).toBe("*الرصيد:* 45");
    expect(mockedGenerateText).toHaveBeenCalledTimes(1);
  });

  it("falls back to original on error", async () => {
    mockedGenerateText.mockRejectedValueOnce(new Error("API error"));
    const result = await translateMessage("*Credits:* 45", "ar");
    expect(result).toBe("*Credits:* 45");
  });
});

describe("handleSystemCommand", () => {
  it("routes 'credits' to check_credits template", async () => {
    const result = await handleSystemCommand(
      "credits",
      makeUser(),
      [],
      "credits"
    );
    expect(result).toContain("*Your Credits*");
    expect(result).toContain("45");
    expect(result).toContain("Basic");
  });

  it("routes 'help' to help template", async () => {
    const result = await handleSystemCommand("help", makeUser(), [], "help");
    expect(result).toContain("*Ghali Quick Guide*");
    expect(result).toContain("credits");
  });

  it("routes 'privacy' to privacy template", async () => {
    const result = await handleSystemCommand(
      "privacy",
      makeUser(),
      [],
      "privacy"
    );
    expect(result).toContain("*Your Privacy*");
  });

  it("routes 'upgrade' for basic user to upgrade template", async () => {
    const result = await handleSystemCommand(
      "upgrade",
      makeUser(),
      [],
      "upgrade"
    );
    expect(result).toContain("*Ghali Pro*");
    expect(result).toContain("$19/month");
  });

  it("routes 'upgrade' for pro user to already_pro template", async () => {
    const result = await handleSystemCommand(
      "upgrade",
      makeUser({ tier: "pro", credits: 580 }),
      [],
      "upgrade"
    );
    expect(result).toContain("*You're Pro!*");
    expect(result).toContain("580");
  });

  it("routes 'my memory' with content", async () => {
    const result = await handleSystemCommand(
      "my memory",
      makeUser(),
      makeUserFiles("- Likes coffee\n- Lives in Dubai"),
      "my memory"
    );
    expect(result).toContain("*What I Know About You*");
    expect(result).toContain("Likes coffee");
    expect(result).toContain("Lives in Dubai");
  });

  it("routes 'my memory' with empty memory", async () => {
    const result = await handleSystemCommand(
      "my memory",
      makeUser(),
      makeUserFiles(),
      "my memory"
    );
    expect(result).toContain("*What I Know About You*");
    expect(result).toContain("haven't learned anything");
  });

  it("routes 'clear memory' to confirmation template", async () => {
    const result = await handleSystemCommand(
      "clear memory",
      makeUser(),
      [],
      "clear memory"
    );
    expect(result).toContain("*Clear Memory?*");
    expect(result).toContain("yes");
  });

  it("routes 'clear documents' to confirmation template", async () => {
    const result = await handleSystemCommand(
      "clear documents",
      makeUser(),
      [],
      "clear documents"
    );
    expect(result).toContain("*Clear Documents?*");
  });

  it("routes 'clear everything' to confirmation template", async () => {
    const result = await handleSystemCommand(
      "clear everything",
      makeUser(),
      [],
      "clear everything"
    );
    expect(result).toContain("*Clear Everything?*");
    expect(result).toContain("yes");
  });

  it("returns null for 'account'", async () => {
    const result = await handleSystemCommand(
      "account",
      makeUser(),
      [],
      "account"
    );
    expect(result).toBeNull();
  });

  it("returns null for unknown commands", async () => {
    const result = await handleSystemCommand(
      "hello",
      makeUser(),
      [],
      "hello"
    );
    expect(result).toBeNull();
  });

  it("is case-insensitive", async () => {
    const result = await handleSystemCommand(
      "CREDITS",
      makeUser(),
      [],
      "CREDITS"
    );
    expect(result).toContain("*Your Credits*");
  });

  it("trims whitespace", async () => {
    const result = await handleSystemCommand(
      "  help  ",
      makeUser(),
      [],
      "  help  "
    );
    expect(result).toContain("*Ghali Quick Guide*");
  });
});
