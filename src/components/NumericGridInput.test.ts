import { describe, expect, it } from "vitest";
import { getNumericGridArrowDelta, getNumericGridDigits, isNumericGridClearKey } from "./NumericGridInput";

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

  it("preserves numeric entry and clear-key helpers", () => {
    expect(getNumericGridDigits(5)).toEqual(["1", "2", "3", "4", "5"]);
    expect(isNumericGridClearKey("Backspace")).toBe(true);
    expect(isNumericGridClearKey("Delete")).toBe(true);
    expect(isNumericGridClearKey("0")).toBe(true);
    expect(isNumericGridClearKey("1")).toBe(false);
  });
});
