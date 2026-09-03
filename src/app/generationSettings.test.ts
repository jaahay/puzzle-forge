import { describe, expect, it } from "vitest";
import type { GeneratedPuzzle } from "../catalog/types";
import { getDailyPuzzleSeed } from "../games/shared/daily";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { defaultSudokuVariation } from "../games/sudoku/variation";
import type { GenerationRuntimeSettings } from "./generationIdentity";
import { resolveGenerationIdentity } from "./generationSettings";

const runtimeSettings: GenerationRuntimeSettings = {
  seed: "runtime-seed",
  width: 9,
  height: 9,
  difficulty: "Medium",
  requireUniqueSolution: true,
  sudokuVariation: defaultSudokuVariation,
  solitaireVariation: defaultSolitaireVariation,
};

const cardPuzzle: GeneratedPuzzle = {
  id: "cards-current",
  puzzleId: "klondike-solitaire",
  title: "Klondike Solitaire",
  seed: "current-deal",
  width: 7,
  height: 7,
  checksum: "checksum",
  createdAt: "2026-08-30T00:00:00.000Z",
  notes: [],
  kind: "cards",
  stacks: [],
  solitaireVariation: { ...defaultSolitaireVariation, drawMode: "draw-3" },
};

const imagePuzzle: GeneratedPuzzle = {
  id: "tile-current",
  puzzleId: "tile-swap",
  title: "Tile Swap",
  seed: "image-seed",
  width: 4,
  height: 4,
  checksum: "checksum",
  createdAt: "2026-08-30T00:00:00.000Z",
  notes: [],
  kind: "tiles",
  tiles: [],
  asset: {
    kind: "image",
    id: "current-art",
    title: "Current art",
    alt: "Current art",
    orientation: "square",
    intrinsicWidth: 100,
    intrinsicHeight: 100,
    files: {
      puzzle: "/puzzle.jpg",
      preview: "/preview.jpg",
      thumbnail: "/thumbnail.jpg",
    },
    credit: { text: "Test", sourceName: "Test" },
  },
};

describe("resolveGenerationIdentity", () => {
  it("gives explicit prospective settings precedence over current and runtime values", () => {
    expect(resolveGenerationIdentity({
      puzzleId: "nonogram",
      currentPuzzle: null,
      runtimeSettings,
      settings: {
        seed: "next-seed",
        width: 10,
        height: 11,
        difficulty: "Hard",
        requireUniqueSolution: false,
      },
      makeSeed: () => "fallback",
    })).toMatchObject({
      puzzleId: "nonogram",
      seed: "next-seed",
      width: 10,
      height: 11,
      difficulty: "Hard",
      requireUniqueSolution: false,
    });
  });

  it("normalizes dimensions into the selected puzzle's supported range", () => {
    expect(resolveGenerationIdentity({
      puzzleId: "nonogram",
      currentPuzzle: null,
      runtimeSettings,
      settings: { width: 99, height: 1 },
      makeSeed: () => "fallback",
    })).toMatchObject({ width: 12, height: 5 });

    expect(resolveGenerationIdentity({
      puzzleId: "sudoku",
      currentPuzzle: null,
      runtimeSettings,
      settings: { width: 8, height: 12 },
      makeSeed: () => "fallback",
    })).toMatchObject({ width: 9, height: 9 });
  });

  it("resolves a Nonogram daily seed to its canonical profile", () => {
    expect(resolveGenerationIdentity({
      puzzleId: "nonogram",
      currentPuzzle: null,
      runtimeSettings,
      settings: {
        seed: getDailyPuzzleSeed("nonogram", new Date(2026, 8, 3)),
        width: 12,
        height: 5,
        difficulty: "Expert",
        requireUniqueSolution: false,
      },
      makeSeed: () => "fallback",
    })).toMatchObject({
      width: 8,
      height: 8,
      difficulty: "Medium",
      requireUniqueSolution: true,
    });
  });

  it("keeps the selected Sudoku ruleset as the daily track while fixing daily difficulty", () => {
    expect(resolveGenerationIdentity({
      puzzleId: "sudoku",
      currentPuzzle: null,
      runtimeSettings,
      settings: {
        seed: getDailyPuzzleSeed("sudoku", new Date(2026, 8, 3)),
        difficulty: "Expert",
        sudokuVariation: "diagonal",
      },
      makeSeed: () => "fallback",
    })).toMatchObject({
      width: 9,
      height: 9,
      difficulty: "Medium",
      requireUniqueSolution: true,
      sudokuVariation: "diagonal",
    });
  });

  it("uses the current Solitaire variation when no prospective variation is supplied", () => {
    expect(resolveGenerationIdentity({
      puzzleId: "klondike-solitaire",
      currentPuzzle: cardPuzzle,
      runtimeSettings,
      makeSeed: () => "fallback",
    }).solitaireVariation.drawMode).toBe("draw-3");
  });

  it("keeps current artwork unless another image is explicitly requested", () => {
    const current = resolveGenerationIdentity({
      puzzleId: "tile-swap",
      currentPuzzle: imagePuzzle,
      runtimeSettings,
      makeSeed: () => "fallback",
    });
    const replacement = resolveGenerationIdentity({
      puzzleId: "tile-swap",
      currentPuzzle: imagePuzzle,
      runtimeSettings,
      settings: { imageId: "new-art" },
      makeSeed: () => "fallback",
    });

    expect(current.imageId).toBe("current-art");
    expect(replacement.imageId).toBe("new-art");
  });

  it("treats an explicitly blank seed as a request to reuse the current puzzle seed", () => {
    expect(resolveGenerationIdentity({
      puzzleId: "klondike-solitaire",
      currentPuzzle: cardPuzzle,
      runtimeSettings,
      settings: { seed: "   " },
      makeSeed: () => "fallback",
    }).seed).toBe("current-deal");
  });
});
