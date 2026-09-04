import type { PuzzleCell } from "../catalog/types";
import { getCanonicalDailyPuzzleLabel } from "../games/shared/daily";
import { getBoardViewportNaturalWidth } from "./BoardViewport";
import { CurrentPuzzleHeader, getPuzzleArrivalIdentity, usePuzzleArrival } from "./CurrentPuzzleIdentity";
import { FutoshikiBoard } from "./FutoshikiBoard";
import { GridPuzzlePreview } from "./GridPuzzlePreview";
import { NonogramNewPuzzleControl } from "./NonogramNewPuzzleControl";
import { PuzzleHistoryActions } from "./PuzzleHistoryActions";
import { BottomPuzzleConfiguration, TopPuzzleConfiguration } from "./PuzzleConfiguration";
import type { GridPuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { SeedControl } from "./SeedControl";
import { WordGuessGame } from "./WordGuessGame";

const getFilledOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked && cell.value).length ?? 0;
const getOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked).length ?? 0;

export const GridPuzzleWorkspace = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  seed,
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
  const isFixedSize = selectedDefinition.minWidth === selectedDefinition.maxWidth && selectedDefinition.minHeight === selectedDefinition.maxHeight;
  const filledOpenCount = getFilledOpenCount(gridCells);
  const openCount = getOpenCount(gridCells);
  const dailyLabel = puzzle ? getCanonicalDailyPuzzleLabel(puzzle) : null;
  const workspaceClass = [
    isNonogram ? "nonogram-workspace" : "",
    isWordGuess ? "word-guess-workspace" : "",
    isFutoshiki ? "futoshiki-workspace" : "",
  ].filter(Boolean).join(" ");
  const seedInput = <SeedControl currentSeed={puzzle?.seed ?? seed} seed={seedLoadInput} onSeedChange={onSeedLoadInputChange} />;
  const nonogramRowClueSlots = puzzle?.kind === "grid" && isNonogram
    ? Math.max(1, ...(puzzle.clues?.rows ?? []).map((clue) => clue.length))
    : 1;
  const playColumnMax = puzzle?.kind === "grid" && isNonogram
    ? getBoardViewportNaturalWidth({ kind: "nonogram", columns: puzzle.width, rowClueSlots: nonogramRowClueSlots })
    : undefined;
  const puzzleArrivalIdentity = puzzle && isNonogram ? getPuzzleArrivalIdentity(puzzle) : null;
  const isPuzzleArriving = usePuzzleArrival(puzzleArrivalIdentity);

  const newPuzzleControl = puzzle && isNonogram ? (
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
  ) : null;
  const historyActions = puzzle && isNonogram ? (
    <PuzzleHistoryActions
      canUndo={canUndoGrid}
      canRedo={canRedoGrid}
      disabled={isGenerating}
      onUndo={onUndoGrid}
      onRedo={onRedoGrid}
    />
  ) : null;
  const currentPuzzleHeader = puzzle && isNonogram ? (
    <CurrentPuzzleHeader
      key={puzzleArrivalIdentity ?? undefined}
      puzzle={puzzle}
      newPuzzleControl={(
        <div class="current-puzzle-header-actions">
          {newPuzzleControl}
          {historyActions}
        </div>
      )}
      isArriving={isPuzzleArriving}
    />
  ) : newPuzzleControl;

  const generation = !puzzle || isNonogram ? null : isWordGuess ? (
    <BottomPuzzleConfiguration
      kind="word-guess"
      selectedDefinition={selectedDefinition}
      selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
      seedInput={seedInput}
      width={nextPuzzleDraft.width}
      height={nextPuzzleDraft.height}
      isGenerating={isGenerating}
      onWidthChange={(width) => onNextPuzzleDraftChange({ width })}
      onHeightChange={(height) => onNextPuzzleDraftChange({ height })}
      onSettingsCommit={onNextPuzzleDraftChange}
      onToday={onToday}
      onUseSeed={onLoadSeed}
      onRandomize={onNewPuzzle}
      onReset={onReset}
    />
  ) : isFutoshiki ? (
    <BottomPuzzleConfiguration
      kind="futoshiki"
      selectedDefinition={selectedDefinition}
      selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
      seedInput={seedInput}
      difficulty={nextPuzzleDraft.difficulty}
      isGenerating={isGenerating}
      onDifficultyChange={(difficulty) => onNextPuzzleDraftChange({ difficulty })}
      onToday={onToday}
      onUseSeed={onLoadSeed}
      onRandomize={onNewPuzzle}
      onReset={onReset}
    />
  ) : (
    <TopPuzzleConfiguration
      selectedDefinition={selectedDefinition}
      selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
      seedInput={seedInput}
      width={nextPuzzleDraft.width}
      height={nextPuzzleDraft.height}
      isFixedSize={isFixedSize}
      isGenerating={isGenerating}
      onWidthChange={(width) => onNextPuzzleDraftChange({ width })}
      onHeightChange={(height) => onNextPuzzleDraftChange({ height })}
      onSettingsCommit={onNextPuzzleDraftChange}
      onToday={onToday}
      onUseSeed={onLoadSeed}
      onRandomize={onNewPuzzle}
      onReset={onReset}
    />
  );

  const status = usesDedicatedStatus ? null : <p class="status-line" aria-live="polite">{statusMessage}</p>;
  const validation = isNonogram && gridCheckFeedbackTone ? (
    <p class={`grid-validation-message ${gridCheckFeedbackTone}`} aria-live="polite">{statusMessage}</p>
  ) : isFutoshiki ? (
    <p class={`grid-validation-message ${gridCheckFeedbackTone ?? "progress"}`} aria-live="polite">{statusMessage}</p>
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
      key={isNonogram ? puzzleArrivalIdentity ?? undefined : undefined}
      class={`puzzle-panel${isNonogram && isPuzzleArriving ? " puzzle-arrival" : ""}`}
      aria-label="Generated puzzle preview"
    >
      <div class="puzzle-meta">
        <span>{`${puzzle.width} x ${puzzle.height}`}</span>
        {puzzle.difficulty ? <span>{puzzle.difficulty}</span> : null}
        {isNonogram ? <span>{puzzle.uniqueSolution ? "One solution" : "Uniqueness not required"}</span> : null}
        {isFutoshiki ? <span>{puzzle.uniqueSolution ? "Unique" : "Open"}</span> : null}
        {isWordGuess ? <span>Answer-list solvable</span> : null}
        {isNonogram || isFutoshiki ? <span>{filledOpenCount}/{openCount} filled</span> : dailyLabel ? <span>Daily: {dailyLabel}</span> : null}
      </div>
      {puzzle.puzzleId === "word-guess" && gridCells ? (
        <WordGuessGame puzzle={puzzle} cells={gridCells} statusMessage={statusMessage} onCellInput={onCellInput} onSubmitGuess={onCheck} />
      ) : puzzle.puzzleId === "futoshiki" && gridCells ? (
        <FutoshikiBoard puzzle={puzzle} cells={gridCells} selectedGridCell={selectedGridCell} onCellClick={onCellClick} onCellInput={onCellInput} />
      ) : gridCells ? (
        <GridPuzzlePreview puzzle={puzzle} cells={gridCells} selectedGridCell={selectedGridCell} onCellClick={onCellClick} onCellInput={onCellInput} />
      ) : null}
      {usesDedicatedStatus || puzzle.notes.length === 0 ? null : (
        <ul class="notes-list">{puzzle.notes.map((note) => <li key={note}>{note}</li>)}</ul>
      )}
    </section>
  ) : isGenerating ? loadingBoard : null;

  const gameplay = puzzle?.kind === "grid" && !isWordGuess ? (
    <div class="gameplay-control-stack">
      <div class={`puzzle-actions ${isNonogram ? "nonogram-current-actions" : ""}`.trim()}>
        <button type="button" onClick={onCheck}>Check</button>
        {isNonogram ? <button type="button" onClick={onReset} disabled={isGenerating}>Reset</button> : null}
      </div>
      {validation}
    </div>
  ) : null;

  return (
    <PuzzleWorkspaceLayout
      className={workspaceClass}
      header={currentPuzzleHeader}
      status={status}
      board={board}
      gameplay={gameplay}
      generation={generation}
      playColumnMax={playColumnMax}
    />
  );
};
