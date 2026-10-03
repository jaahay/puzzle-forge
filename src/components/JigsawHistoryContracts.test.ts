import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const previewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("./JigsawWorkspace.tsx", import.meta.url), "utf8");

describe("Jigsaw history integration", () => {
  it("exposes shared crown history controls with live availability after solve", () => {
    expect(workspaceSource).toContain("<PuzzleHistoryActions");
    expect(workspaceSource).toContain('canUndoNow={() => canHistoryActionNow("undo")}');
    expect(workspaceSource).toContain('canRedoNow={() => canHistoryActionNow("redo")}');
    expect(workspaceSource).toContain("onHistoryControllerChange={handleHistoryControllerChange}");
    expect(workspaceSource).toMatch(
      /<PuzzleHistoryActions[\s\S]*?disabled=\{isGenerating\}[\s\S]*?\/>/,
    );
    expect(workspaceSource).not.toMatch(
      /<PuzzleHistoryActions[\s\S]*?disabled=\{isGenerating \|\| isSolved\}/,
    );
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
