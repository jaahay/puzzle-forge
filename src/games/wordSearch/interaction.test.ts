import { describe, expect, it } from "vitest";
import { chooseWordSearchEndpoint, moveWordSearchFocus, wordSearchCellAt, wordSearchDragEnd } from "./interaction";
import { wordSearchPath } from "./model";

describe("Word Search board interaction", () => {
  const bounds = { left: 40, top: 20, width: 300, height: 300 };
  it("maps visual cell centers and edges without wrapping outside the board", () => {
    expect(wordSearchCellAt(10, bounds, { x: 55, y: 35 })).toBe(0);
    expect(wordSearchCellAt(10, bounds, { x: 339.9, y: 319.9 })).toBe(99);
    expect(wordSearchCellAt(10, bounds, { x: 340, y: 319 })).toBeNull();
    expect(wordSearchCellAt(10, bounds, { x: 39, y: 35 })).toBeNull();
    expect(wordSearchCellAt(10, { ...bounds, width: 0 }, { x: 55, y: 35 })).toBeNull();
  });

  it("projects off-axis and out-of-board drags onto the exact committed ray", () => {
    const start = 22;
    const diagonal = wordSearchDragEnd(10, start, bounds, { x: 239, y: 204 });
    expect(wordSearchPath(10, start, diagonal)).toEqual([22, 33, 44, 55, 66]);
    expect(wordSearchDragEnd(10, start, bounds, { x: 1000, y: 95 })).toBe(29);
    expect(wordSearchDragEnd(10, start, bounds, { x: -500, y: 95 })).toBe(20);
  });

  it("uses one endpoint activation model for tap and keyboard", () => {
    expect(chooseWordSearchEndpoint(10, null, 22)).toEqual({ anchor: 22, selection: null });
    expect(chooseWordSearchEndpoint(10, 22, 66)).toEqual({ anchor: null, selection: { start: 22, end: 66 } });
    expect(chooseWordSearchEndpoint(10, 66, 22)).toEqual({ anchor: null, selection: { start: 66, end: 22 } });
    expect(chooseWordSearchEndpoint(10, 22, 35)).toEqual({ anchor: 35, selection: null });
    expect(chooseWordSearchEndpoint(10, 22, 22)).toEqual({ anchor: null, selection: null });
    expect(chooseWordSearchEndpoint(10, 22, 100)).toEqual({ anchor: 22, selection: null });
  });

  it("moves focus within rows and columns without consuming unrelated keys", () => {
    expect(moveWordSearchFocus(10, 10, "ArrowLeft")).toBe(10);
    expect(moveWordSearchFocus(10, 19, "ArrowRight")).toBe(19);
    expect(moveWordSearchFocus(10, 2, "ArrowUp")).toBe(2);
    expect(moveWordSearchFocus(10, 95, "ArrowDown")).toBe(95);
    expect(moveWordSearchFocus(10, 22, "ArrowDown")).toBe(32);
    expect(moveWordSearchFocus(10, 22, "Home")).toBe(20);
    expect(moveWordSearchFocus(10, 22, "End")).toBe(29);
    expect(moveWordSearchFocus(10, 22, "Tab")).toBeNull();
  });
});
