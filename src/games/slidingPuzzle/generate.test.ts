import { describe, expect, it } from "vitest";
import { hasUniqueTilePositions, isImageTileSolved } from "../imageTiles/state";
import { generateSlidingPuzzle, slidingPuzzleMaximumAxis, slidingPuzzleMinimumAxis } from "./generate";

const inversionCount = (values: readonly number[]) => {
  let count = 0;
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      if (values[left] > values[right]) count += 1;
    }
  }
  return count;
};

const isClassicallySolvable = (width: number, height: number, emptyIndex: number, currentByIndex: readonly number[]) => {
  const inversions = inversionCount(currentByIndex);
  if (width % 2 === 1) return inversions % 2 === 0;

  const emptyRowFromBottom = height - Math.floor(emptyIndex / width);
  return emptyRowFromBottom % 2 === 0 ? inversions % 2 === 1 : inversions % 2 === 0;
};

describe("generateSlidingPuzzle", () => {
  it("is deterministic for seed, dimensions, and concrete artwork", () => {
    const first = generateSlidingPuzzle({
      puzzleId: "sliding-puzzle",
      seed: "legal-walk",
      width: 4,
      height: 4,
      imageId: "canal-in-venice",
    });
    const second = generateSlidingPuzzle({
      puzzleId: "sliding-puzzle",
      seed: "legal-walk",
      width: 4,
      height: 4,
      imageId: "canal-in-venice",
    });

    expect(first.asset.id).toBe("canal-in-venice");
    expect(first.tiles).toEqual(second.tiles);
    expect(first.emptyIndex).toBe(second.emptyIndex);
    expect(first.checksum).toBe(second.checksum);
    expect(first.id).toBe(second.id);
  });

  it("starts in a valid, non-solved state with exactly one gap", () => {
    const puzzle = generateSlidingPuzzle({ puzzleId: "sliding-puzzle", seed: "one-gap", width: 4, height: 4 });
    const cellCount = puzzle.width * puzzle.height;
    const occupied = new Set(puzzle.tiles.map((tile) => tile.currentIndex));

    expect(puzzle.tiles).toHaveLength(cellCount - 1);
    expect(hasUniqueTilePositions(puzzle.tiles, cellCount)).toBe(true);
    expect(occupied.has(puzzle.emptyIndex)).toBe(false);
    expect(puzzle.emptyIndex).toBeGreaterThanOrEqual(0);
    expect(puzzle.emptyIndex).toBeLessThan(cellCount);
    expect(isImageTileSolved(puzzle.tiles, puzzle.emptyIndex, cellCount)).toBe(false);
  });

  it("produces positions in the reachable sliding-puzzle parity class across seeds and board shapes", () => {
    for (const [width, height] of [[2, 3], [3, 3], [4, 4], [4, 5], [5, 4], [6, 5]] as const) {
      for (let seedIndex = 0; seedIndex < 24; seedIndex += 1) {
        const puzzle = generateSlidingPuzzle({
          puzzleId: "sliding-puzzle",
          seed: `reachability-${width}x${height}-${seedIndex}`,
          width,
          height,
        });
        const currentByIndex = [...puzzle.tiles]
          .sort((left, right) => left.currentIndex - right.currentIndex)
          .map((tile) => tile.solvedIndex);

        expect(isClassicallySolvable(width, height, puzzle.emptyIndex, currentByIndex)).toBe(true);
      }
    }
  });

  it("bounds board dimensions", () => {
    const puzzle = generateSlidingPuzzle({ puzzleId: "sliding-puzzle", seed: "bounds", width: 1, height: 99 });
    expect(puzzle.width).toBe(slidingPuzzleMinimumAxis);
    expect(puzzle.height).toBe(slidingPuzzleMaximumAxis);
  });
});
