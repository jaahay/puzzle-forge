import { describe, expect, it } from "vitest";
import {
  deriveJigsawSeamProgram,
  getJigsawSeamProgramSignature,
  jigsawSeamGrammarCatalog,
  jigsawSeamGrammarIds,
  realizeJigsawSeamProgram,
} from "./seamGrammar";

describe("Jigsaw seam grammar", () => {
  it("gives every grammar family a unique structural production", () => {
    const productions = jigsawSeamGrammarIds.map(
      (grammarId) => jigsawSeamGrammarCatalog[grammarId].production,
    );

    expect(new Set(productions).size).toBe(jigsawSeamGrammarIds.length);
  });

  it("derives deterministic programs and finite normalized geometry", () => {
    for (const grammarId of jigsawSeamGrammarIds) {
      for (const seedOffset of [1, 17, 991, 123_456, 999_999]) {
        const first = deriveJigsawSeamProgram(grammarId, seedOffset);
        const second = deriveJigsawSeamProgram(grammarId, seedOffset);

        expect(first).toEqual(second);
        expect(first.grammarId).toBe(grammarId);
        expect(first.events.length).toBeGreaterThan(0);

        const points = realizeJigsawSeamProgram(first);
        expect(points.length).toBeGreaterThanOrEqual(5);
        for (const point of points) {
          expect(Number.isFinite(point.x)).toBe(true);
          expect(Number.isFinite(point.y)).toBe(true);
        }
      }
    }
  });

  it("varies continuous geometry without changing a fixed grammar's event structure", () => {
    for (const grammarId of [
      "classic-bulb",
      "necked-head",
      "scoop",
      "serpentine",
      "curl",
      "stacked-lock",
    ] as const) {
      const programs = Array.from({ length: 16 }, (_, seedOffset) =>
        deriveJigsawSeamProgram(grammarId, seedOffset),
      );
      const signatures = programs.map(getJigsawSeamProgramSignature);

      expect(new Set(signatures).size).toBe(1);
      expect(new Set(programs.map((program) => JSON.stringify(program))).size).toBeGreaterThan(8);
    }
  });

  it("allows bounded repeat grammars to derive genuinely different event counts", () => {
    for (const grammarId of ["multi-lobe", "terrace", "zigzag"] as const) {
      const signatures = Array.from({ length: 128 }, (_, seedOffset) =>
        getJigsawSeamProgramSignature(
          deriveJigsawSeamProgram(grammarId, seedOffset),
        ),
      );

      expect(new Set(signatures).size).toBeGreaterThan(1);
    }
  });

  it("keeps the collapsed catalog free of the retired cosmetic families", () => {
    expect(jigsawSeamGrammarIds).not.toContain("mushroom");
    expect(jigsawSeamGrammarIds).not.toContain("keyhole");
    expect(jigsawSeamGrammarIds).not.toContain("bottle");
    expect(jigsawSeamGrammarIds).not.toContain("dovetail");
    expect(jigsawSeamGrammarIds).not.toContain("t-lock");
  });
});
