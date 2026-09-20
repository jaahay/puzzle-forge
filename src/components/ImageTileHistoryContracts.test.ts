import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("./ImageTilePuzzleWorkspace.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("./ImageTilePuzzlePreview.tsx", import.meta.url), "utf8");

describe("image tile history integration", () => {
  it("owns Undo/Redo in the current-puzzle crown for both image-tile puzzle types", () => {
    expect(workspaceSource).toContain("const historyActions = imagePuzzle ? (");
    expect(workspaceSource).toContain("<PuzzleHistoryActions");
    expect(workspaceSource).toContain("historyControl={historyActions}");
    expect(workspaceSource).toContain("historyControllerRef");
    expect(workspaceSource).not.toContain('puzzleId !== "tile-swap"');
  });

  it("dispatches every history action directly instead of storing only the latest command", () => {
    expect(workspaceSource).not.toContain("historyCommand");
    expect(previewSource).not.toContain("historyCommand");
    expect(workspaceSource).toContain("controller.dispatch(action)");
    expect(previewSource).toContain("onHistoryControllerChange(controller)");
    expect(previewSource).toContain(
      "applyImageTileHistoryAction(toImageTileActionRuntime(current), action)",
    );
  });

  it("announces accepted Undo/Redo actions through the workspace status line", () => {
    expect(workspaceSource).toContain(
      'onStatusMessageChange(action === "undo" ? "Undid last puzzle action." : "Redid last puzzle action.");',
    );
  });

  it("keeps history controls available after solve while generation is idle", () => {
    expect(workspaceSource).toMatch(
      /<PuzzleHistoryActions[\s\S]*?disabled=\{isGenerating\}[\s\S]*?\/>/,
    );
    expect(workspaceSource).not.toMatch(
      /<PuzzleHistoryActions[\s\S]*?disabled=\{isGenerating \|\| isSolved\}[\s\S]*?\/>/,
    );
  });

  it("records completed Tile Swap exchanges rather than tile selection as actions", () => {
    const firstSelection = previewSource.indexOf("if (!selectedTileId)");
    const historySwap = previewSource.indexOf("swapImageTileAction(", firstSelection);

    expect(firstSelection).toBeGreaterThan(-1);
    expect(historySwap).toBeGreaterThan(firstSelection);
    expect(
      previewSource.slice(firstSelection, historySwap),
    ).not.toContain("swapImageTileAction");
  });

  it("records each legal Sliding Puzzle line shift through the shared history transition", () => {
    expect(previewSource).toContain("slideImageTileAction(");
    expect(previewSource).not.toContain("slideTileTowardGap(");
  });

  it("treats Reset as one reversible action for both image-tile puzzle types", () => {
    expect(previewSource).toContain("resetImageTileAction(");
    expect(previewSource).not.toContain('puzzle.puzzleId !== "tile-swap"');
  });

  it("keeps live history availability authoritative during rapid command sequences", () => {
    expect(workspaceSource).toContain('canUndoNow={() => canHistoryActionNow("undo")}');
    expect(workspaceSource).toContain('canRedoNow={() => canHistoryActionNow("redo")}');
    expect(workspaceSource).not.toContain("const available = historyAvailability");
    expect(previewSource).toContain("const runtimeRef = useRef(runtime);");
    expect(previewSource).toContain("publishHistoryAvailability(next);");
    expect(previewSource).toContain("publishHistoryAvailability(restored);");
  });

  it("registers the shared history controller and rendered availability for both puzzle types", () => {
    expect(workspaceSource).toContain("onHistoryAvailabilityChange={handleHistoryAvailabilityChange}");
    expect(workspaceSource).toContain("onHistoryControllerChange={handleHistoryControllerChange}");
    expect(previewSource).toContain("puzzleInstanceId: puzzle.id");
    expect(previewSource).toContain("can: canHistoryAction");
    expect(previewSource).toContain("dispatch: dispatchHistoryAction");
  });
});
