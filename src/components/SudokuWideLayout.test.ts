import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sudokuWorkspaceSource = readFileSync(new URL("./SudokuWorkspace.tsx", import.meta.url), "utf8");
const workspaceHierarchyCss = readFileSync(new URL("../site/workspace-hierarchy.css", import.meta.url), "utf8");
const numericGridCss = readFileSync(new URL("../site/numeric-grid.css", import.meta.url), "utf8");

describe("Sudoku wide/short play composition", () => {
  it("keeps the crown outside one Sudoku-owned board and gameplay composition", () => {
    expect(sudokuWorkspaceSource).toContain('class="sudoku-play-composition"');
    expect(sudokuWorkspaceSource).toContain('class="sudoku-play-board" aria-label="Puzzle board"');
    expect(sudokuWorkspaceSource).toContain('class="sudoku-play-controls" aria-label="Gameplay controls"');
    expect(sudokuWorkspaceSource).toContain("crown={currentPuzzleCrown}");
    expect(sudokuWorkspaceSource).toContain("play={playComposition}");
    expect(sudokuWorkspaceSource).toContain("board={playComposition ? null : board}");
    expect(sudokuWorkspaceSource).not.toContain("gameplay={gameplay}");
  });

  it("uses container width plus available block height instead of orientation", () => {
    expect(workspaceHierarchyCss).toMatch(
      /\.sudoku-workspace \.workspace-layout-play-surface\s*\{[^}]*container-type: inline-size;[^}]*container-name: sudoku-play-surface;/s,
    );
    expect(workspaceHierarchyCss).toContain("@media (max-height: 48rem)");
    expect(workspaceHierarchyCss).toContain("@container sudoku-play-surface (min-width: 45rem)");
    expect(workspaceHierarchyCss).not.toContain("orientation: landscape");
    expect(workspaceHierarchyCss).toMatch(
      /\.sudoku-play-composition\s*\{[^}]*grid-template-columns: minmax\(0, 42rem\) minmax\(12rem, 15rem\);/s,
    );
  });

  it("keeps the touch digit pad available beyond the narrow-width breakpoint", () => {
    expect(numericGridCss).toContain("@media (any-pointer: coarse)");
    expect(numericGridCss).toMatch(
      /@media \(any-pointer: coarse\)\s*\{\s*\.numeric-grid-digit-pad\s*\{[^}]*display: grid;/s,
    );
    expect(workspaceHierarchyCss).toMatch(
      /\.sudoku-play-controls \.numeric-grid-digit-pad\s*\{[^}]*display: grid;[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/s,
    );
  });

  it("keeps current identity/history/New out of the side rail", () => {
    const playComposition = sudokuWorkspaceSource.slice(
      sudokuWorkspaceSource.indexOf('const playComposition ='),
      sudokuWorkspaceSource.indexOf('return (\n    <PuzzleWorkspaceLayout'),
    );

    expect(playComposition).toContain("{board}");
    expect(playComposition).toContain("{gameplay}");
    expect(playComposition).not.toContain("currentPuzzleCrown");
    expect(playComposition).not.toContain("historyActions");
    expect(playComposition).not.toContain("newPuzzleControl");
  });
});
