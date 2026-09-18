import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gridWorkspaceSource = readFileSync(new URL("./GridPuzzleWorkspace.tsx", import.meta.url), "utf8");
const sudokuWorkspaceSource = readFileSync(new URL("./SudokuWorkspace.tsx", import.meta.url), "utf8");
const gridControllerSource = readFileSync(new URL("../app/useGridController.ts", import.meta.url), "utf8");
const gridPreviewSource = readFileSync(new URL("./GridPuzzlePreview.tsx", import.meta.url), "utf8");
const futoshikiSource = readFileSync(new URL("./FutoshikiBoard.tsx", import.meta.url), "utf8");
const wordGuessSource = readFileSync(new URL("./WordGuessGame.tsx", import.meta.url), "utf8");
const jigsawSource = readFileSync(new URL("./JigsawWorkspace.tsx", import.meta.url), "utf8");

describe("terminal interaction contracts", () => {
  it("disables solved Nonogram and Futoshiki interaction at the board boundary", () => {
    expect(gridWorkspaceSource).toMatch(/<FutoshikiBoard[\s\S]*?disabled=\{isSolved\}[\s\S]*?<\/FutoshikiBoard>|<FutoshikiBoard[\s\S]*?disabled=\{isSolved\}[\s\S]*?\/>/);
    expect(gridWorkspaceSource).toMatch(/<GridPuzzlePreview[\s\S]*?disabled=\{isSolved\}[\s\S]*?\/>/);
    expect(gridPreviewSource).toContain("const interactionDisabled = disabled || isSudokuSolved;");
    expect(gridPreviewSource).toContain("disabled={!isSelectable}");
    expect(futoshikiSource).toContain("enabled: !disabled");
    expect(futoshikiSource).toContain('disabled ? "" : "interactive-cell"');
    expect(futoshikiSource).toContain("disabled={disabled}");
  });

  it("prevents solved Sudoku history controls and shortcuts from returning to active play", () => {
    expect(sudokuWorkspaceSource).toMatch(/<PuzzleHistoryActions[\s\S]*?disabled=\{isGenerating \|\| isSolved\}[\s\S]*?\/>/);
    expect(gridControllerSource.match(/supportsAutomaticGridCompletion\(puzzle\.puzzleId\) && isGridPuzzleSolved\(puzzle, currentCells\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("disables Word Guess terminal continuation while replacement generation is active", () => {
    expect(gridWorkspaceSource).toMatch(/<WordGuessGame[\s\S]*?disabled=\{isGenerating\}[\s\S]*?\/>/);
    expect(wordGuessSource).toContain("disabled={disabled}");
  });

  it("keeps Jigsaw completion direct instead of using an unconnected presentation lifecycle", () => {
    expect(jigsawSource).not.toContain("usePuzzleCompletionPresentation");
    expect(jigsawSource).toContain("isSolved ? (");
  });
});
