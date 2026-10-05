import { describe, expect, it } from "vitest";
import type {
  JigsawCutStyle,
  JigsawEdgeSide,
  JigsawGeneratedPuzzle,
  JigsawPiece,
  JigsawPieceEdge,
} from "../../catalog/types";
import { createGeneratedJigsawPuzzle } from "../shared";
import {
  defaultJigsawCutStyle,
  deriveJigsawBaselineCoursePalette,
  jigsawEdgeProfileIds,
} from "./cutStyle";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";
import {
  getJigsawSurpriseAnomalyBudget,
  jigsawSurpriseEdgeProfileIds,
} from "./surpriseAnomalies";

const makeJigsaw = (
  imageId: string = defaultJigsawImageAsset.id,
  jigsawCutStyle: JigsawCutStyle = defaultJigsawCutStyle,
) =>
  generateJigsaw({
    puzzleId: "jigsaw",
    seed: "phase-one-seed",
    width: 4,
    height: 3,
    imageId,
    jigsawCutStyle,
  });

const getTile = (puzzle: JigsawGeneratedPuzzle, row: number, column: number) => {
  const tile = puzzle.tiles.find((candidate) => candidate.row === row && candidate.column === column);
  if (!tile) throw new Error(`Missing tile at ${row},${column}`);
  return tile;
};

const getEdge = (tile: JigsawPiece, side: JigsawEdgeSide): JigsawPieceEdge => {
  const edge = tile.edges.find((candidate) => candidate.side === side);
  if (!edge) throw new Error(`Missing ${side} edge for ${tile.id}`);
  return edge;
};

const getAllEdges = (puzzle: JigsawGeneratedPuzzle) => puzzle.tiles.flatMap((tile) => tile.edges);

