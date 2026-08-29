import { useEffect, useRef } from "preact/hooks";
import type { PuzzleCell } from "../catalog/types";
import { sudokuVariationRules } from "../games/sudoku/variation";
import { isGridAnswerCompleteAndCorrect } from "../interactions/gridChecking";
import { GridPuzzlePreview } from "./GridPuzzlePreview";
import { getNumericGridDigits, NumericGridDigitPad, useNumericGridInput } from "./NumericGridInput";
import { BottomPuzzleConfiguration } from "./PuzzleConfiguration";
import type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { SeedControl } from "./SeedControl";
import { SudokuMeta } from "./SudokuMeta";
import { usePuzzleCompletionPresentation } from "./usePuzzleCompletionPresentation";

export const SudokuWorkspace = ({
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
  onReset,
  onCheck,
  onNextPuzzleDraftChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
  onCellClick,
  onCellInput,
}: PuzzleWorkspaceProps) => {
  const sudokuPuzzle = puzzle?.kind === "grid" && puzzle.puzzleId === "sudoku" ? puzzle : null;
  const isSolved = Boolean(sudokuPuzzle && gridCells && isGridAnswerCompleteAndCorrect(sudokuPuzzle, gridCells));
  const completion = usePuzzleCompletionPresentation({
    enabled: Boolean(sudokuPuzzle && gridCells),
    identity: sudokuPuzzle
      ? `${sudokuPuzzle.puzzleId}:${sudokuPuzzle.seed}:${sudokuPuzzle.sudokuVariation ?? ""}:${sudokuPuzzle.width}:${sudokuPuzzle.height}`
      : "sudoku:pending",
    solved: isSolved,
    trackedKeys: sudokuPuzzle ? [...getNumericGridDigits(sudokuPuzzle.width), "Enter", " "] : [],
  });
  const isPresentationCompleted = isSolved && completion.phase === "completed";
  const completionStageRef = useRef<HTMLDivElement>(null);
  const activeGameplayRef = useRef<HTMLDivElement>(null);
  const activeGameplayHadFocusRef = useRef(false);

  const handleCellInput = (cell: PuzzleCell, value: string) => {
    completion.recordCausativeInput();
    onCellInput(cell, value);
  };

  const numericInput = useNumericGridInput({
    enabled: Boolean(sudokuPuzzle && !isSolved),
    puzzleIdentity: sudokuPuzzle
      ? `${sudokuPuzzle.puzzleId}:${sudokuPuzzle.seed}:${sudokuPuzzle.sudokuVariation ?? ""}:${sudokuPuzzle.width}:${sudokuPuzzle.height}`
      : "sudoku:pending",
    digitCount: sudokuPuzzle?.width ?? 0,
    cells: gridCells ?? [],
    selectedGridCell: isSolved ? null : selectedGridCell,
    onCellClick,
    onCellInput: handleCellInput,
  });

  useEffect(() => {
    if (!isPresentationCompleted) {
      activeGameplayHadFocusRef.current = false;
      return;
    }

    if (!activeGameplayHadFocusRef.current || typeof document === "undefined") {
      return;
    }

    const activeElement = document.activeElement;
    if (!activeElement || activeElement === document.body || activeGameplayRef.current?.contains(activeElement)) {
      completionStageRef.current?.focus({ preventScroll: true });
    }
    activeGameplayHadFocusRef.current = false;
  }, [isPresentationCompleted]);

  const seedInput = (
    <SeedControl
      currentSeed={sudokuPuzzle?.seed ?? seed}
      seed={seedLoadInput}
      onSeedChange={onSeedLoadInputChange}
    />
  );

  const generation = sudokuPuzzle ? (
    <BottomPuzzleConfiguration
      kind="sudoku"
      selectedDefinition={selectedDefinition}
      selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
      seedInput={seedInput}
      width={nextPuzzleDraft.width}
      height={nextPuzzleDraft.height}
      difficulty={nextPuzzleDraft.difficulty}
      requireUniqueSolution={nextPuzzleDraft.requireUniqueSolution}
      sudokuVariation={nextPuzzleDraft.sudokuVariation}
      isFixedSize
      isGenerating={isGenerating}
      showRandomize={!isPresentationCompleted}
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
  ) : null;

  const validation = !isSolved && gridCheckFeedbackTone ? (
    <p class={`grid-validation-message ${gridCheckFeedbackTone}`} aria-live="polite">
      {statusMessage}
    </p>
  ) : null;

  const digitPad = sudokuPuzzle && !isPresentationCompleted ? (
    <NumericGridDigitPad
      title={sudokuPuzzle.title}
      digits={numericInput.digits}
      activeValue={numericInput.activeValue}
      canClearSelectedCell={numericInput.canClearSelectedCell}
      disabled={isSolved}
      onDigit={numericInput.setSelectedValue}
      onClear={numericInput.clearSelectedValue}
    />
  ) : null;

  const completionDock = isSolved ? (
    <section
      class="completion-dock"
      aria-hidden={completion.phase !== "completed" || undefined}
      aria-live={isPresentationCompleted ? "polite" : "off"}
      aria-label="Sudoku solved"
    >
      <div class="completion-dock-copy">
        <span class="completion-dock-mark" aria-hidden="true">✓</span>
        <strong>Puzzle solved</strong>
      </div>
      <div class="puzzle-actions">
        <button type="button" onClick={onNewPuzzle} disabled={isGenerating} tabIndex={isPresentationCompleted ? 0 : -1}>
          New puzzle
        </button>
      </div>
    </section>
  ) : null;

  const gameplay = sudokuPuzzle ? (
    <div class="gameplay-control-stack">
      <div class="completion-control-stage" data-phase={completion.phase} ref={completionStageRef} tabIndex={-1}>
        <div
          class="completion-control-layer completion-control-playing gameplay-active-controls"
          aria-hidden={isPresentationCompleted || undefined}
          ref={activeGameplayRef}
          onFocusCapture={() => {
            activeGameplayHadFocusRef.current = true;
          }}
          onBlurCapture={(event) => {
            const nextTarget = event.relatedTarget;
            if (nextTarget instanceof Node && activeGameplayRef.current?.contains(nextTarget)) return;
            if (nextTarget) activeGameplayHadFocusRef.current = false;
          }}
        >
          {digitPad}
          <div class="puzzle-actions">
            <button type="button" onClick={onCheck} disabled={isSolved}>Check</button>
          </div>
          {validation}
        </div>
        {completionDock ? <div class="completion-control-layer completion-control-solved">{completionDock}</div> : null}
      </div>
    </div>
  ) : null;

  const rules = sudokuPuzzle ? sudokuVariationRules[sudokuPuzzle.sudokuVariation ?? "classic"] : undefined;
  const help = rules ? (
    <details class="sudoku-rules-disclosure">
      <summary>Rules</summary>
      <p>{rules}</p>
    </details>
  ) : null;

  const loadingBoard = (
    <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label="Sudoku is generating">
      <div class="puzzle-loading-copy"><strong>Generating Sudoku</strong><span>{statusMessage}</span></div>
      <div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</div>
    </section>
  );

  const board = sudokuPuzzle && gridCells ? (
    <section class="puzzle-panel" aria-label="Generated puzzle preview">
      <div class="puzzle-meta"><SudokuMeta puzzle={sudokuPuzzle} cells={gridCells} /></div>
      <GridPuzzlePreview
        puzzle={sudokuPuzzle}
        cells={gridCells}
        selectedGridCell={selectedGridCell}
        numericSelectedCell={numericInput.selectedCell}
        numericActiveValue={numericInput.activeValue}
        completionPhase={completion.phase}
        onCompletionAnimationEnd={completion.completePresentation}
        onCellClick={onCellClick}
        onCellInput={handleCellInput}
      />
    </section>
  ) : isGenerating ? loadingBoard : null;

  return (
    <PuzzleWorkspaceLayout
      className="sudoku-workspace"
      board={board}
      gameplay={gameplay}
      help={help}
      generation={generation}
    />
  );
};
