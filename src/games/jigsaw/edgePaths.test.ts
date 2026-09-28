import { describe, expect, it } from "vitest";
import type {
  JigsawBoundaryEdge,
  JigsawEdgeProfileId,
  JigsawEdgeSide,
  JigsawInteriorEdge,
  JigsawPiece,
} from "../../catalog/types";
import { jigsawEdgeProfileIds } from "./edgeProfiles";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";
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

const cross = (
  first: { x: number; y: number },
  second: { x: number; y: number },
  third: { x: number; y: number },
) =>
  (second.x - first.x) * (third.y - first.y) -
  (second.y - first.y) * (third.x - first.x);

const segmentsProperlyIntersect = (
  firstStart: { x: number; y: number },
  firstEnd: { x: number; y: number },
  secondStart: { x: number; y: number },
  secondEnd: { x: number; y: number },
) => {
  if (
    Math.max(firstStart.x, firstEnd.x) < Math.min(secondStart.x, secondEnd.x) ||
    Math.max(secondStart.x, secondEnd.x) < Math.min(firstStart.x, firstEnd.x) ||
    Math.max(firstStart.y, firstEnd.y) < Math.min(secondStart.y, secondEnd.y) ||
    Math.max(secondStart.y, secondEnd.y) < Math.min(firstStart.y, firstEnd.y)
  ) {
    return false;
  }

  const firstSideA = cross(firstStart, firstEnd, secondStart);
  const firstSideB = cross(firstStart, firstEnd, secondEnd);
  const secondSideA = cross(secondStart, secondEnd, firstStart);
  const secondSideB = cross(secondStart, secondEnd, firstEnd);
  return firstSideA * firstSideB < -1e-6 && secondSideA * secondSideB < -1e-6;
};

