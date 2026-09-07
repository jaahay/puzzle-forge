import { describe, expect, it } from "vitest";
import {
  getDailyPuzzleLabel,
  getDailyPuzzleSeed,
  getDailyPuzzleSeedForProfile,
} from "./daily";

const sampleDate = new Date(2026, 7, 29, 12, 0, 0);

describe("daily puzzle identity", () => {
  it("keeps the legacy date-scoped seed contract for puzzle families that use it directly", () => {
    expect(getDailyPuzzleSeed("sudoku", sampleDate)).toBe("daily-sudoku-2026-08-29");
    expect(getDailyPuzzleSeed("word-guess", sampleDate)).toBe("daily-word-guess-2026-08-29");
  });

  it("derives an opaque deterministic Sudoku seed from the daily generation profile", () => {
    const profile = {
      width: 9,
      height: 9,
      difficulty: "Hard" as const,
      requireUniqueSolution: true,
      sudokuVariation: "diagonal" as const,
    };

    expect(getDailyPuzzleSeedForProfile("sudoku", "2026-08-29", profile)).toBe("15az0ce1ktqlga");
    expect(getDailyPuzzleSeedForProfile("sudoku", "2026-08-29", profile)).not.toContain("daily");
    expect(getDailyPuzzleSeedForProfile("sudoku", "2026-08-29", profile)).not.toContain("diagonal");
  });

  it("derives an opaque deterministic Nonogram seed from the daily generation profile", () => {
    expect(getDailyPuzzleSeedForProfile("nonogram", "2026-08-29", {
      width: 10,
      height: 6,
      difficulty: "Expert",
      requireUniqueSolution: false,
    })).toBe("027my8z0qt7x3b");
  });

  it("changes the daily seed when a meaningful generation setting changes", () => {
    const baseProfile = {
      width: 9,
      height: 9,
      difficulty: "Medium" as const,
      requireUniqueSolution: true,
      sudokuVariation: "classic" as const,
    };

    expect(getDailyPuzzleSeedForProfile("sudoku", "2026-08-29", baseProfile)).not.toBe(
      getDailyPuzzleSeedForProfile("sudoku", "2026-08-29", { ...baseProfile, difficulty: "Hard" }),
    );
    expect(getDailyPuzzleSeedForProfile("sudoku", "2026-08-29", baseProfile)).not.toBe(
      getDailyPuzzleSeedForProfile("sudoku", "2026-08-29", { ...baseProfile, sudokuVariation: "diagonal" }),
    );
  });

  it("parses only the legacy date-scoped seed format", () => {
    expect(getDailyPuzzleLabel("word-guess", getDailyPuzzleSeed("word-guess", sampleDate))).toBe("2026-08-29");
    expect(getDailyPuzzleLabel("sudoku", "daily-sudoku-2026-08-29-hard-diagonal")).toBeNull();
    expect(getDailyPuzzleLabel("sudoku", "daily-sudoku-2026-08-29-user-seed")).toBeNull();
    expect(getDailyPuzzleLabel("word-guess", "daily-word-guess-2026-08-29-custom")).toBeNull();
  });
});
