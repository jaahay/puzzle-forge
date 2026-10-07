import { describe, expect, it } from "vitest";
import type {
  JigsawCutStyle,
  JigsawEdgeSide,
  JigsawInteriorEdge,
} from "../../catalog/types";
import {
  applyJigsawConnectorProgramForCutStyle,
  getJigsawConnectorRealizationPolicy,
  sampleJigsawBaselineCourseForCutStyle,
  selectJigsawEdgeProfileForCutStyle,
} from "./cutStyle";
import {
  deriveJigsawConnectorProgram,
  realizeJigsawConnectorProgram,
} from "./connectorGrammar";
import { getJigsawEdgePoints } from "./edgePaths";

const makeInteriorEdge = (
  side: JigsawEdgeSide,
  polarity: JigsawInteriorEdge["polarity"],
  seedOffset: number,
): JigsawInteriorEdge => ({
  edgeId: `classic-calibration:${side}:${polarity}`,
  side,
  boundary: false,
  neighborPieceId: "neighbor",
  neighborEdgeId: `neighbor:${side}`,
  profileId: "necked-head",
  polarity,
  seedOffset,
});

const edgeModel = (cutStyle: JigsawCutStyle) => ({
  cutStyle,
  baselineCourseIds: ["straight"] as const,
});

const connectorMetrics = (cutStyle: JigsawCutStyle, seedOffset: number) => {
  const points = getJigsawEdgePoints(
    makeInteriorEdge("top", "tab", seedOffset),
    edgeModel(cutStyle),
  );
  const active = points.filter((candidate) => Math.abs(candidate.y) > 0.25);
  return {
    span: Math.max(...active.map((point) => point.x)) -
      Math.min(...active.map((point) => point.x)),
    depth: Math.max(...active.map((point) => Math.abs(point.y))),
  };
};

describe("Classic Jigsaw realization policy", () => {
  it("keeps primitive necked-head grammar intact while restraining its Classic realization", () => {
    const primitive = deriveJigsawConnectorProgram("necked-head", 123_456);
    expect(primitive.connectorGrammarId).toBe("necked-head");
    if (primitive.connectorGrammarId !== "necked-head") return;

    const classic = applyJigsawConnectorProgramForCutStyle("classic", primitive);
    const eclectic = applyJigsawConnectorProgramForCutStyle("eclectic", primitive);
    expect(classic.connectorGrammarId).toBe("necked-head");
    if (classic.connectorGrammarId !== "necked-head") return;

    expect(eclectic).toBe(primitive);
    expect(classic.events).toEqual(primitive.events);
    expect(classic.stem).toBeGreaterThan(primitive.stem);
    expect(classic.head).toBeLessThan(primitive.head);
    expect(classic.shaftHeight).toBeLessThan(primitive.shaftHeight);
    expect(classic.crown).toBeGreaterThanOrEqual(1.06);
    expect(classic.crown).toBeLessThanOrEqual(1.1);
  });

  it("keeps the Classic necked-head crown above its shoulder anchors", () => {
    for (let seedOffset = 0; seedOffset < 512; seedOffset += 1) {
      const primitive = deriveJigsawConnectorProgram("necked-head", seedOffset);
      const classic = applyJigsawConnectorProgramForCutStyle("classic", primitive);
      expect(classic.connectorGrammarId).toBe("necked-head");
      if (classic.connectorGrammarId !== "necked-head") continue;

      const points = realizeJigsawConnectorProgram(classic);
      const fixedShoulderHeight = Math.max(points[6]!.y, points[10]!.y);
      expect(points[7]!.y).toBeGreaterThan(fixedShoulderHeight);
      expect(points[8]!.y).toBeGreaterThan(points[7]!.y);
      expect(points[9]!.y).toBeGreaterThan(fixedShoulderHeight);
    }
  });

  it("uses a restrained Classic connector envelope without changing other styles", () => {
    const classic = getJigsawConnectorRealizationPolicy("classic", "necked-head");
    expect(classic.widthScale).toBeLessThan(1);
    expect(classic.depthScale).toBeLessThan(1);
    expect(classic.leanScale).toBeLessThan(1);
    expect(classic.centerBiasScale).toBeLessThan(1);

    expect(getJigsawConnectorRealizationPolicy("eclectic", "necked-head")).toEqual({
      widthScale: 1,
      depthScale: 1,
      leanScale: 1,
      centerBiasScale: 1,
    });
  });

  it("makes the same necked-head seed narrower and shallower in Classic", () => {
    const classic = connectorMetrics("classic", 123_456);
    const eclectic = connectorMetrics("eclectic", 123_456);

    expect(classic.span).toBeLessThan(eclectic.span);
    expect(classic.depth).toBeLessThan(eclectic.depth);
  });

  it("favors necked heads over bare lobes in Classic generation", () => {
    const selected = Array.from({ length: 600 }, (_, index) =>
      selectJigsawEdgeProfileForCutStyle("classic", (index + 0.5) / 600));
    const neckedHeads = selected.filter((profileId) => profileId === "necked-head").length;
    const bulbs = selected.filter((profileId) => profileId === "classic-bulb").length;

    expect(neckedHeads).toBe(500);
    expect(bulbs).toBe(100);
  });

  it("keeps Classic baseline sampling strongly quiet", () => {
    const palette = ["straight", "bow", "inflection", "angled-course"] as const;
    const selected = Array.from({ length: 2_100 }, (_, index) =>
      sampleJigsawBaselineCourseForCutStyle(
        "classic",
        palette,
        (index + 0.5) / 2_100,
      ));
    const count = (id: (typeof palette)[number]) =>
      selected.filter((candidate) => candidate === id).length;

    expect(count("straight")).toBeGreaterThan(count("bow") * 3);
    expect(count("bow")).toBeGreaterThan(
      count("inflection") + count("angled-course"),
    );
  });

  it("preserves exact reciprocal Classic geometry", () => {
    const seedOffset = 987_654;
    const right = getJigsawEdgePoints(
      makeInteriorEdge("right", "tab", seedOffset),
      edgeModel("classic"),
    );
    const left = getJigsawEdgePoints(
      makeInteriorEdge("left", "blank", seedOffset),
      edgeModel("classic"),
    )
      .map((point) => ({ x: point.x + 100, y: point.y }))
      .reverse();

    expect(left).toHaveLength(right.length);
    for (let index = 0; index < right.length; index += 1) {
      expect(left[index]!.x).toBeCloseTo(right[index]!.x, 3);
      expect(left[index]!.y).toBeCloseTo(right[index]!.y, 3);
    }
  });
});
