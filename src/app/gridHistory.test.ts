import { describe, expect, it } from "vitest";
import type { PuzzleCell } from "../catalog/types";
import {
  gridHistoryLimit,
  makeEmptyGridHistoryState,
  makeGridHistoryEntry,
  pushGridHistoryEntry,
  redoGridHistory,
  sameGridPlayerState,
  undoGridHistory,
} from "./gridHistory";

const makeCell = (
  value: string,
  tone: PuzzleCell["tone"] = "empty",
  locked = false,
): PuzzleCell => ({
  row: 0,
  column: 0,
  value,
  locked,
  tone,
  ariaLabel: `${value || "Empty"} cell at row 1, column 1`,
});

const makeEntry = (value: string) => makeGridHistoryEntry(
  [makeCell(value)],
  { row: 0, column: 0 },
);

describe("grid action history", () => {
  it("moves the previous player snapshot to redo on undo", () => {
    const history = pushGridHistoryEntry(makeEmptyGridHistoryState(), makeEntry("1"));
    const transition = undoGridHistory(history, makeEntry("2"));

    expect(transition?.entry.cells[0]?.value).toBe("1");
    expect(transition?.history.undoStack).toHaveLength(0);
    expect(transition?.history.redoStack[0]?.cells[0]?.value).toBe("2");
  });

  it("round-trips an undone action through redo", () => {
    const history = pushGridHistoryEntry(makeEmptyGridHistoryState(), makeEntry("1"));
    const undone = undoGridHistory(history, makeEntry("2"));
    expect(undone).not.toBeNull();

    const redone = redoGridHistory(undone!.history, undone!.entry);
    expect(redone?.entry.cells[0]?.value).toBe("2");
    expect(redone?.history.undoStack[0]?.cells[0]?.value).toBe("1");
    expect(redone?.history.redoStack).toHaveLength(0);
  });

  it("clears redo when a divergent player action is recorded", () => {
    const history = pushGridHistoryEntry(makeEmptyGridHistoryState(), makeEntry("1"));
    const undone = undoGridHistory(history, makeEntry("2"));
    expect(undone?.history.redoStack).toHaveLength(1);

    const divergent = pushGridHistoryEntry(undone!.history, makeEntry("3"));
    expect(divergent.redoStack).toHaveLength(0);
    expect(divergent.undoStack[divergent.undoStack.length - 1]?.cells[0]?.value).toBe("3");
  });

  it("keeps history bounded", () => {
    let history = makeEmptyGridHistoryState();
    for (let index = 0; index < gridHistoryLimit + 5; index += 1) {
      history = pushGridHistoryEntry(history, makeEntry(String(index)));
    }

    expect(history.undoStack).toHaveLength(gridHistoryLimit);
    expect(history.undoStack[0]?.cells[0]?.value).toBe("5");
  });

  it("compares player state without treating validation presentation as a move", () => {
    expect(sameGridPlayerState(
      [makeCell("4", "hint")],
      [{ ...makeCell("4", "empty"), ariaLabel: "Different presentation" }],
    )).toBe(true);
    expect(sameGridPlayerState([makeCell("4")], [makeCell("5")])).toBe(false);
    expect(sameGridPlayerState([makeCell("4")], [makeCell("4", "empty", true)])).toBe(false);
  });
});
