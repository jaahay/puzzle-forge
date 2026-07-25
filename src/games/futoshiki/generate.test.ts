import { describe, expect, it } from "vitest";
import { countFutoshikiSolutions, generateFutoshiki } from "./generate";

describe("generateFutoshiki", () => {
  it("is deterministic for seed, size, and difficulty", () => {
    const params = { puzzleId: "futoshiki" as const, seed: "inequality-seed", width: 5, height: 5, difficulty: "Hard" as const };
    const first = generateFutoshiki(params);
    const second = generateFutoshiki(params);

    expect(first.checksum).toBe(second.checksum);
    expect(first.cells).toEqual(second.cells);
    expect(first.answerKey).toEqual(second.answerKey);
    expect(first.inequalities).toEqual(second.inequalities);
  });

  it("builds a Latin-square answer satisfying every inequality", () => {
    const puzzle = generateFutoshiki({ puzzleId: "futoshiki", seed: "latin", width: 5, height: 5, difficulty: "Medium" });
    const answer = puzzle.answerKey?.map(Number) ?? [];

    for (let row = 0; row < puzzle.height; row += 1) {
      expect(new Set(answer.slice(row * puzzle.width, (row + 1) * puzzle.width)).size).toBe(puzzle.width);
    }
    for (let column = 0; column < puzzle.width; column += 1) {
      expect(new Set(Array.from({ length: puzzle.height }, (_, row) => answer[row * puzzle.width + column])).size).toBe(puzzle.height);
    }
    for (const inequality of puzzle.inequalities ?? []) {
      const lesser = answer[inequality.lesser.row * puzzle.width + inequality.lesser.column];
      const greater = answer[inequality.greater.row * puzzle.width + inequality.greater.column];
      expect(lesser).toBeLessThan(greater);
      expect(Math.abs(inequality.lesser.row - inequality.greater.row) + Math.abs(inequality.lesser.column - inequality.greater.column)).toBe(1);
    }
  });

  it("publishes a uniquely solvable player state", () => {
    const puzzle = generateFutoshiki({ puzzleId: "futoshiki", seed: "unique", width: 5, height: 5, difficulty: "Expert" });
    const givens = puzzle.cells.map((cell) => cell.locked ? Number(cell.value) : null);

    expect(puzzle.uniqueSolution).toBe(true);
    expect(countFutoshikiSolutions(puzzle.width, givens, puzzle.inequalities ?? [])).toBe(1);
  });
});
