import { describe, it, expect } from "vitest";
import {
  getReflectionThreshold,
  REFLECTION_THRESHOLD_NEW,
  REFLECTION_THRESHOLD_ESTABLISHED,
  REFLECTION_NEW_USER_CUTOFF,
} from "./reflection";

describe("getReflectionThreshold", () => {
  it("returns lower threshold for new users (< 30 messages)", () => {
    expect(getReflectionThreshold(0)).toBe(REFLECTION_THRESHOLD_NEW);
    expect(getReflectionThreshold(1)).toBe(REFLECTION_THRESHOLD_NEW);
    expect(getReflectionThreshold(29)).toBe(REFLECTION_THRESHOLD_NEW);
  });

  it("returns higher threshold at exactly the cutoff", () => {
    expect(getReflectionThreshold(REFLECTION_NEW_USER_CUTOFF)).toBe(
      REFLECTION_THRESHOLD_ESTABLISHED
    );
  });

  it("returns higher threshold for established users (30+ messages)", () => {
    expect(getReflectionThreshold(30)).toBe(REFLECTION_THRESHOLD_ESTABLISHED);
    expect(getReflectionThreshold(100)).toBe(REFLECTION_THRESHOLD_ESTABLISHED);
    expect(getReflectionThreshold(1000)).toBe(REFLECTION_THRESHOLD_ESTABLISHED);
  });

  it("uses expected constant values", () => {
    expect(REFLECTION_THRESHOLD_NEW).toBe(5);
    expect(REFLECTION_THRESHOLD_ESTABLISHED).toBe(15);
    expect(REFLECTION_NEW_USER_CUTOFF).toBe(30);
  });
});
