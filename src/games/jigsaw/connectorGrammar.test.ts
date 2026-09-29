import { describe, expect, it } from "vitest";
import {
  deriveJigsawConnectorProgram,
  getJigsawConnectorProgramSignature,
  jigsawConnectorGrammarCatalog,
  jigsawConnectorGrammarIds,
  realizeJigsawConnectorProgram,
} from "./connectorGrammar";

describe("Jigsaw connector grammar", () => {
  it("gives every grammar family a unique structural production", () => {
    const productions = jigsawConnectorGrammarIds.map(
      (grammarId) => jigsawConnectorGrammarCatalog[grammarId].production,
    );

    expect(new Set(productions).size).toBe(jigsawConnectorGrammarIds.length);
  });

  it("derives deterministic programs and finite normalized geometry", () => {
    for (const grammarId of jigsawConnectorGrammarIds) {
      for (const seedOffset of [1, 17, 991, 123_456, 999_999]) {
        const first = deriveJigsawConnectorProgram(grammarId, seedOffset);
        const second = deriveJigsawConnectorProgram(grammarId, seedOffset);

        expect(first).toEqual(second);
        expect(first.connectorGrammarId).toBe(grammarId);
        expect(first.events.length).toBeGreaterThan(0);

        const points = realizeJigsawConnectorProgram(first);
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
      "stacked-lock",
    ] as const) {
      const programs = Array.from({ length: 16 }, (_, seedOffset) =>
        deriveJigsawConnectorProgram(grammarId, seedOffset),
      );
      const signatures = programs.map(getJigsawConnectorProgramSignature);

      expect(new Set(signatures).size).toBe(1);
      expect(new Set(programs.map((program) => JSON.stringify(program))).size).toBeGreaterThan(8);
    }
  });

  it("allows bounded repeat grammars to derive genuinely different event counts", () => {
    for (const grammarId of ["multi-lobe", "terrace", "zigzag"] as const) {
      const signatures = Array.from({ length: 128 }, (_, seedOffset) =>
        getJigsawConnectorProgramSignature(
          deriveJigsawConnectorProgram(grammarId, seedOffset),
        ),
      );

      expect(new Set(signatures).size).toBeGreaterThan(1);
    }
  });

  it("keeps the collapsed catalog free of the retired cosmetic families", () => {
    expect(jigsawConnectorGrammarIds).not.toContain("mushroom");
    expect(jigsawConnectorGrammarIds).not.toContain("keyhole");
    expect(jigsawConnectorGrammarIds).not.toContain("bottle");
    expect(jigsawConnectorGrammarIds).not.toContain("dovetail");
    expect(jigsawConnectorGrammarIds).not.toContain("t-lock");
    expect(jigsawConnectorGrammarIds).not.toContain("curl");
  });
});
