import { describe, expect, it } from "vitest";
import type { JigsawWorkspaceSnapshot } from "./history";
import {
  applyJigsawHistoryAction,
  commitJigsawPlacementAction,
  getJigsawHistoryAvailability,
  jigsawHistoryLimit,
  makeEmptyJigsawHistoryState,
  resolveJigsawActionBaseline,
  sameJigsawSnapshot,
} from "./history";

const snapshot = (
  entries: Array<[string, number, number]>,
  joinedComponents: string[][] = [],
): JigsawWorkspaceSnapshot => ({
  placements: entries.map(([id, worldX, worldY]) => ({ id, worldX, worldY })),
  assembly: { joinedComponents: joinedComponents.map((component) => [...component]) },
});

describe("Jigsaw action history", () => {
  it("records one completed island action rather than pointer-motion samples", () => {
    const before = snapshot([["a", 10, 20], ["b", 30, 40]]);
    const during = snapshot([["a", 15, 25], ["b", 30, 40]]);
    const after = snapshot([["a", 50, 60], ["b", 30, 40]]);

    const history = commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), before, after);

    expect(history.undoStack).toHaveLength(1);
    expect(sameJigsawSnapshot(history.undoStack[0]!, before)).toBe(true);
    expect(sameJigsawSnapshot(history.undoStack[0]!, during)).toBe(false);
  });

  it("does not record a drag that returns to its original state", () => {
    const before = snapshot([["a", 10, 20]]);
    const history = commitJigsawPlacementAction(
      makeEmptyJigsawHistoryState(),
      before,
      snapshot([["a", 10, 20]]),
    );

    expect(history.undoStack).toHaveLength(0);
  });

  it("round-trips both an island merge and its transient workspace position", () => {
    const before = snapshot([["a", 10, 20], ["b", 80, 20]]);
    const joined = snapshot(
      [["a", 40, 30], ["b", 140, 30]],
      [["a", "b"]],
    );
    const history = commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), before, joined);

    const undone = applyJigsawHistoryAction(history, joined, "undo");
    expect(undone).not.toBeNull();
    expect(sameJigsawSnapshot(undone!.snapshot, before)).toBe(true);

    const redone = applyJigsawHistoryAction(undone!.history, undone!.snapshot, "redo");
    expect(redone).not.toBeNull();
    expect(sameJigsawSnapshot(redone!.snapshot, joined)).toBe(true);
  });

  it("clears Redo after a divergent completed action", () => {
    const start = snapshot([["a", 10, 20]]);
    const first = snapshot([["a", 30, 40]]);
    const second = snapshot([["a", 70, 80]]);
    const history = commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), start, first);
    const undone = applyJigsawHistoryAction(history, first, "undo");
    expect(undone?.history.redoStack).toHaveLength(1);

    const divergent = commitJigsawPlacementAction(undone!.history, undone!.snapshot, second);
    expect(divergent.redoStack).toHaveLength(0);
  });

  it("uses the pre-drag committed snapshot as the Reset/Restage baseline", () => {
    const committed = snapshot([["a", 10, 20], ["b", 110, 20]], [["a", "b"]]);
    const inFlight = snapshot([["a", 75, 85], ["b", 175, 85]], [["a", "b"]]);
    const restaged = snapshot([["a", 5, 10], ["b", 105, 10]], [["a", "b"]]);

    const baseline = resolveJigsawActionBaseline(inFlight, committed);
    const history = commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), baseline, restaged);
    const undone = applyJigsawHistoryAction(history, restaged, "undo");

    expect(undone).not.toBeNull();
    expect(sameJigsawSnapshot(undone!.snapshot, committed)).toBe(true);
    expect(sameJigsawSnapshot(undone!.snapshot, inFlight)).toBe(false);
  });

  it("temporarily suppresses rendered history availability during an active gesture", () => {
    const start = snapshot([["a", 10, 20]]);
    const moved = snapshot([["a", 30, 40]]);
    const history = commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), start, moved);
    const undone = applyJigsawHistoryAction(history, moved, "undo");
    expect(undone).not.toBeNull();

    expect(getJigsawHistoryAvailability(undone!.history)).toEqual({
      canUndo: false,
      canRedo: true,
    });
    expect(getJigsawHistoryAvailability(undone!.history, true)).toEqual({
      canUndo: false,
      canRedo: false,
    });
  });

  it("treats Reset or Restage as one reversible workspace action", () => {
    const progressed = snapshot([["a", 90, 80], ["b", 190, 80]], [["a", "b"]]);
    const reset = snapshot([["a", 5, 10], ["b", 110, 120]]);
    const history = commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), progressed, reset);

    expect(history.undoStack).toHaveLength(1);
    const undone = applyJigsawHistoryAction(history, reset, "undo");
    expect(undone).not.toBeNull();
    expect(sameJigsawSnapshot(undone!.snapshot, progressed)).toBe(true);
  });

  it("keeps history bounded and deeply snapshots assembly state", () => {
    let history = makeEmptyJigsawHistoryState();
    let current = snapshot([["a", 0, 0], ["b", 100, 0]], [["a", "b"]]);

    for (let index = 1; index <= jigsawHistoryLimit + 3; index += 1) {
      const next = snapshot([["a", index, index], ["b", 100 + index, index]], [["a", "b"]]);
      history = commitJigsawPlacementAction(history, current, next);
      current = next;
    }

    current.placements[0]!.worldX = 999;
    current.assembly.joinedComponents[0]![0] = "mutated";

    expect(history.undoStack).toHaveLength(jigsawHistoryLimit);
    expect(history.undoStack[0]!.placements[0]!.worldX).toBe(3);
    expect(history.undoStack.at(-1)!.placements[0]!.worldX).toBe(jigsawHistoryLimit + 2);
    expect(history.undoStack.at(-1)!.assembly.joinedComponents[0]).toEqual(["a", "b"]);
  });
});
