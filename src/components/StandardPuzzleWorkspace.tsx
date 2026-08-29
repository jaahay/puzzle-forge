import type { PuzzleCell } from "../catalog/types";
import { getCanonicalDailyPuzzleLabel } from "../games/shared/daily";
import { CardPuzzlePreview } from "./CardPuzzlePreview";
import { FutoshikiBoard } from "./FutoshikiBoard";
import { GridPuzzlePreview } from "./GridPuzzlePreview";
import { BottomPuzzleConfiguration, TopPuzzleConfiguration } from "./PuzzleConfiguration";
import type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { SeedControl } from "./SeedControl";
import { WordGuessGame } from "./WordGuessGame";

const getFilledOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked && cell.value).length ?? 0;
const getOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked).length ?? 0;

export const StandardPuzzleWorkspace = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  seed,
  puzzle,
  nextPuzzleDraft,
  seedLoadInput,
  cardStacks,
  selectedCard,
  solitaireStats,
  gridCells,
  selectedGridCell,
  gridCheckFeedbackTone,
  statusMessage,
  isGenerating,
  onReset,
  onCheck,
  onNextPuzzleDraftChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
  onAutoMoveToFoundations,
  onUndoSolitaire,
  onRedoSolitaire,
  canUndoSolitaire,
  canRedoSolitaire,
  onCardClick,
  onCardDoubleClick,
  onStackClick,
  onCellClick,
  onCellInput,
}: PuzzleWorkspaceProps) => {
  const isNonogram = selectedDefinition.id === "nonogram";
  const isWordGuess = selectedDefinition.id === "word-guess";
  const isFutoshiki = selectedDefinition.id === "futoshiki";
  const isSolitaire = selectedDefinition.id === "klondike-solitaire";
  const hasBottomSettingsBar = isNonogram || isWordGuess || isFutoshiki;
  const showStatusLine = !hasBottomSettingsBar;
  const isFixedSize = selectedDefinition.minWidth === selectedDefinition.maxWidth && selectedDefinition.minHeight === selectedDefinition.maxHeight;
  const filledOpenCount = getFilledOpenCount(gridCells);
  const openCount = getOpenCount(gridCells);
  const dailyLabel = puzzle ? getCanonicalDailyPuzzleLabel(puzzle) : null;
  const workspaceClass = `${isNonogram ? "nonogram-workspace" : ""} ${isWordGuess ? "word-guess-workspace" : ""} ${isFutoshiki ? "futoshiki-workspace" : ""} ${isSolitaire ? "solitaire-workspace" : ""}`;
  const seedInput = <SeedControl currentSeed={puzzle?.seed ?? seed} seed={seedLoadInput} onSeedChange={onSeedLoadInputChange} />;
  const solitaireActionControls = (
    <div class="solitaire-action-row" aria-label="Solitaire controls">
      <button type="button" onClick={onUndoSolitaire} disabled={!canUndoSolitaire} aria-label="Undo Solitaire move" title="Undo">↶</button>
      <button type="button" onClick={onRedoSolitaire} disabled={!canRedoSolitaire} aria-label="Redo Solitaire move" title="Redo">↷</button>
      <button type="button" onClick={onAutoMoveToFoundations} aria-label="Move all currently legal cards to foundations" title="Auto foundation">♣→</button>
    </div>
  );

  const generation = !puzzle ? null : hasBottomSettingsBar ? (
    <BottomPuzzleConfiguration
      selectedDefinition={selectedDefinition}
      selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
      seedInput={seedInput}
      width={nextPuzzleDraft.width}
      height={nextPuzzleDraft.height}
      difficulty={nextPuzzleDraft.difficulty}
      requireUniqueSolution={nextPuzzleDraft.requireUniqueSolution}
      sudokuVariation={nextPuzzleDraft.sudokuVariation}
      isFixedSize={isFixedSize}
      isNonogram={isNonogram}
      isWordGuess={isWordGuess}
      isSudoku={false}
      isGenerating={isGenerating}
      onWidthChange={(width) => onNextPuzzleDraftChange({ width })}
      onHeightChange={(height) => onNextPuzzleDraftChange({ height })}
      onSettingsCommit={onNextPuzzleDraftChange}
      onDifficultyChange={(difficulty) => onNextPuzzleDraftChange({ difficulty })}
      onSudokuVariationChange={(sudokuVariation) => onNextPuzzleDraftChange({ sudokuVariation })}
      onUniqueSolutionChange={(requireUniqueSolution) => onNextPuzzleDraftChange({ requireUniqueSolution })}
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
      solitaireVariation={nextPuzzleDraft.solitaireVariation}
      isFixedSize={isFixedSize}
      isGenerating={isGenerating}
      isSolitaire={isSolitaire}
      prospective
      onWidthChange={(width) => onNextPuzzleDraftChange({ width })}
      onHeightChange={(height) => onNextPuzzleDraftChange({ height })}
      onSettingsCommit={onNextPuzzleDraftChange}
      onSolitaireVariationChange={(solitaireVariation) => onNextPuzzleDraftChange({ solitaireVariation })}
      onToday={onToday}
      onUseSeed={onLoadSeed}
      onRandomize={onNewPuzzle}
      onReset={onReset}
    />
  );

  const status = showStatusLine ? <p class="status-line" aria-live="polite">{statusMessage}</p> : null;
  const validation = isNonogram && gridCheckFeedbackTone ? (
    <p class={`sudoku-validation-message ${gridCheckFeedbackTone}`} aria-live="polite">{statusMessage}</p>
  ) : isFutoshiki ? (
    <p class={`sudoku-validation-message ${gridCheckFeedbackTone ?? "progress"}`} aria-live="polite">{statusMessage}</p>
  ) : null;

  const loadingBoard = (
    <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label={`${selectedDefinition.title} is generating`}>
      <div class="puzzle-loading-copy"><strong>Generating {selectedDefinition.title}</strong><span>{statusMessage}</span></div>
      <div class="puzzle-loading-grid" aria-hidden="true">
        {Array.from({ length: isSolitaire ? 12 : 9 }, (_, index) => <span key={index} />)}
      </div>
    </section>
  );

  const board = puzzle ? (
    <section class="puzzle-panel" aria-label="Generated puzzle preview">
      {puzzle.kind === "cards" ? null : (
        <div class="puzzle-meta">
          <span>{`${puzzle.width} x ${puzzle.height}`}</span>
          {puzzle.difficulty ? <span>{puzzle.difficulty}</span> : null}
          {isNonogram || isFutoshiki ? <span>{puzzle.uniqueSolution ? "Unique" : "Open"}</span> : null}
          {isWordGuess ? <span>Answer-list solvable</span> : null}
          {isNonogram || isFutoshiki ? <span>{filledOpenCount}/{openCount} filled</span> : dailyLabel ? <span>Daily: {dailyLabel}</span> : null}
        </div>
      )}
      {puzzle.kind === "cards" && cardStacks ? (
        <CardPuzzlePreview
          stacks={cardStacks}
          selectedCard={selectedCard}
          stats={solitaireStats}
          toolbar={solitaireActionControls}
          variation={puzzle.solitaireVariation}
          onCardClick={onCardClick}
          onCardDoubleClick={onCardDoubleClick}
          onStackClick={onStackClick}
        />
      ) : puzzle.kind === "grid" && puzzle.puzzleId === "word-guess" && gridCells ? (
        <WordGuessGame puzzle={puzzle} cells={gridCells} statusMessage={statusMessage} onCellInput={onCellInput} onSubmitGuess={onCheck} />
      ) : puzzle.kind === "grid" && puzzle.puzzleId === "futoshiki" && gridCells ? (
        <FutoshikiBoard puzzle={puzzle} cells={gridCells} selectedGridCell={selectedGridCell} onCellClick={onCellClick} onCellInput={onCellInput} />
      ) : puzzle.kind === "grid" && gridCells ? (
        <GridPuzzlePreview puzzle={puzzle} cells={gridCells} selectedGridCell={selectedGridCell} onCellClick={onCellClick} onCellInput={onCellInput} />
      ) : null}
      {hasBottomSettingsBar || puzzle.kind === "cards" || puzzle.notes.length === 0 ? null : (
        <ul class="notes-list">{puzzle.notes.map((note) => <li key={note}>{note}</li>)}</ul>
      )}
    </section>
  ) : isGenerating ? loadingBoard : null;

  const gameplay = puzzle && puzzle.kind !== "cards" && !isWordGuess ? (
    <div class="gameplay-control-stack">
      <div class="puzzle-actions"><button type="button" onClick={onCheck}>Check</button></div>
      {validation}
    </div>
  ) : null;

  return <PuzzleWorkspaceLayout className={workspaceClass} status={status} board={board} gameplay={gameplay} generation={generation} />;
};
