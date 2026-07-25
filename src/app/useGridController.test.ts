import { describe, expect, it } from "vitest";
import type { PuzzleCell } from "../catalog/types";
import { clearGridValidationTone, getGridEntryTone } from "./useGridController";

const makeCell = (tone: PuzzleCell["tone"], locked = false): PuzzleCell => ({
  row: 0,
  column: 0,
  value: "3",
  locked,
  tone,
  ariaLabel: "3 cell at row 1, column 1",
});

describe("Futoshiki grid entry tones", () => {
  it("keeps ordinary player entries visually neutral", () => {
    expect(getGridEntryTone("futoshiki", "3")).toBe("empty");
    expect(getGridEntryTone("futoshiki", "")).toBe("empty");
  });

  it("clears correct and incorrect validation tones after an edit", () => {
    expect(clearGridValidationTone("futoshiki", makeCell("answer")).tone).toBe("empty");
    expect(clearGridValidationTone("futoshiki", makeCell("hint")).tone).toBe("empty");
  });

  it("preserves locked givens while clearing validation", () => {
    expect(clearGridValidationTone("futoshiki", makeCell("answer", true)).tone).toBe("answer");
  });
});
