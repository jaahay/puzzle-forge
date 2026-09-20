import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const controllerSource = readFileSync(new URL("../app/useSolitaireController.ts", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("./SolitaireWorkspace.tsx", import.meta.url), "utf8");

describe("Solitaire shared history integration", () => {
  it("uses the shared crown history controls and removes the legacy board-local arrows", () => {
    expect(workspaceSource).toContain("<PuzzleHistoryActions");
    expect(workspaceSource).toContain("historyControl={historyActions}");
    expect(workspaceSource).toContain("canUndoNow={canUndoSolitaireNow}");
    expect(workspaceSource).toContain("canRedoNow={canRedoSolitaireNow}");
    expect(workspaceSource).not.toContain("Undo Solitaire move");
    expect(workspaceSource).not.toContain("Redo Solitaire move");
    expect(workspaceSource).toContain("onAutoMoveToFoundations");
  });

  it("routes shortcuts through authoritative live controller state", () => {
    expect(controllerSource).toContain("const solitaireStateRef = useRef(solitaireState);");
    expect(controllerSource).toContain("const canUndoSolitaireNow =");
    expect(controllerSource).toContain("const canRedoSolitaireNow =");
    expect(controllerSource).toContain("const current = solitaireStateRef.current;");
    expect(controllerSource).toContain("applySolitaireHistoryAction({");
    expect(appSource).toContain("canUndoSolitaireNow: solitaire.canUndoSolitaireNow");
    expect(appSource).toContain("canRedoSolitaireNow: solitaire.canRedoSolitaireNow");
  });

  it("preserves Solitaire's existing terminal history policy", () => {
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
