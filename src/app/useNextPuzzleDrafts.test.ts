import { describe, expect, it } from "vitest";
import type { GeneratedPuzzle } from "../catalog/types";
import { getPuzzleImageAsset, getPuzzleImageAssetsFor } from "../games/imageAssets";
import { defaultJigsawBoundaryMode } from "../games/jigsaw/boundaryContours";
import { defaultJigsawCutStyle } from "../games/jigsaw/cutStyle";
import { defaultJigsawImageAsset } from "../games/jigsaw/imageAssets";
import { resolveJigsawSizeDimensions } from "../games/jigsaw/size";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import {
  buildNextPuzzleDraft,
  randomizeNextPuzzleArtwork,
} from "./useNextPuzzleDrafts";
import type { GenerationRuntimeSettings } from "./generationIdentity";

const runtimeSettings: GenerationRuntimeSettings = {
  seed: "runtime-seed",
  width: 6,
  height: 7,
  difficulty: "Hard",
  requireUniqueSolution: false,
  sudokuVariation: "diagonal",
  solitaireVariation: { ...defaultSolitaireVariation, drawMode: "draw-3" },
  jigsawCutStyle: defaultJigsawCutStyle,
  jigsawBoundaryMode: defaultJigsawBoundaryMode,
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

  it("materializes explicit Jigsaw size intent when constructing a new draft", () => {
    const small = resolveJigsawSizeDimensions(defaultJigsawImageAsset, "Small");
    const jigsawDraft = buildNextPuzzleDraft({
      puzzleId: "jigsaw",
      selectedPuzzleId: "jigsaw",
      currentPuzzle: null,
      runtimeSettings: {
        ...runtimeSettings,
        width: small.width,
        height: small.height,
      },
    });

    expect(jigsawDraft).toMatchObject({
      width: small.width,
      height: small.height,
      jigsawSizeSelection: "Small",
      jigsawCutStyle: defaultJigsawCutStyle,
      jigsawBoundaryMode: defaultJigsawBoundaryMode,
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


describe("Jigsaw boundary draft intent", () => {
  it("keeps boundary mode independent while changing other Jigsaw draft settings", () => {
    const base = buildNextPuzzleDraft({
      puzzleId: "jigsaw",
      selectedPuzzleId: "jigsaw",
      currentPuzzle: null,
      runtimeSettings: {
        ...runtimeSettings,
        jigsawBoundaryMode: "contoured",
      },
    });

    expect(base.jigsawBoundaryMode).toBe("contoured");
    expect(randomizeNextPuzzleArtwork("jigsaw", base, 0).jigsawBoundaryMode)
      .toBe("contoured");
  });
});

describe("randomizeNextPuzzleArtwork", () => {
  it("keeps non-image puzzle drafts unchanged", () => {
    const draft = buildNextPuzzleDraft({
      puzzleId: "sudoku",
      selectedPuzzleId: "sudoku",
      currentPuzzle: sudokuPuzzle,
      runtimeSettings,
    });

    expect(randomizeNextPuzzleArtwork("sudoku", draft, 0)).toBe(draft);
  });

  it("excludes the resolved default artwork when the draft omits imageId", () => {
    const defaultAsset = getPuzzleImageAsset(undefined, "tile-swap");
    const draft = {
      width: 5,
      height: 4,
      difficulty: "Medium" as const,
      requireUniqueSolution: true,
      sudokuVariation: "classic" as const,
      solitaireVariation: defaultSolitaireVariation,
    };

    const randomized = randomizeNextPuzzleArtwork("tile-swap", draft, 0);

    expect(randomized.imageId).not.toBe(defaultAsset.id);
  });

  it("changes only artwork for image-tile puzzles", () => {
    const [currentAsset] = getPuzzleImageAssetsFor("tile-swap");
    const draft = {
      width: 5,
      height: 4,
      difficulty: "Hard" as const,
      requireUniqueSolution: false,
      sudokuVariation: "classic" as const,
      solitaireVariation: defaultSolitaireVariation,
      imageId: currentAsset.id,
    };

    const randomized = randomizeNextPuzzleArtwork("tile-swap", draft, 0);

    expect(randomized).toMatchObject({
      width: 5,
      height: 4,
      difficulty: "Hard",
      requireUniqueSolution: false,
    });
    expect(randomized.imageId).not.toBe(currentAsset.id);
  });

  it("re-adapts Jigsaw preset dimensions to the randomized artwork", () => {
    const [currentAsset] = getPuzzleImageAssetsFor("jigsaw");
    const currentSize = resolveJigsawSizeDimensions(currentAsset, "Small");
    const draft = {
      width: currentSize.width,
      height: currentSize.height,
      difficulty: "Medium" as const,
      requireUniqueSolution: true,
      sudokuVariation: "classic" as const,
      solitaireVariation: defaultSolitaireVariation,
      imageId: currentAsset.id,
      jigsawSizeSelection: "Small" as const,
      jigsawCutStyle: defaultJigsawCutStyle,
      jigsawBoundaryMode: defaultJigsawBoundaryMode,
    };

    const randomized = randomizeNextPuzzleArtwork("jigsaw", draft, 0);
    const randomizedAsset = getPuzzleImageAsset(randomized.imageId, "jigsaw");
    const expectedSize = resolveJigsawSizeDimensions(randomizedAsset, "Small");

    expect(randomized.imageId).not.toBe(currentAsset.id);
    expect(randomized).toMatchObject({
      width: expectedSize.width,
      height: expectedSize.height,
      jigsawSizeSelection: "Small",
      jigsawCutStyle: defaultJigsawCutStyle,
      jigsawBoundaryMode: defaultJigsawBoundaryMode,
    });
  });

  it("keeps explicit Jigsaw Custom dimensions while randomizing artwork", () => {
    const [currentAsset] = getPuzzleImageAssetsFor("jigsaw");
    const draft = {
      width: 11,
      height: 7,
      difficulty: "Medium" as const,
      requireUniqueSolution: true,
      sudokuVariation: "classic" as const,
      solitaireVariation: defaultSolitaireVariation,
      imageId: currentAsset.id,
      jigsawSizeSelection: "Custom" as const,
      jigsawCutStyle: defaultJigsawCutStyle,
      jigsawBoundaryMode: defaultJigsawBoundaryMode,
    };

    const randomized = randomizeNextPuzzleArtwork("jigsaw", draft, 0);

    expect(randomized.imageId).not.toBe(currentAsset.id);
    expect(randomized.width).toBe(11);
    expect(randomized.height).toBe(7);
  });
});
