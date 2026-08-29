import { describe, expect, it } from "vitest";
import { getPuzzleDefinition } from "../../catalog/puzzleCatalog";
import { getPuzzleImageAssetsFor } from "../imageAssets";
import { generateSudoku } from "../sudoku/generate";
import {
  getCanonicalDailyGenerationSettings,
  getCanonicalDailyPuzzleLabel,
  getDailyPuzzleLabel,
  getDailyPuzzleSeed,
} from "./daily";

const sampleDate = new Date(2026, 7, 29, 12, 0, 0);

describe("canonical daily puzzle identity", () => {
  it("builds one canonical configuration for a puzzle type", () => {
    const sudoku = getCanonicalDailyGenerationSettings("sudoku", sampleDate);

    expect(sudoku).toMatchObject({
      seed: "daily-sudoku-2026-08-29",
      width: 9,
      height: 9,
      difficulty: "Medium",
      requireUniqueSolution: true,
      sudokuVariation: "classic",
    });
  });

  it("uses canonical dimensions and artwork for image-backed daily puzzles", () => {
    const jigsaw = getCanonicalDailyGenerationSettings("jigsaw", sampleDate);
    const definition = getPuzzleDefinition("jigsaw");
    const firstArtwork = getPuzzleImageAssetsFor("jigsaw")[0];

    expect(jigsaw.width).toBe(definition.defaultWidth);
    expect(jigsaw.height).toBe(definition.defaultHeight);
    expect(jigsaw.imageId).toBe(firstArtwork?.id);
  });

  it("labels only the canonical configuration as the daily puzzle", () => {
    const canonicalSettings = getCanonicalDailyGenerationSettings("sudoku", sampleDate);
    const canonical = generateSudoku({ puzzleId: "sudoku", ...canonicalSettings });
    const hard = generateSudoku({ puzzleId: "sudoku", ...canonicalSettings, difficulty: "Hard" });
    const diagonal = generateSudoku({ puzzleId: "sudoku", ...canonicalSettings, sudokuVariation: "diagonal" });

    expect(getCanonicalDailyPuzzleLabel(canonical)).toBe("2026-08-29");
    expect(getCanonicalDailyPuzzleLabel(hard)).toBeNull();
    expect(getCanonicalDailyPuzzleLabel(diagonal)).toBeNull();
  });

  it("still parses daily seed provenance independently of canonical configuration", () => {
    const seed = getDailyPuzzleSeed("sudoku", sampleDate);

    expect(getDailyPuzzleLabel("sudoku", seed)).toBe("2026-08-29");
    expect(getDailyPuzzleLabel("nonogram", seed)).toBeNull();
  });
});
