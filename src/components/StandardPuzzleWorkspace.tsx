import type { PuzzleCell } from "../catalog/types";
import { getDailyPuzzleLabel } from "../games/shared/daily";
import { isGridAnswerCompleteAndCorrect } from "../interactions/gridChecking";
import { CardPuzzlePreview } from "./CardPuzzlePreview";
import { FutoshikiBoard } from "./FutoshikiBoard";
import { GridPuzzlePreview } from "./GridPuzzlePreview";
import { getNumericGridDigits } from "./NumericGridInput";
import { BottomPuzzleConfiguration, TopPuzzleConfiguration } from "./PuzzleConfiguration";
import type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { SeedControl } from "./SeedControl";
import { SudokuMeta } from "./SudokuMeta";
import { usePuzzleCompletionPresentation } from "./usePuzzleCompletionPresentation";
import { WordGuessGame } from "./WordGuessGame";

const getFilledOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked && cell.value).length ?? 0;
const getOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked).length ?? 0;

export const StandardPuzzleWorkspace = ({
  selectedDefinition, selectedPuzzleIsGeneratable, seed, width, height, sudokuVariation,
  puzzle, nextPuzzleDraft, seedLoadInput, cardStacks, selectedCard, solitaireStats,
  gridCells, selectedGridCell, statusMessage, isGenerating, onReset, onCheck,
  onNextPuzzleDraftChange, onSeedLoadInputChange, onNewPuzzle, onToday, onLoadSeed,
  onAutoMoveToFoundations, onUndoSolitaire, onRedoSolitaire, canUndoSolitaire,
  canRedoSolitaire, onCardClick, onCardDoubleClick, onStackClick, onCellClick, onCellInput,
}: PuzzleWorkspaceProps) => {
  const isSudoku = selectedDefinition.id === "sudoku";
  const isNonogram = selectedDefinition.id === "nonogram";
  const isWordGuess = selectedDefinition.id === "word-guess";
  const isFutoshiki = selectedDefinition.id === "futoshiki";
  const isSolitaire = selectedDefinition.id === "klondike-solitaire";
  const isSudokuSolved = Boolean(
    isSudoku && puzzle?.kind === "grid" && gridCells && isGridAnswerCompleteAndCorrect(puzzle, gridCells),
  );
  const sudokuCompletionIdentity = puzzle?.kind === "grid" && puzzle.puzzleId === "sudoku"
    ? `${puzzle.puzzleId}:${puzzle.seed}:${puzzle.sudokuVariation ?? ""}:${puzzle.width}:${puzzle.height}`
    : `sudoku:${seed}:${sudokuVariation}:${width}:${height}`;
  const sudokuCompletion = usePuzzleCompletionPresentation({
    enabled: Boolean(isSudoku && puzzle?.kind === "grid" && gridCells),
    identity: sudokuCompletionIdentity,
    solved: isSudokuSolved,
    trackedKeys: puzzle?.kind === "grid" && puzzle.puzzleId === "sudoku"
      ? [...getNumericGridDigits(puzzle.width), "Enter", " "]
      : [],
  });
  const isSudokuPresentationCompleted = isSudokuSolved && sudokuCompletion.phase === "completed";
  const handleSudokuCellInput = (cell: PuzzleCell, value: string) => {
    sudokuCompletion.recordCausativeInput();
    onCellInput(cell, value);
  };
  const hasBottomSettingsBar = isSudoku || isNonogram || isWordGuess || isFutoshiki;
  const showStatusLine = !hasBottomSettingsBar;
  const isFixedSize = selectedDefinition.minWidth === selectedDefinition.maxWidth && selectedDefinition.minHeight === selectedDefinition.maxHeight;
  const filledOpenCount = getFilledOpenCount(gridCells);
  const openCount = getOpenCount(gridCells);
  const dailyLabel = puzzle ? getDailyPuzzleLabel(puzzle.puzzleId, puzzle.seed) : null;
  const workspaceClass = `${isSudoku ? "sudoku-workspace" : ""} ${isNonogram ? "nonogram-workspace" : ""} ${isWordGuess ? "word-guess-workspace" : ""} ${isFutoshiki ? "futoshiki-workspace" : ""} ${isSolitaire ? "solitaire-workspace" : ""}`;
  const showSudokuValidationMessage = isSudoku && !isSudokuSolved && (statusMessage.startsWith("No mistakes") || statusMessage.includes("need attention"));
  const showNonogramValidationMessage = isNonogram && (statusMessage.startsWith("Solved.") || statusMessage.includes("do not match"));
  const sudokuValidationTone = statusMessage.includes("need attention") ? "error" : "progress";
  const nonogramValidationTone = statusMessage.startsWith("Solved.") ? "success" : "error";
  const futoshikiValidationTone = statusMessage.startsWith("Solved.") ? "success" : statusMessage.startsWith("Not solved") ? "error" : "progress";
  const seedInput = <SeedControl currentSeed={puzzle?.seed ?? seed} seed={seedLoadInput} onSeedChange={onSeedLoadInputChange} />;
  const solitaireActionControls = <div class="solitaire-action-row" aria-label="Solitaire controls"><button type="button" onClick={onUndoSolitaire} disabled={!canUndoSolitaire} aria-label="Undo Solitaire move" title="Undo">↶</button><button type="button" onClick={onRedoSolitaire} disabled={!canRedoSolitaire} aria-label="Redo Solitaire move" title="Redo">↷</button><button type="button" onClick={onAutoMoveToFoundations} aria-label="Move all currently legal cards to foundations" title="Auto foundation">♣→</button></div>;

  const configurationSlot = !puzzle ? null : hasBottomSettingsBar ? (
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
      isSudoku={isSudoku}
      isGenerating={isGenerating}
      showRandomize={!isSudokuPresentationCompleted}
      onWidthChange={(nextWidth) => onNextPuzzleDraftChange({ width: nextWidth })}
      onHeightChange={(nextHeight) => onNextPuzzleDraftChange({ height: nextHeight })}
      onSettingsCommit={onNextPuzzleDraftChange}
      onDifficultyChange={(nextDifficulty) => onNextPuzzleDraftChange({ difficulty: nextDifficulty })}
      onSudokuVariationChange={(nextVariation) => onNextPuzzleDraftChange({ sudokuVariation: nextVariation })}
      onUniqueSolutionChange={(nextRequireUniqueSolution) => onNextPuzzleDraftChange({ requireUniqueSolution: nextRequireUniqueSolution })}
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
      onWidthChange={(nextWidth) => onNextPuzzleDraftChange({ width: nextWidth })}
      onHeightChange={(nextHeight) => onNextPuzzleDraftChange({ height: nextHeight })}
      onSettingsCommit={onNextPuzzleDraftChange}
      onSolitaireVariationChange={(nextVariation) => onNextPuzzleDraftChange({ solitaireVariation: nextVariation })}
      onToday={onToday}
      onUseSeed={onLoadSeed}
      onRandomize={onNewPuzzle}
      onReset={onReset}
    />
  );

  const statusSlot = showStatusLine ? <p class="status-line" aria-live="polite">{statusMessage}</p> : null;
  const validationSlot = showSudokuValidationMessage ? <p class={`sudoku-validation-message ${sudokuValidationTone}`} aria-live="polite">{statusMessage}</p> : showNonogramValidationMessage ? <p class={`sudoku-validation-message ${nonogramValidationTone}`} aria-live="polite">{statusMessage}</p> : isFutoshiki ? <p class={`sudoku-validation-message ${futoshikiValidationTone}`} aria-live="polite">{statusMessage}</p> : null;
  const sudokuCompletionDock = isSudokuSolved ? (
    <section
      class="completion-dock"
      aria-hidden={sudokuCompletion.phase !== "completed" || undefined}
      aria-live={isSudokuPresentationCompleted ? "polite" : "off"}
      aria-label="Sudoku solved"
    >
      <div class="completion-dock-copy">
        <span class="completion-dock-mark" aria-hidden="true">✓</span>
        <strong>Puzzle solved</strong>
      </div>
      <div class="puzzle-actions">
        <button type="button" onClick={onNewPuzzle} tabIndex={isSudokuPresentationCompleted ? 0 : -1}>New puzzle</button>
      </div>
    </section>
  ) : null;
  const sudokuGameplayControl = isSudoku ? (
    <div class="completion-control-stage" data-phase={sudokuCompletion.phase}>
      <div
        class="completion-control-layer completion-control-playing"
        aria-hidden={isSudokuPresentationCompleted || undefined}
      >
        <div class="puzzle-actions">
          <button type="button" onClick={onCheck} disabled={isSudokuSolved}>Check</button>
        </div>
        {validationSlot}
      </div>
      {sudokuCompletionDock ? (
        <div class="completion-control-layer completion-control-solved">
          {sudokuCompletionDock}
        </div>
      ) : null}
    </div>
  ) : null;
  const loadingBoardSlot = <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label={`${selectedDefinition.title} is generating`}><div class="puzzle-loading-copy"><strong>Generating {selectedDefinition.title}</strong><span>{statusMessage}</span></div><div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: isSolitaire ? 12 : 9 }, (_, index) => <span key={index} />)}</div></section>;

  const boardSlot = puzzle ? (
    <section class="puzzle-panel" aria-label="Generated puzzle preview">
      {puzzle.kind === "cards" ? null : <div class="puzzle-meta">{isSudoku && puzzle.kind === "grid" && gridCells ? <SudokuMeta puzzle={puzzle} cells={gridCells} /> : <>{isSudoku ? null : <span>{`${puzzle.width} x ${puzzle.height}`}</span>}{puzzle.difficulty ? <span>{puzzle.difficulty}</span> : null}{isNonogram || isFutoshiki ? <span>{puzzle.uniqueSolution ? "Unique" : "Open"}</span> : null}{isWordGuess ? <span>Answer-list solvable</span> : null}{isNonogram ? <span>{filledOpenCount}/{openCount} filled</span> : isFutoshiki ? <span>{filledOpenCount}/{openCount} filled</span> : dailyLabel ? <span>Daily: {dailyLabel}</span> : null}</>}</div>}
      {puzzle.kind === "cards" && cardStacks ? <CardPuzzlePreview stacks={cardStacks} selectedCard={selectedCard} stats={solitaireStats} toolbar={solitaireActionControls} variation={puzzle.solitaireVariation} onCardClick={onCardClick} onCardDoubleClick={onCardDoubleClick} onStackClick={onStackClick} /> : puzzle.kind === "grid" && puzzle.puzzleId === "word-guess" && gridCells ? <WordGuessGame puzzle={puzzle} cells={gridCells} statusMessage={statusMessage} onCellInput={onCellInput} onSubmitGuess={onCheck} /> : puzzle.kind === "grid" && puzzle.puzzleId === "futoshiki" && gridCells ? <FutoshikiBoard puzzle={puzzle} cells={gridCells} selectedGridCell={selectedGridCell} onCellClick={onCellClick} onCellInput={onCellInput} /> : puzzle.kind === "grid" && gridCells ? <GridPuzzlePreview puzzle={puzzle} cells={gridCells} selectedGridCell={selectedGridCell} completionPhase={isSudoku ? sudokuCompletion.phase : undefined} onCompletionAnimationEnd={isSudoku ? sudokuCompletion.completePresentation : undefined} onCellClick={onCellClick} onCellInput={isSudoku ? handleSudokuCellInput : onCellInput} /> : null}
      {hasBottomSettingsBar || puzzle.kind === "cards" || puzzle.notes.length === 0 ? null : <ul class="notes-list">{puzzle.notes.map((note) => <li key={note}>{note}</li>)}</ul>}
    </section>
  ) : isGenerating ? loadingBoardSlot : null;

  const gameplaySlot = puzzle && puzzle.kind !== "cards" && !isWordGuess ? (
    <div class="gameplay-control-stack">
      {sudokuGameplayControl ?? <><div class="puzzle-actions"><button type="button" onClick={onCheck}>Check</button></div>{validationSlot}</>}
    </div>
  ) : null;
  return <PuzzleWorkspaceLayout className={workspaceClass} status={statusSlot} board={boardSlot} gameplay={gameplaySlot} generation={configurationSlot} />;
};
