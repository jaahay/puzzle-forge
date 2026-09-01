import { describe, expect, it } from "vitest";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import {
  makeInitialPuzzleGenerationOptions,
  shouldAcceptGenerationResponse,
  shouldRecoverMissingPuzzleSurface,
} from "./usePuzzleGeneration";

describe("generation response ownership", () => {
  it("accepts only the response for the active request", () => {
    expect(shouldAcceptGenerationResponse("request-2", "request-2")).toBe(true);
    expect(shouldAcceptGenerationResponse("request-2", "request-1")).toBe(false);
  });

  it("rejects every late response after the active request is cancelled", () => {
    expect(shouldAcceptGenerationResponse(null, "request-2")).toBe(false);
  });

  it("does not start fallback recovery while a restore generation request is already active", () => {
    const startupSurface = {
      hasSelectedPuzzle: true,
      isHomeSelected: false,
      isGenerating: false,
      hasPuzzle: false,
      selectedPuzzleIsGeneratable: true,
    };

    expect(shouldRecoverMissingPuzzleSurface(startupSurface)).toBe(true);
    expect(shouldRecoverMissingPuzzleSurface({
      ...startupSurface,
      hasActiveGenerationRequest: true,
    })).toBe(false);
  });
});

describe("initial puzzle generation", () => {
  it("uses puzzle defaults instead of inheriting settings from another puzzle type", () => {
    expect(makeInitialPuzzleGenerationOptions({ puzzleId: "nonogram", makeSeed: () => "fresh" })).toEqual({
      puzzleId: "nonogram",
      seed: "fresh",
      width: 8,
      height: 8,
      difficulty: "Medium",
      requireUniqueSolution: true,
      sudokuVariation: undefined,
      solitaireVariation: undefined,
      imageId: undefined,
    });
  });

  it("applies type-specific defaults only to the type that owns them", () => {
    expect(makeInitialPuzzleGenerationOptions({ puzzleId: "sudoku", makeSeed: () => "sudoku" })).toMatchObject({
      difficulty: "Medium",
      requireUniqueSolution: true,
      sudokuVariation: "classic",
      solitaireVariation: undefined,
    });
    expect(makeInitialPuzzleGenerationOptions({ puzzleId: "klondike-solitaire", makeSeed: () => "cards" })).toMatchObject({
      difficulty: "Medium",
      requireUniqueSolution: true,
      sudokuVariation: undefined,
      solitaireVariation: defaultSolitaireVariation,
    });
  });

  it("uses remembered per-puzzle preferences without reusing the old seed", () => {
    const rememberedDraft = {
      width: 9,
      height: 9,
      difficulty: "Hard" as const,
      requireUniqueSolution: true,
      sudokuVariation: "zero-killer" as const,
      solitaireVariation: defaultSolitaireVariation,
    };

    expect(makeInitialPuzzleGenerationOptions({
      puzzleId: "sudoku",
      makeSeed: () => "fresh-zero-killer",
      rememberedDraft,
    })).toMatchObject({
      seed: "fresh-zero-killer",
      difficulty: "Hard",
      sudokuVariation: "zero-killer",
    });
  });

  it("restores image-backed dimensions and artwork preferences with a fresh seed", () => {
    const rememberedDraft = {
      width: 6,
      height: 5,
      difficulty: "Medium" as const,
      requireUniqueSolution: true,
      sudokuVariation: "classic" as const,
      solitaireVariation: defaultSolitaireVariation,
      imageId: "great-wave",
    };

    expect(makeInitialPuzzleGenerationOptions({
      puzzleId: "jigsaw",
      makeSeed: () => "fresh-jigsaw",
      rememberedDraft,
    })).toMatchObject({
      seed: "fresh-jigsaw",
      width: 6,
      height: 5,
      imageId: "great-wave",
    });
  });

  it("clamps malformed remembered dimensions to supported puzzle bounds", () => {
    const rememberedDraft = {
      width: 100,
      height: -4,
      difficulty: "Medium" as const,
      requireUniqueSolution: true,
      sudokuVariation: "classic" as const,
      solitaireVariation: defaultSolitaireVariation,
    };

    expect(makeInitialPuzzleGenerationOptions({
      puzzleId: "nonogram",
      makeSeed: () => "bounded",
      rememberedDraft,
    })).toMatchObject({ width: 12, height: 5 });
  });
});
