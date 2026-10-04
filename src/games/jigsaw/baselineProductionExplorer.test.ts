import { describe, expect, it } from "vitest";
import {
  getJigsawBaselineProductionStructure,
} from "./baselineProduction";
import { compileJigsawBaselineProduction } from "./baselineProductionCompiler";
import {
  exploreJigsawBaselineProductions,
  getJigsawBaselineInstructionSignature,
} from "./baselineProductionExplorer";

const explore = (seed = "bounded-explorer") =>
  exploreJigsawBaselineProductions({
    seed,
    sampleCount: 64,
    maximumDepth: 3,
    maximumInstructions: 16,
  });

describe("Jigsaw bounded baseline production explorer", () => {
  it("derives the same bounded candidate set from the same seed", () => {
    const first = explore();
    const again = explore();

    expect(again).toEqual(first);
    expect(first.candidates).toHaveLength(64);
    expect(first.seed).toBe("bounded-explorer");
  });

  it("allows seeded exploration to change the structural candidate set", () => {
    const first = explore("bounded-explorer");
    const different = explore("another-explorer-seed");

    expect(
      different.candidates.map((candidate) => candidate.semanticSignature),
    ).not.toEqual(
      first.candidates.map((candidate) => candidate.semanticSignature),
    );
  });

  it("records normalized structural and semantic signatures before realization", () => {
    const result = explore();

    for (const candidate of result.candidates) {
      const instructions =
        compileJigsawBaselineProduction(candidate.production);

      expect(candidate.structureSignature).toBe(
        getJigsawBaselineProductionStructure(candidate.production),
      );
      expect(candidate.semanticSignature).toBe(
        getJigsawBaselineInstructionSignature(instructions),
      );
      expect(candidate.instructionCount).toBe(instructions.length);
    }
  });

  it("surfaces accepted structures outside the named BaselineGrammar catalog", () => {
    const result = explore();
    const novelAccepted = result.candidates.filter(
      (candidate) =>
        candidate.canonicalGrammarId === null &&
        candidate.realization.accepted,
    );

    expect(novelAccepted.length).toBeGreaterThan(0);
    for (const candidate of novelAccepted) {
      expect(candidate.realization.accepted).toBe(true);
      if (!candidate.realization.accepted) continue;
      expect(candidate.realization.points[0]).toEqual({ x: 0, y: 0 });
      expect(candidate.realization.points.at(-1)).toEqual({ x: 1, y: 0 });
    }
  });

  it("retains explicit rejected candidates instead of rewriting their structure", () => {
    const result = explore();
    const rejected = result.candidates.filter(
      (candidate) => !candidate.realization.accepted,
    );

    expect(rejected.length).toBeGreaterThan(0);
    expect(
      rejected.every(
        (candidate) =>
          candidate.structureSignature ===
          getJigsawBaselineProductionStructure(candidate.production),
      ),
    ).toBe(true);
  });

  it("rejects candidates beyond the requested instruction budget before realization", () => {
    const result = exploreJigsawBaselineProductions({
      seed: "tight-instruction-budget",
      sampleCount: 64,
      maximumDepth: 4,
      maximumInstructions: 1,
    });
    const oversized = result.candidates.filter(
      (candidate) => candidate.instructionCount > 1,
    );

    expect(oversized.length).toBeGreaterThan(0);
    expect(
      oversized.every(
        (candidate) =>
          !candidate.realization.accepted &&
          candidate.realization.reason === "instruction-limit",
      ),
    ).toBe(true);
  });

  it("enforces hard explorer limits instead of accepting unbounded requests", () => {
    expect(() =>
      exploreJigsawBaselineProductions({
        seed: "too-many",
        sampleCount: 129,
      }),
    ).toThrow("sample count");

    expect(() =>
      exploreJigsawBaselineProductions({
        seed: "too-deep",
        maximumDepth: 5,
      }),
    ).toThrow("maximum depth");

    expect(() =>
      exploreJigsawBaselineProductions({
        seed: "too-wide",
        maximumInstructions: 33,
      }),
    ).toThrow("maximum instructions");
  });
});
