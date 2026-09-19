import { describe, expect, it } from "vitest";
import type { TilePuzzlePiece } from "../../catalog/types";
import {
  imageTileHistoryLimit,
  makeEmptyImageTileHistoryState,
  pushImageTileHistoryEntry,
  redoImageTileHistory,
  sameImageTileActionState,
  undoImageTileHistory,
  type ImageTileActionState,
} from "./history";

const makeTile = (id: string, currentIndex: number): TilePuzzlePiece => ({
  id,
  currentIndex,
  solvedIndex: Number(id.replace("tile-", "")),
  row: 0,
  column: Number(id.replace("tile-", "")),
});

const makeState = (
  indexes: number[],
  moveCount: number,
): ImageTileActionState => ({
  tiles: indexes.map((currentIndex, index) => makeTile(`tile-${index}`, currentIndex)),
  moveCount,
});

describe("image tile action history", () => {
  it("undoes and redoes one completed board action", () => {
    const before = makeState([1, 0, 2], 4);
    const after = makeState([1, 2, 0], 5);
    const history = pushImageTileHistoryEntry(makeEmptyImageTileHistoryState(), before);

    const undone = undoImageTileHistory(history, after);
    expect(undone).not.toBeNull();
    expect(undone && sameImageTileActionState(undone.entry, before)).toBe(true);
    expect(undone?.history.redoStack).toHaveLength(1);

    const redone = undone && redoImageTileHistory(undone.history, undone.entry);
    expect(redone && sameImageTileActionState(redone.entry, after)).toBe(true);
    expect(redone?.history.redoStack).toHaveLength(0);
  });

  it("clears redo after a divergent completed action", () => {
    const first = makeState([1, 0, 2], 1);
    const second = makeState([1, 2, 0], 2);
    const divergent = makeState([2, 0, 1], 2);
    const history = pushImageTileHistoryEntry(makeEmptyImageTileHistoryState(), first);
    const undone = undoImageTileHistory(history, second);
    expect(undone?.history.redoStack).toHaveLength(1);

    const next = pushImageTileHistoryEntry(undone!.history, divergent);
    expect(next.redoStack).toHaveLength(0);
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
