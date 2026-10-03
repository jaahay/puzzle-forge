import { describe, expect, it } from "vitest";
import { supportsAutomaticGridCompletion, supportsGridActionHistory, supportsReversibleGridReset, usesTransientGridValidation } from "./useGridController";

describe("grid controller history policy", () => {
  it("enables shared action history for Sudoku, Nonogram, Futoshiki, and Word Guess editing", () => {
    expect(supportsGridActionHistory("sudoku")).toBe(true);
    expect(supportsGridActionHistory("nonogram")).toBe(true);
    expect(supportsGridActionHistory("futoshiki")).toBe(true);
    expect(supportsGridActionHistory("word-guess")).toBe(true);
  });

  it("keeps Word Guess Reset outside reversible history", () => {
    expect(supportsReversibleGridReset("sudoku")).toBe(true);
    expect(supportsReversibleGridReset("nonogram")).toBe(true);
    expect(supportsReversibleGridReset("futoshiki")).toBe(true);
    expect(supportsReversibleGridReset("word-guess")).toBe(false);
  });
});

describe("grid controller terminal policy", () => {
  it("auto-completes only puzzle families with authoritative board completion", () => {
    expect(supportsAutomaticGridCompletion("sudoku")).toBe(true);
    expect(supportsAutomaticGridCompletion("nonogram")).toBe(true);
    expect(supportsAutomaticGridCompletion("futoshiki")).toBe(true);
    expect(supportsAutomaticGridCompletion("word-guess")).toBe(false);
  });

  it("keeps explicit Check decoration transient for Sudoku, Nonogram, and Futoshiki", () => {
    expect(usesTransientGridValidation("sudoku")).toBe(true);
    expect(usesTransientGridValidation("nonogram")).toBe(true);
    expect(usesTransientGridValidation("futoshiki")).toBe(true);
    expect(usesTransientGridValidation("word-guess")).toBe(false);
  });
});
