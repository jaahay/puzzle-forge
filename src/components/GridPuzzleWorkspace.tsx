import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { getPuzzleProvenance } from "../app/puzzleProvenance";
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
import { usePuzzleCompletionPresentation } from "./usePuzzleCompletionPresentation";
import { WordGuessGame } from "./WordGuessGame";
import { WordGuessNewPuzzleControl } from "./WordGuessNewPuzzleControl";

const getFilledOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked && cell.value).length ?? 0;
const getOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked).length ?? 0;

export const getGridWorkspaceTerminalState = (
  puzzle: GridGeneratedPuzzle | null,
  cells: PuzzleCell[] | null,
): PuzzleTerminalState => {
  if (!puzzle || !cells || (puzzle.puzzleId !== "nonogram" && puzzle.puzzleId !== "futoshiki")) {
    return playingTerminalState;
  }

  return isGridPuzzleSolved(puzzle, cells) ? solvedTerminalState : playingTerminalState;
};

export const getGridPuzzleMetaItems = ({
  isFutoshiki,
  isWordGuess,
  filledOpenCount,
  openCount,
  dailyLabel,
}: {
  isFutoshiki: boolean;
  isWordGuess: boolean;
  filledOpenCount: number;
  openCount: number;
  dailyLabel: string | null;
}) => [
  ...(isWordGuess ? ["Answer-list solvable"] : []),
  ...(isFutoshiki
    ? [`${filledOpenCount}/${openCount} filled`]
    : !isWordGuess && dailyLabel
      ? [`Daily: ${dailyLabel}`]
      : []),
];

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
  onUndoGrid,
  onRedoGrid,
  onReset,
  onCheck,
  onNextPuzzleDraftChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
  onCellClick,
  onCellInput,
}: GridPuzzleWorkspaceProps) => {
  const isNonogram = selectedDefinition.id === "nonogram";
  const isWordGuess = selectedDefinition.id === "word-guess";
  const isFutoshiki = selectedDefinition.id === "futoshiki";
  const usesDedicatedStatus = isNonogram || isWordGuess || isFutoshiki;
  const terminalPuzzle = puzzle?.kind === "grid" ? puzzle : null;
  const terminalState = getGridWorkspaceTerminalState(terminalPuzzle, gridCells);
  const isSolved = terminalState.kind === "solved";
  const completion = usePuzzleCompletionPresentation({
    enabled: Boolean(terminalPuzzle && (isNonogram || isFutoshiki)),
    identity: terminalPuzzle?.id ?? `${selectedDefinition.id}:pending`,
    solved: isSolved,
    trackedKeys: isFutoshiki ? ["1", "2", "3", "4", "5", "Enter", " "] : ["Enter", " "],
  });
  const isCompletionPresented = isSolved && completion.phase === "completed";
  const filledOpenCount = getFilledOpenCount(gridCells);
  const openCount = getOpenCount(gridCells);
  const dailyLabel = puzzle ? getPuzzleProvenance(puzzle)?.dateStamp ?? null : null;
  const puzzleMetaItems = getGridPuzzleMetaItems({ isFutoshiki, isWordGuess, filledOpenCount, openCount, dailyLabel });
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
    if (isSolved) return;
    if (isNonogram) completion.recordCausativeInput();
    onCellClick(cell);
  };

  const handleCellInput = (cell: PuzzleCell, value: string) => {
    if (isSolved) return;
    if (isFutoshiki) completion.recordCausativeInput();
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

  const historyActions = puzzle && isNonogram ? (
    <PuzzleHistoryActions
      canUndo={canUndoGrid}
      canRedo={canRedoGrid}
      disabled={isGenerating || isSolved}
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

  const status = usesDedicatedStatus ? null : <p class="status-line" aria-live="polite">{statusMessage}</p>;
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
    >
      {isNonogram ? null : (
        <div class="puzzle-meta">
          {puzzleMetaItems.map((item) => <span key={item}>{item}</span>)}
        </div>
      )}
      {puzzle.puzzleId === "word-guess" && gridCells ? (
        <WordGuessGame
          puzzle={puzzle}
          cells={gridCells}
          statusMessage={statusMessage}
          onCellInput={onCellInput}
          onSubmitGuess={onCheck}
          onReset={onReset}
        />
      ) : puzzle.puzzleId === "futoshiki" && gridCells ? (
        <FutoshikiBoard
          puzzle={puzzle}
          cells={gridCells}
          selectedGridCell={isSolved ? null : selectedGridCell}
          onCellClick={handleCellClick}
          onCellInput={handleCellInput}
        />
      ) : gridCells ? (
        <GridPuzzlePreview
          puzzle={puzzle}
          cells={gridCells}
          selectedGridCell={isSolved ? null : selectedGridCell}
          onCellClick={handleCellClick}
          onCellInput={handleCellInput}
        />
      ) : null}
      {usesDedicatedStatus || puzzle.notes.length === 0 ? null : (
        <ul class="notes-list">{puzzle.notes.map((note) => <li key={note}>{note}</li>)}</ul>
      )}
    </section>
  ) : isGenerating ? loadingBoard : null;

  const gameplay = puzzle?.kind === "grid" && !isWordGuess ? (
    <div class="gameplay-control-stack">
      {isCompletionPresented ? (
        <PuzzleTerminalDock
          state={solvedTerminalState}
          label="Puzzle solved"
          ariaLabel={`${selectedDefinition.title} solved`}
          disabled={isGenerating}
          onReset={onReset}
          onNewPuzzle={onNewPuzzle}
        />
      ) : (
        <>
          <div class={`puzzle-actions ${isNonogram ? "nonogram-current-actions" : ""}`.trim()}>
            <button type="button" onClick={onCheck} disabled={isSolved}>Check</button>
            {isNonogram || isFutoshiki ? <button type="button" onClick={onReset} disabled={isGenerating || isSolved}>Reset</button> : null}
          </div>
          {validation}
        </>
      )}
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
