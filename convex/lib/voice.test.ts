import { describe, it, expect } from "vitest";
import { isAudioType, getAudioExtension } from "./voice";

describe("isAudioType", () => {
  it("returns true for audio/ogg", () => {
    expect(isAudioType("audio/ogg")).toBe(true);
  });

  it("returns true for audio/ogg with codec info", () => {
    expect(isAudioType("audio/ogg; codecs=opus")).toBe(true);
  });

  it("returns true for audio/mpeg", () => {
    expect(isAudioType("audio/mpeg")).toBe(true);
  });

  it("returns true for all supported audio types", () => {
    const supported = [
      "audio/ogg",
      "audio/mpeg",
      "audio/mp4",
      "audio/amr",
      "audio/wav",
      "audio/webm",
      "audio/aac",
    ];
    for (const type of supported) {
      expect(isAudioType(type)).toBe(true);
    }
  });

  it("returns false for image/jpeg", () => {
    expect(isAudioType("image/jpeg")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isAudioType("")).toBe(false);
  });

  it("handles uppercase MIME types", () => {
    expect(isAudioType("Audio/OGG")).toBe(true);
  });
});

describe("getAudioExtension", () => {
  it("maps audio/ogg to ogg", () => {
    expect(getAudioExtension("audio/ogg")).toBe("ogg");
  });

  it("maps audio/mpeg to mp3", () => {
    expect(getAudioExtension("audio/mpeg")).toBe("mp3");
  });

  it("maps audio/mp4 to m4a", () => {
    expect(getAudioExtension("audio/mp4")).toBe("m4a");
  });

  it("strips codec info before mapping", () => {
    expect(getAudioExtension("audio/ogg; codecs=opus")).toBe("ogg");
  });

  it("defaults to ogg for unknown types", () => {
    expect(getAudioExtension("audio/unknown")).toBe("ogg");
  });
});
