import { describe, expect, it } from "vitest";
import {
  baselineSpanExperimentLeavesProductionCatalogUntouched,
  getCurrentBaselineSequenceWithoutRun,
  jigsawBaselineSpanExplorationCandidates,
  realizeJigsawBaselineSpanCandidate,
} from "./baselineSpanExplorer";
import { getJigsawBaselineProductionStructure } from "./baselineProduction";

const seeds = Array.from(
  { length: 64 },
  (_, index) => index * 104729 + 31,
);

const getCandidate = (
  id: (typeof jigsawBaselineSpanExplorationCandidates)[number]["id"],
) => {
  const candidate = jigsawBaselineSpanExplorationCandidates.find(
    (entry) => entry.id === id,
  );
  if (!candidate) throw new Error(`Missing span candidate: ${id}`);
  return candidate;
};

describe("Jigsaw baseline span exploration", () => {
  it("realizes every bounded span candidate safely and deterministically", () => {
    for (const candidate of jigsawBaselineSpanExplorationCandidates) {
      for (const seedOffset of seeds) {
        const first = realizeJigsawBaselineSpanCandidate(
          candidate,
          seedOffset,
        );
        const again = realizeJigsawBaselineSpanCandidate(
          candidate,
          seedOffset,
        );

        expect(first.accepted).toBe(true);
        expect(again).toEqual(first);
        if (!first.accepted) continue;

        expect(first.points[0]).toEqual({ x: 0, y: 0 });
        expect(first.points.at(-1)).toEqual({ x: 1, y: 0 });
        expect(
          first.points.every(
            (point) =>
              point.x >= 0 &&
              point.x <= 1 &&
              Math.abs(point.y) <= 1,
          ),
        ).toBe(true);
      }
    }
  });

  it("preserves deliberate quiet runs as first-class span structure", () => {
    for (const id of [
      "separated-bows",
      "opposed-pair",
      "inflection-rest-bow",
    ] as const) {
      const realized = realizeJigsawBaselineSpanCandidate(
        getCandidate(id),
        1,
      );
      expect(realized.accepted).toBe(true);
      if (!realized.accepted) continue;

      expect(realized.runSpans).toHaveLength(1);
      const run = realized.runSpans[0]!;
      expect(run.end - run.start).toBeGreaterThanOrEqual(0.18);
      expect(realized.structureSignature).toContain("run[");
    }
  });

  it("shows why algebraic identity cannot stand in for a deliberate quiet span", () => {
    expect(
      getJigsawBaselineProductionStructure(
        getCurrentBaselineSequenceWithoutRun(),
      ),
    ).toBe(
      "deflect > mirror(deflect) > deflect > mirror(deflect)",
    );

    const separated = realizeJigsawBaselineSpanCandidate(
      getCandidate("separated-bows"),
      1,
    );
    expect(separated.accepted).toBe(true);
    if (!separated.accepted) return;

    expect(separated.structureSignature).toContain("run[2]");
  });

  it("expresses dominant/subordinate gesture scale without minting another baseline family", () => {
    const realized = realizeJigsawBaselineSpanCandidate(
      getCandidate("primary-secondary"),
      1,
    );
    expect(realized.accepted).toBe(true);
    if (!realized.accepted) return;

    const primaryDepth = Math.max(
      ...realized.points
        .filter((point) => point.x <= 0.5)
        .map((point) => Math.abs(point.y)),
    );
    const secondaryDepth = Math.max(
      ...realized.points
        .filter((point) => point.x >= 0.6875)
        .map((point) => Math.abs(point.y)),
    );

    expect(primaryDepth).toBeGreaterThan(
      secondaryDepth * 2,
    );
  });

  it("can separate gestures on opposite sides without turning the run into a connector", () => {
    const realized = realizeJigsawBaselineSpanCandidate(
      getCandidate("opposed-pair"),
      1,
    );
    expect(realized.accepted).toBe(true);
    if (!realized.accepted) return;

    expect(
      Math.max(...realized.points.map((point) => point.y)),
    ).toBeGreaterThan(0.8);
    expect(
      Math.min(...realized.points.map((point) => point.y)),
    ).toBeLessThan(-0.8);
  });

  it("remains exploration-only and does not expand the production BaselineGrammar catalog", () => {
    expect(
      baselineSpanExperimentLeavesProductionCatalogUntouched(),
    ).toBe(true);
  });
});
