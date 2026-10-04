import { describe, expect, it } from "vitest";
import {
  deriveJigsawBaselineCourseProgram,
  getJigsawBaselineCourseDefinition,
  isJigsawBaselineGrammarId,
  jigsawBaselineCourseIds,
  realizeJigsawBaselineCourseProgram,
} from "./baselineCourse";
import {
  deriveJigsawBaselineProgram,
  jigsawBaselineGrammarIds,
  realizeJigsawBaselineProgram,
} from "./baselineGrammar";

describe("Jigsaw baseline course vocabulary", () => {
  it("contains the canonical grammar plus all shipped span and reversal courses", () => {
    expect(jigsawBaselineCourseIds).toEqual([
      ...jigsawBaselineGrammarIds,
      "separated-bows",
      "opposed-pair",
      "primary-secondary",
      "inflection-rest-bow",
      "same-side-hairpin",
      "opposed-hairpin",
      "counter-hook",
    ]);
  });

  it("delegates canonical course geometry exactly to BaselineGrammar", () => {
    for (const grammarId of jigsawBaselineGrammarIds) {
      for (const seedOffset of [1, 17, 991, 123_456, 999_999]) {
        expect(
          realizeJigsawBaselineCourseProgram(
            deriveJigsawBaselineCourseProgram(grammarId, seedOffset),
          ),
        ).toEqual(
          realizeJigsawBaselineProgram(
            deriveJigsawBaselineProgram(grammarId, seedOffset),
          ),
        );
      }
    }
  });

  it("keeps every reversal course as a genuine bounded longitudinal backtrack", () => {
    const reversalIds = [
      "same-side-hairpin",
      "opposed-hairpin",
      "counter-hook",
    ] as const;

    for (const courseId of reversalIds) {
      for (const seedOffset of [1, 17, 991, 8_001, 123_456, 456_789, 999_999]) {
        const points = realizeJigsawBaselineCourseProgram(
          deriveJigsawBaselineCourseProgram(courseId, seedOffset),
        );
        expect(
          points.some(
            (candidate, index) =>
              index > 0 && candidate.x < points[index - 1]!.x - 0.01,
          ),
        ).toBe(true);
        expect(points[1]).toMatchObject({ y: 0 });
        expect(points.at(-2)).toMatchObject({ y: 0 });
      }
    }
  });

  it("derives every advanced production course deterministically across broad seeds", () => {
    const advanced = jigsawBaselineCourseIds.filter(
      (courseId) => !isJigsawBaselineGrammarId(courseId),
    );

    for (const courseId of advanced) {
      const definition = getJigsawBaselineCourseDefinition(courseId);
      for (let index = 0; index < 256; index += 1) {
        const seedOffset = (index * 48_271 + 12_345) % 1_000_000;
        const first = deriveJigsawBaselineCourseProgram(courseId, seedOffset);
        const again = deriveJigsawBaselineCourseProgram(courseId, seedOffset);
        expect(again).toEqual(first);

        const points = realizeJigsawBaselineCourseProgram(first);
        expect(points[0]).toEqual({ x: 0, y: 0 });
        expect(points.at(-1)).toEqual({ x: 1, y: 0 });
        expect(points.every((candidate) =>
          Number.isFinite(candidate.x) &&
          Number.isFinite(candidate.y) &&
          candidate.x >= 0 &&
          candidate.x <= 1
        )).toBe(true);
        expect(Math.max(...points.map((candidate) => Math.abs(candidate.y))))
          .toBeLessThanOrEqual(definition.depth[1] + 1e-9);
      }
    }
  });
});
