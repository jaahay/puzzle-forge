import type { PuzzleCell } from "../catalog/types";
import { getDailyPuzzleLabel, getDailyPuzzleSeed } from "../games/shared/daily";
import { CardPuzzlePreview } from "./CardPuzzlePreview";
import { GridPuzzlePreview } from "./GridPuzzlePreview";
import { BottomPuzzleConfiguration, TopPuzzleConfiguration } from "./PuzzleConfiguration";
import type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { SeedControl } from "./SeedControl";
import { WordGuessGame } from "./WordGuessGame";

const getGivenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => cell.locked).length ?? 0;
const getFilledOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked && cell.value).length ?? 0;
const getOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked).length ?? 0;

export const StandardPuzzleWorkspace = ({
  selectedDefinition, selectedPuzzleIsGeneratable, seed, width, height, difficulty,
  requireUniqueSolution, sudokuVariation, puzzle, solitaireVariation, cardStacks,
  selectedCard, solitaireStats, gridCells, selectedGridCell, statusMessage, isGenerating,
  onSeedChange, onWidthChange, onHeightChange, onSettingsCommit, onDifficultyChange,
  onSudokuVariationChange, onUniqueSolutionChange, onGenerate, onRandomize, onReset,
  onCheck, onSolitaireVariationChange, onAutoMoveToFoundations, onUndoSolitaire,
  onRedoSolitaire, canUndoSolitaire, canRedoSolitaire, onCardClick, onCardDoubleClick,
  onStackClick, onCellClick, onCellInput,
}: PuzzleWorkspaceProps) => {
  const isSudoku = selectedDefinition.id === "sudoku";
  const isNonogram = selectedDefinition.id === "nonogram";
  const isWordGuess = selectedDefinition.id === "word-guess";
  const isSolitaire = selectedDefinition.id === "klondike-solitaire";
  const hasBottomSettingsBar = isSudoku || isNonogram || isWordGuess;
  const showStatusLine = !hasBottomSettingsBar;
  const isFixedSize = selectedDefinition.minWidth === selectedDefinition.maxWidth && selectedDefinition.minHeight === selectedDefinition.maxHeight;
  const filledOpenCount = getFilledOpenCount(gridCells);
  const openCount = getOpenCount(gridCells);
  const dailyLabel = puzzle ? getDailyPuzzleLabel(puzzle.puzzleId, puzzle.seed) : null;
  const workspaceClass = `${isSudoku ? "sudoku-workspace" : ""} ${isNonogram ? "nonogram-workspace" : ""} ${isWordGuess ? "word-guess-workspace" : ""} ${isSolitaire ? "solitaire-workspace" : ""}`;
  const showSudokuValidationMessage = isSudoku && (statusMessage === "Solved." || statusMessage.startsWith("No mistakes") || statusMessage.includes("need attention"));
  const showNonogramValidationMessage = isNonogram && (statusMessage.startsWith("Solved.") || statusMessage.includes("do not match"));
  const sudokuValidationTone = statusMessage === "Solved." ? "success" : statusMessage.includes("need attention") ? "error" : "progress";
  const nonogramValidationTone = statusMessage.startsWith("Solved.") ? "success" : "error";
  const generateDailyPuzzle = () => onSettingsCommit({ seed: getDailyPuzzleSeed(selectedDefinition.id), width, height });
  const seedInput = <SeedControl seed={seed} onSeedChange={onSeedChange} onSeedCommit={(nextSeed) => onSettingsCommit({ seed: nextSeed })} />;
  const solitaireActionControls = <div class="solitaire-action-row" aria-label="Solitaire controls"><button type="button" onClick={onUndoSolitaire} disabled={!canUndoSolitaire} aria-label="Undo Solitaire move" title="Undo">↶</button><button type="button" onClick={onRedoSolitaire} disabled={!canRedoSolitaire} aria-label="Redo Solitaire move" title="Redo">↷</button><button type="button" onClick={onAutoMoveToFoundations} aria-label="Move all currently legal cards to foundations" title="Auto foundation">♣→</button></div>;

  const configurationSlot = !puzzle ? null : hasBottomSettingsBar ? (
    <BottomPuzzleConfiguration selectedDefinition={selectedDefinition} selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable} seedInput={seedInput} width={width} height={height} difficulty={difficulty} requireUniqueSolution={requireUniqueSolution} sudokuVariation={sudokuVariation} isFixedSize={isFixedSize} isNonogram={isNonogram} isWordGuess={isWordGuess} isSudoku={isSudoku} isGenerating={isGenerating} onWidthChange={onWidthChange} onHeightChange={onHeightChange} onSettingsCommit={onSettingsCommit} onDifficultyChange={onDifficultyChange} onSudokuVariationChange={onSudokuVariationChange} onUniqueSolutionChange={onUniqueSolutionChange} onToday={generateDailyPuzzle} onUseSeed={onGenerate} onRandomize={onRandomize} onReset={onReset} />
  ) : (
    <TopPuzzleConfiguration selectedDefinition={selectedDefinition} selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable} seedInput={seedInput} width={width} height={height} solitaireVariation={solitaireVariation} isFixedSize={isFixedSize} isGenerating={isGenerating} isSolitaire={isSolitaire} onWidthChange={onWidthChange} onHeightChange={onHeightChange} onSettingsCommit={onSettingsCommit} onSolitaireVariationChange={onSolitaireVariationChange} onToday={generateDailyPuzzle} onUseSeed={onGenerate} onRandomize={onRandomize} onReset={onReset} />
  );

  const statusSlot = showStatusLine ? <p class="status-line" aria-live="polite">{statusMessage}</p> : null;
  const validationSlot = showSudokuValidationMessage ? <p class={`sudoku-validation-message ${sudokuValidationTone}`} aria-live="polite">{statusMessage}</p> : showNonogramValidationMessage ? <p class={`sudoku-validation-message ${nonogramValidationTone}`} aria-live="polite">{statusMessage}</p> : null;
  const loadingBoardSlot = <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label={`${selectedDefinition.title} is generating`}><div class="puzzle-loading-copy"><strong>Generating {selectedDefinition.title}</strong><span>{statusMessage}</span></div><div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: isSolitaire ? 12 : 9 }, (_, index) => <span key={index} />)}</div></section>;

  const boardSlot = puzzle ? (
    <section class="puzzle-panel" aria-label="Generated puzzle preview">
      {puzzle.kind === "cards" ? null : <div class="puzzle-meta">{isSudoku ? null : <span>{`${puzzle.width} x ${puzzle.height}`}</span>}{puzzle.difficulty ? <span>{puzzle.difficulty}</span> : null}{isNonogram ? <span>{puzzle.uniqueSolution ? "Unique" : "Open"}</span> : null}{isWordGuess ? <span>Answer-list solvable</span> : null}{isSudoku ? <span>{getGivenCount(gridCells)} givens</span> : isNonogram ? <span>{filledOpenCount}/{openCount} filled</span> : dailyLabel ? <span>Daily: {dailyLabel}</span> : null}{isSudoku ? <span>Progress: {filledOpenCount} of {openCount}</span> : null}</div>}
      {puzzle.kind === "cards" && cardStacks ? <CardPuzzlePreview stacks={cardStacks} selectedCard={selectedCard} stats={solitaireStats} toolbar={solitaireActionControls} variation={puzzle.solitaireVariation} onCardClick={onCardClick} onCardDoubleClick={onCardDoubleClick} onStackClick={onStackClick} /> : puzzle.kind === "grid" && puzzle.puzzleId === "word-guess" && gridCells ? <WordGuessGame puzzle={puzzle} cells={gridCells} statusMessage={statusMessage} onCellInput={onCellInput} onSubmitGuess={onCheck} /> : puzzle.kind === "grid" && gridCells ? <GridPuzzlePreview puzzle={puzzle} cells={gridCells} selectedGridCell={selectedGridCell} onCellClick={onCellClick} onCellInput={onCellInput} /> : null}
      {hasBottomSettingsBar || puzzle.kind === "cards" || puzzle.notes.length === 0 ? null : <ul class="notes-list">{puzzle.notes.map((note) => <li key={note}>{note}</li>)}</ul>}
    </section>
  ) : isGenerating ? loadingBoardSlot : null;

  const gameplaySlot = puzzle && puzzle.kind !== "cards" && !isWordGuess ? <div class="gameplay-control-stack"><div class="puzzle-actions"><button type="button" onClick={onCheck}>Check</button></div>{validationSlot}</div> : null;
  return <PuzzleWorkspaceLayout className={workspaceClass} status={statusSlot} board={boardSlot} gameplay={gameplaySlot} generation={configurationSlot} />;
};
