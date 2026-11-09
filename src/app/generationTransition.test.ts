import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const app = read("../App.tsx");
const grid = read("../components/GridPuzzleWorkspace.tsx");
const sudoku = read("../components/SudokuWorkspace.tsx");
const solitaire = read("../components/SolitaireWorkspace.tsx");
const jigsaw = read("../components/JigsawWorkspace.tsx");
const imageTiles = read("../components/ImageTilePuzzleWorkspace.tsx");
const jigsawPreview = read("../components/TilePuzzlePreview.tsx");
const imagePreview = read("../components/ImageTilePuzzlePreview.tsx");

describe("generation transition boundaries", () => {
  it("captures the outgoing session before worker dispatch and preserves it for failure recovery", () => {
    const start = app.indexOf("  const beginGeneration = (");
    const end = app.indexOf("  const handleGeneratedPuzzle =", start);
    const transition = app.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(transition.indexOf("sessions.saveSession(")).toBeGreaterThan(-1);
    expect(transition.indexOf("sessions.saveSession(")).toBeLessThan(transition.indexOf("generation.beginGeneration("));
    expect(transition).toContain("fallback,");
    expect(transition).toContain("restoreSession(fallback.session, fallback.route)");
    expect(app).toContain("generationErrorHandlerRef.current(error)");
  });

  it("suspends every mounted puzzle surface while replacement generation runs", () => {
    expect(grid).toContain("inert={isGenerating}");
    expect(sudoku).toContain('class="sudoku-play-composition" inert={isGenerating}');
    expect(solitaire).toContain("inert={isGenerating}");
    expect(jigsaw).toContain("inert={isGenerating}");
    expect(imageTiles).toContain("inert={isGenerating}");
    expect(grid).toContain("disabled={isSolved || isGenerating}");
    expect(sudoku).toContain("enabled: Boolean(sudokuPuzzle && !isSolved && !isGenerating)");
  });

  it("blocks domain mutations before updated disabled props are rendered", () => {
    expect(app).toContain("if (!generation.hasActiveRequest()) grid.handleGridCellInput(");
    expect(app).toContain("if (!generation.hasActiveRequest()) solitaire.handleCardClick(");
    expect(app).toContain("if (generation.hasActiveRequest() || puzzle?.kind !==");
    expect(imagePreview).toContain("if (interactionSuspended || isSolved) return;");
  });

  it("cancels active Jigsaw dragging instead of committing in-flight moves", () => {
    expect(jigsaw).toContain("inputSuspended={isGenerating}");
    expect(jigsawPreview).toContain("cancelJigsawDragAction(activeDrag)");
    expect(jigsawPreview).toContain("if (inputSuspendedRef.current) return;");
  });
});
