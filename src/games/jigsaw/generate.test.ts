import { describe, expect, it } from "vitest";
import type { JigsawEdgeSide, JigsawGeneratedPuzzle, JigsawPiece, JigsawPieceEdge } from "../../catalog/types";
import { createGeneratedJigsawPuzzle } from "../shared";
import {
  getJigsawEdgeProfile,
  jigsawEdgeProfileCatalogRevision,
  jigsawEdgeProfileIds,
} from "./edgeProfiles";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";

const makeJigsaw = (imageId: string = defaultJigsawImageAsset.id) =>
  generateJigsaw({
    puzzleId: "jigsaw",
    seed: "phase-one-seed",
    width: 4,
    height: 3,
    imageId,
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

describe("generateJigsaw", () => {
  it("is deterministic for seed, dimensions, image id, and edge model", () => {
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
    expect(puzzle.edgeModel).toEqual({
      catalogRevision: jigsawEdgeProfileCatalogRevision,
      profileIds: [...jigsawEdgeProfileIds],
    });
    expect(puzzle.id).toContain(defaultJigsawImageAsset.id);
    expect(puzzle.id).toContain(`edges@${jigsawEdgeProfileCatalogRevision}`);
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

  it("provides a complete, explicitly ordered edge profile repository", () => {
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
        catalogRevision: puzzle.edgeModel.catalogRevision + 1,
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
