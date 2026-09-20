import { describe, expect, it } from "vitest";
import type { TilePuzzlePiece } from "../../catalog/types";
import { isImageTileSolved } from "./state";
import {
  applyImageTileHistoryAction,
  imageTileHistoryLimit,
  makeEmptyImageTileHistoryState,
  pushImageTileHistoryEntry,
  resetImageTileAction,
  sameImageTileActionState,
  slideImageTileAction,
  swapImageTileAction,
  type ImageTileActionRuntime,
  type ImageTileActionState,
} from "./history";

const makeTile = (solvedIndex: number, currentIndex: number): TilePuzzlePiece => ({
  id: `tile-${solvedIndex}`,
  currentIndex,
  solvedIndex,
  row: 0,
  column: solvedIndex,
});

const makeState = (
  indexes: number[],
  moveCount: number,
): ImageTileActionState => ({
  tiles: indexes.map((currentIndex, solvedIndex) => makeTile(solvedIndex, currentIndex)),
  moveCount,
});

const makeRuntime = (indexes: number[], moveCount = 0): ImageTileActionRuntime => ({
  state: makeState(indexes, moveCount),
  history: makeEmptyImageTileHistoryState(),
});

const requireTransition = <T>(value: T | null): T => {
  expect(value).not.toBeNull();
  if (value === null) throw new Error("Expected image-tile history transition.");
  return value;
};

const makeSlidingRuntime = (
  width: number,
  height: number,
  emptyIndex: number,
  positions?: Record<number, number>,
): ImageTileActionRuntime => ({
  state: {
    tiles: Array.from({ length: width * height }, (_, solvedIndex) => solvedIndex === width * height - 1
      ? null
      : makeTile(
          solvedIndex,
          positions?.[solvedIndex] ?? (solvedIndex === emptyIndex ? width * height - 1 : solvedIndex),
        ))
      .filter((tile): tile is TilePuzzlePiece => tile !== null),
    emptyIndex,
    moveCount: 0,
  },
  history: makeEmptyImageTileHistoryState(),
});

