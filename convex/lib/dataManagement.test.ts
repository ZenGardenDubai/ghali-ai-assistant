import { describe, it, expect } from "vitest";
import { isAffirmative } from "./utils";
import { PENDING_ACTION_EXPIRY_MS } from "../constants";

describe("isAffirmative", () => {
  it("recognizes English affirmatives", () => {
    expect(isAffirmative("yes")).toBe(true);
    expect(isAffirmative("y")).toBe(true);
    expect(isAffirmative("ok")).toBe(true);
    expect(isAffirmative("sure")).toBe(true);
    expect(isAffirmative("yep")).toBe(true);
    expect(isAffirmative("yeah")).toBe(true);
    expect(isAffirmative("confirm")).toBe(true);
  });

  it("recognizes multilingual affirmatives", () => {
    expect(isAffirmative("نعم")).toBe(true); // Arabic
    expect(isAffirmative("oui")).toBe(true); // French
    expect(isAffirmative("si")).toBe(true); // Spanish
    expect(isAffirmative("haan")).toBe(true); // Hindi
    expect(isAffirmative("ہاں")).toBe(true); // Urdu (script)
    expect(isAffirmative("jee")).toBe(true); // Hindi/Urdu
    expect(isAffirmative("جی")).toBe(true); // Urdu (script)
  });

  it("is case-insensitive", () => {
    expect(isAffirmative("YES")).toBe(true);
    expect(isAffirmative("Yes")).toBe(true);
    expect(isAffirmative("Y")).toBe(true);
    expect(isAffirmative("OK")).toBe(true);
  });

  it("trims whitespace", () => {
    expect(isAffirmative("  yes  ")).toBe(true);
    expect(isAffirmative(" y ")).toBe(true);
  });

  it("rejects non-affirmative messages", () => {
    expect(isAffirmative("no")).toBe(false);
    expect(isAffirmative("cancel")).toBe(false);
    expect(isAffirmative("hello")).toBe(false);
    expect(isAffirmative("what is my memory")).toBe(false);
    expect(isAffirmative("")).toBe(false);
    expect(isAffirmative("yes please")).toBe(false); // Only exact matches
  });
});

describe("PENDING_ACTION_EXPIRY_MS", () => {
  it("is 5 minutes", () => {
    expect(PENDING_ACTION_EXPIRY_MS).toBe(5 * 60 * 1000);
  });
});

describe("pending action expiry logic", () => {
  it("action within 5 minutes is not expired", () => {
    const pendingActionAt = Date.now() - (4 * 60 * 1000); // 4 min ago
    const isExpired = Date.now() - pendingActionAt > PENDING_ACTION_EXPIRY_MS;
    expect(isExpired).toBe(false);
  });

  it("action older than 5 minutes is expired", () => {
    const pendingActionAt = Date.now() - (6 * 60 * 1000); // 6 min ago
    const isExpired = Date.now() - pendingActionAt > PENDING_ACTION_EXPIRY_MS;
    expect(isExpired).toBe(true);
  });

  it("action exactly at 5 minutes is not expired", () => {
    const now = Date.now();
    const pendingActionAt = now - PENDING_ACTION_EXPIRY_MS;
    const isExpired = now - pendingActionAt > PENDING_ACTION_EXPIRY_MS;
    expect(isExpired).toBe(false);
  });
});
