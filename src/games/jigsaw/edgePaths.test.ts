import { describe, expect, it } from "vitest";
import type {
  JigsawBoundaryEdge,
  JigsawCutStyle,
  JigsawEdgeModel,
  JigsawEdgeProfileId,
  JigsawEdgeSide,
  JigsawInteriorEdge,
  JigsawPiece,
} from "../../catalog/types";
import {
  getJigsawBaselineGrammarDefinition,
  jigsawBaselineGrammarIds,
} from "./baselineGrammar";
import { deriveJigsawBaselinePalette } from "./cutStyle";
import {
  jigsawEdgeProfileCatalogRevision,
  jigsawEdgeProfileIds,
} from "./edgeProfiles";
import { deriveJigsawSeamProgram } from "./seamProgram";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";
import {
  getJigsawCanonicalConnectorPoints,
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

const makeSeedSweep = (count: number) => {
  const historicalRegressionSeeds = [1, 17, 991, 8_001, 123_456, 456_789, 999_999];
  const generated = Array.from(
    { length: count },
    (_, index) => (index * 48_271 + 12_345) % 1_000_000,
  );
  return [...new Set([...historicalRegressionSeeds, ...generated])];
};

const broadSeamSeedOffsets = makeSeedSweep(256);
const broadPieceSeedOffsets = makeSeedSweep(64);

const makeEdgeModel = (
  cutStyle: JigsawCutStyle = "unconventional",
): JigsawEdgeModel => ({
  catalogRevision: jigsawEdgeProfileCatalogRevision,
  profileIds: [...jigsawEdgeProfileIds],
  cutStyle,
  baselineGrammarIds: [
    ...deriveJigsawBaselinePalette(cutStyle, `edge-path-test:${cutStyle}`),
  ],
});

const expressiveEdgeModel = makeEdgeModel("unconventional");

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

const expectPointsSafe = (
  points: Array<{ x: number; y: number }>,
  context: string,
) => {
  for (const candidate of points) {
    if (!Number.isFinite(candidate.x) || !Number.isFinite(candidate.y)) {
      throw new Error(`${context}: non-finite point ${candidate.x},${candidate.y}.`);
    }
    if (
      candidate.x < -jigsawEdgeMaximumDepth ||
      candidate.x > 100 + jigsawEdgeMaximumDepth ||
      candidate.y < -jigsawEdgeMaximumDepth ||
      candidate.y > 100 + jigsawEdgeMaximumDepth
    ) {
      throw new Error(`${context}: point ${candidate.x},${candidate.y} exceeds geometry bounds.`);
    }
  }

  expectNoSelfIntersection(points, context);
};

describe("Jigsaw edge paths", () => {
  it("keeps all boundary edges flat", () => {
    expect(getJigsawEdgePath(makeBoundaryEdge("top"), expressiveEdgeModel)).toBe("M 0 0 L 100 0");
    expect(getJigsawEdgePath(makeBoundaryEdge("right"), expressiveEdgeModel)).toBe("M 100 0 L 100 100");
    expect(getJigsawEdgePath(makeBoundaryEdge("bottom"), expressiveEdgeModel)).toBe("M 100 100 L 0 100");
    expect(getJigsawEdgePath(makeBoundaryEdge("left"), expressiveEdgeModel)).toBe("M 0 100 L 0 0");
  });

  it("is deterministic while giving every profile a distinct silhouette", () => {
    const paths = jigsawEdgeProfileIds.map((profileId) =>
      getJigsawEdgePath(makeInteriorEdge({ side: "top", profileId }), expressiveEdgeModel),
    );

    expect(new Set(paths).size).toBe(jigsawEdgeProfileIds.length);
    expect(paths[0]).toBe(getJigsawEdgePath(makeInteriorEdge({ side: "top" }), expressiveEdgeModel));
    paths.forEach((path) => {
      expect(path.startsWith("M ")).toBe(true);
      expect(path).not.toMatch(/NaN|Infinity/);
    });
  });

  it("preserves connector render modes while baseline rendering remains independent", () => {
    const organicFamilies: JigsawEdgeProfileId[] = [
      "classic-bulb",
      "necked-head",
      "multi-lobe",
      "scoop",
      "serpentine",
      "stacked-lock",
    ];
    const angularFamilies: JigsawEdgeProfileId[] = [
      "terrace",
      "zigzag",
    ];

    for (const profileId of organicFamilies) {
      expect(getJigsawEdgePath(makeInteriorEdge({ side: "top", profileId }), expressiveEdgeModel)).toContain(" C ");
    }

    for (const profileId of angularFamilies) {
      const fullyAngularSeed = Array.from({ length: 4_096 }, (_, seedOffset) => seedOffset).find(
        (seedOffset) => {
          const seam = deriveJigsawSeamProgram(profileId, seedOffset, {
            cutStyle: expressiveEdgeModel.cutStyle,
            baselineGrammarIds: expressiveEdgeModel.baselineGrammarIds,
          });
          return (
            getJigsawBaselineGrammarDefinition(
              seam.approach.baselineGrammarId,
            ).renderMode === "angular" &&
            getJigsawBaselineGrammarDefinition(
              seam.departure.baselineGrammarId,
            ).renderMode === "angular"
          );
        },
      );

      expect(fullyAngularSeed).toBeDefined();
      if (fullyAngularSeed === undefined) continue;

      expect(
        getJigsawEdgePath(
          makeInteriorEdge({ side: "top", profileId, seedOffset: fullyAngularSeed }),
          expressiveEdgeModel,
        ),
      ).not.toContain(" C ");
    }

    const mixedSeed = Array.from({ length: 4_096 }, (_, seedOffset) => seedOffset).find(
      (seedOffset) => {
        const seam = deriveJigsawSeamProgram("terrace", seedOffset, {
          cutStyle: expressiveEdgeModel.cutStyle,
          baselineGrammarIds: expressiveEdgeModel.baselineGrammarIds,
        });
        return (
          getJigsawBaselineGrammarDefinition(
            seam.approach.baselineGrammarId,
          ).renderMode === "smooth" ||
          getJigsawBaselineGrammarDefinition(
            seam.departure.baselineGrammarId,
          ).renderMode === "smooth"
        );
      },
    );

    expect(mixedSeed).toBeDefined();
    if (mixedSeed !== undefined) {
      expect(
        getJigsawEdgePath(
          makeInteriorEdge({
            side: "top",
            profileId: "terrace",
            seedOffset: mixedSeed,
          }),
          expressiveEdgeModel,
        ),
      ).toContain(" C ");
    }
  });

  it("changes materially within each family when the shared seed offset changes", () => {
    for (const profileId of jigsawEdgeProfileIds) {
      const paths = Array.from({ length: 8 }, (_, seedOffset) =>
        getJigsawEdgePath(makeInteriorEdge({ side: "top", profileId, seedOffset }), expressiveEdgeModel),
      );
      expect(new Set(paths).size).toBeGreaterThanOrEqual(6);
    }
  });

  it("uses substantially more edge span while preserving a corner buffer", () => {
    for (const profileId of jigsawEdgeProfileIds) {
      for (const seedOffset of [1, 17, 991, 123_456, 999_999]) {
        const connectorPoints = getJigsawCanonicalConnectorPoints(
          profileId,
          seedOffset,
        );
        const horizontal = connectorPoints.map((point) => point.x);
        const minimum = Math.min(...horizontal);
        const maximum = Math.max(...horizontal);

        expect(maximum - minimum).toBeGreaterThan(55);
        expect(minimum).toBeGreaterThanOrEqual(4);
        expect(maximum).toBeLessThanOrEqual(96);
      }
    }
  });

  it("allows visibly off-center seams when the connector width leaves room", () => {
    const centers = Array.from({ length: 128 }, (_, seedOffset) => {
      const points = getJigsawCanonicalConnectorPoints(
        "necked-head",
        seedOffset,
      );
      const horizontal = points.map((point) => point.x);
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
          expressiveEdgeModel,
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
            const points = getJigsawEdgePoints(makeInteriorEdge({ side, profileId, polarity, seedOffset }), expressiveEdgeModel);

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

  it("survives broad deterministic seam sweeps for both cut styles", () => {
    for (const cutStyle of ["traditional", "unconventional"] as const) {
      const edgeModel = makeEdgeModel(cutStyle);

      for (const profileId of jigsawEdgeProfileIds) {
        const baselinePairs = new Set<string>();
        const approachGrammarIds = new Set<string>();
        const departureGrammarIds = new Set<string>();

        for (const seedOffset of broadSeamSeedOffsets) {
          const seam = deriveJigsawSeamProgram(profileId, seedOffset, {
            cutStyle: edgeModel.cutStyle,
            baselineGrammarIds: edgeModel.baselineGrammarIds,
          });
          approachGrammarIds.add(seam.approach.baselineGrammarId);
          departureGrammarIds.add(seam.departure.baselineGrammarId);
          baselinePairs.add(
            `${seam.approach.baselineGrammarId}>${seam.departure.baselineGrammarId}`,
          );
          const points = getJigsawEdgePoints(
            makeInteriorEdge({ side: "top", profileId, polarity: "tab", seedOffset }),
            edgeModel,
          );

          expectPointsSafe(
            points,
            `${cutStyle} ${profileId} broad seam seed ${seedOffset}`,
          );
        }

        expect(approachGrammarIds).toEqual(
          new Set(edgeModel.baselineGrammarIds),
        );
        expect(departureGrammarIds).toEqual(
          new Set(edgeModel.baselineGrammarIds),
        );
        expect(baselinePairs.size).toBeGreaterThanOrEqual(
          edgeModel.baselineGrammarIds.length * 2,
        );
      }
    }
  }, 20_000);

  it("allows unmistakable connector topology beyond a single-valued edge bump", () => {
    const backtrackingFamilies: JigsawEdgeProfileId[] = [
      "necked-head",
      "scoop",
      "stacked-lock",
    ];

    for (const profileId of backtrackingFamilies) {
      const points = getJigsawEdgePoints(
        makeInteriorEdge({ side: "top", profileId, polarity: "tab", seedOffset: 123_456 }),
        expressiveEdgeModel,
      );
      expect(
        points.some((point, index) => index > 0 && point.x < points[index - 1].x - 0.05),
      ).toBe(true);
    }

    const serpentine = getJigsawEdgePoints(
      makeInteriorEdge({ side: "top", profileId: "serpentine", polarity: "tab", seedOffset: 123_456 }),
      expressiveEdgeModel,
    );
    expect(Math.min(...serpentine.map((point) => point.y))).toBeLessThan(-1);
    expect(Math.max(...serpentine.map((point) => point.y))).toBeGreaterThan(1);
  });

  it("maps reciprocal right and left edges onto the same world-space seam for every family", () => {
    for (const profileId of jigsawEdgeProfileIds) {
      const right = getJigsawEdgePoints(makeInteriorEdge({ side: "right", profileId, polarity: "tab" }), expressiveEdgeModel);
      const left = getJigsawEdgePoints(makeInteriorEdge({ side: "left", profileId, polarity: "blank" }), expressiveEdgeModel)
        .map((point) => ({ x: point.x + 100, y: point.y }))
        .reverse();

      expectPointsToMatch(right, left);
    }
  });

  it("maps reciprocal bottom and top edges onto the same world-space seam for every family", () => {
    for (const profileId of jigsawEdgeProfileIds) {
      const bottom = getJigsawEdgePoints(makeInteriorEdge({ side: "bottom", profileId, polarity: "tab" }), expressiveEdgeModel);
      const top = getJigsawEdgePoints(makeInteriorEdge({ side: "top", profileId, polarity: "blank" }), expressiveEdgeModel)
        .map((point) => ({ x: point.x, y: point.y + 100 }))
        .reverse();

      expectPointsToMatch(bottom, top);
    }
  });

  it("draws tabs outside and blanks inside the owning square", () => {
    const tab = getJigsawEdgePoints(makeInteriorEdge({ side: "right", polarity: "tab" }), expressiveEdgeModel);
    const blank = getJigsawEdgePoints(makeInteriorEdge({ side: "right", polarity: "blank" }), expressiveEdgeModel);

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
            getJigsawPieceOutlinePoints(piece, expressiveEdgeModel),
            `${profileId} seed ${seedOffset} polarities ${polarities.join("/")}`,
          );
        }
      }
    }
  });

  it("survives broad whole-piece seed sweeps for the collision-prone polarity extremes", () => {
    const polarityPatterns: Array<readonly JigsawInteriorEdge["polarity"][]> = [
      ["tab", "tab", "tab", "tab"],
      ["blank", "blank", "blank", "blank"],
    ];

    for (const profileId of jigsawEdgeProfileIds) {
      for (const seedOffset of broadPieceSeedOffsets) {
        for (const polarities of polarityPatterns) {
          const piece = makePiece([
            makeInteriorEdge({ side: "top", profileId, polarity: polarities[0], seedOffset }),
            makeInteriorEdge({ side: "right", profileId, polarity: polarities[1], seedOffset: seedOffset + 1 }),
            makeInteriorEdge({ side: "bottom", profileId, polarity: polarities[2], seedOffset: seedOffset + 2 }),
            makeInteriorEdge({ side: "left", profileId, polarity: polarities[3], seedOffset: seedOffset + 3 }),
          ]);

          expectNoSelfIntersection(
            getJigsawPieceOutlinePoints(piece, expressiveEdgeModel),
            `${profileId} broad piece seed ${seedOffset} polarities ${polarities.join("/")}`,
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
          getJigsawPieceOutlinePoints(tile, puzzle.edgeModel),
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
    const points = getJigsawPieceOutlinePoints(piece, expressiveEdgeModel);
    const path = getJigsawPieceOutlinePath(piece, expressiveEdgeModel);

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

    expect(
      getJigsawPieceOutlinePath(makePiece(edges), expressiveEdgeModel),
    ).toBe(
      getJigsawPieceOutlinePath(
        makePiece([edges[2], edges[3], edges[0], edges[1]]),
        expressiveEdgeModel,
      ),
    );
  });
});
