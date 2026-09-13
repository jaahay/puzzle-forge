import { describe, expect, it } from "vitest";
import type { GeneratedPuzzle } from "../catalog/types";
import { getPuzzleImageAsset } from "../games/imageAssets";
import { getDailyPuzzleSeedForProfile } from "../games/shared/daily";
import { generateSlidingPuzzle } from "../games/slidingPuzzle/generate";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { defaultSudokuVariation } from "../games/sudoku/variation";
import { generateTileSwap } from "../games/tileSwap/generate";
import {
  generatedPuzzleMatchesIdentity,
  type GenerationRuntimeSettings,
} from "./generationIdentity";
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

const currentImageAsset = getPuzzleImageAsset("great-wave", "tile-swap");

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
  asset: currentImageAsset,
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
      provenance: undefined,
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

  it("keeps Nonogram Today generation relative to the selected settings", () => {
    const provenance = { source: "daily" as const, dateStamp: "2026-09-03" };
    const identity = resolveGenerationIdentity({
      puzzleId: "nonogram",
      currentPuzzle: null,
      runtimeSettings,
      settings: {
        provenance,
        width: 12,
        height: 5,
        difficulty: "Expert",
        requireUniqueSolution: false,
      },
      makeSeed: () => "fallback",
    });

    expect(identity).toMatchObject({
      seed: getDailyPuzzleSeedForProfile("nonogram", provenance.dateStamp, {
        width: 12,
        height: 5,
        difficulty: "Expert",
        requireUniqueSolution: false,
        sudokuVariation: defaultSudokuVariation,
      }),
      width: 12,
      height: 5,
      difficulty: "Expert",
      requireUniqueSolution: false,
      provenance,
    });
  });

  it("keeps Sudoku Today generation relative to both difficulty and ruleset", () => {
    const provenance = { source: "daily" as const, dateStamp: "2026-09-03" };
    const identity = resolveGenerationIdentity({
      puzzleId: "sudoku",
      currentPuzzle: null,
      runtimeSettings,
      settings: {
        provenance,
        difficulty: "Expert",
        sudokuVariation: "diagonal",
      },
      makeSeed: () => "fallback",
    });

    expect(identity).toMatchObject({
      seed: getDailyPuzzleSeedForProfile("sudoku", provenance.dateStamp, {
        width: 9,
        height: 9,
        difficulty: "Expert",
        requireUniqueSolution: true,
        sudokuVariation: "diagonal",
      }),
      width: 9,
      height: 9,
      difficulty: "Expert",
      requireUniqueSolution: true,
      sudokuVariation: "diagonal",
      provenance,
    });
  });

  it("preserves an explicit seed when restoring a daily resource identity", () => {
    const provenance = { source: "daily" as const, dateStamp: "2026-09-03" };
    const identity = resolveGenerationIdentity({
      puzzleId: "sudoku",
      currentPuzzle: null,
      runtimeSettings,
      settings: {
        seed: "encoded-daily-seed",
        provenance,
        difficulty: "Expert",
        sudokuVariation: "diagonal",
      },
      makeSeed: () => "fallback",
    });

    expect(identity.seed).toBe("encoded-daily-seed");
    expect(identity.provenance).toEqual(provenance);
  });

  it("does not infer daily provenance from a seed that merely looks daily", () => {
    const seed = "daily-sudoku-2026-09-03-hard-diagonal";
    const identity = resolveGenerationIdentity({
      puzzleId: "sudoku",
      currentPuzzle: null,
      runtimeSettings,
      settings: {
        seed,
        difficulty: "Medium",
        sudokuVariation: "zero-killer",
      },
      makeSeed: () => "fallback",
    });

    expect(identity.seed).toBe(seed);
    expect(identity.provenance).toBeUndefined();
  });

  it("uses the current Solitaire variation when no prospective variation is supplied", () => {
    expect(resolveGenerationIdentity({
      puzzleId: "klondike-solitaire",
      currentPuzzle: cardPuzzle,
      runtimeSettings,
      makeSeed: () => "fallback",
    }).solitaireVariation.drawMode).toBe("draw-3");
  });

  it("resolves implicit default artwork before Tile Swap and Sliding Puzzle generation", () => {
    for (const puzzleId of ["tile-swap", "sliding-puzzle"] as const) {
      const identity = resolveGenerationIdentity({
        puzzleId,
        currentPuzzle: null,
        runtimeSettings: { ...runtimeSettings, width: 4, height: 4 },
        settings: { seed: "default-artwork", width: 4, height: 4 },
        makeSeed: () => "fallback",
      });
      const expectedImageId = getPuzzleImageAsset(undefined, puzzleId).id;
      const generated = puzzleId === "tile-swap"
        ? generateTileSwap({
            puzzleId,
            seed: identity.seed,
            width: identity.width,
            height: identity.height,
            imageId: identity.imageId,
          })
        : generateSlidingPuzzle({
            puzzleId,
            seed: identity.seed,
            width: identity.width,
            height: identity.height,
            imageId: identity.imageId,
          });

      expect(identity.imageId).toBe(expectedImageId);
      expect(generated.asset.id).toBe(expectedImageId);
      expect(generatedPuzzleMatchesIdentity(generated, identity)).toBe(true);
    }
  });

  it("keeps current artwork unless another image is explicitly requested", () => {
    const replacementImageId = getPuzzleImageAsset("cypresses", "tile-swap").id;
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
      settings: { imageId: replacementImageId },
      makeSeed: () => "fallback",
    });

    expect(current.imageId).toBe(currentImageAsset.id);
    expect(replacement.imageId).toBe(replacementImageId);
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
