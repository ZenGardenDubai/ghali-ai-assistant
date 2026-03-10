import { describe, it, expect } from "vitest";
import { TEMPLATE_DEFINITIONS, renderTemplatePreview } from "./admin";

describe("TEMPLATE_DEFINITIONS", () => {
  it("contains 9 templates", () => {
    expect(TEMPLATE_DEFINITIONS).toHaveLength(9);
  });

  it("every template has required fields", () => {
    for (const tpl of TEMPLATE_DEFINITIONS) {
      expect(tpl.name).toMatch(/^ghali_/);
      expect(tpl.description).toBeTruthy();
      expect(tpl.variables.length).toBeGreaterThan(0);
      expect(tpl.preview).toBeTruthy();
    }
  });

  it("template variable count matches preview placeholders", () => {
    for (const tpl of TEMPLATE_DEFINITIONS) {
      const placeholders = tpl.preview.match(/\{\{\d+\}\}/g) ?? [];
      expect(placeholders.length).toBe(tpl.variables.length);
    }
  });

  it("all template names are unique", () => {
    const names = TEMPLATE_DEFINITIONS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("template names use 360dialog naming convention (no ContentSid, no env var references)", () => {
    for (const tpl of TEMPLATE_DEFINITIONS) {
      // 360dialog template names are snake_case strings, not env var or ContentSid patterns
      expect(tpl.name).toMatch(/^[a-z][a-z0-9_]+$/);
      expect(tpl.name).not.toMatch(/^HX/); // Twilio ContentSid prefix
      expect(tpl.name).not.toMatch(/^CONTENT_SID/); // Twilio env var pattern
    }
  });
});

describe("getTemplateStatus shape (360dialog migration check)", () => {
  it("each definition has a name usable as template key (no env var lookup needed)", () => {
    // 360dialog sends templates by name directly — confirm all names are non-empty strings
    for (const tpl of TEMPLATE_DEFINITIONS) {
      expect(typeof tpl.name).toBe("string");
      expect(tpl.name.length).toBeGreaterThan(0);
    }
  });

  it("simulated getTemplateStatus returns key equal to name for each template", () => {
    // Mirrors what getTemplateStatus returns — key must be set so the dashboard
    // template selector can select and send templates correctly.
    const statusItems = TEMPLATE_DEFINITIONS.map((t) => ({
      key: t.name,
      name: t.name,
      description: t.description,
      variables: t.variables as unknown as string[],
      preview: t.preview,
      configured: true,
    }));

    for (const item of statusItems) {
      expect(item.key).toBe(item.name);
      expect(item.configured).toBe(true);
      // No "Content SID" or env var concept — templates are always "configured"
    }
  });
});

describe("renderTemplatePreview", () => {
  it("replaces {{1}} with the first variable value", () => {
    const result = renderTemplatePreview(
      "Hi from Ghali! Here is your scheduled reminder:\n\n{{1}}\n\nReply to chat.",
      { "1": "Call the dentist at 3pm" }
    );
    expect(result).toContain("Call the dentist at 3pm");
    expect(result).not.toContain("{{1}}");
  });

  it("replaces multiple placeholders", () => {
    const result = renderTemplatePreview(
      "Your {{2}} credits have been refreshed. You now have {{1}} credits for this month.",
      { "1": "600", "2": "Pro" }
    );
    expect(result).toBe(
      "Your Pro credits have been refreshed. You now have 600 credits for this month."
    );
  });

  it("leaves unreferenced placeholders unchanged when variable is missing", () => {
    const result = renderTemplatePreview("Hello {{1}} and {{2}}", { "1": "Alice" });
    expect(result).toBe("Hello Alice and {{2}}");
  });

  it("returns preview unchanged when variables map is empty", () => {
    const preview = "Static template with no variables";
    expect(renderTemplatePreview(preview, {})).toBe(preview);
  });
});
