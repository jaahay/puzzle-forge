import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gridWorkspaceSource = readFileSync(new URL("./GridPuzzleWorkspace.tsx", import.meta.url), "utf8");
const sudokuWorkspaceSource = readFileSync(new URL("./SudokuWorkspace.tsx", import.meta.url), "utf8");
const gridControllerSource = readFileSync(new URL("../app/useGridController.ts", import.meta.url), "utf8");
const gridPreviewSource = readFileSync(new URL("./GridPuzzlePreview.tsx", import.meta.url), "utf8");
const futoshikiSource = readFileSync(new URL("./FutoshikiBoard.tsx", import.meta.url), "utf8");
const wordGuessSource = readFileSync(new URL("./WordGuessGame.tsx", import.meta.url), "utf8");
const jigsawSource = readFileSync(new URL("./JigsawWorkspace.tsx", import.meta.url), "utf8");
const jigsawPreviewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const jigsawCss = readFileSync(new URL("../site/jigsaw.css", import.meta.url), "utf8");
const immersiveCss = readFileSync(new URL("../site/immersive.css", import.meta.url), "utf8");
const newCommandSource = readFileSync(new URL("./NewPuzzleCommand.tsx", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("./PuzzleWorkspaceLayout.tsx", import.meta.url), "utf8");

describe("terminal interaction contracts", () => {
  it("keeps the reserved grid validation lane mounted after completion", () => {
    expect(gridWorkspaceSource).toContain("      )}\n      {validation}\n    </div>");
  });

  it("disables solved Nonogram and Futoshiki interaction at the board boundary", () => {
    expect(gridWorkspaceSource).toMatch(/<FutoshikiBoard[\s\S]*?disabled=\{isSolved\}[\s\S]*?<\/FutoshikiBoard>|<FutoshikiBoard[\s\S]*?disabled=\{isSolved\}[\s\S]*?\/>/);
    expect(gridWorkspaceSource).toMatch(/<GridPuzzlePreview[\s\S]*?disabled=\{isSolved\}[\s\S]*?\/>/);
    expect(gridPreviewSource).toContain("const interactionDisabled = disabled || isSudokuSolved;");
    expect(gridPreviewSource).toContain("disabled={!isSelectable}");
    expect(futoshikiSource).toContain("enabled: !disabled");
    expect(futoshikiSource).toContain('disabled ? "" : "interactive-cell"');
    expect(futoshikiSource).toContain("disabled={disabled}");
    expect(futoshikiSource).not.toMatch(/["']correct-cell["']/);
  });

  it("exposes shared history controls for Futoshiki and Word Guess while disabling solved grid play", () => {
    expect(gridWorkspaceSource).toContain(
      "const historyActions = puzzle && (isNonogram || isFutoshiki || isWordGuess) ? (",
    );
    expect(gridWorkspaceSource).toMatch(
      /<PuzzleHistoryActions[\s\S]*?disabled=\{isGenerating \|\| isSolved\}[\s\S]*?\/>/,
    );
  });

  it("uses the same staged Sudoku completion presentation for explicit Check", () => {
    expect(sudokuWorkspaceSource).toMatch(/const handleCheck = \(\) => \{[\s\S]*?completion\.recordCausativeInput\(\);[\s\S]*?onCheck\(\);[\s\S]*?\};/);
  });

  it("prevents solved Sudoku history controls and shortcuts from returning to active play", () => {
    expect(sudokuWorkspaceSource).toMatch(/<PuzzleHistoryActions[\s\S]*?disabled=\{isGenerating \|\| isSolved\}[\s\S]*?\/>/);
    expect(gridControllerSource.match(/supportsAutomaticGridCompletion\(puzzle\.puzzleId\) && isGridPuzzleSolved\(puzzle, currentCells\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("disables Word Guess terminal continuation while replacement generation is active", () => {
    expect(gridWorkspaceSource).toMatch(/<WordGuessGame[\s\S]*?disabled=\{isGenerating\}[\s\S]*?\/>/);
    expect(wordGuessSource).toContain("disabled={disabled}");
  });

  it("keeps Word Guess terminal announcements in its detailed status live region only", () => {
    expect(wordGuessSource).toContain('class="word-guess-status" aria-live="polite"');
    expect(wordGuessSource).toMatch(/<PuzzleTerminalDock[\s\S]*?announce=\{false\}[\s\S]*?\/>|<PuzzleTerminalDock[\s\S]*?announce=\{false\}[\s\S]*?>/);
  });

  it("keeps Jigsaw navigation in its header without duplicating completion actions on the board", () => {
    expect(jigsawSource).toContain("usePuzzleCompletionPresentation");
    expect(jigsawSource).not.toContain("PuzzleTerminalDock");
    expect(jigsawSource).toContain('const crown = jigsawPuzzle ? (');
    expect(jigsawSource).toContain("newPuzzleControl={newPuzzleControl}");
    expect(jigsawSource).toContain("onRestartPuzzle={isSolved ? resetJigsaw : undefined}");
    expect(jigsawSource).toContain("completionPhase={completion.phase}");
    expect(jigsawSource).toContain("onCausativeInput={completion.recordCausativeInput}");
    expect(jigsawSource).toContain("onCompletionAnimationEnd={completion.completePresentation}");
    expect(jigsawPreviewSource).toContain("shouldShowJigsawCompletionCelebration(isSolved, completionPhase)");
    expect(jigsawPreviewSource).toContain('class="jigsaw-solved-card is-celebrating"');
    expect(jigsawPreviewSource).toContain('class="jigsaw-completion-announcement" role="status" aria-live="polite"');
    expect(jigsawPreviewSource).not.toContain("showCompletionControls");
    expect(jigsawPreviewSource).not.toContain("onChoosePuzzle");
    expect(jigsawPreviewSource).not.toContain('class="jigsaw-solved-card is-completed"');
    expect(jigsawCss).not.toContain(".jigsaw-solved-actions {");
    expect(jigsawCss).not.toContain(".jigsaw-solved-card.is-completed");
    expect(newCommandSource).toContain("compactActions ? <RandomIcon />");
    expect(newCommandSource).toContain("compactActions ? <PuzzlePickerIcon />");
    expect(newCommandSource).toContain('class="new-puzzle-restart-current"');
    expect(newCommandSource).not.toContain("openOptionsRequest");
    expect(newCommandSource).toContain('document.addEventListener("keydown", handleKeyDown, true)');
    expect(layoutSource).toContain(".new-puzzle-options[open]");
    expect(layoutSource).not.toContain("[data-workspace-escape-layer]");
    expect(immersiveCss).toContain(".workspace-layout-header.workspace-layout-crown");
    expect(jigsawCss).toContain("background: #111827");
    expect(jigsawCss).toContain(".jigsaw-workspace .current-puzzle-new-action .new-puzzle-split-control");
    expect(jigsawCss).toContain(".jigsaw-workspace.is-immersive .new-puzzle-options-panel");
  });

  it("celebrates only the causative final drop and keeps solved artwork visually quiet afterward", () => {
    expect(jigsawPreviewSource).toMatch(
      /if \(completed\.solved\) onCausativeInput\(\);/,
    );
    expect(jigsawPreviewSource).toContain("showEdgeSeams && !isSolved ? seams.map(");
    expect(jigsawPreviewSource).toContain("hidden={isSolved}");
    expect(jigsawPreviewSource).not.toContain('isSolved ? "is-solved"');
    expect(jigsawCss).not.toContain(".tile-puzzle-tools.is-solved");
    expect(jigsawCss).toContain(".jigsaw-freeform-stage.solved .jigsaw-island-artwork");
    expect(jigsawCss).toContain(".jigsaw-freeform-stage.solved .tile-puzzle-piece-outline");
    expect(jigsawCss).toContain(".jigsaw-freeform-stage.completion-celebrating .jigsaw-world-layer");
    expect(jigsawCss).toContain("animation: jigsaw-solved-card-arrive 620ms ease-out both;");
    expect(jigsawCss).toContain("animation: jigsaw-solved-world-settle 620ms ease-out both;");
    expect(jigsawCss).not.toContain(".jigsaw-freeform-stage.solved .jigsaw-world-layer");
    expect(jigsawCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.jigsaw-solved-card\.is-celebrating[\s\S]*?animation: none;/,
    );
  });
});
