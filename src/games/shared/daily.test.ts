import { describe, expect, it } from "vitest";
import {
  getDailyPuzzleLabel,
  getDailyPuzzleProfile,
  getDailyPuzzleSeed,
} from "./daily";

const sampleDate = new Date(2026, 7, 29, 12, 0, 0);

describe("daily puzzle identity", () => {
  it("builds one deterministic seed per puzzle type and local date", () => {
    expect(getDailyPuzzleSeed("sudoku", sampleDate)).toBe("daily-sudoku-2026-08-29");
    expect(getDailyPuzzleSeed("nonogram", sampleDate)).toBe("daily-nonogram-2026-08-29");
  });

  it("defines one canonical Nonogram daily profile", () => {
    expect(getDailyPuzzleProfile("nonogram")).toEqual({
      width: 8,
      height: 8,
      difficulty: "Medium",
      requireUniqueSolution: true,
    });
  });

  it("defines one Medium Sudoku daily track per ruleset", () => {
    expect(getDailyPuzzleProfile("sudoku", "zero-killer")).toEqual({
      width: 9,
      height: 9,
      difficulty: "Medium",
      requireUniqueSolution: true,
      sudokuVariation: "zero-killer",
    });
  });

  it("leaves puzzles without a canonical daily profile settings-relative", () => {
    expect(getDailyPuzzleProfile("word-guess")).toBeNull();
  });

  it("parses daily seed provenance only for the matching puzzle type", () => {
    const seed = getDailyPuzzleSeed("sudoku", sampleDate);

    expect(getDailyPuzzleLabel("sudoku", seed)).toBe("2026-08-29");
    expect(getDailyPuzzleLabel("nonogram", seed)).toBeNull();
  });
});
