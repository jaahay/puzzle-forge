import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { supportsAutomaticGridCompletion, supportsGridActionHistory, usesTransientGridValidation } from "./useGridController";

describe("grid controller history policy", () => {
  it("enables shared action history for Sudoku, Nonogram, Futoshiki, and Word Guess editing", () => {
    expect(supportsGridActionHistory("sudoku")).toBe(true);
    expect(supportsGridActionHistory("nonogram")).toBe(true);
    expect(supportsGridActionHistory("futoshiki")).toBe(true);
    expect(supportsGridActionHistory("word-guess")).toBe(true);
  });

  it("clears both Undo and Redo on Reset for every grid type", () => {
    const source = readFileSync(new URL("./useGridController.ts", import.meta.url), "utf8");
    const reset = source.slice(source.indexOf("const resetCurrentGrid = ("), source.indexOf("const undoGridAction = ("));
    expect(reset).toContain("clearGridHistory();");
    expect(reset).not.toContain("recordGridHistoryEntry(");
    expect(reset).not.toContain("supportsReversibleGridReset");
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
