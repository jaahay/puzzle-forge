import { describe, expect, it } from "vitest";
import type { GeneratedPuzzle } from "../catalog/types";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { buildNextPuzzleDraft } from "./useNextPuzzleDrafts";
import type { GenerationRuntimeSettings } from "./generationIdentity";

const runtimeSettings: GenerationRuntimeSettings = {
  seed: "runtime-seed",
  width: 6,
  height: 7,
  difficulty: "Hard",
  requireUniqueSolution: false,
  sudokuVariation: "diagonal",
  solitaireVariation: { ...defaultSolitaireVariation, drawMode: "draw-3" },
};

const sudokuPuzzle: GeneratedPuzzle = {
  id: "sudoku-current",
  puzzleId: "sudoku",
  title: "Sudoku",
  seed: "current-seed",
  width: 9,
  height: 9,
  checksum: "checksum",
  createdAt: "2026-08-29T00:00:00.000Z",
  difficulty: "Medium",
  uniqueSolution: true,
  sudokuVariation: "zero-killer",
  notes: [],
  kind: "grid",
  cells: [],
};

describe("buildNextPuzzleDraft", () => {
  it("uses the current generated puzzle as the initial draft when it matches the selected type", () => {
    expect(buildNextPuzzleDraft({
      puzzleId: "sudoku",
      selectedPuzzleId: "sudoku",
      currentPuzzle: sudokuPuzzle,
      runtimeSettings,
    })).toMatchObject({
      width: 9,
      height: 9,
      difficulty: "Medium",
      requireUniqueSolution: true,
      sudokuVariation: "zero-killer",
    });
  });

  it("uses current runtime generation settings only for the selected puzzle type", () => {
    const selectedDraft = buildNextPuzzleDraft({
      puzzleId: "futoshiki",
      selectedPuzzleId: "futoshiki",
      currentPuzzle: null,
      runtimeSettings,
    });
    expect(selectedDraft).toMatchObject({
      width: 6,
      height: 7,
      difficulty: "Hard",
      requireUniqueSolution: false,
    });

    const otherDraft = buildNextPuzzleDraft({
      puzzleId: "futoshiki",
      selectedPuzzleId: "sudoku",
      currentPuzzle: sudokuPuzzle,
      runtimeSettings,
    });
    expect(otherDraft.width).not.toBe(runtimeSettings.width);
    expect(otherDraft.height).not.toBe(runtimeSettings.height);
    expect(otherDraft.difficulty).toBe("Medium");
  });
});
