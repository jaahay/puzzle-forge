import type { TilePuzzlePiece } from "../../catalog/types";
import { slideTileTowardGap, swapTilePositions } from "./state";

export type ImageTileActionState = {
  tiles: TilePuzzlePiece[];
  emptyIndex?: number;
  moveCount: number;
};

export type ImageTileHistoryState = {
  undoStack: ImageTileActionState[];
  redoStack: ImageTileActionState[];
};

export type ImageTileActionRuntime = {
  state: ImageTileActionState;
  history: ImageTileHistoryState;
};

export type ImageTileHistoryAction = "undo" | "redo";

export const imageTileHistoryLimit = 100;

const cloneTiles = (tiles: readonly TilePuzzlePiece[]) => tiles.map((tile) => ({ ...tile }));

export const cloneImageTileActionState = (state: ImageTileActionState): ImageTileActionState => ({
  tiles: cloneTiles(state.tiles),
  ...(state.emptyIndex === undefined ? {} : { emptyIndex: state.emptyIndex }),
  moveCount: state.moveCount,
});

export const makeEmptyImageTileHistoryState = (): ImageTileHistoryState => ({
  undoStack: [],
  redoStack: [],
});

export const sameImageTileActionState = (
  left: ImageTileActionState,
  right: ImageTileActionState,
) =>
  left.moveCount === right.moveCount &&
  left.emptyIndex === right.emptyIndex &&
  left.tiles.length === right.tiles.length &&
  left.tiles.every((tile, index) => {
    const other = right.tiles[index];
    return Boolean(
      other &&
      tile.id === other.id &&
      tile.currentIndex === other.currentIndex &&
      tile.solvedIndex === other.solvedIndex,
    );
  });

export const pushImageTileHistoryEntry = (
  history: ImageTileHistoryState,
  entry: ImageTileActionState,
): ImageTileHistoryState => ({
  undoStack: [...history.undoStack, cloneImageTileActionState(entry)].slice(-imageTileHistoryLimit),
  redoStack: [],
});

type ImageTileHistoryTransition = {
  entry: ImageTileActionState;
  history: ImageTileHistoryState;
};

export const undoImageTileHistory = (
  history: ImageTileHistoryState,
  current: ImageTileActionState,
): ImageTileHistoryTransition | null => {
  const entry = history.undoStack.at(-1);
  if (!entry) return null;

  return {
    entry: cloneImageTileActionState(entry),
    history: {
      undoStack: history.undoStack.slice(0, -1).map(cloneImageTileActionState),
      redoStack: [...history.redoStack, cloneImageTileActionState(current)].slice(-imageTileHistoryLimit),
    },
  };
};

export const redoImageTileHistory = (
  history: ImageTileHistoryState,
  current: ImageTileActionState,
): ImageTileHistoryTransition | null => {
  const entry = history.redoStack.at(-1);
  if (!entry) return null;

  return {
    entry: cloneImageTileActionState(entry),
    history: {
      undoStack: [...history.undoStack, cloneImageTileActionState(current)].slice(-imageTileHistoryLimit),
      redoStack: history.redoStack.slice(0, -1).map(cloneImageTileActionState),
    },
  };
};

export const swapImageTileAction = (
  runtime: ImageTileActionRuntime,
  firstTileId: string,
  secondTileId: string,
): ImageTileActionRuntime | null => {
  const tiles = swapTilePositions(runtime.state.tiles, firstTileId, secondTileId);
  const changed = tiles.some((tile, index) => tile.currentIndex !== runtime.state.tiles[index]?.currentIndex);
  if (!changed) return null;

  return {
    state: {
      ...runtime.state,
      tiles,
      moveCount: runtime.state.moveCount + 1,
    },
    history: pushImageTileHistoryEntry(runtime.history, runtime.state),
  };
};

export const slideImageTileAction = (
  runtime: ImageTileActionRuntime,
  tileId: string,
  width: number,
  height: number,
): ImageTileActionRuntime | null => {
  if (runtime.state.emptyIndex === undefined) return null;

  const next = slideTileTowardGap(
    runtime.state.tiles,
    tileId,
    runtime.state.emptyIndex,
    width,
    height,
  );
  if (!next.moved) return null;

  return {
    state: {
      ...runtime.state,
      tiles: next.tiles,
      emptyIndex: next.emptyIndex,
      moveCount: runtime.state.moveCount + 1,
    },
    history: pushImageTileHistoryEntry(runtime.history, runtime.state),
  };
};

export const resetImageTileAction = (
  runtime: ImageTileActionRuntime,
  initialState: ImageTileActionState,
): ImageTileActionRuntime | null => {
  if (sameImageTileActionState(runtime.state, initialState)) return null;

  return {
    state: cloneImageTileActionState(initialState),
    history: pushImageTileHistoryEntry(runtime.history, runtime.state),
  };
};

export const applyImageTileHistoryAction = (
  runtime: ImageTileActionRuntime,
  action: ImageTileHistoryAction,
): ImageTileActionRuntime | null => {
  const transition = action === "undo"
    ? undoImageTileHistory(runtime.history, runtime.state)
    : redoImageTileHistory(runtime.history, runtime.state);
  if (!transition) return null;

  return {
    state: transition.entry,
    history: transition.history,
  };
};
