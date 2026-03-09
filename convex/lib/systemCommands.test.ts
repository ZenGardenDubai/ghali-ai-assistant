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
  language: "en",
  timezone: "Asia/Dubai",
  phone: "+971501234567",
  ...overrides,
});

const makeUserFiles = (memory?: string, profile?: string) => {
  const files = [];
  if (profile !== undefined) {
    files.push({ filename: "profile", content: profile });
  }
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
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*Your Credits*");
    expect(result!.response).toContain("45");
    expect(result!.response).toContain("Basic");
    expect(result!.pendingAction).toBeUndefined();
  });

  it("routes 'help' to help template", async () => {
    const result = await handleSystemCommand("help", makeUser(), [], "help");
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*Ghali Quick Guide*");
    expect(result!.response).toContain("credits");
  });

  it("routes 'privacy' to privacy template", async () => {
    const result = await handleSystemCommand(
      "privacy",
      makeUser(),
      [],
      "privacy"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*Your Privacy*");
  });

  it("routes 'upgrade' for basic user to upgrade template", async () => {
    const result = await handleSystemCommand(
      "upgrade",
      makeUser(),
      [],
      "upgrade"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*Ghali Pro*");
    expect(result!.response).toContain("$9.99/month");
  });

  it("routes 'upgrade' for pro user to already_pro template", async () => {
    const result = await handleSystemCommand(
      "upgrade",
      makeUser({ tier: "pro", credits: 580 }),
      [],
      "upgrade"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*You're already Pro!*");
    expect(result!.response).toContain("580");
  });

  it("routes 'my memory' with content", async () => {
    const result = await handleSystemCommand(
      "my memory",
      makeUser(),
      makeUserFiles("- Likes coffee\n- Lives in Dubai"),
      "my memory"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*What I Know About You*");
    expect(result!.response).toContain("Likes coffee");
    expect(result!.response).toContain("Lives in Dubai");
  });

  it("routes 'my memory' with profile and memory", async () => {
    const result = await handleSystemCommand(
      "my memory",
      makeUser(),
      makeUserFiles("- Prefers morning meetings", "## Personal\nname: Hesham"),
      "my memory"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("Profile:");
    expect(result!.response).toContain("name: Hesham");
    // ## headers are stripped for WhatsApp
    expect(result!.response).not.toContain("## Personal");
    expect(result!.response).toContain("Memory:");
    expect(result!.response).toContain("Prefers morning meetings");
  });

  it("routes 'my memory' with empty memory", async () => {
    const result = await handleSystemCommand(
      "my memory",
      makeUser(),
      makeUserFiles(),
      "my memory"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*What I Know About You*");
    expect(result!.response).toContain("haven't learned anything");
  });

  it("routes 'clear memory' to confirmation template with pendingAction", async () => {
    const result = await handleSystemCommand(
      "clear memory",
      makeUser(),
      [],
      "clear memory"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*Clear Memory?*");
    expect(result!.response).toContain("yes");
    expect(result!.pendingAction).toBe("clear_memory");
  });

  it("routes 'clear documents' to confirmation template with pendingAction", async () => {
    const result = await handleSystemCommand(
      "clear documents",
      makeUser(),
      [],
      "clear documents",
      5
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*Clear Documents?*");
    expect(result!.response).toContain("5");
    expect(result!.pendingAction).toBe("clear_documents");
  });

  it("routes 'clear schedules' to confirmation template with pendingAction", async () => {
    const result = await handleSystemCommand(
      "clear schedules",
      makeUser(),
      [],
      "clear schedules"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*Clear Schedules?*");
    expect(result!.response).toContain("yes");
    expect(result!.pendingAction).toBe("clear_schedules");
  });

  it("routes 'clear everything' to confirmation template with pendingAction", async () => {
    const result = await handleSystemCommand(
      "clear everything",
      makeUser(),
      [],
      "clear everything"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*Clear Everything?*");
    expect(result!.response).toContain("yes");
    expect(result!.pendingAction).toBe("clear_everything");
  });

  it("routes 'account' to account template for basic user", async () => {
    const result = await handleSystemCommand(
      "account",
      makeUser(),
      [],
      "account"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*Your Account*");
    expect(result!.response).toContain("Basic (Free)");
    expect(result!.response).toContain("45");
    expect(result!.response).toContain("Asia/Dubai");
  });

  it("routes 'account' to account template for pro user", async () => {
    const result = await handleSystemCommand(
      "account",
      makeUser({ tier: "pro" as const, credits: 580 }),
      [],
      "account"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("Pro");
    expect(result!.response).toContain("580");
  });

  it("shows canceling note for pro user with subscriptionCanceling", async () => {
    const result = await handleSystemCommand(
      "account",
      makeUser({ tier: "pro" as const, credits: 580, subscriptionCanceling: true }),
      [],
      "account"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("cancel");
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
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*Your Credits*");
  });

  it("trims whitespace", async () => {
    const result = await handleSystemCommand(
      "  help  ",
      makeUser(),
      [],
      "  help  "
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("*Ghali Quick Guide*");
  });

  // === Opt-Out & Delete Commands ===

  it("routes 'stop' to opt-out with immediateAction", async () => {
    const result = await handleSystemCommand("stop", makeUser(), [], "stop");
    expect(result).not.toBeNull();
    expect(result!.response).toContain("paused");
    expect(result!.immediateAction).toBe("opt_out");
  });

  it("routes 'yes' when optedOut=true to resume", async () => {
    const result = await handleSystemCommand(
      "yes",
      makeUser({ optedOut: true }),
      [],
      "yes"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("Welcome back");
    expect(result!.immediateAction).toBe("resume_from_opt_out");
  });

  it("routes 'no' when optedOut=true to keep paused", async () => {
    const result = await handleSystemCommand(
      "no",
      makeUser({ optedOut: true }),
      [],
      "no"
    );
    expect(result).not.toBeNull();
    expect(result!.immediateAction).toBe("keep_paused");
  });

  it("returns null for 'yes' when not opted out", async () => {
    const result = await handleSystemCommand(
      "yes",
      makeUser({ optedOut: false }),
      [],
      "yes"
    );
    expect(result).toBeNull();
  });

  it("returns null for 'no' when not opted out", async () => {
    const result = await handleSystemCommand(
      "no",
      makeUser({ optedOut: false }),
      [],
      "no"
    );
    expect(result).toBeNull();
  });

  it("routes 'delete' with no pending deletion to delete confirm request", async () => {
    const result = await handleSystemCommand(
      "delete",
      makeUser({ deletionScheduledAt: undefined }),
      [],
      "delete"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("Delete Account");
    expect(result!.immediateAction).toBe("schedule_deletion");
  });

  it("routes 'delete' with pending deletion to already-pending message", async () => {
    const result = await handleSystemCommand(
      "delete",
      makeUser({
        deletionScheduledAt: Date.now(),
        deletionDueAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      }),
      [],
      "delete"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("already scheduled");
    expect(result!.immediateAction).toBeUndefined();
  });

  it("routes 'cancel' with pending deletion to cancel", async () => {
    const result = await handleSystemCommand(
      "cancel",
      makeUser({
        deletionScheduledAt: Date.now(),
        deletionDueAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      }),
      [],
      "cancel"
    );
    expect(result).not.toBeNull();
    expect(result!.response).toContain("Cancelled");
    expect(result!.immediateAction).toBe("cancel_deletion");
  });

  it("returns null for 'cancel' with no pending deletion", async () => {
    const result = await handleSystemCommand(
      "cancel",
      makeUser({ deletionScheduledAt: undefined }),
      [],
      "cancel"
    );
    expect(result).toBeNull();
  });
});
