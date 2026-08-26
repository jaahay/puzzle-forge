import { describe, expect, it } from "vitest";
import { isImageTileSolved } from "../imageTiles/state";
import { generateTileSwap, tileSwapMaximumAxis, tileSwapMinimumAxis } from "./generate";

describe("generateTileSwap", () => {
  it("is deterministic for seed, dimensions, concrete artwork, and shuffle revision", () => {
    const first = generateTileSwap({
      puzzleId: "tile-swap",
      seed: "gallery-night",
      width: 4,
      height: 3,
      imageId: "great-wave",
    });
    const second = generateTileSwap({
      puzzleId: "tile-swap",
      seed: "gallery-night",
      width: 4,
      height: 3,
      imageId: "great-wave",
    });
    const alternateArtwork = generateTileSwap({
      puzzleId: "tile-swap",
      seed: "gallery-night",
      width: 4,
      height: 3,
      imageId: "roses",
    });

    expect(first.asset.id).toBe("great-wave");
    expect(first.id).toContain("shuffle@1");
    expect(first.tiles).toEqual(second.tiles);
    expect(first.checksum).toBe(second.checksum);
    expect(first.id).toBe(second.id);
    expect(alternateArtwork.id).not.toBe(first.id);
  });

  it("starts with a complete, unique, non-solved permutation", () => {
    const puzzle = generateTileSwap({ puzzleId: "tile-swap", seed: "shuffle-me", width: 4, height: 4 });
    const currentIndexes = puzzle.tiles.map((tile) => tile.currentIndex);
    const solvedIndexes = puzzle.tiles.map((tile) => tile.solvedIndex);

    expect(puzzle.tiles).toHaveLength(16);
    expect(new Set(currentIndexes).size).toBe(16);
    expect(new Set(solvedIndexes).size).toBe(16);
    expect([...currentIndexes].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, index) => index));
    expect(isImageTileSolved(puzzle.tiles)).toBe(false);
  });

  it("bounds board dimensions", () => {
    const puzzle = generateTileSwap({ puzzleId: "tile-swap", seed: "bounds", width: 1, height: 99 });
    expect(puzzle.width).toBe(tileSwapMinimumAxis);
    expect(puzzle.height).toBe(tileSwapMaximumAxis);
  });
});
