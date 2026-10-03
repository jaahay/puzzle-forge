import { describe, expect, it } from "vitest";
import type { PuzzleCell } from "../catalog/types";
import {
  getNumericGridArrowDelta,
  getNumericGridArrowTarget,
  getNumericGridDigits,
  isNumericGridClearKey,
} from "./NumericGridInput";

const cell = (row: number, column: number, tone: PuzzleCell["tone"] = "empty") =>
  ({
    row,
    column,
    value: "",
    locked: false,
    tone,
  }) satisfies PuzzleCell;

describe("NumericGridInput keyboard helpers", () => {
  it("maps each arrow key to one orthogonal cell movement", () => {
    expect(getNumericGridArrowDelta("ArrowUp")).toEqual({ row: -1, column: 0 });
    expect(getNumericGridArrowDelta("ArrowRight")).toEqual({ row: 0, column: 1 });
    expect(getNumericGridArrowDelta("ArrowDown")).toEqual({ row: 1, column: 0 });
    expect(getNumericGridArrowDelta("ArrowLeft")).toEqual({ row: 0, column: -1 });
  });

  it("does not treat unrelated keys as movement", () => {
    expect(getNumericGridArrowDelta("Home")).toBeNull();
    expect(getNumericGridArrowDelta("9")).toBeNull();
  });

  it("finds the adjacent enabled cell and halts at board edges", () => {
    const cells = [cell(0, 0), cell(0, 1), cell(1, 0), cell(1, 1, "disabled")];

    expect(getNumericGridArrowTarget(cells, cells[0], "ArrowRight")).toBe(cells[1]);
    expect(getNumericGridArrowTarget(cells, cells[0], "ArrowDown")).toBe(cells[2]);
    expect(getNumericGridArrowTarget(cells, cells[0], "ArrowUp")).toBeUndefined();
    expect(getNumericGridArrowTarget(cells, cells[2], "ArrowDown")).toBeUndefined();
    expect(getNumericGridArrowTarget(cells, cells[1], "ArrowDown")).toBeUndefined();
  });

  it("preserves numeric entry and clear-key helpers", () => {
    expect(getNumericGridDigits(5)).toEqual(["1", "2", "3", "4", "5"]);
    expect(isNumericGridClearKey("Backspace")).toBe(true);
    expect(isNumericGridClearKey("Delete")).toBe(true);
    expect(isNumericGridClearKey("0")).toBe(true);
    expect(isNumericGridClearKey("1")).toBe(false);
  });
});
