import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const controllerSource = readFileSync(new URL("../app/useSolitaireController.ts", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("./SolitaireWorkspace.tsx", import.meta.url), "utf8");

const sourceBetween = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThan(-1);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};

describe("Solitaire shared history integration", () => {
  it("uses the shared crown history controls with rendered and live availability", () => {
    const historyControl = sourceBetween(
      workspaceSource,
      "const historyActions = solitairePuzzle ? (",
      "const crown = solitairePuzzle ? (",
    );

    expect(historyControl).toContain("<PuzzleHistoryActions");
    expect(historyControl).toContain("canUndo={canUndoSolitaire}");
    expect(historyControl).toContain("canRedo={canRedoSolitaire}");
    expect(historyControl).toContain("canUndoNow={canUndoSolitaireNow}");
    expect(historyControl).toContain("canRedoNow={canRedoSolitaireNow}");
    expect(historyControl).toContain("onUndo={onUndoSolitaire}");
    expect(historyControl).toContain("onRedo={onRedoSolitaire}");
    expect(historyControl).not.toContain("isSolved");
    expect(workspaceSource).toContain("historyControl={historyActions}");
  });

  it("removes legacy history arrows while retaining Solitaire-specific board actions", () => {
    const actionControls = sourceBetween(
      workspaceSource,
      "const actionControls = isSolved ? (",
      "const loadingBoard = (",
    );

    expect(workspaceSource).not.toContain("Undo Solitaire move");
    expect(workspaceSource).not.toContain("Redo Solitaire move");
    expect(actionControls).toContain('class="solitaire-action-row"');
    expect(actionControls).toContain("onAutoMoveToFoundations");
    expect(actionControls).toContain('title="Auto foundation"');
    expect(actionControls).toContain("onClick={onReset}");
    expect(actionControls).toContain(">Reset</button>");
  });

  it("routes shortcuts through authoritative live controller state", () => {
    const stateUpdater = sourceBetween(
      controllerSource,
      "const updateSolitaireState =",
      "const setStatusMessage =",
    );
    const historyAction = sourceBetween(
      controllerSource,
      'const applyHistoryAction = (action: "undo" | "redo") => {',
      "const undoSolitaireMove =",
    );

    expect(controllerSource).toContain("const solitaireStateRef = useRef(solitaireState);");
    expect(stateUpdater).toContain("solitaireStateRef.current = next;");
    expect(stateUpdater).toContain("setRenderedSolitaireState(next);");
    expect(stateUpdater.indexOf("solitaireStateRef.current = next;")).toBeLessThan(
      stateUpdater.indexOf("setRenderedSolitaireState(next);"),
    );
    expect(controllerSource).toContain("const canUndoSolitaireNow =");
    expect(controllerSource).toContain("const canRedoSolitaireNow =");
    expect(historyAction).toContain("const current = solitaireStateRef.current;");
    expect(historyAction).toContain("applySolitaireHistoryAction({");
    expect(historyAction).toContain("updateSolitaireState(() => ({");
    expect(appSource).toContain("canUndoSolitaireNow: solitaire.canUndoSolitaireNow");
    expect(appSource).toContain("canRedoSolitaireNow: solitaire.canRedoSolitaireNow");
  });

  it("preserves Solitaire's existing solved-terminal history policy", () => {
    expect(controllerSource).toMatch(
      /if \(isSolved\) \{[\s\S]*?solitaireUndoStack: \[\],[\s\S]*?solitaireRedoStack: \[\],[\s\S]*?\}/,
    );
    expect(workspaceSource).toContain("<PuzzleTerminalDock");
    expect(workspaceSource).toContain("disabled={isSolved}");
  });

  it("keeps existing Solitaire session history as the single persisted history model", () => {
    expect(appSource).toContain("solitaireUndoStack: solitaire.solitaireUndoStack");
    expect(appSource).toContain("solitaireRedoStack: solitaire.solitaireRedoStack");
    expect(controllerSource).not.toContain("PuzzleHistoryActions");
  });
});
