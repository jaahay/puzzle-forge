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

describe("Word Guess generation registration", () => {
  it("requires the explicit supplied answer pool", () => {
    const request = { puzzleId: "word-guess" as const, seed: "registry", width: 5, height: 6 };
    expect(hasPuzzleGenerator("word-guess")).toBe(true);
    expect(() => generatePuzzle(request)).toThrow("explicit answer pool");
    const puzzle = generatePuzzle(request, ["CRANE"]);
    expect(puzzle.kind).toBe("grid");
    if (puzzle.kind === "grid") expect(puzzle.answerKey).toEqual([..."CRANE"]);
  });
});
