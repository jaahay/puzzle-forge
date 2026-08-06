import { describe, expect, it } from "vitest";
import type {
  JigsawBoundaryEdge,
  JigsawEdgeProfileId,
  JigsawEdgeSide,
  JigsawInteriorEdge,
} from "../../catalog/types";
import { jigsawEdgeProfileIds } from "./edgeProfiles";
import { getJigsawEdgePath, getJigsawEdgePoints } from "./edgePaths";

const makeBoundaryEdge = (side: JigsawEdgeSide): JigsawBoundaryEdge => ({
  edgeId: `boundary:${side}`,
  side,
  boundary: true,
  neighborPieceId: null,
  neighborEdgeId: null,
  profileId: null,
  polarity: "flat",
  seedOffset: 0,
});

const makeInteriorEdge = ({
  side,
  profileId = "classic-round",
  polarity = "tab",
  seedOffset = 123_456,
}: {
  side: JigsawEdgeSide;
  profileId?: JigsawEdgeProfileId;
  polarity?: JigsawInteriorEdge["polarity"];
  seedOffset?: number;
}): JigsawInteriorEdge => ({
  edgeId: `interior:${side}:${polarity}`,
  side,
  boundary: false,
  neighborPieceId: "neighbor",
  neighborEdgeId: `neighbor:${side}`,
  profileId,
  polarity,
  seedOffset,
});

const expectPointsToMatch = (
  first: Array<{ x: number; y: number }>,
  second: Array<{ x: number; y: number }>,
) => {
  expect(first).toHaveLength(second.length);
  first.forEach((point, index) => {
    expect(point.x).toBeCloseTo(second[index].x, 3);
    expect(point.y).toBeCloseTo(second[index].y, 3);
  });
};

describe("Jigsaw edge paths", () => {
  it("keeps all boundary edges flat", () => {
    expect(getJigsawEdgePath(makeBoundaryEdge("top"))).toBe("M 0 0 L 100 0");
    expect(getJigsawEdgePath(makeBoundaryEdge("right"))).toBe("M 100 0 L 100 100");
    expect(getJigsawEdgePath(makeBoundaryEdge("bottom"))).toBe("M 100 100 L 0 100");
    expect(getJigsawEdgePath(makeBoundaryEdge("left"))).toBe("M 0 100 L 0 0");
  });

  it("is deterministic while giving every profile a distinct silhouette", () => {
    const paths = jigsawEdgeProfileIds.map((profileId) =>
      getJigsawEdgePath(makeInteriorEdge({ side: "top", profileId })),
    );

    expect(new Set(paths).size).toBe(jigsawEdgeProfileIds.length);
    expect(paths[0]).toBe(getJigsawEdgePath(makeInteriorEdge({ side: "top" })));
    paths.forEach((path) => {
      expect(path.startsWith("M ")).toBe(true);
      expect(path).not.toMatch(/NaN|Infinity/);
    });
  });

  it("changes controlled asymmetry when the shared seed offset changes", () => {
    const first = getJigsawEdgePath(makeInteriorEdge({ side: "top", seedOffset: 10 }));
    const second = getJigsawEdgePath(makeInteriorEdge({ side: "top", seedOffset: 11 }));

    expect(first).not.toBe(second);
  });

  it("maps reciprocal right and left edges onto the same world-space seam", () => {
    const right = getJigsawEdgePoints(makeInteriorEdge({ side: "right", polarity: "tab" }));
    const left = getJigsawEdgePoints(makeInteriorEdge({ side: "left", polarity: "blank" }))
      .map((point) => ({ x: point.x + 100, y: point.y }))
      .reverse();

    expectPointsToMatch(right, left);
  });

  it("maps reciprocal bottom and top edges onto the same world-space seam", () => {
    const bottom = getJigsawEdgePoints(makeInteriorEdge({ side: "bottom", polarity: "tab" }));
    const top = getJigsawEdgePoints(makeInteriorEdge({ side: "top", polarity: "blank" }))
      .map((point) => ({ x: point.x, y: point.y + 100 }))
      .reverse();

    expectPointsToMatch(bottom, top);
  });

  it("draws tabs outside and blanks inside the owning square", () => {
    const tab = getJigsawEdgePoints(makeInteriorEdge({ side: "right", polarity: "tab" }));
    const blank = getJigsawEdgePoints(makeInteriorEdge({ side: "right", polarity: "blank" }));

    expect(Math.max(...tab.map((point) => point.x))).toBeGreaterThan(100);
    expect(Math.min(...blank.map((point) => point.x))).toBeLessThan(100);
  });
});
