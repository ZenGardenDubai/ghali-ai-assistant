import { describe, it, expect } from "vitest";
import {
  detectTimezone,
  canAfford,
  isSystemCommand,
  isBlockedCountryCode,
  fillTemplate,
  splitLongMessage,
} from "./utils";

describe("detectTimezone", () => {
  it("detects UAE timezone", () => {
    expect(detectTimezone("+971501234567")).toBe("Asia/Dubai");
  });

  it("detects UK timezone", () => {
    expect(detectTimezone("+447911123456")).toBe("Europe/London");
  });

  it("detects US timezone", () => {
    expect(detectTimezone("+12025551234")).toBe("America/New_York");
  });

  it("detects France timezone", () => {
    expect(detectTimezone("+33612345678")).toBe("Europe/Paris");
  });

  it("returns UTC for unknown country code", () => {
    expect(detectTimezone("+99912345678")).toBe("UTC");
  });

  it("handles Saudi Arabia", () => {
    expect(detectTimezone("+966501234567")).toBe("Asia/Riyadh");
  });
});

describe("canAfford", () => {
  it("returns true when credits >= cost", () => {
    expect(canAfford(5, 1)).toBe(true);
  });

  it("returns true when credits == cost", () => {
    expect(canAfford(1, 1)).toBe(true);
  });

  it("returns false when credits < cost", () => {
    expect(canAfford(0, 1)).toBe(false);
  });
});

describe("isSystemCommand", () => {
  it("recognizes system commands", () => {
    expect(isSystemCommand("credits")).toBe(true);
    expect(isSystemCommand("help")).toBe(true);
    expect(isSystemCommand("privacy")).toBe(true);
    expect(isSystemCommand("upgrade")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isSystemCommand("CREDITS")).toBe(true);
    expect(isSystemCommand("Help")).toBe(true);
  });

  it("trims whitespace", () => {
    expect(isSystemCommand("  credits  ")).toBe(true);
  });

  it("rejects non-system messages", () => {
    expect(isSystemCommand("what's the weather")).toBe(false);
    expect(isSystemCommand("hello")).toBe(false);
  });
});

describe("isBlockedCountryCode", () => {
  it("blocks India", () => {
    expect(isBlockedCountryCode("+919876543210")).toBe(true);
  });

  it("blocks Pakistan", () => {
    expect(isBlockedCountryCode("+923001234567")).toBe(true);
  });

  it("blocks Bangladesh", () => {
    expect(isBlockedCountryCode("+8801712345678")).toBe(true);
  });

  it("blocks Nigeria", () => {
    expect(isBlockedCountryCode("+2348012345678")).toBe(true);
  });

  it("does not block UAE", () => {
    expect(isBlockedCountryCode("+971501234567")).toBe(false);
  });

  it("does not block UK", () => {
    expect(isBlockedCountryCode("+447911123456")).toBe(false);
  });
});

describe("fillTemplate", () => {
  it("fills variables", () => {
    expect(fillTemplate("*Credits:* {{credits}}", { credits: 45 })).toBe(
      "*Credits:* 45"
    );
  });

  it("fills multiple variables", () => {
    expect(
      fillTemplate("{{name}} has {{credits}} credits", {
        name: "Ahmad",
        credits: 60,
      })
    ).toBe("Ahmad has 60 credits");
  });

  it("throws on missing variable", () => {
    expect(() => fillTemplate("{{missing}}", {})).toThrow(
      "Missing template variable: missing"
    );
  });
});

describe("splitLongMessage", () => {
  it("returns single chunk for short messages", () => {
    expect(splitLongMessage("Hello")).toEqual(["Hello"]);
  });

  it("splits at paragraph boundaries", () => {
    const text = "A".repeat(3000) + "\n\n" + "B".repeat(2000);
    const chunks = splitLongMessage(text, 4096);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toBe("A".repeat(3000));
    expect(chunks[1]).toBe("B".repeat(2000));
  });

  it("splits long messages into multiple chunks", () => {
    const text = "A".repeat(10000);
    const chunks = splitLongMessage(text, 4096);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("").length).toBe(10000);
  });
});