describe("image tile action history", () => {
  it("treats one completed swap as one undoable and redoable action", () => {
    const initial = makeRuntime([2, 0, 1]);
    const swapped = requireTransition(swapImageTileAction(initial, "tile-0", "tile-1"));

    expect(swapped.state.tiles.map((tile) => tile.currentIndex)).toEqual([0, 2, 1]);
    expect(swapped.state.moveCount).toBe(1);
    expect(swapped.history.undoStack).toHaveLength(1);

    const undone = requireTransition(applyImageTileHistoryAction(swapped, "undo"));
    expect(sameImageTileActionState(undone.state, initial.state)).toBe(true);
    expect(undone.history.redoStack).toHaveLength(1);

    const redone = requireTransition(applyImageTileHistoryAction(undone, "redo"));
    expect(sameImageTileActionState(redone.state, swapped.state)).toBe(true);
  });

  it("applies consecutive Undo commands independently instead of collapsing them", () => {
    const initial = makeRuntime([2, 0, 1]);
    const first = requireTransition(swapImageTileAction(initial, "tile-0", "tile-1"));
    const second = requireTransition(swapImageTileAction(first, "tile-1", "tile-2"));
    expect(isImageTileSolved(second.state.tiles)).toBe(true);

    const firstUndo = requireTransition(applyImageTileHistoryAction(second, "undo"));
    const secondUndo = requireTransition(applyImageTileHistoryAction(firstUndo, "undo"));

    expect(sameImageTileActionState(secondUndo.state, initial.state)).toBe(true);
    expect(secondUndo.history.redoStack).toHaveLength(2);
  });

  it("treats Reset as one action that Undo restores exactly", () => {
    const initialState = makeState([2, 0, 1], 0);
    const progressed = requireTransition(
      swapImageTileAction({ state: initialState, history: makeEmptyImageTileHistoryState() }, "tile-0", "tile-1"),
    );
    const reset = requireTransition(resetImageTileAction(progressed, initialState));

    expect(sameImageTileActionState(reset.state, initialState)).toBe(true);

    const undone = requireTransition(applyImageTileHistoryAction(reset, "undo"));
    expect(sameImageTileActionState(undone.state, progressed.state)).toBe(true);
  });

  it("undoes the finishing swap back into an unsolved playing state", () => {
    const initial = makeRuntime([2, 0, 1]);
    const first = requireTransition(swapImageTileAction(initial, "tile-0", "tile-1"));
    const solved = requireTransition(swapImageTileAction(first, "tile-1", "tile-2"));
    expect(isImageTileSolved(solved.state.tiles)).toBe(true);

    const reopened = requireTransition(applyImageTileHistoryAction(solved, "undo"));
    expect(isImageTileSolved(reopened.state.tiles)).toBe(false);
    expect(reopened.state.moveCount).toBe(1);
  });

  it("clears redo after a divergent completed action", () => {
    const initial = makeRuntime([2, 0, 1]);
    const first = requireTransition(swapImageTileAction(initial, "tile-0", "tile-1"));
    const second = requireTransition(swapImageTileAction(first, "tile-1", "tile-2"));
    const undone = requireTransition(applyImageTileHistoryAction(second, "undo"));
    expect(undone.history.redoStack).toHaveLength(1);

    const divergent = requireTransition(swapImageTileAction(undone, "tile-0", "tile-2"));
    expect(divergent.history.redoStack).toHaveLength(0);
  });

  it("treats an aligned multi-tile Sliding Puzzle shift as one action", () => {
    const initial = makeSlidingRuntime(4, 3, 7);
    const slid = requireTransition(slideImageTileAction(initial, "tile-4", 4, 3));

    expect(slid.state.emptyIndex).toBe(4);
    expect(slid.state.moveCount).toBe(1);
    expect(slid.state.tiles.find((tile) => tile.id === "tile-4")?.currentIndex).toBe(5);
    expect(slid.state.tiles.find((tile) => tile.id === "tile-5")?.currentIndex).toBe(6);
    expect(slid.state.tiles.find((tile) => tile.id === "tile-6")?.currentIndex).toBe(7);
    expect(slid.history.undoStack).toHaveLength(1);

    const undone = requireTransition(applyImageTileHistoryAction(slid, "undo"));
    expect(sameImageTileActionState(undone.state, initial.state)).toBe(true);
    expect(undone.history.redoStack).toHaveLength(1);

    const redone = requireTransition(applyImageTileHistoryAction(undone, "redo"));
    expect(sameImageTileActionState(redone.state, slid.state)).toBe(true);
  });

  it("treats Sliding Puzzle Reset as one reversible action including the gap", () => {
    const initial = makeSlidingRuntime(4, 3, 7);
    const progressed = requireTransition(slideImageTileAction(initial, "tile-4", 4, 3));
    const reset = requireTransition(resetImageTileAction(progressed, initial.state));

    expect(sameImageTileActionState(reset.state, initial.state)).toBe(true);

    const undone = requireTransition(applyImageTileHistoryAction(reset, "undo"));
    expect(sameImageTileActionState(undone.state, progressed.state)).toBe(true);
    expect(undone.state.emptyIndex).toBe(4);
  });

  it("does not record an illegal Sliding Puzzle request", () => {
    const initial = makeSlidingRuntime(4, 3, 7);
    const invalid = slideImageTileAction(initial, "tile-0", 4, 3);

    expect(invalid).toBeNull();
    expect(initial.history.undoStack).toHaveLength(0);
    expect(initial.history.redoStack).toHaveLength(0);
  });

  it("undoes a finishing Sliding Puzzle move back into play", () => {
    const initial = makeSlidingRuntime(2, 2, 2);
    const solved = requireTransition(slideImageTileAction(initial, "tile-2", 2, 2));

    expect(isImageTileSolved(solved.state.tiles, solved.state.emptyIndex, 4)).toBe(true);
    expect(solved.state.moveCount).toBe(1);

    const reopened = requireTransition(applyImageTileHistoryAction(solved, "undo"));
    expect(isImageTileSolved(reopened.state.tiles, reopened.state.emptyIndex, 4)).toBe(false);
    expect(reopened.state.emptyIndex).toBe(2);
    expect(reopened.state.moveCount).toBe(0);
  });

  it("keeps history bounded and snapshots immutable", () => {
    const source = makeState([0, 1, 2], 0);
    let history = makeEmptyImageTileHistoryState();
    for (let index = 0; index < imageTileHistoryLimit + 3; index += 1) {
      source.moveCount = index;
      history = pushImageTileHistoryEntry(history, source);
    }

    source.tiles[0].currentIndex = 2;
    expect(history.undoStack).toHaveLength(imageTileHistoryLimit);
    expect(history.undoStack[0]?.moveCount).toBe(3);
    expect(history.undoStack.at(-1)?.tiles[0].currentIndex).toBe(0);
  });
});
