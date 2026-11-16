import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../../catalog/types";
import {
  applyJigsawHistoryAction,
  commitJigsawPlacementAction,
  makeEmptyJigsawHistoryState,
  sameJigsawSnapshot,
  type JigsawWorkspaceSnapshot,
} from "./history";
import {
  buildPersistedJigsawRuntime,
  restorePersistedJigsawRuntime,
} from "./persistence";

const pieces = Array.from({ length: 9 }, (_, index) => ({ id: "tile-" + index })) as JigsawPiece[];
const snapshot = (offset: number): JigsawWorkspaceSnapshot => ({
  placements: pieces.map((piece, index) => ({
    id: piece.id, worldX: index * 100 + offset, worldY: index * 30 + offset,
  })),
  assembly: { joinedComponents: [] },
});

describe("compact Jigsaw session history", () => {
  it("round-trips exact current cursor, Undo, and Redo", () => {
    const before = snapshot(0), afterOne = snapshot(20), afterTwo = snapshot(40);
    let history = commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), before, afterOne);
    history = commitJigsawPlacementAction(history, afterOne, afterTwo);
    const undone = applyJigsawHistoryAction(history, afterTwo, "undo")!;
    const compact = buildPersistedJigsawRuntime({
      snapshot: undone.snapshot, history: undone.history,
    }, pieces)!;
    const restored = restorePersistedJigsawRuntime(JSON.parse(JSON.stringify(compact)), pieces)!;
    expect(sameJigsawSnapshot(restored.snapshot, afterOne)).toBe(true);
    expect(restored.history.undoStack).toHaveLength(1);
    expect(restored.history.redoStack).toHaveLength(1);
    const redone = applyJigsawHistoryAction(restored.history, restored.snapshot, "redo")!;
    expect(sameJigsawSnapshot(redone.snapshot, afterTwo)).toBe(true);
  });

  it("stores only changed coordinates per step on a large board", () => {
    const largePieces = Array.from({ length: 1024 }, (_, index) =>
      ({ id: "tile-" + index })) as JigsawPiece[];
    const base: JigsawWorkspaceSnapshot = {
      placements: largePieces.map((piece, index) => ({
        id: piece.id, worldX: index * 20, worldY: index * 10,
      })),
      assembly: { joinedComponents: [] },
    };
    const undoStack = Array.from({ length: 100 }, (_, index): JigsawWorkspaceSnapshot => ({
      placements: base.placements.map((placement, pieceIndex) =>
        pieceIndex === 0 ? { ...placement, worldX: index } : { ...placement }),
      assembly: { joinedComponents: [] },
    }));
    const compact = buildPersistedJigsawRuntime({
      snapshot: {
        placements: base.placements.map((placement, index) =>
          index === 0 ? { ...placement, worldX: 100 } : { ...placement }),
        assembly: { joinedComponents: [] },
      },
      history: { undoStack, redoStack: [] },
    }, largePieces);
    expect(compact).not.toBeNull();
    expect(compact!.undo).toHaveLength(100);
    expect(compact!.undo.every((entry) => entry.positions.length === 1)).toBe(true);
    expect(JSON.stringify(compact).length).toBeLessThan(40000);
  });

  it("preserves the current board but drops corrupt history", () => {
    const before = snapshot(0), after = snapshot(10);
    const compact = buildPersistedJigsawRuntime({
      snapshot: after,
      history: commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), before, after),
    }, pieces)!;
    compact.undo[0]!.positions = [[9999, 3, 4]];
    const restored = restorePersistedJigsawRuntime(compact, pieces)!;
    expect(sameJigsawSnapshot(restored.snapshot, after)).toBe(true);
    expect(restored.history.undoStack).toEqual([]);
    compact.current.positions[0] = [Number.NaN, 0];
    expect(restorePersistedJigsawRuntime(compact, pieces)).toBeNull();
  });
});
