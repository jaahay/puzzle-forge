import type { JigsawAssemblyProgress } from "./assembly";
import { cloneJigsawAssemblyProgress, sameJigsawAssemblyProgress } from "./assembly";
import type { JigsawPlacement } from "./placement";

export type JigsawHistoryAction = "undo" | "redo";

export type JigsawWorkspaceSnapshot = {
  placements: JigsawPlacement[];
  assembly: JigsawAssemblyProgress;
};

export type JigsawHistoryState = {
  undoStack: JigsawWorkspaceSnapshot[];
  redoStack: JigsawWorkspaceSnapshot[];
};

export type JigsawHistoryTransition = {
  snapshot: JigsawWorkspaceSnapshot;
  history: JigsawHistoryState;
};

export const jigsawHistoryLimit = 100;

export const cloneJigsawPlacements = (
  placements: readonly JigsawPlacement[],
): JigsawPlacement[] => placements.map((placement) => ({ ...placement }));

export const cloneJigsawSnapshot = (
  snapshot: JigsawWorkspaceSnapshot,
): JigsawWorkspaceSnapshot => ({
  placements: cloneJigsawPlacements(snapshot.placements),
  assembly: cloneJigsawAssemblyProgress(snapshot.assembly),
});

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
  current: JigsawWorkspaceSnapshot,
  inFlightStart: JigsawWorkspaceSnapshot | null = null,
) => cloneJigsawSnapshot(inFlightStart ?? current);

const sameJigsawPlacements = (
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
      placement.worldY === other.worldY,
    );
  });

export const sameJigsawSnapshot = (
  left: JigsawWorkspaceSnapshot,
  right: JigsawWorkspaceSnapshot,
) =>
  sameJigsawPlacements(left.placements, right.placements) &&
  sameJigsawAssemblyProgress(left.assembly, right.assembly);

export const pushJigsawHistoryEntry = (
  history: JigsawHistoryState,
  entry: JigsawWorkspaceSnapshot,
): JigsawHistoryState => ({
  undoStack: [...history.undoStack, cloneJigsawSnapshot(entry)].slice(-jigsawHistoryLimit),
  redoStack: [],
});

export const commitJigsawPlacementAction = (
  history: JigsawHistoryState,
  before: JigsawWorkspaceSnapshot,
  after: JigsawWorkspaceSnapshot,
): JigsawHistoryState =>
  sameJigsawSnapshot(before, after)
    ? history
    : pushJigsawHistoryEntry(history, before);

export const applyJigsawHistoryAction = (
  history: JigsawHistoryState,
  current: JigsawWorkspaceSnapshot,
  action: JigsawHistoryAction,
): JigsawHistoryTransition | null => {
  const sourceStack = action === "undo" ? history.undoStack : history.redoStack;
  const entry = sourceStack.at(-1);
  if (!entry) return null;

  if (action === "undo") {
    return {
      snapshot: cloneJigsawSnapshot(entry),
      history: {
        undoStack: history.undoStack.slice(0, -1).map(cloneJigsawSnapshot),
        redoStack: [...history.redoStack, cloneJigsawSnapshot(current)].slice(-jigsawHistoryLimit),
      },
    };
  }

  return {
    snapshot: cloneJigsawSnapshot(entry),
    history: {
      undoStack: [...history.undoStack, cloneJigsawSnapshot(current)].slice(-jigsawHistoryLimit),
      redoStack: history.redoStack.slice(0, -1).map(cloneJigsawSnapshot),
    },
  };
};
