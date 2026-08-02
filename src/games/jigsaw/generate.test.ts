import { describe, expect, it } from "vitest";
import type { JigsawEdgeSide, JigsawPieceEdge, TileGeneratedPuzzle, TilePuzzlePiece } from "../../catalog/types";
import { createGeneratedTilePuzzle } from "../shared";
import { getJigsawEdgeProfile, jigsawEdgeProfileIds } from "./edgeProfiles";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";

const makeJigsaw = (
  jigsawImageId: string = defaultJigsawImageAsset.id,
  jigsawAssetRevision: number = defaultJigsawImageAsset.assetRevision,
) =>
  generateJigsaw({
    puzzleId: "jigsaw",
    seed: "phase-one-seed",
    width: 4,
    height: 3,
    jigsawImageId,
    jigsawAssetRevision,
  });

const getTile = (puzzle: TileGeneratedPuzzle, row: number, column: number) => {
  const tile = puzzle.tiles.find((candidate) => candidate.row === row && candidate.column === column);
  if (!tile) throw new Error(`Missing tile at ${row},${column}`);
  return tile;
};

const getEdge = (tile: TilePuzzlePiece, side: JigsawEdgeSide): JigsawPieceEdge => {
  const edge = tile.edges?.find((candidate) => candidate.side === side);
  if (!edge) throw new Error(`Missing ${side} edge for ${tile.id}`);
  return edge;
};

const getAllEdges = (puzzle: TileGeneratedPuzzle) => puzzle.tiles.flatMap((tile) => tile.edges ?? []);

describe("generateJigsaw", () => {
  it("is deterministic for seed, dimensions, image id, asset revision, and edge profiles", () => {
    const first = makeJigsaw();
    const second = makeJigsaw();

    expect(first.id).toBe(second.id);
    expect(first.checksum).toBe(second.checksum);
    expect(first.tiles).toEqual(second.tiles);
  });

  it("records the selected bundled image asset identity", () => {
    const puzzle = makeJigsaw();

    expect(puzzle.asset).toEqual(defaultJigsawImageAsset);
    expect(puzzle.asset.kind).toBe("image");
    expect(puzzle.id).toContain(`${defaultJigsawImageAsset.id}@${defaultJigsawImageAsset.assetRevision}`);
  });

  it("creates one correctly indexed piece with four semantic edges for every grid position", () => {
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
    expect(sortedTiles.every((tile) => tile.edges?.length === 4)).toBe(true);
  });

  it("provides a complete typed edge profile repository", () => {
    expect(jigsawEdgeProfileIds).toEqual([
      "classic-round",
      "soft-round",
      "angular",
      "wave",
      "simple-lock",
    ]);

    for (const profileId of jigsawEdgeProfileIds) {
      const profile = getJigsawEdgeProfile(profileId);
      expect(profile.id).toBe(profileId);
      expect(profile.description.length).toBeGreaterThan(0);
      expect(profile.difficultyWeight).toBeGreaterThan(0);
    }
  });

  it("makes every border edge flat and unpaired", () => {
    const puzzle = makeJigsaw();
    const boundaryEdges = getAllEdges(puzzle).filter((edge) => edge.boundary);

    expect(boundaryEdges).toHaveLength(puzzle.width * 2 + puzzle.height * 2);
    for (const edge of boundaryEdges) {
      expect(edge.polarity).toBe("flat");
      expect(edge.neighborPieceId).toBeNull();
      expect(edge.neighborEdgeId).toBeNull();
      expect(edge.seedOffset).toBe(0);
      expect(jigsawEdgeProfileIds).toContain(edge.profileId);
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
    const interiorEdges = allEdges.filter((edge) => !edge.boundary);
    const uniquePairs = new Set<string>();

    for (const edge of interiorEdges) {
      expect(edge.polarity).not.toBe("flat");
      expect(edge.neighborPieceId).not.toBeNull();
      expect(edge.neighborEdgeId).not.toBeNull();

      const neighborEdge = edge.neighborEdgeId ? edgeById.get(edge.neighborEdgeId) : undefined;
      expect(neighborEdge).toBeDefined();
      expect(neighborEdge?.neighborEdgeId).toBe(edge.edgeId);
      expect(neighborEdge?.neighborPieceId).toBe(edge.edgeId.split(":edge:")[0]);

      if (edge.neighborEdgeId) {
        uniquePairs.add([edge.edgeId, edge.neighborEdgeId].sort().join("|"));
      }
    }

    expect(uniquePairs.size).toBe(
      puzzle.height * (puzzle.width - 1) + (puzzle.height - 1) * puzzle.width,
    );
  });

  it("includes edge metadata in the generated checksum", () => {
    const puzzle = makeJigsaw();
    const changedTiles = puzzle.tiles.map((tile, tileIndex) =>
      tileIndex === 0
        ? {
            ...tile,
            edges: tile.edges?.map((edge, edgeIndex) =>
              edgeIndex === 0 ? { ...edge, seedOffset: edge.seedOffset + 1 } : edge,
            ),
          }
        : tile,
    );
    const changedPuzzle = createGeneratedTilePuzzle({
      id: puzzle.id,
      puzzleId: puzzle.puzzleId,
      title: puzzle.title,
      seed: puzzle.seed,
      width: puzzle.width,
      height: puzzle.height,
      tiles: changedTiles,
      asset: puzzle.asset,
      notes: puzzle.notes,
    });

    expect(changedPuzzle.checksum).not.toBe(puzzle.checksum);
  });

  it("rejects an unknown bundled image id", () => {
    expect(() => makeJigsaw("missing-image")).toThrow("Unknown bundled Jigsaw image");
  });

  it("rejects an unsupported asset revision", () => {
    expect(() => makeJigsaw(defaultJigsawImageAsset.id, defaultJigsawImageAsset.assetRevision + 1)).toThrow(
      "Unsupported revision",
    );
  });
});
