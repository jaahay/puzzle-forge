import { describe, expect, it } from "vitest";
import type { PuzzleCell } from "../catalog/types";
import { getWordGuessBank, isValidWordGuess } from "../games/wordGuess/words";
import {
  commitGridHistoryState,
  makeEmptyGridHistoryState,
  makeGridHistoryEntry,
  pushGridHistoryEntry,
  redoGridHistory,
  undoGridHistory,
  type GridHistoryState,
} from "./gridHistory";

type WordGuessEditRuntime = {
  cells: PuzzleCell[];
  history: GridHistoryState;
};

const makeCells = (rows = 2, columns = 4): PuzzleCell[] =>
  Array.from({ length: rows * columns }, (_, index) => ({
    row: Math.floor(index / columns),
    column: index % columns,
    value: "",
    locked: false,
    tone: "empty",
    ariaLabel: "Empty Word Guess cell",
  }));

const editCell = (
  runtime: WordGuessEditRuntime,
  row: number,
  column: number,
  value: string,
): WordGuessEditRuntime => {
  const cells = runtime.cells.map((cell) => ({ ...cell }));
  const index = cells.findIndex((cell) => cell.row === row && cell.column === column);
  const current = cells[index];
  if (!current || current.value === value) return runtime;

  cells[index] = { ...current, value };
  return {
    cells,
    history: pushGridHistoryEntry(
      runtime.history,
      makeGridHistoryEntry(runtime.cells, { row, column }),
    ),
  };
};

const undo = (runtime: WordGuessEditRuntime): WordGuessEditRuntime | null => {
  const transition = undoGridHistory(
    runtime.history,
    makeGridHistoryEntry(runtime.cells, null),
  );
  return transition
    ? { cells: transition.entry.cells, history: transition.history }
    : null;
};

const redo = (runtime: WordGuessEditRuntime): WordGuessEditRuntime | null => {
  const transition = redoGridHistory(
    runtime.history,
    makeGridHistoryEntry(runtime.cells, null),
  );
  return transition
    ? { cells: transition.entry.cells, history: transition.history }
    : null;
};

const rowValue = (runtime: WordGuessEditRuntime, row: number) =>
  runtime.cells
    .filter((cell) => cell.row === row)
    .sort((left, right) => left.column - right.column)
    .map((cell) => cell.value)
    .join("");

describe("Word Guess edit history behavior", () => {
  it("round-trips current-row edits, then cannot cross an accepted submission boundary", () => {
    let runtime: WordGuessEditRuntime = {
      cells: makeCells(),
      history: makeEmptyGridHistoryState(),
    };

    runtime = editCell(runtime, 0, 0, "A");
    runtime = editCell(runtime, 0, 1, "B");

    const undone = undo(runtime);
    expect(undone).not.toBeNull();
    expect(rowValue(undone!, 0)).toBe("A");

    const redone = redo(undone!);
    expect(redone).not.toBeNull();
    expect(rowValue(redone!, 0)).toBe("AB");

    runtime = editCell(redone!, 0, 2, "L");
    runtime = editCell(runtime, 0, 3, "E");
    expect(isValidWordGuess(rowValue(runtime, 0), getWordGuessBank(4))).toBe(true);

    runtime = { ...runtime, history: commitGridHistoryState() };
    expect(runtime.history.undoStack).toHaveLength(0);
    expect(runtime.history.redoStack).toHaveLength(0);

    runtime = editCell(runtime, 1, 0, "B");
    const nextRowUndo = undo(runtime);
    expect(nextRowUndo).not.toBeNull();
    expect(rowValue(nextRowUndo!, 0)).toBe("ABLE");
    expect(rowValue(nextRowUndo!, 1)).toBe("");
    expect(undo(nextRowUndo!)).toBeNull();
  });

  it("retains edit history when a complete guess is rejected", () => {
    let runtime: WordGuessEditRuntime = {
      cells: makeCells(),
      history: makeEmptyGridHistoryState(),
    };

    for (const [column, letter] of Array.from("ZZZZ").entries()) {
      runtime = editCell(runtime, 0, column, letter);
    }

    expect(isValidWordGuess(rowValue(runtime, 0), getWordGuessBank(4))).toBe(false);
    expect(runtime.history.undoStack.length).toBeGreaterThan(0);

    const undone = undo(runtime);
    expect(undone).not.toBeNull();
    expect(rowValue(undone!, 0)).toBe("ZZZ");
  });
});
