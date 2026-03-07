import { describe, it, expect } from "vitest";
import { setTraceId, clearTraceId, SYSTEM_BLOCK, AGENT_INSTRUCTIONS } from "./agent";

// ============================================================================
// Trace ID Management
// ============================================================================

describe("setTraceId and clearTraceId", () => {
  it("sets and clears trace ID without errors", () => {
    // These functions manage module-level state for PostHog analytics
    // They should not throw errors
    expect(() => setTraceId("test-trace-123")).not.toThrow();
    expect(() => clearTraceId()).not.toThrow();
  });

  it("accepts various trace ID formats", () => {
    expect(() => setTraceId("uuid-format")).not.toThrow();
    expect(() => setTraceId("12345")).not.toThrow();
    expect(() => setTraceId("trace-with-dashes-123")).not.toThrow();
    clearTraceId();
  });
});

// ============================================================================
// SYSTEM_BLOCK — Core behavioral directives
// ============================================================================

describe("SYSTEM_BLOCK", () => {
  it("contains privacy directive", () => {
    expect(SYSTEM_BLOCK).toContain("Privacy-first");
  });

  it("contains honesty directive", () => {
    expect(SYSTEM_BLOCK).toContain("honest");
  });

  it("contains identity directive", () => {
    expect(SYSTEM_BLOCK).toContain("Always identify as Ghali");
    expect(SYSTEM_BLOCK).toContain("Never pretend to be human");
  });

  it("contains credit-aware directive", () => {
    expect(SYSTEM_BLOCK).toContain("credit-aware");
  });

  it("prohibits displaying credit counts in responses", () => {
    expect(SYSTEM_BLOCK).toContain("NEVER display credit counts");
  });

  it("instructs to refuse harmful content", () => {
    expect(SYSTEM_BLOCK).toContain("Never generate harmful");
  });

  it("instructs to be accurate with numbers", () => {
    expect(SYSTEM_BLOCK).toContain("accurate with numbers");
  });

  it("instructs to respond in user's language", () => {
    expect(SYSTEM_BLOCK).toContain("Respond in the user's language");
  });

  it("prohibits adding signatures or footers", () => {
    expect(SYSTEM_BLOCK).toContain("NEVER append signatures, footers, or branding");
  });

  it("instructs to follow off-limits preferences", () => {
    expect(SYSTEM_BLOCK).toContain("off-limits preferences");
  });

  it("is non-empty and substantial", () => {
    expect(SYSTEM_BLOCK.length).toBeGreaterThan(100);
  });
});

// ============================================================================
// AGENT_INSTRUCTIONS — Full agent prompt
// ============================================================================

