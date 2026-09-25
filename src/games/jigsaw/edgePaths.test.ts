import { describe, expect, it } from "vitest";
import type {
  JigsawBoundaryEdge,
  JigsawEdgeProfileId,
  JigsawEdgeSide,
  JigsawInteriorEdge,
  JigsawPiece,
} from "../../catalog/types";
import { jigsawEdgeProfileIds } from "./edgeProfiles";
import {
  getJigsawEdgePath,
  getJigsawEdgePoints,
  getJigsawPieceOutlinePath,
  getJigsawPieceOutlinePoints,
  jigsawEdgeMaximumDepth,
} from "./edgePaths";

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
  profileId = "classic-bulb",
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

const makePiece = (edges: JigsawPiece["edges"]): JigsawPiece => ({
  id: "piece",
  currentIndex: 0,
  solvedIndex: 0,
  row: 0,
  column: 0,
  edges,
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

  it("changes materially within each family when the shared seed offset changes", () => {
    for (const profileId of jigsawEdgeProfileIds) {
      const paths = Array.from({ length: 8 }, (_, seedOffset) =>
        getJigsawEdgePath(makeInteriorEdge({ side: "top", profileId, seedOffset })),
      );
      expect(new Set(paths).size).toBeGreaterThanOrEqual(6);
    }
  });

  it("keeps seeded connector geometry inside safe bounds without reversing along its edge", () => {
    const sides: JigsawEdgeSide[] = ["top", "right", "bottom", "left"];
    const polarities: JigsawInteriorEdge["polarity"][] = ["tab", "blank"];

    for (const profileId of jigsawEdgeProfileIds) {
      for (const side of sides) {
        for (const polarity of polarities) {
          for (const seedOffset of [1, 17, 991, 123_456, 999_999]) {
            const points = getJigsawEdgePoints(makeInteriorEdge({ side, profileId, polarity, seedOffset }));

            for (const point of points) {
              expect(point.x).toBeGreaterThanOrEqual(-jigsawEdgeMaximumDepth);
              expect(point.x).toBeLessThanOrEqual(100 + jigsawEdgeMaximumDepth);
              expect(point.y).toBeGreaterThanOrEqual(-jigsawEdgeMaximumDepth);
              expect(point.y).toBeLessThanOrEqual(100 + jigsawEdgeMaximumDepth);
            }

            const primary = points.map((point) =>
              side === "top" || side === "bottom" ? point.x : point.y,
            );
            const direction = side === "top" || side === "right" ? 1 : -1;
            for (let index = 1; index < primary.length; index += 1) {
              expect((primary[index] - primary[index - 1]) * direction).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  it("maps reciprocal right and left edges onto the same world-space seam for every family", () => {
    for (const profileId of jigsawEdgeProfileIds) {
      const right = getJigsawEdgePoints(makeInteriorEdge({ side: "right", profileId, polarity: "tab" }));
      const left = getJigsawEdgePoints(makeInteriorEdge({ side: "left", profileId, polarity: "blank" }))
        .map((point) => ({ x: point.x + 100, y: point.y }))
        .reverse();

      expectPointsToMatch(right, left);
    }
  });

  it("maps reciprocal bottom and top edges onto the same world-space seam for every family", () => {
    for (const profileId of jigsawEdgeProfileIds) {
      const bottom = getJigsawEdgePoints(makeInteriorEdge({ side: "bottom", profileId, polarity: "tab" }));
      const top = getJigsawEdgePoints(makeInteriorEdge({ side: "top", profileId, polarity: "blank" }))
        .map((point) => ({ x: point.x, y: point.y + 100 }))
        .reverse();

      expectPointsToMatch(bottom, top);
    }
  });

  it("draws tabs outside and blanks inside the owning square", () => {
    const tab = getJigsawEdgePoints(makeInteriorEdge({ side: "right", polarity: "tab" }));
    const blank = getJigsawEdgePoints(makeInteriorEdge({ side: "right", polarity: "blank" }));

    expect(Math.max(...tab.map((point) => point.x))).toBeGreaterThan(100);
    expect(Math.min(...blank.map((point) => point.x))).toBeLessThan(100);
  });

  it("joins the four directed edges into one closed piece outline", () => {
    const piece = makePiece([
      makeBoundaryEdge("top"),
      makeInteriorEdge({ side: "right", polarity: "tab" }),
      makeInteriorEdge({ side: "bottom", polarity: "blank", seedOffset: 20 }),
      makeBoundaryEdge("left"),
    ]);
    const points = getJigsawPieceOutlinePoints(piece);
    const path = getJigsawPieceOutlinePath(piece);

    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points.at(-1)).toEqual({ x: 0, y: 0 });
    expect(Math.max(...points.map((point) => point.x))).toBeGreaterThan(100);
    expect(path.startsWith("M 0 0 L 100 0")).toBe(true);
    expect(path.endsWith(" Z")).toBe(true);
    expect(path).not.toMatch(/NaN|Infinity/);
  });

  it("does not depend on the stored edge array order when building an outline", () => {
    const edges = [
      makeInteriorEdge({ side: "bottom", polarity: "blank", seedOffset: 20 }),
      makeBoundaryEdge("left"),
      makeBoundaryEdge("top"),
      makeInteriorEdge({ side: "right", polarity: "tab" }),
    ];

    expect(getJigsawPieceOutlinePath(makePiece(edges))).toBe(
      getJigsawPieceOutlinePath(makePiece([edges[2], edges[3], edges[0], edges[1]])),
    );
  });
});
