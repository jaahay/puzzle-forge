import { describe, expect, it } from "vitest";
import { generatePuzzle, hasPuzzleGenerator } from "./registry";

describe("image tile generator registration", () => {
  it.each(["tile-swap", "sliding-puzzle"] as const)("registers and generates %s", (puzzleId) => {
    expect(hasPuzzleGenerator(puzzleId)).toBe(true);
    const puzzle = generatePuzzle({ puzzleId, seed: "registry", width: 4, height: 4, imageId: "great-wave" });
    expect(puzzle.puzzleId).toBe(puzzleId);
    expect(puzzle.kind).toBe("tiles");
  });
});
