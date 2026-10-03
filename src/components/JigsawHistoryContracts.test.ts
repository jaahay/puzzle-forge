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

  it("delegates drag snapshot, projection, completion, and cancellation to the tested drag-action boundary", () => {
    expect(previewSource).toContain("beginJigsawDragAction({");
    expect(previewSource).toContain("projectJigsawDragAction(");
    expect(previewSource).toContain("completeJigsawDragAction(");
    expect(previewSource).toContain("cancelJigsawDragAction(");
  });

  it("disables rendered history controls throughout drag and pinch gestures", () => {  it("disables rendered history controls throughout drag and pinch gestures", () => {
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
