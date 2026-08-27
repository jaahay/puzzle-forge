import { describe, expect, it } from "vitest";
import type { TilePuzzlePiece } from "../../catalog/types";
import {
  canSlideTile,
  getSlidingNeighborIndexes,
  hasUniqueTilePositions,
  isImageTileSolved,
  slideTileIntoGap,
  swapTilePositions,
} from "./state";

const makeTile = (solvedIndex: number, currentIndex = solvedIndex): TilePuzzlePiece => ({
  id: `tile-${solvedIndex}`,
  currentIndex,
  solvedIndex,
  row: Math.floor(solvedIndex / 3),
  column: solvedIndex % 3,
});

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

  it("treats the gap as part of sliding-puzzle completion", () => {
    const tiles = [makeTile(0), makeTile(1), makeTile(2)];
    expect(isImageTileSolved(tiles)).toBe(true);
    expect(isImageTileSolved(tiles, 3, 4)).toBe(true);
    expect(isImageTileSolved(tiles, 2, 4)).toBe(false);
  });
});
