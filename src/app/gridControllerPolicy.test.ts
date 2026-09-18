import { describe, expect, it } from "vitest";
import { supportsAutomaticGridCompletion, usesTransientGridValidation } from "./useGridController";

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
