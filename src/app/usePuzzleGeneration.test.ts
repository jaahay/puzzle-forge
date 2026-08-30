import { describe, expect, it } from "vitest";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { makeInitialPuzzleGenerationOptions, shouldAcceptGenerationResponse } from "./usePuzzleGeneration";

describe("generation response ownership", () => {
  it("accepts only the response for the active request", () => {
    expect(shouldAcceptGenerationResponse("request-2", "request-2")).toBe(true);
    expect(shouldAcceptGenerationResponse("request-2", "request-1")).toBe(false);
  });

  it("rejects every late response after the active request is cancelled", () => {
    expect(shouldAcceptGenerationResponse(null, "request-2")).toBe(false);
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
});
