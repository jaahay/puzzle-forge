import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("./ImageTilePuzzleWorkspace.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("./ImageTilePuzzlePreview.tsx", import.meta.url), "utf8");

describe("Tile Swap history integration", () => {
  it("owns Undo/Redo in the current-puzzle crown for Tile Swap only", () => {
    expect(workspaceSource).toContain('imagePuzzle && puzzleId === "tile-swap"');
    expect(workspaceSource).toContain("<PuzzleHistoryActions");
    expect(workspaceSource).toContain("historyControl={historyActions}");
    expect(workspaceSource).toContain("historyDispatcherRef");
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

  it("records completed swaps rather than tile selection as actions", () => {
    const firstSelection = previewSource.indexOf("if (!selectedTileId)");
    const historySwap = previewSource.indexOf("swapImageTileAction(", firstSelection);

    expect(firstSelection).toBeGreaterThan(-1);
    expect(historySwap).toBeGreaterThan(firstSelection);
    expect(
      previewSource.slice(firstSelection, historySwap),
    ).not.toContain("swapImageTileAction");
  });

  it("treats Reset as one reversible Tile Swap action without changing Sliding history", () => {
    expect(previewSource).toContain('if (puzzle.puzzleId !== "tile-swap")');
    expect(previewSource).toContain("resetImageTileAction(");
    expect(previewSource).toMatch(
      /slideTileTowardGap[\s\S]*?return \{[\s\S]*?\.\.\.current,[\s\S]*?progress:/,
    );
  });
});
