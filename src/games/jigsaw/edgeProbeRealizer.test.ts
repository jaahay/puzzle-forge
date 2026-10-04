import { describe, expect, it } from "vitest";
import { jigsawBaselineGrammarIds } from "./baselineGrammar";
import { jigsawEdgeAdvanceProbeIds } from "./edgeProbeGallery";
import {
  getJigsawEdgeProbeReciprocalPoints,
  realizeJigsawEdgeProbeSeam,
  validateJigsawEdgeProbePieceOutline,
  validateJigsawEdgeProbeSeam,
} from "./edgeProbeRealizer";

const seeds = Array.from(
  { length: 48 },
  (_, index) => index * 7919 + 17,
);

describe("Jigsaw edge probe realizer", () => {
  it("is deterministic for every advanced hypothesis", () => {
    for (const probeId of jigsawEdgeAdvanceProbeIds) {
      const first = realizeJigsawEdgeProbeSeam({
        probeId,
        seedOffset: 123456,
      });
      const again = realizeJigsawEdgeProbeSeam({
        probeId,
        seedOffset: 123456,
      });

      expect(again).toEqual(first);
    }
  });

  it("keeps all advanced hypotheses safe across existing baseline roles and broad seeds", () => {
    for (const probeId of jigsawEdgeAdvanceProbeIds) {
      for (const seedOffset of seeds) {
        if (probeId === "connectorless-wave") {
          const seam = realizeJigsawEdgeProbeSeam({
            probeId,
            seedOffset,
          });
          expect(validateJigsawEdgeProbeSeam(seam.points)).toEqual({
            valid: true,
          });
          expect(
            validateJigsawEdgeProbePieceOutline(seam.points),
          ).toEqual({ valid: true });
          continue;
        }

        for (const approachGrammarId of jigsawBaselineGrammarIds) {
          for (const departureGrammarId of jigsawBaselineGrammarIds) {
            const seam = realizeJigsawEdgeProbeSeam({
              probeId,
              seedOffset,
              approachGrammarId,
              departureGrammarId,
            });

            expect(validateJigsawEdgeProbeSeam(seam.points)).toEqual({
              valid: true,
            });
            expect(
              validateJigsawEdgeProbePieceOutline(seam.points),
            ).toEqual({ valid: true });
          }
        }
      }
    }
  });

  it("preserves exact reciprocal seam geometry under local neighbor orientation", () => {
    for (const probeId of jigsawEdgeAdvanceProbeIds) {
      for (const seedOffset of seeds) {
        const seam = realizeJigsawEdgeProbeSeam({
          probeId,
          seedOffset,
        });
        const reciprocal =
          getJigsawEdgeProbeReciprocalPoints(seam.points);
        const restored =
          getJigsawEdgeProbeReciprocalPoints(reciprocal);

        expect(restored).toHaveLength(seam.points.length);
        for (let index = 0; index < seam.points.length; index += 1) {
          expect(restored[index]!.x).toBeCloseTo(
            seam.points[index]!.x,
            10,
          );
          expect(restored[index]!.y).toBeCloseTo(
            seam.points[index]!.y,
            10,
          );
        }
        expect(validateJigsawEdgeProbeSeam(reciprocal)).toEqual({
          valid: true,
        });
        expect(
          validateJigsawEdgeProbePieceOutline(reciprocal),
        ).toEqual({ valid: true });
      }
    }
  });

  it("makes connector cardinality explicit in realized development seams", () => {
    expect(
      realizeJigsawEdgeProbeSeam({
        probeId: "connectorless-wave",
        seedOffset: 1,
      }).connectorCount,
    ).toBe(0);
    expect(
      realizeJigsawEdgeProbeSeam({
        probeId: "notched-head",
        seedOffset: 1,
      }).connectorCount,
    ).toBe(1);
    expect(
      realizeJigsawEdgeProbeSeam({
        probeId: "compound-lock",
        seedOffset: 1,
      }).connectorCount,
    ).toBe(2);
    expect(
      realizeJigsawEdgeProbeSeam({
        probeId: "opposed-dual-lock",
        seedOffset: 1,
      }).connectorCount,
    ).toBe(2);
  });

  it("realizes opposed dual lock with complete structure on both sides of the baseline", () => {
    for (const seedOffset of seeds) {
      const seam = realizeJigsawEdgeProbeSeam({
        probeId: "opposed-dual-lock",
        seedOffset,
        approachGrammarId: "straight",
        departureGrammarId: "straight",
      });
      const connectorPoints = seam.points.filter(
        (candidate) =>
          candidate.x >= 22 && candidate.x <= 78,
      );

      expect(
        Math.max(...connectorPoints.map((candidate) => candidate.y)),
      ).toBeGreaterThan(12);
      expect(
        Math.min(...connectorPoints.map((candidate) => candidate.y)),
      ).toBeLessThan(-12);
    }
  });

  it("derives the notched head from the production Necked head rather than the gallery sketch", () => {
    for (const seedOffset of seeds) {
      const seam = realizeJigsawEdgeProbeSeam({
        probeId: "notched-head",
        seedOffset,
        approachGrammarId: "straight",
        departureGrammarId: "straight",
      });
      const connectorPoints = seam.points.filter(
        (candidate) =>
          candidate.x >= 22 && candidate.x <= 78,
      );
      const center = connectorPoints.reduce(
        (closest, candidate) =>
          Math.abs(candidate.x - 50) < Math.abs(closest.x - 50)
            ? candidate
            : closest,
      );
      const nearbyPeak = Math.max(
        ...connectorPoints
          .filter(
            (candidate) =>
              Math.abs(candidate.x - 50) >= 2 &&
              Math.abs(candidate.x - 50) <= 12,
          )
          .map((candidate) => candidate.y),
      );

      expect(center.y).toBeLessThan(nearbyPeak);
    }
  });
});
