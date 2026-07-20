import { describe, expect, it } from "vitest";
import { generateSudoku, sudokuTestHooks } from "./generate";

const expectedDigits = "123456789";
const sorted = (values: string[]) => [...values].sort().join("");

const expectUnit = (values: string[]) => expect(sorted(values)).toBe(expectedDigits);
const countGivens = (puzzle: ReturnType<typeof generateSudoku>) => {
  expect(puzzle.kind).toBe("grid");
  if (puzzle.kind !== "grid") throw new Error("Expected generated Sudoku to be a grid puzzle.");
  return puzzle.cells.filter((cell) => cell.locked).length;
};

const expectStandardUnits = (solution: string[]) => {
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
};

describe("generateSudoku", () => {
  it("generates classic Sudoku without a variant override", () => {
    const puzzle = generateSudoku({ puzzleId: "sudoku", seed: "classic-seed", width: 9, height: 9, difficulty: "Medium" });

    expect(puzzle.kind).toBe("grid");
    if (puzzle.kind !== "grid") throw new Error("Expected generated Sudoku to be a grid puzzle.");

    expect(puzzle.sudokuVariation).toBe("classic");
    expect(puzzle.title).toBe("Sudoku");
    expect(puzzle.answerKey).toHaveLength(81);
  });

  it("uses fewer givens for Diagonal Sudoku difficulty targets", () => {
    const classicPuzzle = generateSudoku({ puzzleId: "sudoku", seed: "shared-seed", width: 9, height: 9, difficulty: "Medium" });
    const diagonalPuzzle = generateSudoku({ puzzleId: "sudoku", seed: "shared-seed", width: 9, height: 9, difficulty: "Medium", sudokuVariation: "diagonal" });

    expect(countGivens(diagonalPuzzle)).toBeLessThanOrEqual(countGivens(classicPuzzle));
  });

  it("generates diagonal Sudoku with valid diagonal units", () => {
    const puzzle = generateSudoku({ puzzleId: "sudoku", seed: "diagonal-seed", width: 9, height: 9, difficulty: "Medium", sudokuVariation: "diagonal" });

    expect(puzzle.kind).toBe("grid");
    if (puzzle.kind !== "grid") throw new Error("Expected generated Sudoku to be a grid puzzle.");

    const solution = puzzle.answerKey ?? [];

    expect(puzzle.sudokuVariation).toBe("diagonal");
    expect(puzzle.title).toBe("Diagonal Sudoku");
    expect(solution).toHaveLength(81);

    expectStandardUnits(solution);

    expectUnit(Array.from({ length: 9 }, (_, index) => solution[index * 9 + index] ?? ""));
    expectUnit(Array.from({ length: 9 }, (_, index) => solution[index * 9 + (8 - index)] ?? ""));
  });

  it("generates Zero Killer Sudoku as sparse killer cages over normal Sudoku digits", () => {
    const puzzle = generateSudoku({ puzzleId: "sudoku", seed: "zero-killer-seed", width: 9, height: 9, difficulty: "Medium", sudokuVariation: "zero-killer" });

    expect(puzzle.kind).toBe("grid");
    if (puzzle.kind !== "grid") throw new Error("Expected generated Sudoku to be a grid puzzle.");

    const solution = puzzle.answerKey ?? [];
    const cages = puzzle.cages ?? [];
    const cagedCellCount = new Set(cages.flatMap((cage) => cage.cells.map((cell) => `${cell.row}-${cell.column}`))).size;

    expect(puzzle.sudokuVariation).toBe("zero-killer");
    expect(puzzle.title).toBe("Zero Killer Sudoku");
    expect(solution).toHaveLength(81);
    expectStandardUnits(solution);
    expect(puzzle.cells.every((cell) => !cell.locked && cell.value === "")).toBe(true);
    expect(cages.length).toBeGreaterThan(0);
    expect(cagedCellCount).toBeLessThan(81);
    expect(sudokuTestHooks.countKillerSolutions(cages)).toBe(1);

    for (const cage of cages) {
      const actualSum = cage.cells.reduce((sum, cell) => sum + Number(solution[cell.row * 9 + cell.column] ?? 0), 0);
      const cageValues = cage.cells.map((cell) => solution[cell.row * 9 + cell.column] ?? "");

      expect(actualSum).toBe(cage.sum);
      expect(new Set(cageValues).size).toBe(cageValues.length);
    }
  });
});
