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
  for (let row = 0; row < 9; row += 1) expectUnit(solution.slice(row * 9, row * 9 + 9));
  for (let column = 0; column < 9; column += 1) expectUnit(Array.from({ length: 9 }, (_, row) => solution[row * 9 + column] ?? ""));
  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxColumn = 0; boxColumn < 3; boxColumn += 1) {
      expectUnit(Array.from({ length: 9 }, (_, index) => {
        const row = boxRow * 3 + Math.floor(index / 3);
        const column = boxColumn * 3 + (index % 3);
        return solution[row * 9 + column] ?? "";
      }));
    }
  }
};

const expectValidZeroKillerPuzzle = (puzzle: ReturnType<typeof generateSudoku>) => {
  expect(puzzle.kind).toBe("grid");
  if (puzzle.kind !== "grid") throw new Error("Expected generated Sudoku to be a grid puzzle.");
  const solution = puzzle.answerKey ?? [];
  const cages = puzzle.cages ?? [];
  const cagedCellKeys = cages.flatMap((cage) => cage.cells.map((cell) => `${cell.row}-${cell.column}`));

  expect(puzzle.sudokuVariation).toBe("zero-killer");
  expect(puzzle.title).toBe("Zero Killer Sudoku");
  expect(puzzle.uniqueSolution).toBe(true);
  expect(puzzle.id).toContain(`zero-killer-v${sudokuTestHooks.zeroKillerGeneratorVersion}`);
  expect(solution).toHaveLength(81);
  expectStandardUnits(solution);
  expect(puzzle.cells.every((cell) => !cell.locked && cell.value === "")).toBe(true);
  expect(cages.length).toBeGreaterThan(0);
  expect(cages.some((cage) => cage.cells.length > 1)).toBe(true);
  expect(cages.filter((cage) => cage.cells.length === 1).length / cages.length).toBeLessThanOrEqual(0.6);
  expect(Math.max(...cages.map((cage) => cage.cells.length))).toBeLessThanOrEqual(
    sudokuTestHooks.zeroKillerPolicy.maxCageSizes[puzzle.difficulty ?? "Medium"],
  );
  expect(new Set(cagedCellKeys).size).toBe(cagedCellKeys.length);
  expect(cagedCellKeys.length).toBeLessThan(81);
  expect(sudokuTestHooks.hasUniqueKillerSolution(cages, solution)).toBe(true);
  expect(puzzle.notes.every((note) => !note.includes("uniqueness checks"))).toBe(true);

  for (const cage of cages) {
    const cageValues = cage.cells.map((cell) => solution[cell.row * 9 + cell.column] ?? "");
    expect(cage.cells.reduce((sum, cell) => sum + Number(solution[cell.row * 9 + cell.column] ?? 0), 0)).toBe(cage.sum);
    expect(new Set(cageValues).size).toBe(cageValues.length);
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
    expectStandardUnits(solution);
    expectUnit(Array.from({ length: 9 }, (_, index) => solution[index * 9 + index] ?? ""));
    expectUnit(Array.from({ length: 9 }, (_, index) => solution[index * 9 + (8 - index)] ?? ""));
  });

  it("generates deterministic, sparse, uniquely solvable Zero Killer puzzles", () => {
    const first = generateSudoku({ puzzleId: "sudoku", seed: "zero-killer-seed", width: 9, height: 9, difficulty: "Medium", sudokuVariation: "zero-killer" });
    const second = generateSudoku({ puzzleId: "sudoku", seed: "zero-killer-seed", width: 9, height: 9, difficulty: "Medium", sudokuVariation: "zero-killer" });
    expectValidZeroKillerPuzzle(first);
    expect(first.kind).toBe("grid");
    expect(second.kind).toBe("grid");
    if (first.kind !== "grid" || second.kind !== "grid") throw new Error("Expected generated Sudoku to be a grid puzzle.");
    expect(second.id).toBe(first.id);
    expect(second.cages).toEqual(first.cages);
    expect(second.answerKey).toEqual(first.answerKey);
    expect(second.checksum).toBe(first.checksum);
  });

  it("versions the Zero Killer generation policy", () => {
    expect(sudokuTestHooks.zeroKillerGeneratorVersion).toBe(1);
    expect(sudokuTestHooks.zeroKillerPolicy.uniquenessNodeLimit).toBeGreaterThan(0);
  });

  it("rejects cage definitions that do not match the target solution", () => {
    const puzzle = generateSudoku({ puzzleId: "sudoku", seed: "zero-killer-invalid-cage", width: 9, height: 9, difficulty: "Medium", sudokuVariation: "zero-killer" });
    expect(puzzle.kind).toBe("grid");
    if (puzzle.kind !== "grid") throw new Error("Expected generated Sudoku to be a grid puzzle.");
    const cages = (puzzle.cages ?? []).map((cage, index) => index === 0 ? { ...cage, sum: cage.sum - 1 } : cage);
    expect(sudokuTestHooks.hasUniqueKillerSolution(cages, puzzle.answerKey ?? [])).toBe(false);
  });

  it("keeps the bounded runtime generator robust across difficulties and seeds", () => {
    for (const difficulty of ["Easy", "Medium", "Hard", "Expert"] as const) {
      for (let index = 0; index < 3; index += 1) {
        const puzzle = generateSudoku({ puzzleId: "sudoku", seed: `zero-killer-${difficulty}-${index}`, width: 9, height: 9, difficulty, sudokuVariation: "zero-killer" });
        expectValidZeroKillerPuzzle(puzzle);
      }
    }
  }, 20_000);
});
