import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { useState } from "preact/hooks";
import { playingTerminalState, solvedTerminalState, type PuzzleTerminalState } from "../app/puzzleTerminalState";
import { isGridPuzzleSolved } from "../interactions/gridChecking";
import { getBoardViewportNaturalWidth } from "./BoardViewport";
import { CurrentPuzzleHeader, getPuzzleArrivalIdentity, usePuzzleArrival } from "./CurrentPuzzleIdentity";
import { FutoshikiBoard } from "./FutoshikiBoard";
import { FutoshikiNewPuzzleControl } from "./FutoshikiNewPuzzleControl";
import { GridPuzzlePreview } from "./GridPuzzlePreview";
import { NonogramNewPuzzleControl } from "./NonogramNewPuzzleControl";
import { PuzzleHistoryActions } from "./PuzzleHistoryActions";
import { PuzzleTerminalDock } from "./PuzzleTerminalDock";
import type { GridPuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { WordGuessGame } from "./WordGuessGame";
import { WordGuessNewPuzzleControl } from "./WordGuessNewPuzzleControl";

export const getGridWorkspaceTerminalState = (
  puzzle: GridGeneratedPuzzle | null,
  cells: PuzzleCell[] | null,
): PuzzleTerminalState => {
  if (!puzzle || !cells || (puzzle.puzzleId !== "nonogram" && puzzle.puzzleId !== "futoshiki")) {
    return playingTerminalState;
  }

  return isGridPuzzleSolved(puzzle, cells) ? solvedTerminalState : playingTerminalState;
};

export type NonogramMarkMode = "fill" | "cross";

export const getNextNonogramMark = (current: string, mode: NonogramMarkMode) => {
  const mark = mode === "fill" ? "■" : "×";
  return current === mark ? "" : mark;
};

export const GridPuzzleWorkspace = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  puzzle,
  nextPuzzleDraft,
  seedLoadInput,
  gridCells,
  selectedGridCell,
  gridCheckFeedbackTone,
  statusMessage,
  isGenerating,
  canUndoGrid,
  canRedoGrid,
  canUndoGridNow,
  canRedoGridNow,
  onUndoGrid,
  onRedoGrid,
  onCommitGridHistory,
  onReset,
  onRuntimeProgressChange,
  onCheck,
  onNextPuzzleDraftChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
  onCellClick,
  onCellInput,
}: GridPuzzleWorkspaceProps) => {
  const [nonogramMarkMode, setNonogramMarkMode] = useState<NonogramMarkMode>("fill");
  const isNonogram = selectedDefinition.id === "nonogram";
  const isWordGuess = selectedDefinition.id === "word-guess";
  const isFutoshiki = selectedDefinition.id === "futoshiki";
  const usesDedicatedStatus = isNonogram || isWordGuess || isFutoshiki;
  const terminalPuzzle = puzzle?.kind === "grid" ? puzzle : null;
  const terminalState = getGridWorkspaceTerminalState(terminalPuzzle, gridCells);
  const isSolved = terminalState.kind === "solved";
  const workspaceClass = [
    isNonogram ? "nonogram-workspace" : "",
    isWordGuess ? "word-guess-workspace" : "",
    isFutoshiki ? "futoshiki-workspace" : "",
  ].filter(Boolean).join(" ");
  const nonogramRowClueSlots = puzzle?.kind === "grid" && isNonogram
    ? Math.max(1, ...(puzzle.clues?.rows ?? []).map((clue) => clue.length))
    : 1;
  const playColumnMax = puzzle?.kind === "grid" && isNonogram
    ? getBoardViewportNaturalWidth({ kind: "nonogram", columns: puzzle.width, rowClueSlots: nonogramRowClueSlots })
    : undefined;
  const hasCrown = Boolean(puzzle && (isNonogram || isWordGuess || isFutoshiki));
  const puzzleArrivalIdentity = hasCrown && puzzle ? getPuzzleArrivalIdentity(puzzle) : null;
  const isPuzzleArriving = usePuzzleArrival(puzzleArrivalIdentity);

  const handleCellClick = (cell: PuzzleCell) => {
    if (isGenerating || isSolved) return;
    if (isNonogram) {
      // Both marking modes share the existing grid edit/history/persistence path.
      onCellInput(cell, getNextNonogramMark(cell.value, nonogramMarkMode));
      return;
    }
    onCellClick(cell);
  };

  const handleCellInput = (cell: PuzzleCell, value: string) => {
    if (isGenerating || isSolved) return;
    onCellInput(cell, value);
  };

  const newPuzzleControl = !puzzle ? null : isNonogram ? (
    <NonogramNewPuzzleControl
      currentSeed={puzzle.seed}
      difficulty={nextPuzzleDraft.difficulty}
      width={nextPuzzleDraft.width}
      height={nextPuzzleDraft.height}
      minWidth={selectedDefinition.minWidth}
      maxWidth={selectedDefinition.maxWidth}
      minHeight={selectedDefinition.minHeight}
      maxHeight={selectedDefinition.maxHeight}
      requireUniqueSolution={nextPuzzleDraft.requireUniqueSolution}
      seedLoadInput={seedLoadInput}
      disabled={isGenerating || !selectedPuzzleIsGeneratable}
      onDifficultyChange={(difficulty) => onNextPuzzleDraftChange({ difficulty })}
      onWidthChange={(width) => onNextPuzzleDraftChange({ width })}
      onHeightChange={(height) => onNextPuzzleDraftChange({ height })}
      onUniqueSolutionChange={(requireUniqueSolution) => onNextPuzzleDraftChange({ requireUniqueSolution })}
      onSeedLoadInputChange={onSeedLoadInputChange}
      onNewPuzzle={onNewPuzzle}
      onToday={onToday}
      onLoadSeed={onLoadSeed}
    />
  ) : isWordGuess ? (
    <WordGuessNewPuzzleControl
      currentSeed={puzzle.seed}
      width={nextPuzzleDraft.width}
      height={nextPuzzleDraft.height}
      minWidth={selectedDefinition.minWidth}
      maxWidth={selectedDefinition.maxWidth}
      minHeight={selectedDefinition.minHeight}
      maxHeight={selectedDefinition.maxHeight}
      seedLoadInput={seedLoadInput}
      disabled={isGenerating || !selectedPuzzleIsGeneratable}
      onWidthChange={(width) => onNextPuzzleDraftChange({ width })}
      onHeightChange={(height) => onNextPuzzleDraftChange({ height })}
      onSeedLoadInputChange={onSeedLoadInputChange}
      onNewPuzzle={onNewPuzzle}
      onToday={onToday}
      onLoadSeed={onLoadSeed}
    />
  ) : isFutoshiki ? (
    <FutoshikiNewPuzzleControl
      currentSeed={puzzle.seed}
      difficulty={nextPuzzleDraft.difficulty}
      seedLoadInput={seedLoadInput}
      disabled={isGenerating || !selectedPuzzleIsGeneratable}
      onDifficultyChange={(difficulty) => onNextPuzzleDraftChange({ difficulty })}
      onSeedLoadInputChange={onSeedLoadInputChange}
      onNewPuzzle={onNewPuzzle}
      onToday={onToday}
      onLoadSeed={onLoadSeed}
    />
  ) : null;

  const historyActions = puzzle && (isNonogram || isFutoshiki || isWordGuess) ? (
    <PuzzleHistoryActions
      canUndo={canUndoGrid}
      canRedo={canRedoGrid}
      disabled={isGenerating || isSolved}
      canUndoNow={canUndoGridNow}
      canRedoNow={canRedoGridNow}
      onUndo={onUndoGrid}
      onRedo={onRedoGrid}
    />
  ) : null;

  const currentPuzzleCrown = puzzle && hasCrown ? (
    <CurrentPuzzleHeader
      key={puzzleArrivalIdentity ?? undefined}
      puzzle={puzzle}
      historyControl={historyActions}
      newPuzzleControl={newPuzzleControl}
      isArriving={isPuzzleArriving}
    />
  ) : null;

  const status = usesDedicatedStatus || !statusMessage ? null : <p class="status-line" aria-live="polite">{statusMessage}</p>;
  const validationMessage = !isSolved && gridCheckFeedbackTone ? statusMessage : "";
  const validation = isNonogram || isFutoshiki ? (
    <p
      class={`grid-validation-message ${validationMessage ? gridCheckFeedbackTone : "is-idle"}`}
      aria-hidden={validationMessage ? undefined : true}
      aria-live="polite"
    >
      {validationMessage || "\u00a0"}
    </p>
  ) : null;

  const loadingBoard = (
    <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label={`${selectedDefinition.title} is generating`}>
      <div class="puzzle-loading-copy"><strong>Generating {selectedDefinition.title}</strong><span>{statusMessage}</span></div>
      <div class="puzzle-loading-grid" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
      </div>
    </section>
  );

  const board = puzzle?.kind === "grid" ? (
    <section
      key={puzzleArrivalIdentity ?? undefined}
      class={`puzzle-panel${hasCrown && isPuzzleArriving ? " puzzle-arrival" : ""}`}
      aria-label="Generated puzzle preview"
      inert={isGenerating}
    >
      {isNonogram && gridCells ? (
        <div class="nonogram-mark-mode" role="group" aria-label="Nonogram cell marking">
          <button type="button" aria-pressed={nonogramMarkMode === "fill"} onClick={() => setNonogramMarkMode("fill")} disabled={isGenerating || isSolved}>Fill</button>
          <button type="button" aria-pressed={nonogramMarkMode === "cross"} onClick={() => setNonogramMarkMode("cross")} disabled={isGenerating || isSolved} aria-label="Empty × (mark cells empty)">Empty ×</button>
        </div>
      ) : null}
      {puzzle.puzzleId === "word-guess" && gridCells ? (
        <WordGuessGame
          puzzle={puzzle}
          cells={gridCells}
          statusMessage={statusMessage}
          onCellInput={onCellInput}
          onProgressChange={(report) => onRuntimeProgressChange(puzzle.id, report)}
          onSubmitGuess={onCheck}
          onCommitCurrentGuess={onCommitGridHistory}
          onReset={onReset}
          onNewPuzzle={() => onNewPuzzle()}
          disabled={isGenerating}
        />
      ) : puzzle.puzzleId === "futoshiki" && gridCells ? (
        <FutoshikiBoard
          puzzle={puzzle}
          cells={gridCells}
          selectedGridCell={isSolved ? null : selectedGridCell}
          disabled={isSolved || isGenerating}
          onCellClick={handleCellClick}
          onCellInput={handleCellInput}
        />
      ) : gridCells ? (
        <GridPuzzlePreview
          puzzle={puzzle}
          cells={gridCells}
          selectedGridCell={isSolved ? null : selectedGridCell}
          disabled={isSolved || isGenerating}
          onCellClick={handleCellClick}
          onCellInput={handleCellInput}
        />
      ) : null}
    </section>
  ) : isGenerating ? loadingBoard : null;

  const gameplay = puzzle?.kind === "grid" && !isWordGuess ? (
    <div class="gameplay-control-stack">
      {isSolved ? (
        <PuzzleTerminalDock
          state={solvedTerminalState}
          label="Puzzle solved"
          ariaLabel={`${selectedDefinition.title} solved`}
          disabled={isGenerating}
          onReset={() => onReset()}
          onNextPuzzle={() => onNewPuzzle()}
        />
      ) : (
        <div class={`puzzle-actions ${isNonogram ? "nonogram-current-actions" : ""}`.trim()}>
          <button type="button" onClick={onCheck} disabled={isGenerating}>Check</button>
          {isNonogram || isFutoshiki ? <button type="button" onClick={() => onReset()} disabled={isGenerating}>Reset</button> : null}
        </div>
      )}
      {validation}
    </div>
  ) : null;

  return (
    <PuzzleWorkspaceLayout
      className={workspaceClass}
      crown={currentPuzzleCrown}
      status={status}
      board={board}
      gameplay={gameplay}
      playColumnMax={playColumnMax}
    />
  );
};
