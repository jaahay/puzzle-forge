import { describe, expect, it } from "vitest";
import {
  getDailyPuzzleLabel,
  getDailyPuzzleSeed,
  getDailyPuzzleSeedForProfile,
} from "./daily";

const sampleDate = new Date(2026, 7, 29, 12, 0, 0);

describe("daily puzzle identity", () => {
  it("builds one deterministic base seed per puzzle type and local date", () => {
    expect(getDailyPuzzleSeed("sudoku", sampleDate)).toBe("daily-sudoku-2026-08-29");
    expect(getDailyPuzzleSeed("nonogram", sampleDate)).toBe("daily-nonogram-2026-08-29");
  });

  it("scopes Sudoku daily identity to meaningful generation settings", () => {
    expect(getDailyPuzzleSeedForProfile("sudoku", "2026-08-29", {
      width: 9,
      height: 9,
      difficulty: "Hard",
      requireUniqueSolution: true,
      sudokuVariation: "diagonal",
    })).toBe("daily-sudoku-2026-08-29-hard-diagonal");
  });

  it("scopes Nonogram daily identity to meaningful generation settings", () => {
    expect(getDailyPuzzleSeedForProfile("nonogram", "2026-08-29", {
      width: 10,
      height: 6,
      difficulty: "Expert",
      requireUniqueSolution: false,
    })).toBe("daily-nonogram-2026-08-29-expert-10x6-unchecked");
  });

  it("keeps unsupported puzzle types on their date-scoped daily seed", () => {
    expect(getDailyPuzzleSeedForProfile("word-guess", "2026-08-29", {
      width: 5,
      height: 6,
      difficulty: "Medium",
      requireUniqueSolution: true,
    })).toBe("daily-word-guess-2026-08-29");
  });

  it("parses daily provenance from both base and valid profile-scoped seeds", () => {
    const baseSeed = getDailyPuzzleSeed("sudoku", sampleDate);
    const sudokuProfileSeed = getDailyPuzzleSeedForProfile("sudoku", "2026-08-29", {
      width: 9,
      height: 9,
      difficulty: "Medium",
      requireUniqueSolution: true,
      sudokuVariation: "zero-killer",
    });
    const nonogramProfileSeed = getDailyPuzzleSeedForProfile("nonogram", "2026-08-29", {
      width: 10,
      height: 6,
      difficulty: "Hard",
      requireUniqueSolution: true,
    });

    expect(getDailyPuzzleLabel("sudoku", baseSeed)).toBe("2026-08-29");
    expect(getDailyPuzzleLabel("sudoku", sudokuProfileSeed)).toBe("2026-08-29");
    expect(getDailyPuzzleLabel("nonogram", nonogramProfileSeed)).toBe("2026-08-29");
    expect(getDailyPuzzleLabel("nonogram", sudokuProfileSeed)).toBeNull();
  });

  it("does not treat arbitrary daily-prefixed custom seeds as daily provenance", () => {
    expect(getDailyPuzzleLabel("sudoku", "daily-sudoku-2026-08-29-user-seed")).toBeNull();
    expect(getDailyPuzzleLabel("nonogram", "daily-nonogram-2026-08-29-medium-large-unique")).toBeNull();
    expect(getDailyPuzzleLabel("word-guess", "daily-word-guess-2026-08-29-custom")).toBeNull();
  });
});
