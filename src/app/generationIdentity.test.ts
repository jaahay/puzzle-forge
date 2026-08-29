import { describe, expect, it } from "vitest";
import type { GeneratedPuzzle, PuzzleDifficulty, SolitaireVariation, SudokuVariation } from "../catalog/types";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { defaultSudokuVariation } from "../games/sudoku/variation";
import { generatedPuzzleMatchesIdentity, type GenerationIdentity } from "./generationIdentity";

const baseIdentity = (puzzleId: GenerationIdentity["puzzleId"]): GenerationIdentity => ({
  puzzleId,
  seed: "seed-1",
  width: 9,
  height: 9,
  difficulty: "Medium",
  requireUniqueSolution: true,
  sudokuVariation: defaultSudokuVariation,
  solitaireVariation: defaultSolitaireVariation,
});

const gridPuzzle = (
  puzzleId: "sudoku" | "nonogram" | "futoshiki",
  overrides: Partial<{
    seed: string;
    width: number;
    height: number;
    difficulty: PuzzleDifficulty;
    uniqueSolution: boolean;
    sudokuVariation: SudokuVariation;
  }> = {},
): GeneratedPuzzle => ({
  id: `${puzzleId}-1`,
  puzzleId,
  title: puzzleId,
  seed: overrides.seed ?? "seed-1",
  width: overrides.width ?? 9,
  height: overrides.height ?? 9,
  checksum: "checksum",
  createdAt: "2026-08-29T00:00:00.000Z",
  difficulty: overrides.difficulty ?? "Medium",
  uniqueSolution: overrides.uniqueSolution ?? true,
  sudokuVariation: overrides.sudokuVariation,
  notes: [],
  kind: "grid",
  cells: [],
});

const cardPuzzle = (variation: SolitaireVariation = defaultSolitaireVariation): GeneratedPuzzle => ({
  id: "cards-1",
  puzzleId: "klondike-solitaire",
  title: "Solitaire",
  seed: "seed-1",
  width: 7,
  height: 7,
  checksum: "checksum",
  createdAt: "2026-08-29T00:00:00.000Z",
  notes: [],
  kind: "cards",
  stacks: [],
  solitaireVariation: variation,
});

describe("generated puzzle identity matching", () => {
  it("matches the exact current Sudoku and rejects prospective changes", () => {
    const puzzle = gridPuzzle("sudoku", { sudokuVariation: "diagonal" });
    const identity = { ...baseIdentity("sudoku"), sudokuVariation: "diagonal" as const };

    expect(generatedPuzzleMatchesIdentity(puzzle, identity)).toBe(true);
    expect(generatedPuzzleMatchesIdentity(puzzle, { ...identity, difficulty: "Hard" })).toBe(false);
    expect(generatedPuzzleMatchesIdentity(puzzle, { ...identity, sudokuVariation: "zero-killer" })).toBe(false);
  });

  it("includes Nonogram uniqueness and Futoshiki difficulty in identity", () => {
    const nonogram = gridPuzzle("nonogram");
    expect(generatedPuzzleMatchesIdentity(nonogram, baseIdentity("nonogram"))).toBe(true);
    expect(generatedPuzzleMatchesIdentity(nonogram, { ...baseIdentity("nonogram"), requireUniqueSolution: false })).toBe(false);

    const futoshiki = gridPuzzle("futoshiki");
    expect(generatedPuzzleMatchesIdentity(futoshiki, baseIdentity("futoshiki"))).toBe(true);
    expect(generatedPuzzleMatchesIdentity(futoshiki, { ...baseIdentity("futoshiki"), difficulty: "Hard" })).toBe(false);
  });

  it("compares Solitaire variation semantically", () => {
    const puzzle = cardPuzzle();
    const identity = { ...baseIdentity("klondike-solitaire"), width: 7, height: 7 };

    expect(generatedPuzzleMatchesIdentity(puzzle, identity)).toBe(true);
    expect(generatedPuzzleMatchesIdentity(puzzle, {
      ...identity,
      solitaireVariation: { ...defaultSolitaireVariation, drawMode: "draw-3" },
    })).toBe(false);
  });

  it("includes image identity and dimensions for image-backed puzzles", () => {
    const puzzle = {
      id: "tile-1",
      puzzleId: "tile-swap",
      title: "Tile Swap",
      seed: "seed-1",
      width: 4,
      height: 4,
      checksum: "checksum",
      createdAt: "2026-08-29T00:00:00.000Z",
      notes: [],
      kind: "tiles",
      tiles: [],
      asset: { kind: "image", id: "art-1" },
    } as GeneratedPuzzle;
    const identity = { ...baseIdentity("tile-swap"), width: 4, height: 4, imageId: "art-1" };

    expect(generatedPuzzleMatchesIdentity(puzzle, identity)).toBe(true);
    expect(generatedPuzzleMatchesIdentity(puzzle, { ...identity, imageId: "art-2" })).toBe(false);
    expect(generatedPuzzleMatchesIdentity(puzzle, { ...identity, width: 5 })).toBe(false);
  });
});
