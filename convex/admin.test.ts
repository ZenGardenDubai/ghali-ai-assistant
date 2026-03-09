import { describe, it, expect } from "vitest";
import { TEMPLATE_DEFINITIONS } from "./admin";

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
});
