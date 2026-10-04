import { describe, expect, it } from "vitest";
import {
  getJigsawEdgeAdvanceProbes,
  jigsawEdgeAdvanceProbeIds,
  jigsawEdgeExplorationProbes,
  validateJigsawEdgeExplorationProbe,
} from "./edgeProbeGallery";

describe("Jigsaw edge exploration gallery", () => {
  it("keeps every representative visual sketch finite, anchored, bounded, and non-self-intersecting", () => {
    for (const probe of jigsawEdgeExplorationProbes) {
      expect(validateJigsawEdgeExplorationProbe(probe)).toEqual({
        valid: true,
      });
    }
  });

  it("advances only the strongest sketch hypotheses to common realization", () => {
    expect(getJigsawEdgeAdvanceProbes().map((probe) => probe.id)).toEqual(
      [...jigsawEdgeAdvanceProbeIds],
    );
  });

  it("folds paired and mixed serial locks into one compound-lock direction", () => {
    const compound = jigsawEdgeExplorationProbes.find(
      (probe) => probe.id === "compound-lock",
    );

    expect(compound?.sourceProbeIds).toEqual([
      "paired-lock",
      "mixed-lock",
    ]);
  });

  it("keeps opposed dual lock as a genuinely two-sided connector probe", () => {
    const opposed = jigsawEdgeExplorationProbes.find(
      (probe) => probe.id === "opposed-dual-lock",
    );
    const yValues = opposed?.points.map((point) => point.y) ?? [];

    expect(Math.max(...yValues)).toBeGreaterThan(0);
    expect(Math.min(...yValues)).toBeLessThan(0);
  });

  it("keeps connectorless geometry at seam scope rather than inventing a fake connector", () => {
    const connectorless = jigsawEdgeExplorationProbes.find(
      (probe) => probe.id === "connectorless-wave",
    );

    expect(connectorless?.scope).toBe("seam");
    expect(connectorless?.sourceProbeIds).toEqual([
      "connector-cardinality",
    ]);
  });

  it("deprioritizes Scoop-adjacent sketches without claiming semantic collapse", () => {
    const scoopAdjacent = jigsawEdgeExplorationProbes.filter(
      (probe) => probe.comparisonGroup === "scoop-adjacent",
    );

    expect(scoopAdjacent.map((probe) => probe.id)).toEqual([
      "asymmetric-catch",
      "hook-catch",
    ]);
    expect(
      scoopAdjacent.every((probe) => probe.sketchDisposition === "deprioritize"),
    ).toBe(true);
  });

  it("marks true nesting topology-dependent instead of declaring it collapsed", () => {
    const nested = jigsawEdgeExplorationProbes.find(
      (probe) => probe.id === "nested-lock",
    );

    expect(nested?.sketchDisposition).toBe("topology-dependent");
    expect(nested?.comparisonGroup).toBe("notched-head");
  });
});
