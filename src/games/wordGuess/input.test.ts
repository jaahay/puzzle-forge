import { describe, expect, it } from "vitest";
import { normalizeWordGuessNativeInput } from "./input";

describe("Word Guess native input normalization", () => {
  it("accepts ordinary device-keyboard text and normalizes it to puzzle letters", () => {
    expect(normalizeWordGuessNativeInput("crane", 5)).toBe("CRANE");
    expect(normalizeWordGuessNativeInput("c-r a!n?e", 5)).toBe("CRANE");
  });

  it("caps input at the active word length", () => {
    expect(normalizeWordGuessNativeInput("planet", 5)).toBe("PLANE");
  });

  it("supports deletion and empty native input", () => {
    expect(normalizeWordGuessNativeInput("CRAN", 5)).toBe("CRAN");
    expect(normalizeWordGuessNativeInput("", 5)).toBe("");
  });
});
