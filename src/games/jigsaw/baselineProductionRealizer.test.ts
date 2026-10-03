import { describe, expect, it } from "vitest";
import {
  jigsawBaselineCanonicalProductions,
  jigsawBaselineGrammarIds,
} from "./baselineGrammar";
import {
  baselineMirror,
  baselineOppose,
  baselinePrimitive,
  baselineSequence,
} from "./baselineProduction";
import {
  realizeJigsawBaselineProductionCandidate,
  type JigsawBaselineCandidatePoint,
} from "./baselineProductionRealizer";

const expectAccepted = (
  result: ReturnType<typeof realizeJigsawBaselineProductionCandidate>,
) => {
  expect(result.accepted).toBe(true);
  if (!result.accepted) throw new Error(`Unexpected rejection: ${result.reason}`);
  return result.points;
};

const countProperBaselineCrossings = (
  points: readonly JigsawBaselineCandidatePoint[],
) => points.slice(1).filter((point, index) =>
  points[index]!.y * point.y < 0,
).length;

describe("Jigsaw generic baseline production realizer", () => {
  it("realizes every canonical BaselineGrammar production across deterministic seeds", () => {
    for (const grammarId of jigsawBaselineGrammarIds) {
      for (const seed of [0, 1, 42, 0xffff_ffff]) {
        const points = expectAccepted(
          realizeJigsawBaselineProductionCandidate(
            jigsawBaselineCanonicalProductions[grammarId],
            seed,
          ),
        );

        expect(points[0]).toEqual({ x: 0, y: 0 });
        expect(points.at(-1)).toEqual({ x: 1, y: 0 });
        for (let index = 1; index < points.length; index += 1) {
          expect(points[index]!.x).toBeGreaterThan(points[index - 1]!.x);
          expect(Math.abs(points[index]!.y)).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("preserves explicit baseline crossings", () => {
    const inflection = expectAccepted(
      realizeJigsawBaselineProductionCandidate(
        jigsawBaselineCanonicalProductions.inflection,
        7,
      ),
    );
    const wave = expectAccepted(
      realizeJigsawBaselineProductionCandidate(
        jigsawBaselineCanonicalProductions.wave,
        7,
      ),
    );

    expect(countProperBaselineCrossings(inflection)).toBe(1);
    expect(countProperBaselineCrossings(wave)).toBe(2);
  });

  it("keeps course instructions on a nonzero offset", () => {
    const points = expectAccepted(
      realizeJigsawBaselineProductionCandidate(
        jigsawBaselineCanonicalProductions["angled-course"],
        11,
      ),
    );

    expect(points[1]!.y).not.toBe(0);
    expect(points[2]!.y).toBeCloseTo(points[1]!.y);
  });

  it("reflects a fully opposed production across the nominal baseline", () => {
    const production = jigsawBaselineCanonicalProductions.dogleg;
    const original = expectAccepted(
      realizeJigsawBaselineProductionCandidate(production, 91),
    );
    const opposed = expectAccepted(
      realizeJigsawBaselineProductionCandidate(
        baselineOppose(production),
        91,
      ),
    );

    expect(opposed).toHaveLength(original.length);
    opposed.forEach((point, index) => {
      expect(point.x).toBeCloseTo(original[index]!.x);
      expect(point.y).toBeCloseTo(-original[index]!.y);
    });
  });

  it("reflects a mirrored production longitudinally", () => {
    const deflect = baselinePrimitive("deflect");
    const production = baselineSequence(
      deflect,
      baselinePrimitive("course"),
      deflect,
      baselineMirror(deflect),
      baselineMirror(deflect),
    );
    const original = expectAccepted(
      realizeJigsawBaselineProductionCandidate(production, 1234),
    );
    const mirrored = expectAccepted(
      realizeJigsawBaselineProductionCandidate(
        baselineMirror(production),
        1234,
      ),
    );

    expect(mirrored).toHaveLength(original.length);
    mirrored.forEach((point, index) => {
      const reflected = original[original.length - 1 - index]!;
      expect(point.x).toBeCloseTo(1 - reflected.x);
      expect(point.y).toBeCloseTo(reflected.y);
    });
  });

  it("is deterministic while allowing seeded proportions to vary", () => {
    const production = jigsawBaselineCanonicalProductions.dogleg;
    const first = expectAccepted(
      realizeJigsawBaselineProductionCandidate(production, 100),
    );
    const again = expectAccepted(
      realizeJigsawBaselineProductionCandidate(production, 100),
    );
    const different = expectAccepted(
      realizeJigsawBaselineProductionCandidate(production, 101),
    );

    expect(again).toEqual(first);
    expect(different).not.toEqual(first);
  });

  it("realizes a structurally new production outside the named catalog", () => {
    const production = baselineSequence(
      baselinePrimitive("deflect"),
      baselinePrimitive("course"),
      baselinePrimitive("course"),
      baselineMirror(baselinePrimitive("deflect")),
    );

    const points = expectAccepted(
      realizeJigsawBaselineProductionCandidate(production, 55),
    );

    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 0.25, y: 1 },
      { x: 0.5, y: 1 },
      { x: 0.75, y: 1 },
      { x: 1, y: 0 },
    ]);
  });

  it("rejects structurally degenerate or unclosable productions explicitly", () => {
    expect(
      realizeJigsawBaselineProductionCandidate(
        baselinePrimitive("deflect"),
        1,
      ),
    ).toEqual({
      accepted: false,
      reason: "unclosable-deflection-balance",
    });

    expect(
      realizeJigsawBaselineProductionCandidate(
        baselinePrimitive("course"),
        1,
      ),
    ).toEqual({
      accepted: false,
      reason: "course-on-baseline",
    });

    expect(
      realizeJigsawBaselineProductionCandidate(
        baselinePrimitive("cross"),
        1,
      ),
    ).toEqual({
      accepted: false,
      reason: "cross-on-baseline",
    });
  });
});
