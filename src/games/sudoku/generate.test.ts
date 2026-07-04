import { describe, expect, it } from "vitest";
import { generateSudoku } from "./generate";

const expectedDigits = "123456789";
const sorted = (values: string[]) => [...values].sort().join("");

const expectUnit = (values: string[]) => expect(sorted(values)).toBe(expectedDigits);

describe("generateSudoku", () => {
  it("generates classic Sudoku without a variant override", () => {
    const puzzle = generateSudoku({ puzzleId: "sudoku", seed: "classic-seed", width: 9, height: 9, difficulty: "Medium" });

    expect(puzzle.sudokuVariation).toBe("classic");
    expect(puzzle.title).toBe("Sudoku");
    expect(puzzle.answerKey).toHaveLength(81);
  });

  it("generates diagonal Sudoku with valid diagonal units", () => {
    const puzzle = generateSudoku({ puzzleId: "sudoku", seed: "diagonal-seed", width: 9, height: 9, difficulty: "Medium", sudokuVariation: "diagonal" });
    const solution = puzzle.answerKey ?? [];

    expect(puzzle.sudokuVariation).toBe("diagonal");
    expect(puzzle.title).toBe("Diagonal Sudoku");
    expect(solution).toHaveLength(81);

    for (let row = 0; row < 9; row += 1) {
      expectUnit(solution.slice(row * 9, row * 9 + 9));
    }

    for (let column = 0; column < 9; column += 1) {
      expectUnit(Array.from({ length: 9 }, (_, row) => solution[row * 9 + column] ?? ""));
    }

    for (let boxRow = 0; boxRow < 3; boxRow += 1) {
      for (let boxColumn = 0; boxColumn < 3; boxColumn += 1) {
        expectUnit(
          Array.from({ length: 9 }, (_, index) => {
            const row = boxRow * 3 + Math.floor(index / 3);
            const column = boxColumn * 3 + (index % 3);
            return solution[row * 9 + column] ?? "";
          }),
        );
      }
    }

    expectUnit(Array.from({ length: 9 }, (_, index) => solution[index * 9 + index] ?? ""));
    expectUnit(Array.from({ length: 9 }, (_, index) => solution[index * 9 + (8 - index)] ?? ""));
  });
});
