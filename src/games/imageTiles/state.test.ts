import { describe, expect, it } from "vitest";
import type { TilePuzzlePiece } from "../../catalog/types";
import {
  canSlideTile,
  canSlideTileTowardGap,
  getSlidingNeighborIndexes,
  hasUniqueTilePositions,
  isImageTileSolved,
  slideTileIntoGap,
  slideTileTowardGap,
  swapTilePositions,
} from "./state";

const makeTile = (solvedIndex: number, currentIndex = solvedIndex): TilePuzzlePiece => ({
  id: `tile-${solvedIndex}`,
  currentIndex,
  solvedIndex,
  row: Math.floor(solvedIndex / 3),
  column: solvedIndex % 3,
});

const makeBoard = (width: number, height: number, emptyIndex: number): TilePuzzlePiece[] =>
  Array.from({ length: width * height }, (_, solvedIndex) => solvedIndex === emptyIndex
    ? null
    : {
        id: `tile-${solvedIndex}`,
        currentIndex: solvedIndex,
        solvedIndex,
        row: Math.floor(solvedIndex / width),
        column: solvedIndex % width,
      })
    .filter((tile): tile is TilePuzzlePiece => tile !== null);

describe("image tile state", () => {
  it("swaps exactly the selected tile positions", () => {
    const tiles = [makeTile(0), makeTile(1), makeTile(2)];
    const swapped = swapTilePositions(tiles, "tile-0", "tile-2");

    expect(swapped.map((tile) => tile.currentIndex)).toEqual([2, 1, 0]);
    expect(hasUniqueTilePositions(swapped, 3)).toBe(true);
  });

  it("enumerates legal sliding neighbors without wrapping rows", () => {
    expect(getSlidingNeighborIndexes(0, 3, 3)).toEqual([1, 3]);
    expect(getSlidingNeighborIndexes(4, 3, 3)).toEqual([1, 5, 7, 3]);
    expect(getSlidingNeighborIndexes(8, 3, 3)).toEqual([5, 7]);
  });

  it("moves only an adjacent tile into the gap", () => {
    const tiles = [makeTile(0), makeTile(1), makeTile(2), makeTile(3)];
    expect(canSlideTile(tiles[1], 3, 2, 2)).toBe(true);

    const result = slideTileIntoGap(tiles, "tile-1", 3, 2, 2);
    expect(result.moved).toBe(true);
    expect(result.emptyIndex).toBe(1);
    expect(result.tiles.find((tile) => tile.id === "tile-1")?.currentIndex).toBe(3);
    expect(result.tiles.filter((tile) => tile.id !== "tile-1")).toEqual(tiles.filter((tile) => tile.id !== "tile-1"));
  });

  it("rejects non-adjacent sliding moves", () => {
    const tiles = [makeTile(0), makeTile(1), makeTile(2)];
    const result = slideTileIntoGap(tiles, "tile-0", 3, 2, 2);

    expect(result.moved).toBe(false);
    expect(result.emptyIndex).toBe(3);
    expect(result.tiles).toEqual(tiles);
  });

  it("allows any tile aligned with the gap to request a line slide", () => {
    const tiles = makeBoard(4, 3, 7);
    const horizontal = tiles.find((tile) => tile.id === "tile-4");
    const vertical = tiles.find((tile) => tile.id === "tile-3");
    const diagonal = tiles.find((tile) => tile.id === "tile-0");

    expect(horizontal && canSlideTileTowardGap(horizontal, 7, 4, 3)).toBe(true);
    expect(vertical && canSlideTileTowardGap(vertical, 7, 4, 3)).toBe(true);
    expect(diagonal && canSlideTileTowardGap(diagonal, 7, 4, 3)).toBe(false);
  });

  it("shifts an aligned horizontal segment one cell toward the gap", () => {
    const tiles = makeBoard(4, 3, 7);
    const result = slideTileTowardGap(tiles, "tile-4", 7, 4, 3);

    expect(result.moved).toBe(true);
    expect(result.emptyIndex).toBe(4);
    expect(result.tiles.find((tile) => tile.id === "tile-4")?.currentIndex).toBe(5);
    expect(result.tiles.find((tile) => tile.id === "tile-5")?.currentIndex).toBe(6);
    expect(result.tiles.find((tile) => tile.id === "tile-6")?.currentIndex).toBe(7);
    expect(hasUniqueTilePositions(result.tiles, 12)).toBe(true);
  });

  it("shifts an aligned vertical segment one cell toward the gap", () => {
    const tiles = makeBoard(4, 3, 10);
    const result = slideTileTowardGap(tiles, "tile-2", 10, 4, 3);

    expect(result.moved).toBe(true);
    expect(result.emptyIndex).toBe(2);
    expect(result.tiles.find((tile) => tile.id === "tile-2")?.currentIndex).toBe(6);
    expect(result.tiles.find((tile) => tile.id === "tile-6")?.currentIndex).toBe(10);
    expect(hasUniqueTilePositions(result.tiles, 12)).toBe(true);
  });

  it("matches the equivalent sequence of ordinary adjacent slides", () => {
    const tiles = makeBoard(4, 3, 7);
    const lineSlide = slideTileTowardGap(tiles, "tile-4", 7, 4, 3);

    let adjacentTiles = tiles;
    let adjacentGap = 7;
    for (const tileId of ["tile-6", "tile-5", "tile-4"]) {
      const next = slideTileIntoGap(adjacentTiles, tileId, adjacentGap, 4, 3);
      expect(next.moved).toBe(true);
      adjacentTiles = next.tiles;
      adjacentGap = next.emptyIndex;
    }

    expect(lineSlide.emptyIndex).toBe(adjacentGap);
    expect(lineSlide.tiles.map(({ id, currentIndex }) => ({ id, currentIndex })))
      .toEqual(adjacentTiles.map(({ id, currentIndex }) => ({ id, currentIndex })));
  });

  it("rejects a line slide from a non-aligned tile", () => {
    const tiles = makeBoard(4, 3, 7);
    const result = slideTileTowardGap(tiles, "tile-0", 7, 4, 3);

    expect(result.moved).toBe(false);
    expect(result.emptyIndex).toBe(7);
    expect(result.tiles).toEqual(tiles);
  });

  it("treats the gap as part of sliding-puzzle completion", () => {
    const tiles = [makeTile(0), makeTile(1), makeTile(2)];
    expect(isImageTileSolved(tiles)).toBe(true);
    expect(isImageTileSolved(tiles, 3, 4)).toBe(true);
    expect(isImageTileSolved(tiles, 2, 4)).toBe(false);
  });
});
