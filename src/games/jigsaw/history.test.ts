import { describe, expect, it } from "vitest";
import type { JigsawPlacement } from "./placement";
import {
  applyJigsawHistoryAction,
  commitJigsawPlacementAction,
  getJigsawHistoryAvailability,
  jigsawHistoryLimit,
  makeEmptyJigsawHistoryState,
  resolveJigsawActionBaseline,
  sameJigsawPlacements,
} from "./history";

const placements = (...entries: Array<[string, number, number, boolean]>): JigsawPlacement[] =>
  entries.map(([id, worldX, worldY, snapped]) => ({ id, worldX, worldY, snapped }));

describe("Jigsaw action history", () => {
  it("records one completed placement rather than pointer-motion samples", () => {
    const before = placements(["a", 10, 20, false], ["b", 30, 40, false]);
    const during = placements(["a", 15, 25, false], ["b", 30, 40, false]);
    const after = placements(["a", 50, 60, false], ["b", 30, 40, false]);

    const history = commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), before, after);

    expect(history.undoStack).toHaveLength(1);
    expect(sameJigsawPlacements(history.undoStack[0]!, before)).toBe(true);
    expect(sameJigsawPlacements(history.undoStack[0]!, during)).toBe(false);
  });

  it("does not record a drag that returns to its original placement", () => {
    const before = placements(["a", 10, 20, false]);
    const history = commitJigsawPlacementAction(
      makeEmptyJigsawHistoryState(),
      before,
      placements(["a", 10, 20, false]),
    );

    expect(history.undoStack).toHaveLength(0);
  });

  it("round-trips a snapped finishing placement through Undo and Redo", () => {
    const before = placements(["a", 10, 20, false], ["b", 30, 40, true]);
    const solved = placements(["a", 100, 100, true], ["b", 30, 40, true]);
    const history = commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), before, solved);

    const undone = applyJigsawHistoryAction(history, solved, "undo");
    expect(undone).not.toBeNull();
    expect(sameJigsawPlacements(undone!.placements, before)).toBe(true);
    expect(undone!.placements.every((placement) => placement.snapped)).toBe(false);

    const redone = applyJigsawHistoryAction(undone!.history, undone!.placements, "redo");
    expect(redone).not.toBeNull();
    expect(sameJigsawPlacements(redone!.placements, solved)).toBe(true);
    expect(redone!.placements.every((placement) => placement.snapped)).toBe(true);
  });

  it("clears Redo after a divergent completed placement", () => {
    const start = placements(["a", 10, 20, false]);
    const first = placements(["a", 30, 40, false]);
    const second = placements(["a", 70, 80, false]);
    const history = commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), start, first);
    const undone = applyJigsawHistoryAction(history, first, "undo");
    expect(undone?.history.redoStack).toHaveLength(1);

    const divergent = commitJigsawPlacementAction(undone!.history, undone!.placements, second);
    expect(divergent.redoStack).toHaveLength(0);
  });

  it("uses the pre-drag committed state as the Reset/Scatter history baseline", () => {
    const committed = placements(["a", 10, 20, false], ["b", 30, 40, true]);
    const inFlight = placements(["a", 75, 85, false], ["b", 30, 40, true]);
    const scattered = placements(["a", 5, 10, false], ["b", 110, 120, false]);

    const baseline = resolveJigsawActionBaseline(inFlight, committed);
    const history = commitJigsawPlacementAction(
      makeEmptyJigsawHistoryState(),
      baseline,
      scattered,
    );
    const undone = applyJigsawHistoryAction(history, scattered, "undo");

    expect(undone).not.toBeNull();
    expect(sameJigsawPlacements(undone!.placements, committed)).toBe(true);
    expect(sameJigsawPlacements(undone!.placements, inFlight)).toBe(false);
  });

  it("temporarily suppresses rendered history availability during an active gesture", () => {
    const history = commitJigsawPlacementAction(
      makeEmptyJigsawHistoryState(),
      placements(["a", 10, 20, false]),
      placements(["a", 30, 40, false]),
    );
    const undone = applyJigsawHistoryAction(history, placements(["a", 30, 40, false]), "undo");
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

  it("treats Scatter or Reset as one reversible placement action", () => {
    const progressed = placements(["a", 90, 80, true], ["b", 30, 40, false]);
    const scattered = placements(["a", 5, 10, false], ["b", 110, 120, false]);
    const history = commitJigsawPlacementAction(
      makeEmptyJigsawHistoryState(),
      progressed,
      scattered,
    );

    expect(history.undoStack).toHaveLength(1);
    const undone = applyJigsawHistoryAction(history, scattered, "undo");
    expect(undone).not.toBeNull();
    expect(sameJigsawPlacements(undone!.placements, progressed)).toBe(true);
  });

  it("keeps history bounded and snapshots immutable", () => {
    let history = makeEmptyJigsawHistoryState();
    let current = placements(["a", 0, 0, false]);

    for (let index = 1; index <= jigsawHistoryLimit + 3; index += 1) {
      const next = placements(["a", index, index, false]);
      history = commitJigsawPlacementAction(history, current, next);
      current = next;
    }

    current[0]!.worldX = 999;
    expect(history.undoStack).toHaveLength(jigsawHistoryLimit);
    expect(history.undoStack[0]![0]!.worldX).toBe(3);
    expect(history.undoStack.at(-1)![0]!.worldX).toBe(jigsawHistoryLimit + 2);
  });
});
