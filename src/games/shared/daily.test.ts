import { describe, expect, it } from "vitest";
import { generateSudoku } from "../sudoku/generate";
import {
  getDailyPuzzleLabel,
  getDailyPuzzleProvenanceLabel,
  getDailyPuzzleSeed,
} from "./daily";

const sampleDate = new Date(2026, 7, 29, 12, 0, 0);

describe("daily puzzle identity", () => {
  it("builds one deterministic seed per puzzle type and local date", () => {
    expect(getDailyPuzzleSeed("sudoku", sampleDate)).toBe("daily-sudoku-2026-08-29");
    expect(getDailyPuzzleSeed("nonogram", sampleDate)).toBe("daily-nonogram-2026-08-29");
  });

  it("treats selected generation settings as independent from daily seed provenance", () => {
    const seed = getDailyPuzzleSeed("sudoku", sampleDate);
    const classic = generateSudoku({
      puzzleId: "sudoku",
      seed,
      width: 9,
      height: 9,
      difficulty: "Medium",
      requireUniqueSolution: true,
      sudokuVariation: "classic",
    });
    const zeroKiller = generateSudoku({
      puzzleId: "sudoku",
      seed,
      width: 9,
      height: 9,
      difficulty: "Hard",
      requireUniqueSolution: true,
      sudokuVariation: "zero-killer",
    });

    expect(getDailyPuzzleProvenanceLabel(classic)).toBe("2026-08-29");
    expect(getDailyPuzzleProvenanceLabel(zeroKiller)).toBe("2026-08-29");
  });

  it("parses daily seed provenance only for the matching puzzle type", () => {
    const seed = getDailyPuzzleSeed("sudoku", sampleDate);

    expect(getDailyPuzzleLabel("sudoku", seed)).toBe("2026-08-29");
    expect(getDailyPuzzleLabel("nonogram", seed)).toBeNull();
  });
});
