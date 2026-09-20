import type { JigsawPlacement } from "./placement";

export type JigsawHistoryAction = "undo" | "redo";

export type JigsawHistoryState = {
  undoStack: JigsawPlacement[][];
  redoStack: JigsawPlacement[][];
};

export type JigsawHistoryTransition = {
  placements: JigsawPlacement[];
  history: JigsawHistoryState;
};

export const jigsawHistoryLimit = 100;

export const cloneJigsawPlacements = (
  placements: readonly JigsawPlacement[],
): JigsawPlacement[] => placements.map((placement) => ({ ...placement }));

export const makeEmptyJigsawHistoryState = (): JigsawHistoryState => ({
  undoStack: [],
  redoStack: [],
});

export const getJigsawHistoryAvailability = (
  history: JigsawHistoryState,
  blocked = false,
) => blocked
  ? { canUndo: false, canRedo: false }
  : {
      canUndo: history.undoStack.length > 0,
      canRedo: history.redoStack.length > 0,
    };

export const resolveJigsawActionBaseline = (
  current: readonly JigsawPlacement[],
  inFlightStart: readonly JigsawPlacement[] | null = null,
) => cloneJigsawPlacements(inFlightStart ?? current);

export const sameJigsawPlacements = (
  left: readonly JigsawPlacement[],
  right: readonly JigsawPlacement[],
) =>
  left.length === right.length &&
  left.every((placement, index) => {
    const other = right[index];
    return Boolean(
      other &&
      placement.id === other.id &&
      placement.worldX === other.worldX &&
      placement.worldY === other.worldY &&
      placement.snapped === other.snapped,
    );
  });

export const pushJigsawHistoryEntry = (
  history: JigsawHistoryState,
  entry: readonly JigsawPlacement[],
): JigsawHistoryState => ({
  undoStack: [...history.undoStack, cloneJigsawPlacements(entry)].slice(-jigsawHistoryLimit),
  redoStack: [],
});

export const commitJigsawPlacementAction = (
  history: JigsawHistoryState,
  before: readonly JigsawPlacement[],
  after: readonly JigsawPlacement[],
): JigsawHistoryState =>
  sameJigsawPlacements(before, after)
    ? history
    : pushJigsawHistoryEntry(history, before);

export const applyJigsawHistoryAction = (
  history: JigsawHistoryState,
  current: readonly JigsawPlacement[],
  action: JigsawHistoryAction,
): JigsawHistoryTransition | null => {
  const sourceStack = action === "undo" ? history.undoStack : history.redoStack;
  const entry = sourceStack.at(-1);
  if (!entry) return null;

  if (action === "undo") {
    return {
      placements: cloneJigsawPlacements(entry),
      history: {
        undoStack: history.undoStack.slice(0, -1).map(cloneJigsawPlacements),
        redoStack: [...history.redoStack, cloneJigsawPlacements(current)].slice(-jigsawHistoryLimit),
      },
    };
  }

  return {
    placements: cloneJigsawPlacements(entry),
    history: {
      undoStack: [...history.undoStack, cloneJigsawPlacements(current)].slice(-jigsawHistoryLimit),
      redoStack: history.redoStack.slice(0, -1).map(cloneJigsawPlacements),
    },
  };
};
