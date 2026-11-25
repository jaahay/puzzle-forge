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
const jigsawNewCommandSource = readFileSync(new URL("./JigsawNewPuzzleControl.tsx", import.meta.url), "utf8");
const terminalDockSource = readFileSync(new URL("./PuzzleTerminalDock.tsx", import.meta.url), "utf8");
const imageTileWorkspaceSource = readFileSync(new URL("./ImageTilePuzzleWorkspace.tsx", import.meta.url), "utf8");
const solitaireWorkspaceSource = readFileSync(new URL("./SolitaireWorkspace.tsx", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("./PuzzleWorkspaceLayout.tsx", import.meta.url), "utf8");

describe("terminal interaction contracts", () => {
  it("keeps New in the crown and adds a contextual Next shortcut at completion", () => {
    expect(terminalDockSource).toContain("onNextPuzzle: () => void");
    expect(terminalDockSource).toContain('class="terminal-next-action"');
    expect(terminalDockSource).toContain("Next puzzle");
    expect(sudokuWorkspaceSource).toContain('aria-label="Reset current Sudoku"');
    expect(sudokuWorkspaceSource).toContain('class="terminal-next-action"');
    expect(sudokuWorkspaceSource).toContain("onClick={() => onNewPuzzle()}");
    for (const workspace of [gridWorkspaceSource, imageTileWorkspaceSource, solitaireWorkspaceSource]) {
      expect(workspace).toContain("newPuzzleControl={newPuzzleControl}");
      const terminal = workspace.slice(workspace.indexOf("<PuzzleTerminalDock"));
      expect(terminal.slice(0, terminal.indexOf("/>"))).toContain("onNextPuzzle=");
    }
    expect(wordGuessSource).toContain("onNextPuzzle={onNewPuzzle}");
    expect(terminalDockSource).toContain('<PuzzleShareButton intent="progress" disabled={disabled} />');
    expect(sudokuWorkspaceSource).toContain('<PuzzleShareButton intent="progress" disabled={isGenerating || !isPresentationCompleted}');
  });

  it("removes hidden completed Sudoku controls from keyboard navigation", () => {
    expect(sudokuWorkspaceSource).toContain("inert={isSolved}");
    expect(sudokuWorkspaceSource).toContain("aria-hidden={isSolved || undefined}");
    expect(sudokuWorkspaceSource).toContain("tabIndex={isPresentationCompleted ? 0 : -1}");
  });

  it("keeps the reserved grid validation lane mounted after completion", () => {
    expect(gridWorkspaceSource).toContain("      )}\n      {validation}\n    </div>");
  });

  it("disables solved Nonogram and Futoshiki interaction at the board boundary", () => {
    expect(gridWorkspaceSource).toMatch(/<FutoshikiBoard[\s\S]*?disabled=\{isSolved \|\| isGenerating\}[\s\S]*?<\/FutoshikiBoard>|<FutoshikiBoard[\s\S]*?disabled=\{isSolved \|\| isGenerating\}[\s\S]*?\/>/);
    expect(gridWorkspaceSource).toMatch(/<GridPuzzlePreview[\s\S]*?disabled=\{isSolved \|\| isGenerating\}[\s\S]*?\/>/);
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

  it("clears stale grid status on successful Undo and Redo while keeping solved feedback", () => {
    const start = gridControllerSource.indexOf("const undoGridAction =");
    const end = gridControllerSource.indexOf("const updateGridCells =", start);
    const actions = gridControllerSource.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(actions.match(/restoreGridHistoryEntry\(transition\.entry\);\s*onStatusMessage\(""\);/g)).toHaveLength(2);
    expect(actions).toContain('onStatusMessage("Solved.");');
    expect(actions).not.toContain("Undid last puzzle action.");
    expect(actions).not.toContain("Redid last puzzle action.");
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
    expect(jigsawSource).toContain('shareResult={isSolved && completion.phase === "completed"}');
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
    expect(newCommandSource).toMatch(/>\s*New\s*<\/button>/);
    expect(newCommandSource).toContain('class="new-puzzle-command-caret"');
    expect(newCommandSource).not.toContain("compactActions");
    expect(jigsawNewCommandSource).not.toContain("compactActions");
    expect(newCommandSource).toContain('class="new-puzzle-restart-current"');
    expect(newCommandSource).not.toContain("openOptionsRequest");
    expect(newCommandSource).toContain('document.addEventListener("keydown", handleKeyDown, true)');
    expect(layoutSource).toContain(".new-puzzle-options[open]");
    expect(layoutSource).not.toContain("[data-workspace-escape-layer]");
    expect(immersiveCss).toContain(".workspace-layout-header.workspace-layout-crown");
    expect(jigsawCss).toContain("background: #111827");
    expect(jigsawCss).not.toContain(".jigsaw-workspace .current-puzzle-new-action .new-puzzle-split-control");
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
