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

  it("uses the tested drag-action boundary for drag history semantics", () => {
    expect(previewSource).toContain("beginJigsawDragAction({");
    expect(previewSource).toContain("completeJigsawDragAction(");
    expect(previewSource).toContain("cancelJigsawDragAction(");
  });

  it("blocks rendered history availability while a drag or pinch is active", () => {
    expect((previewSource.match(/publishHistoryAvailability\(historyRef\.current, true\)/g) ?? []).length)
      .toBeGreaterThanOrEqual(2);
    expect((previewSource.match(/publishHistoryAvailability\(historyRef\.current\)/g) ?? []).length)
      .toBeGreaterThanOrEqual(3);
  });

  it("binds history commands to the active puzzle instance", () => {
    expect(previewSource).toContain("puzzleInstanceId: puzzle.id");
    expect(workspaceSource).toContain("controller?.puzzleInstanceId === puzzleInstanceId");
    expect(workspaceSource).toContain("!controller.dispatch(action)");
  });
});