const expectNoSelfIntersection = (
  points: Array<{ x: number; y: number }>,
  context = "Jigsaw outline",
) => {
  for (let first = 0; first < points.length - 1; first += 1) {
    for (let second = first + 2; second < points.length - 1; second += 1) {
      if (
        segmentsProperlyIntersect(
          points[first],
          points[first + 1],
          points[second],
          points[second + 1],
        )
      ) {
        throw new Error(`${context}: segments ${first} and ${second} intersect.`);
      }
    }
  }
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

  it("renders organic families as curves while preserving deliberately angular families", () => {
    const organicFamilies: JigsawEdgeProfileId[] = [
      "classic-bulb",
      "mushroom",
      "keyhole",
      "bottle",
      "hook",
      "teardrop",
      "double-lobe",
      "crescent",
      "s-lock",
    ];
    const angularFamilies: JigsawEdgeProfileId[] = [
      "dovetail",
      "t-lock",
      "lightning",
      "castle",
      "arrowhead",
    ];

    for (const profileId of organicFamilies) {
      expect(getJigsawEdgePath(makeInteriorEdge({ side: "top", profileId }))).toContain(" C ");
    }

    for (const profileId of angularFamilies) {
      expect(getJigsawEdgePath(makeInteriorEdge({ side: "top", profileId }))).not.toContain(" C ");
    }
  });

  it("changes materially within each family when the shared seed offset changes", () => {
    for (const profileId of jigsawEdgeProfileIds) {
      const paths = Array.from({ length: 8 }, (_, seedOffset) =>
        getJigsawEdgePath(makeInteriorEdge({ side: "top", profileId, seedOffset })),
      );
      expect(new Set(paths).size).toBeGreaterThanOrEqual(6);
    }
  });

  it("uses substantially more edge span while preserving a corner buffer", () => {
    for (const profileId of jigsawEdgeProfileIds) {
      for (const seedOffset of [1, 17, 991, 123_456, 999_999]) {
        const points = getJigsawEdgePoints(
          makeInteriorEdge({ side: "top", profileId, polarity: "tab", seedOffset }),
        );
        const connectorPoints = points.slice(1, -1);
        const horizontal = connectorPoints.map((point) => point.x);
        const minimum = Math.min(...horizontal);
        const maximum = Math.max(...horizontal);

        expect(maximum - minimum).toBeGreaterThan(60);
        expect(minimum).toBeGreaterThanOrEqual(4);
        expect(maximum).toBeLessThanOrEqual(96);
      }
    }
  });

  it("allows visibly off-center seams when the connector width leaves room", () => {
    const centers = Array.from({ length: 128 }, (_, seedOffset) => {
      const points = getJigsawEdgePoints(
        makeInteriorEdge({ side: "top", profileId: "keyhole", polarity: "tab", seedOffset }),
      );
      const horizontal = points.slice(1, -1).map((point) => point.x);
      return (Math.min(...horizontal) + Math.max(...horizontal)) / 2;
    });

    expect(Math.min(...centers)).toBeLessThan(40);
    expect(Math.max(...centers)).toBeGreaterThan(60);
  });

  it("keeps every connector family vertically substantial relative to its edge span", () => {
    for (const profileId of jigsawEdgeProfileIds) {
      for (const seedOffset of [1, 17, 991, 123_456, 999_999]) {
        const points = getJigsawEdgePoints(
          makeInteriorEdge({ side: "top", profileId, polarity: "tab", seedOffset }),
        );
        const connectorPoints = points.slice(1, -1);
        const horizontal = connectorPoints.map((point) => point.x);
        const vertical = connectorPoints.map((point) => point.y);
        const width = Math.max(...horizontal) - Math.min(...horizontal);
        const height = Math.max(...vertical) - Math.min(...vertical);

        expect(height / width).toBeGreaterThan(0.2);
        expect(Math.max(...vertical.map((value) => Math.abs(value)))).toBeLessThanOrEqual(
          jigsawEdgeMaximumDepth,
        );
      }
    }
  });

  it("keeps seeded 2D connector geometry inside safe bounds and free of self-intersection", () => {
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

            expectNoSelfIntersection(points);
          }
        }
      }
    }
  });

  it("allows unmistakable connector topology beyond a single-valued edge bump", () => {
    const backtrackingFamilies: JigsawEdgeProfileId[] = [
      "mushroom",
      "keyhole",
      "dovetail",
      "t-lock",
      "hook",
      "lightning",
      "arrowhead",
    ];

    for (const profileId of backtrackingFamilies) {
      const points = getJigsawEdgePoints(
        makeInteriorEdge({ side: "top", profileId, polarity: "tab", seedOffset: 123_456 }),
      );
      expect(
        points.some((point, index) => index > 0 && point.x < points[index - 1].x - 0.05),
      ).toBe(true);
    }

    const serpentine = getJigsawEdgePoints(
      makeInteriorEdge({ side: "top", profileId: "s-lock", polarity: "tab", seedOffset: 123_456 }),
    );
    expect(Math.min(...serpentine.map((point) => point.y))).toBeLessThan(-1);
    expect(Math.max(...serpentine.map((point) => point.y))).toBeGreaterThan(1);
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

  it("keeps complete expressive piece outlines free of proper self-intersection", () => {
    const polarityPatterns: Array<readonly JigsawInteriorEdge["polarity"][]> = [
      ["tab", "tab", "tab", "tab"],
      ["blank", "blank", "blank", "blank"],
      ["tab", "blank", "tab", "blank"],
      ["blank", "tab", "blank", "tab"],
    ];

    for (const profileId of jigsawEdgeProfileIds) {
      for (const seedOffset of [7, 123, 8_001, 456_789]) {
        for (const polarities of polarityPatterns) {
          const piece = makePiece([
            makeInteriorEdge({ side: "top", profileId, polarity: polarities[0], seedOffset }),
            makeInteriorEdge({ side: "right", profileId, polarity: polarities[1], seedOffset: seedOffset + 1 }),
            makeInteriorEdge({ side: "bottom", profileId, polarity: polarities[2], seedOffset: seedOffset + 2 }),
            makeInteriorEdge({ side: "left", profileId, polarity: polarities[3], seedOffset: seedOffset + 3 }),
          ]);

          expectNoSelfIntersection(
            getJigsawPieceOutlinePoints(piece),
            `${profileId} seed ${seedOffset} polarities ${polarities.join("/")}`,
          );
        }
      }
    }
  });

  it("keeps generated one-family boards free of crossing piece outlines", () => {
    for (const seed of ["mixed-outline-a", "mixed-outline-b"]) {
      const puzzle = generateJigsaw({
        puzzleId: "jigsaw",
        seed,
        width: 6,
        height: 6,
        imageId: defaultJigsawImageAsset.id,
      });

      for (const tile of puzzle.tiles) {
        expectNoSelfIntersection(
          getJigsawPieceOutlinePoints(tile),
          `generated ${seed} ${tile.id} ${tile.edges.find((edge) => !edge.boundary)?.profileId ?? "boundary-only"}`,
        );
      }
    }
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
