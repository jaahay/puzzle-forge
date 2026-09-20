import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const previewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("./JigsawWorkspace.tsx", import.meta.url), "utf8");

const sourceBetween = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThan(-1);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};

describe("Jigsaw history integration", () => {
  it("exposes shared crown history controls with live availability after solve", () => {
    expect(workspaceSource).toContain("<PuzzleHistoryActions");
    expect(workspaceSource).toContain('canUndoNow={() => canHistoryActionNow("undo")}');
    expect(workspaceSource).toContain('canRedoNow={() => canHistoryActionNow("redo")}');
    expect(workspaceSource).toContain("onHistoryControllerChange={handleHistoryControllerChange}");

    const historyControl = sourceBetween(
      workspaceSource,
      "const historyActions = jigsawPuzzle ? (",
      "const crown = jigsawPuzzle ? (",
    );
    expect(historyControl).toContain("disabled={isGenerating}");
    expect(historyControl).not.toContain("isSolved");
  });

  it("captures one pre-drag snapshot and does not record pointer-motion samples", () => {
    const beginDrag = sourceBetween(previewSource, "const beginDrag =", "const moveDrag =");
    const moveDrag = sourceBetween(previewSource, "const moveDrag =", "const finishDrag =");
    const finishDrag = sourceBetween(previewSource, "const finishDrag =", "const cancelDrag =");

    expect(beginDrag).toContain(
      "startPlacements: cloneJigsawPlacements(currentPlacementState.placements)",
    );
    expect(moveDrag).toContain("updatePlacementState");
    expect(moveDrag).not.toContain("commitJigsawPlacementAction");
    expect(finishDrag).toContain("commitJigsawPlacementAction");
    expect(finishDrag).toContain("drag.startPlacements");
  });

  it("reverts interrupted drags instead of leaving untracked placement changes", () => {
    const pinchStart = sourceBetween(previewSource, "const beginTouchPinch =", "const moveTouchPinch =");
    const cancelDrag = sourceBetween(previewSource, "const cancelDrag =", "const beginPan =");

    expect(pinchStart).toContain("cloneJigsawPlacements(interruptedDrag.startPlacements)");
    expect(cancelDrag).toContain("cloneJigsawPlacements(drag.startPlacements)");
    expect(cancelDrag).not.toContain("commitJigsawPlacementAction");
  });

  it("treats Scatter/Reset as one reversible action from the last committed drag state", () => {
    const scatter = sourceBetween(previewSource, "const scatterPieces =", "useEffect(() => {");
    expect(scatter).toContain(
      "resolveJigsawActionBaseline(current.placements, activeDrag?.startPlacements ?? null)",
    );
    expect(scatter).toContain("commitJigsawPlacementAction");
    expect(scatter).toContain("baseline");
    expect(scatter).toContain("nextPlacements");
  });

  it("disables rendered history controls throughout drag and pinch gestures", () => {
    const beginDrag = sourceBetween(previewSource, "const beginDrag =", "const moveDrag =");
    const finishDrag = sourceBetween(previewSource, "const finishDrag =", "const cancelDrag =");
    const cancelDrag = sourceBetween(previewSource, "const cancelDrag =", "const beginPan =");
    const pinchStart = sourceBetween(previewSource, "const beginTouchPinch =", "const moveTouchPinch =");
    const pinchEnd = sourceBetween(previewSource, "const endTouchPinch =", "const getPointerPlacement =");

    expect(beginDrag).toContain("publishHistoryAvailability(historyRef.current, true)");
    expect(pinchStart).toContain("publishHistoryAvailability(historyRef.current, true)");
    expect(finishDrag).toContain("publishHistoryAvailability(historyRef.current)");
    expect(cancelDrag).toContain("publishHistoryAvailability(historyRef.current)");
    expect(pinchEnd).toContain("publishHistoryAvailability(historyRef.current)");
  });

  it("binds history commands to the active puzzle instance", () => {
    expect(previewSource).toContain("puzzleInstanceId: puzzle.id");
    expect(workspaceSource).toContain("controller?.puzzleInstanceId === puzzleInstanceId");
    expect(workspaceSource).toContain("!controller.dispatch(action)");
  });
});