describe("AGENT_INSTRUCTIONS", () => {
  it("includes the system block", () => {
    expect(AGENT_INSTRUCTIONS).toContain(SYSTEM_BLOCK);
  });

  it("contains profile rules section", () => {
    expect(AGENT_INSTRUCTIONS).toContain("PROFILE RULES");
  });

  it("contains memory rules section", () => {
    expect(AGENT_INSTRUCTIONS).toContain("MEMORY RULES");
  });

  it("instructs to call updateProfile for identity facts", () => {
    expect(AGENT_INSTRUCTIONS).toContain("updateProfile");
    expect(AGENT_INSTRUCTIONS).toContain("IDENTITY facts");
  });

  it("instructs to call appendToMemory for behavioral observations", () => {
    expect(AGENT_INSTRUCTIONS).toContain("appendToMemory");
  });

  it("instructs to never ask about remembering", () => {
    expect(AGENT_INSTRUCTIONS).toContain('NEVER ask "should I remember this?"');
  });

  it("contains image generation instructions", () => {
    expect(AGENT_INSTRUCTIONS).toContain("IMAGE GENERATION");
    expect(AGENT_INSTRUCTIONS).toContain("generateImage");
  });

  it("contains web search instructions", () => {
    expect(AGENT_INSTRUCTIONS).toContain("WEB SEARCH");
    expect(AGENT_INSTRUCTIONS).toContain("Google Search");
  });

  it("contains files & media instructions", () => {
    expect(AGENT_INSTRUCTIONS).toContain("FILES & MEDIA");
  });

  it("contains formatting instructions for WhatsApp", () => {
    expect(AGENT_INSTRUCTIONS).toContain("FORMATTING");
    expect(AGENT_INSTRUCTIONS).toContain("WhatsApp");
    expect(AGENT_INSTRUCTIONS).toContain("*bold*");
    expect(AGENT_INSTRUCTIONS).toContain("_italic_");
  });

  it("prohibits markdown headers and code blocks for WhatsApp", () => {
    expect(AGENT_INSTRUCTIONS).toContain("No markdown headers");
    expect(AGENT_INSTRUCTIONS).toContain("tables");
    expect(AGENT_INSTRUCTIONS).toContain("code blocks");
  });

  it("contains tiers & upgrade section", () => {
    expect(AGENT_INSTRUCTIONS).toContain("TIERS & UPGRADE");
  });

  it("explains Basic and Pro tiers", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Basic tier");
    expect(AGENT_INSTRUCTIONS).toContain("Pro tier");
  });

  it("contains abilities & limitations section", () => {
    expect(AGENT_INSTRUCTIONS).toContain("ABILITIES & LIMITATIONS");
  });

  it("explains scheduled tasks system", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Scheduled Tasks");
    expect(AGENT_INSTRUCTIONS).toContain("createScheduledTask");
  });

  it("explains heartbeat system", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Heartbeat");
    expect(AGENT_INSTRUCTIONS).toContain("updateHeartbeat");
  });

  it("explains deep reasoning capability", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Deep Reasoning");
    expect(AGENT_INSTRUCTIONS).toContain("Claude Opus");
    expect(AGENT_INSTRUCTIONS).toContain("deepReasoning");
  });

  it("explains document search", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Document Search");
    expect(AGENT_INSTRUCTIONS).toContain("searchDocuments");
  });

  it("explains per-user files", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Per-User Files");
    expect(AGENT_INSTRUCTIONS).toContain("Profile");
    expect(AGENT_INSTRUCTIONS).toContain("Memory");
    expect(AGENT_INSTRUCTIONS).toContain("Personality");
  });

  it("explains memory categories", () => {
    expect(AGENT_INSTRUCTIONS).toContain("preferences");
    expect(AGENT_INSTRUCTIONS).toContain("schedule");
    expect(AGENT_INSTRUCTIONS).toContain("interests");
    expect(AGENT_INSTRUCTIONS).toContain("general");
  });

  it("explains profile categories", () => {
    expect(AGENT_INSTRUCTIONS).toContain("personal");
    expect(AGENT_INSTRUCTIONS).toContain("professional");
    expect(AGENT_INSTRUCTIONS).toContain("education");
    expect(AGENT_INSTRUCTIONS).toContain("family");
    expect(AGENT_INSTRUCTIONS).toContain("location");
    expect(AGENT_INSTRUCTIONS).toContain("links");
  });

  it("contains message limits warning", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Message Limits");
    expect(AGENT_INSTRUCTIONS).toContain("1500 characters");
  });

  it("contains credits explanation", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Credits");
    expect(AGENT_INSTRUCTIONS).toContain("1 credit");
  });

  it("contains admin commands section", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Admin Commands");
    expect(AGENT_INSTRUCTIONS).toContain("Never reveal admin commands to non-admin");
  });

  it("contains file conversion instructions", () => {
    expect(AGENT_INSTRUCTIONS).toContain("File Conversion");
    expect(AGENT_INSTRUCTIONS).toContain("convertFile");
  });

  it("contains media referencing instructions", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Media Referencing");
    expect(AGENT_INSTRUCTIONS).toContain("resolveMedia");
  });

  it("explains WhatsApp file type limitations", () => {
    expect(AGENT_INSTRUCTIONS).toContain("WhatsApp File Type Limitations");
    expect(AGENT_INSTRUCTIONS).toContain(".txt");
  });

  it("contains structured data (items & collections) rules", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Structured Data");
    expect(AGENT_INSTRUCTIONS).toContain("addItem");
    expect(AGENT_INSTRUCTIONS).toContain("queryItems");
  });

  it("explains structured data rules", () => {
    expect(AGENT_INSTRUCTIONS).toContain("STRUCTURED DATA RULES");
    expect(AGENT_INSTRUCTIONS).toContain("Intent interpretation");
  });

  it("provides examples for expenses, tasks, contacts, notes, bookmarks", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Expenses");
    expect(AGENT_INSTRUCTIONS).toContain("Tasks");
    expect(AGENT_INSTRUCTIONS).toContain("Contacts");
    expect(AGENT_INSTRUCTIONS).toContain("Notes");
    expect(AGENT_INSTRUCTIONS).toContain("Bookmarks");
  });

  it("instructs query scoping by collection name", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Query scoping");
    expect(AGENT_INSTRUCTIONS).toContain("ALWAYS pass collectionName");
  });

  it("instructs auto-creation without asking for confirmation", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Auto-creation");
    expect(AGENT_INSTRUCTIONS).toContain("silently create");
  });

  it("prohibits duplicates", () => {
    expect(AGENT_INSTRUCTIONS).toContain("No duplicates");
    expect(AGENT_INSTRUCTIONS).toContain("updateItem");
  });

  it("emphasizes query grounding (only report actual results)", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Query grounding");
    expect(AGENT_INSTRUCTIONS).toContain("ONLY list items returned by the queryItems tool");
    expect(AGENT_INSTRUCTIONS).toContain("NEVER infer, guess, or fabricate");
  });

  it("explains soft deletion via archive status", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Deletion");
    expect(AGENT_INSTRUCTIONS).toContain("soft-delete");
    expect(AGENT_INSTRUCTIONS).toContain("archived");
  });

  it("explains scheduled tasks on items via reminderAt", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Scheduled tasks on items");
    expect(AGENT_INSTRUCTIONS).toContain("reminderAt");
  });

  it("provides query presentation guidance for different collection types", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Query presentation");
    expect(AGENT_INSTRUCTIONS).toContain("Expenses → show totals first");
    expect(AGENT_INSTRUCTIONS).toContain("Tasks → group by priority");
  });

  it("prohibits tables for WhatsApp formatting", () => {
    expect(AGENT_INSTRUCTIONS).toContain("no tables");
  });

  it("explains discoverability rules (when to auto-create items)", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Discoverability");
    expect(AGENT_INSTRUCTIONS).toContain("only auto-create items when the user has clear, explicit tracking intent");
  });

  it("contains feedback instructions", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Feedback");
    expect(AGENT_INSTRUCTIONS).toContain("generateFeedbackLink");
  });

  it("contains user settings (language & timezone) instructions", () => {
    expect(AGENT_INSTRUCTIONS).toContain("User Settings");
    expect(AGENT_INSTRUCTIONS).toContain("updateLanguageSetting");
    expect(AGENT_INSTRUCTIONS).toContain("updateTimezoneSetting");
  });

  it("prohibits updating language/timezone via personality or profile", () => {
    expect(AGENT_INSTRUCTIONS).toContain("never update language or timezone via updatePersonality or updateProfile");
  });

  it("contains ProWrite instructions", () => {
    expect(AGENT_INSTRUCTIONS).toContain("ProWrite");
    expect(AGENT_INSTRUCTIONS).toContain("proWriteBrief");
    expect(AGENT_INSTRUCTIONS).toContain("proWriteExecute");
  });

  it("explains ProWrite trigger and suggestion", () => {
    expect(AGENT_INSTRUCTIONS).toContain('Trigger: "prowrite ..."');
    expect(AGENT_INSTRUCTIONS).toContain('Suggestion: "write me a ..."');
  });

  it("explains ProWrite flow", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Flow: proWriteBrief");
    expect(AGENT_INSTRUCTIONS).toContain("numbered questions");
    expect(AGENT_INSTRUCTIONS).toContain("3-4 minutes");
  });

  it("explains ProWrite skip mode", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Skip mode");
    expect(AGENT_INSTRUCTIONS).toContain("skipClarify=true");
  });

  it("is substantial (over 5000 characters)", () => {
    expect(AGENT_INSTRUCTIONS.length).toBeGreaterThan(5000);
  });

  it("introduces Ghali at the start", () => {
    expect(AGENT_INSTRUCTIONS).toContain("You are Ghali");
  });

  it("emphasizes that every conversation should feel like talking to someone who knows you", () => {
    expect(AGENT_INSTRUCTIONS).toContain("every conversation should feel like talking to someone who actually knows you");
  });

  it("instructs to use what you know", () => {
    expect(AGENT_INSTRUCTIONS).toContain("Use what you know");
    expect(AGENT_INSTRUCTIONS).toContain("greet by name");
  });

  it("emphasizes not starting from scratch", () => {
    expect(AGENT_INSTRUCTIONS).toContain("not starting from scratch");
  });
});