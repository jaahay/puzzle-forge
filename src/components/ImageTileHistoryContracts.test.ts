import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("./ImageTilePuzzleWorkspace.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("./ImageTilePuzzlePreview.tsx", import.meta.url), "utf8");

describe("image tile history integration", () => {
  it("owns Undo/Redo in the current-puzzle crown for both image-tile puzzle types", () => {
    expect(workspaceSource).toContain("const historyActions = imagePuzzle ? (");
    expect(workspaceSource).toContain("<PuzzleHistoryActions");
    expect(workspaceSource).toContain("historyControl={historyActions}");
    expect(workspaceSource).toContain("historyDispatcherRef");
    expect(workspaceSource).not.toContain('puzzleId !== "tile-swap"');
  });

  it("dispatches every history action directly instead of storing only the latest command", () => {
    expect(workspaceSource).not.toContain("historyCommand");
    expect(previewSource).not.toContain("historyCommand");
    expect(workspaceSource).toContain("dispatcher(action);");
    expect(previewSource).toContain("onHistoryDispatcherChange(dispatchHistoryAction)");
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

  it("registers shared history availability and dispatch callbacks for both puzzle types", () => {
    expect(workspaceSource).toContain("onHistoryAvailabilityChange={handleHistoryAvailabilityChange}");
    expect(workspaceSource).toContain("onHistoryDispatcherChange={handleHistoryDispatcherChange}");
    expect(previewSource).toContain("canUndo: runtime.history.undoStack.length > 0");
    expect(previewSource).toContain("canRedo: runtime.history.redoStack.length > 0");
  });
});