const getDominantInteriorProfile = (puzzle: JigsawGeneratedPuzzle) => {
  const counts = new Map<string, number>();

  for (const edge of getAllEdges(puzzle)) {
    if (edge.boundary) continue;
    counts.set(edge.profileId, (counts.get(edge.profileId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
};

describe("generateJigsaw", () => {
  it("is deterministic for seed, dimensions, image id, cut style, and edge model", () => {
    const first = makeJigsaw();
    const second = makeJigsaw();

    expect(first.id).toBe(second.id);
    expect(first.checksum).toBe(second.checksum);
    expect(first.edgeModel).toEqual(second.edgeModel);
    expect(first.tiles).toEqual(second.tiles);
  });

  it("records the selected image and explicit edge model identities", () => {
    const puzzle = makeJigsaw();

    expect(puzzle.asset).toEqual(defaultJigsawImageAsset);
    expect(puzzle.asset.kind).toBe("image");
    expect(puzzle.edgeModel.cutStyle).toBe(defaultJigsawCutStyle);
    expect(puzzle.edgeModel).toEqual({
      cutStyle: defaultJigsawCutStyle,
      baselineCourseIds: deriveJigsawBaselineCoursePalette(
        defaultJigsawCutStyle,
        `jigsaw:phase-one-seed:4x3:${defaultJigsawImageAsset.id}:edges:${defaultJigsawCutStyle}`,
      ),
    });
    expect(puzzle.id).toContain(defaultJigsawImageAsset.id);
    expect(puzzle.id).toContain(`edges:${defaultJigsawCutStyle}`);
  });

  it("makes cut style part of deterministic puzzle identity", () => {
    const classic = makeJigsaw(defaultJigsawImageAsset.id, "classic");
    const eclectic = makeJigsaw(defaultJigsawImageAsset.id, "eclectic");

    expect(classic.seed).toBe(eclectic.seed);
    expect(classic.asset.id).toBe(eclectic.asset.id);
    expect(classic.edgeModel.cutStyle).toBe("classic");
    expect(eclectic.edgeModel.cutStyle).toBe("eclectic");
    expect(classic.id).not.toBe(eclectic.id);
    expect(classic.checksum).not.toBe(eclectic.checksum);
    expect(classic.edgeModel.baselineCourseIds).not.toEqual(
      eclectic.edgeModel.baselineCourseIds,
    );
  });

  it("creates one correctly indexed piece with four required semantic edges for every grid position", () => {
    const puzzle = makeJigsaw();
    const sortedTiles = [...puzzle.tiles].sort((left, right) => left.solvedIndex - right.solvedIndex);

    expect(puzzle.tiles).toHaveLength(12);
    expect(
      sortedTiles.map(({ id, solvedIndex, row, column }) => ({ id, solvedIndex, row, column })),
    ).toEqual(
      Array.from({ length: 12 }, (_, solvedIndex) => ({
        id: `tile-${solvedIndex}`,
        solvedIndex,
        row: Math.floor(solvedIndex / 4),
        column: solvedIndex % 4,
      })),
    );
    expect(sortedTiles.map((tile) => tile.currentIndex).sort((left, right) => left - right)).toEqual(
      Array.from({ length: 12 }, (_, index) => index),
    );
    expect(sortedTiles.every((tile) => tile.edges.length === 4)).toBe(true);
  });

  it("clamps custom dimensions to the 32 by 32 technical ceiling", () => {
    const puzzle = generateJigsaw({
      puzzleId: "jigsaw",
      seed: "technical-ceiling",
      width: 40,
      height: 33,
      imageId: defaultJigsawImageAsset.id,
    });

    expect(puzzle.width).toBe(32);
    expect(puzzle.height).toBe(32);
    expect(puzzle.tiles).toHaveLength(1024);
  });

  it("keeps one dominant edge profile with only a tiny bounded surprise layer", () => {
    for (const seed of ["one-family-a", "one-family-b", "one-family-c"]) {
      const puzzle = generateJigsaw({
        puzzleId: "jigsaw",
        seed,
        width: 12,
        height: 12,
        imageId: defaultJigsawImageAsset.id,
      });
      const dominantProfileId = getDominantInteriorProfile(puzzle);
      const surpriseEdges = getAllEdges(puzzle).filter(
        (edge) => !edge.boundary && edge.profileId !== dominantProfileId,
      );
      const surprisePairs = new Set(
        surpriseEdges.map((edge) =>
          [edge.edgeId, edge.neighborEdgeId].sort().join("|"),
        ),
      );
      const budget = getJigsawSurpriseAnomalyBudget(puzzle.width * puzzle.height);

      expect(dominantProfileId).not.toBeNull();
      expect(surpriseEdges).toHaveLength(budget * 2);
      expect(surprisePairs.size).toBe(budget);
      surpriseEdges.forEach((edge) => {
        if (edge.boundary) throw new Error("Expected an interior surprise edge.");
        expect(jigsawSurpriseEdgeProfileIds).toContain(edge.profileId);
      });
    }
  });

  it("keeps Classic edge generation inside its familiar palette", () => {
    const selected = new Set<string>();

    for (let index = 0; index < 160; index += 1) {
      const puzzle = generateJigsaw({
        puzzleId: "jigsaw",
        seed: `classic-family-${index}`,
        width: 4,
        height: 4,
        imageId: defaultJigsawImageAsset.id,
        jigsawCutStyle: "classic",
      });
      const dominantProfileId = getDominantInteriorProfile(puzzle);
      if (!dominantProfileId) throw new Error("Expected a dominant Jigsaw edge profile.");
      selected.add(dominantProfileId);
    }

    expect(selected).toEqual(
      new Set(["classic-bulb", "necked-head"]),
    );
  });

  it("lets Eclectic edge generation reach the full production vocabulary", () => {
    const selected = new Set<string>();

    for (let index = 0; index < 320; index += 1) {
      const puzzle = generateJigsaw({
        puzzleId: "jigsaw",
        seed: `eclectic-family-${index}`,
        width: 4,
        height: 4,
        imageId: defaultJigsawImageAsset.id,
        jigsawCutStyle: "eclectic",
      });
      const dominantProfileId = getDominantInteriorProfile(puzzle);
      if (!dominantProfileId) throw new Error("Expected a dominant Jigsaw edge profile.");
      selected.add(dominantProfileId);
    }

    expect(selected).toEqual(new Set(jigsawEdgeProfileIds));
  });

  it("varies the coherent baseline sub-palette across puzzle identities", () => {
    const classicPalettes = new Set<string>();
    const eclecticPalettes = new Set<string>();

    for (let index = 0; index < 96; index += 1) {
      const seed = `palette-sample-${index}`;
      classicPalettes.add(
        generateJigsaw({
          puzzleId: "jigsaw",
          seed,
          width: 6,
          height: 6,
          imageId: defaultJigsawImageAsset.id,
          jigsawCutStyle: "classic",
        }).edgeModel.baselineCourseIds.join("|"),
      );
      eclecticPalettes.add(
        generateJigsaw({
          puzzleId: "jigsaw",
          seed,
          width: 6,
          height: 6,
          imageId: defaultJigsawImageAsset.id,
          jigsawCutStyle: "eclectic",
        }).edgeModel.baselineCourseIds.join("|"),
      );
    }

    expect(classicPalettes.size).toBeGreaterThan(1);
    expect(eclecticPalettes.size).toBeGreaterThan(4);
  });

  it("makes every border edge flat, unpaired, and profile-free", () => {
    const puzzle = makeJigsaw();
    const boundaryEdges = getAllEdges(puzzle).filter((edge) => edge.boundary);

    expect(boundaryEdges).toHaveLength(puzzle.width * 2 + puzzle.height * 2);
    for (const edge of boundaryEdges) {
      expect(edge.polarity).toBe("flat");
      expect(edge.neighborPieceId).toBeNull();
      expect(edge.neighborEdgeId).toBeNull();
      expect(edge.profileId).toBeNull();
      expect(edge.seedOffset).toBe(0);
    }
  });

  it("pairs every horizontal right and left edge compatibly", () => {
    const puzzle = makeJigsaw();

    for (let row = 0; row < puzzle.height; row += 1) {
      for (let column = 0; column < puzzle.width - 1; column += 1) {
        const leftTile = getTile(puzzle, row, column);
        const rightTile = getTile(puzzle, row, column + 1);
        const rightEdge = getEdge(leftTile, "right");
        const leftEdge = getEdge(rightTile, "left");

        expect(rightEdge.boundary).toBe(false);
        expect(leftEdge.boundary).toBe(false);
        expect(rightEdge.neighborPieceId).toBe(rightTile.id);
        expect(rightEdge.neighborEdgeId).toBe(leftEdge.edgeId);
        expect(leftEdge.neighborPieceId).toBe(leftTile.id);
        expect(leftEdge.neighborEdgeId).toBe(rightEdge.edgeId);
        expect(rightEdge.profileId).toBe(leftEdge.profileId);
        expect(rightEdge.seedOffset).toBe(leftEdge.seedOffset);
        expect([rightEdge.polarity, leftEdge.polarity].sort()).toEqual(["blank", "tab"]);
      }
    }
  });

  it("pairs every vertical bottom and top edge compatibly", () => {
    const puzzle = makeJigsaw();

    for (let row = 0; row < puzzle.height - 1; row += 1) {
      for (let column = 0; column < puzzle.width; column += 1) {
        const topTile = getTile(puzzle, row, column);
        const bottomTile = getTile(puzzle, row + 1, column);
        const bottomEdge = getEdge(topTile, "bottom");
        const topEdge = getEdge(bottomTile, "top");

        expect(bottomEdge.boundary).toBe(false);
        expect(topEdge.boundary).toBe(false);
        expect(bottomEdge.neighborPieceId).toBe(bottomTile.id);
        expect(bottomEdge.neighborEdgeId).toBe(topEdge.edgeId);
        expect(topEdge.neighborPieceId).toBe(topTile.id);
        expect(topEdge.neighborEdgeId).toBe(bottomEdge.edgeId);
        expect(bottomEdge.profileId).toBe(topEdge.profileId);
        expect(bottomEdge.seedOffset).toBe(topEdge.seedOffset);
        expect([bottomEdge.polarity, topEdge.polarity].sort()).toEqual(["blank", "tab"]);
      }
    }
  });

  it("gives every interior edge exactly one reciprocal neighbor", () => {
    const puzzle = makeJigsaw();
    const allEdges = getAllEdges(puzzle);
    const edgeById = new Map(allEdges.map((edge) => [edge.edgeId, edge]));
    const uniquePairs = new Set<string>();

    for (const edge of allEdges) {
      if (edge.boundary) continue;

      expect(edge.polarity).not.toBe("flat");
      const neighborEdge = edgeById.get(edge.neighborEdgeId);
      expect(neighborEdge).toBeDefined();
      expect(neighborEdge?.neighborEdgeId).toBe(edge.edgeId);
      expect(neighborEdge?.neighborPieceId).toBe(edge.edgeId.split(":edge:")[0]);
      uniquePairs.add([edge.edgeId, edge.neighborEdgeId].sort().join("|"));
    }

    expect(uniquePairs.size).toBe(
      puzzle.height * (puzzle.width - 1) + (puzzle.height - 1) * puzzle.width,
    );
  });

  it("includes edge graph and edge model metadata in the generated checksum", () => {
    const puzzle = makeJigsaw();
    const changedTiles = puzzle.tiles.map((tile) => ({
      ...tile,
      edges: tile.edges.map((edge) =>
        edge.boundary ? edge : { ...edge, seedOffset: edge.seedOffset + 1 },
      ),
    }));
    const changedEdgesPuzzle = createGeneratedJigsawPuzzle({
      id: puzzle.id,
      title: puzzle.title,
      seed: puzzle.seed,
      width: puzzle.width,
      height: puzzle.height,
      tiles: changedTiles,
      asset: puzzle.asset,
      edgeModel: puzzle.edgeModel,
      notes: puzzle.notes,
    });
    const changedModelPuzzle = createGeneratedJigsawPuzzle({
      id: puzzle.id,
      title: puzzle.title,
      seed: puzzle.seed,
      width: puzzle.width,
      height: puzzle.height,
      tiles: puzzle.tiles,
      asset: puzzle.asset,
      edgeModel: {
        ...puzzle.edgeModel,
        cutStyle:
          puzzle.edgeModel.cutStyle === "classic"
            ? "eclectic"
            : "classic",
      },
      notes: puzzle.notes,
    });

    expect(changedEdgesPuzzle.checksum).not.toBe(puzzle.checksum);
    expect(changedModelPuzzle.checksum).not.toBe(puzzle.checksum);
  });

  it("rejects an unknown bundled image id", () => {
    expect(() => makeJigsaw("missing-image")).toThrow("Unknown bundled Jigsaw image");
  });
});
