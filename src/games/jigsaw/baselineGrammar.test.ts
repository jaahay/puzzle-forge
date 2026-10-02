import { describe, expect, it } from "vitest";
import {
  deriveJigsawBaselineProgram,
  getJigsawBaselineGrammarDefinition,
  getJigsawBaselineProgramSignature,
  jigsawBaselineGrammarCatalog,
  jigsawBaselineGrammarIds,
  realizeJigsawBaselineProgram,
} from "./baselineGrammar";
import {
  expandJigsawBaselineProduction,
  getJigsawBaselineProductionStructure,
} from "./baselineProduction";

describe("Jigsaw baseline grammar", () => {
  it("derives program events from the canonical production tree", () => {
    for (const grammarId of jigsawBaselineGrammarIds) {
      const program = deriveJigsawBaselineProgram(grammarId, 123_456);
      expect(program.events).toEqual(
        expandJigsawBaselineProduction(
          jigsawBaselineGrammarCatalog[grammarId].production,
        ),
      );
    }
  });

  it("derives deterministic programs with seeded variation", () => {
    for (const grammarId of jigsawBaselineGrammarIds) {
      const first = deriveJigsawBaselineProgram(grammarId, 123_456);
      expect(deriveJigsawBaselineProgram(grammarId, 123_456)).toEqual(first);

      const variants = Array.from({ length: 16 }, (_, seedOffset) =>
        JSON.stringify(deriveJigsawBaselineProgram(grammarId, seedOffset)),
      );

      if (grammarId === "straight") {
        expect(new Set(variants).size).toBe(1);
      } else {
        expect(new Set(variants).size).toBeGreaterThan(8);
      }
    }
  });

  it("keeps straight as the exact identity baseline for every seed", () => {
    for (const seedOffset of [0, 1, 17, 991, 123_456, 999_999]) {
      expect(
        realizeJigsawBaselineProgram(
          deriveJigsawBaselineProgram("straight", seedOffset),
        ),
      ).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]);
    }
  });

  it("keeps grammar event signatures structural rather than seed-dependent", () => {
    for (const grammarId of jigsawBaselineGrammarIds) {
      const signatures = Array.from({ length: 32 }, (_, seedOffset) =>
        getJigsawBaselineProgramSignature(
          deriveJigsawBaselineProgram(grammarId, seedOffset),
        ),
      );

      expect(new Set(signatures)).toEqual(
        new Set([
          getJigsawBaselineProductionStructure(
            jigsawBaselineGrammarCatalog[grammarId].production,
          ),
        ]),
      );
    }
  });

  it("realizes exact baseline endpoints with quiet endpoint neighborhoods", () => {
    for (const grammarId of jigsawBaselineGrammarIds) {
      for (const seedOffset of [1, 17, 991, 123_456, 999_999]) {
        const points = realizeJigsawBaselineProgram(
          deriveJigsawBaselineProgram(grammarId, seedOffset),
        );

        expect(points[0]).toEqual({ x: 0, y: 0 });
        expect(points.at(-1)).toEqual({ x: 1, y: 0 });
        expect(points[1].y).toBe(0);
        expect(points.at(-2)?.y).toBe(0);
        expect(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(
          true,
        );
      }
    }
  });

  it("keeps realized baseline amplitude within each grammar's declared shallow depth", () => {
    for (const grammarId of jigsawBaselineGrammarIds) {
      const definition = getJigsawBaselineGrammarDefinition(grammarId);

      for (const seedOffset of Array.from({ length: 128 }, (_, index) => index * 7_919)) {
        const program = deriveJigsawBaselineProgram(grammarId, seedOffset);
        const points = realizeJigsawBaselineProgram(program);
        const maximumDepth = Math.max(...points.map((point) => Math.abs(point.y)));

        expect(program.depth).toBeGreaterThanOrEqual(definition.depth[0]);
        expect(program.depth).toBeLessThanOrEqual(definition.depth[1]);
        expect(maximumDepth).toBeLessThanOrEqual(definition.depth[1]);
        if (grammarId === "straight") {
          expect(maximumDepth).toBe(0);
        } else {
          expect(maximumDepth).toBeGreaterThan(definition.depth[0] * 0.5);
        }
      }
    }
  });

  it("keeps dogleg structurally between an offset course and a stepped course", () => {
    const seedOffset = 123_456;
    const angled = realizeJigsawBaselineProgram(
      deriveJigsawBaselineProgram("angled-course", seedOffset),
    );
    const dogleg = realizeJigsawBaselineProgram(
      deriveJigsawBaselineProgram("dogleg", seedOffset),
    );
    const stepped = realizeJigsawBaselineProgram(
      deriveJigsawBaselineProgram("stepped-course", seedOffset),
    );

    const maximumCount = (points: readonly { y: number }[]) => {
      const maximum = Math.max(...points.map((point) => Math.abs(point.y)));
      return points.filter((point) => Math.abs(point.y) === maximum).length;
    };
    const verticalSegmentCount = (points: readonly { x: number }[]) =>
      points.slice(1).filter((point, index) => point.x === points[index].x).length;

    expect(maximumCount(angled)).toBe(2);
    expect(maximumCount(dogleg)).toBe(1);
    expect(verticalSegmentCount(dogleg)).toBe(0);
    expect(verticalSegmentCount(stepped)).toBeGreaterThan(0);
  });

  it("preserves the defining topology of crossing and non-crossing productions", () => {
    const seedOffset = 123_456;
    const bow = realizeJigsawBaselineProgram(
      deriveJigsawBaselineProgram("bow", seedOffset),
    );
    const inflection = realizeJigsawBaselineProgram(
      deriveJigsawBaselineProgram("inflection", seedOffset),
    );
    const wave = realizeJigsawBaselineProgram(
      deriveJigsawBaselineProgram("wave", seedOffset),
    );

    const hasBothSigns = (points: readonly { y: number }[]) =>
      Math.min(...points.map((point) => point.y)) < 0 &&
      Math.max(...points.map((point) => point.y)) > 0;

    expect(hasBothSigns(bow)).toBe(false);
    expect(hasBothSigns(inflection)).toBe(true);
    expect(hasBothSigns(wave)).toBe(true);
  });
});
