import { describe, expect, it } from "vitest";
import {
  baselineReversalExperimentLeavesProductionCatalogUntouched,
  getJigsawBaselineReversalReciprocalPoints,
  jigsawBaselineReversalCandidateIds,
  realizeJigsawBaselineReversalCandidate,
  validateJigsawBaselineReversalPieceOutline,
  validateJigsawBaselineReversalPoints,
} from "./baselineReversalExplorer";

const seeds = Array.from(
  { length: 128 },
  (_, index) => index * 65537 + 97,
);

describe("Jigsaw baseline longitudinal reversal exploration", () => {
  it("realizes every bounded reversal candidate deterministically and safely", () => {
    for (const candidateId of jigsawBaselineReversalCandidateIds) {
      for (const seedOffset of seeds) {
        const first = realizeJigsawBaselineReversalCandidate(
          candidateId,
          seedOffset,
        );
        const again = realizeJigsawBaselineReversalCandidate(
          candidateId,
          seedOffset,
        );

        expect(again).toEqual(first);
        expect(first.validation.valid).toBe(true);
        expect(
          validateJigsawBaselineReversalPieceOutline(first.points),
        ).toBe(true);

        if (!first.validation.valid) continue;
        expect(first.validation.backtrack).toBeGreaterThanOrEqual(0.1);
        expect(first.validation.backtrack).toBeLessThanOrEqual(0.26);
        expect(first.validation.minimumClearance).toBeGreaterThanOrEqual(
          0.025,
        );
      }
    }
  });

  it("preserves the same bounded reversal contract under reciprocal neighbor orientation", () => {
    for (const candidateId of jigsawBaselineReversalCandidateIds) {
      for (const seedOffset of seeds) {
        const realized = realizeJigsawBaselineReversalCandidate(
          candidateId,
          seedOffset,
        );
        const reciprocal =
          getJigsawBaselineReversalReciprocalPoints(realized.points);
        const restored =
          getJigsawBaselineReversalReciprocalPoints(reciprocal);

        expect(validateJigsawBaselineReversalPoints(reciprocal).valid).toBe(
          true,
        );
        expect(
          validateJigsawBaselineReversalPieceOutline(reciprocal),
        ).toBe(true);
        expect(restored).toHaveLength(realized.points.length);

        for (let index = 0; index < restored.length; index += 1) {
          expect(restored[index]!.x).toBeCloseTo(
            realized.points[index]!.x,
            12,
          );
          expect(restored[index]!.y).toBeCloseTo(
            realized.points[index]!.y,
            12,
          );
        }
      }
    }
  });

  it("rejects ordinary monotonic baselines rather than weakening the reversal definition", () => {
    expect(
      validateJigsawBaselineReversalPoints([
        { x: 0, y: 0 },
        { x: 0.35, y: 0.2 },
        { x: 0.7, y: 0.2 },
        { x: 1, y: 0 },
      ]),
    ).toEqual({
      valid: false,
      reason: "reversal-pattern",
    });
  });

  it("rejects excessive longitudinal backtracking", () => {
    expect(
      validateJigsawBaselineReversalPoints([
        { x: 0, y: 0 },
        { x: 0.2, y: 0.15 },
        { x: 0.72, y: 0.5 },
        { x: 0.35, y: 0.32 },
        { x: 0.82, y: 0.16 },
        { x: 1, y: 0 },
      ]),
    ).toEqual({
      valid: false,
      reason: "backtrack-out-of-bounds",
    });
  });

  it("rejects non-adjacent self-contact, including touching rather than only proper crossings", () => {
    expect(
      validateJigsawBaselineReversalPoints([
        { x: 0, y: 0 },
        { x: 0.2, y: 0.2 },
        { x: 0.7, y: 0.45 },
        { x: 0.5, y: 0.2 },
        { x: 0.7, y: 0.45 },
        { x: 1, y: 0 },
      ]),
    ).toEqual({
      valid: false,
      reason: "self-contact",
    });
  });

  it("rejects reversal rails that pass too close without intersecting", () => {
    const result = validateJigsawBaselineReversalPoints([
      { x: 0, y: 0 },
      { x: 0.18, y: 0.12 },
      { x: 0.7, y: 0.4 },
      { x: 0.52, y: 0.3 },
      { x: 0.82, y: 0.28 },
      { x: 1, y: 0 },
    ]);

    expect(result).toEqual({
      valid: false,
      reason: "insufficient-clearance",
    });
  });

  it("keeps the reversal experiment outside the production BaselineGrammar catalog", () => {
    expect(
      baselineReversalExperimentLeavesProductionCatalogUntouched(),
    ).toBe(true);
  });
});
