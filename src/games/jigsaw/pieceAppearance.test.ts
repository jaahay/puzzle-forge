import { describe, expect, it } from "vitest";
import { jigsawPieceAppearances, resolveJigsawPieceAppearance } from "./playerPreferences";

describe("Jigsaw piece appearance treatment", () => {
  it("preserves the user's mode for joined islands", () => {
    for (const appearance of jigsawPieceAppearances) {
      expect(resolveJigsawPieceAppearance(appearance, true)).toBe(appearance);
    }
  });

  it("always outlines loose pieces for discoverability, including with seamless artwork", () => {
    for (const appearance of jigsawPieceAppearances) {
      expect(resolveJigsawPieceAppearance(appearance, false)).toBe("outlined");
    }
  });
});
