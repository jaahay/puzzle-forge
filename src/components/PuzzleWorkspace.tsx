import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDefinition, PuzzleDifficulty, PuzzleGenerationRequest, SolitaireVariation } from "../catalog/types";
import { getDailyPuzzleLabel, getDailyPuzzleSeed } from "../games/shared/daily";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCellSelection } from "../interactions/gridRules";
import { CardPuzzlePreview } from "./CardPuzzlePreview";
import { GridPuzzlePreview } from "./GridPuzzlePreview";
import { BottomPuzzleConfiguration, TopPuzzleConfiguration } from "./PuzzleConfiguration";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { SeedControl } from "./SeedControl";
import { TilePuzzlePreview } from "./TilePuzzlePreview";
import { WordGuessGame } from "./WordGuessGame";

type SolitaireStats = {
  moveCount: number;
  drawCount: number;
  recycleCount: number;
  autoMoveCount: number;
};

type GenerationSettings = Partial<Pick<PuzzleGenerationRequest, "seed" | "width" | "height" | "difficulty" | "requireUniqueSolution" | "solitaireVariation">>;

type PuzzleWorkspaceProps = {
  selectedDefinition: PuzzleDefinition;
  selectedPuzzleIsGeneratable: boolean;
  seed: string;
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  puzzle: GeneratedPuzzle | null;
  solitaireVariation: SolitaireVariation;
  cardStacks: CardStack[] | null;
  selectedCard: CardSelection | null;
  solitaireStats: SolitaireStats;
  gridCells: PuzzleCell[] | null;
  selectedGridCell: GridCellSelection | null;
  statusMessage: string;
  isGenerating: boolean;
  onSeedChange: (seed: string) => void;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSettingsCommit: (settings?: GenerationSettings) => void;
  onDifficultyChange: (difficulty: PuzzleDifficulty) => void;
  onUniqueSolutionChange: (requireUniqueSolution: boolean) => void;
  onGenerate: () => void;
  onRandomize: () => void;
  onCheck: () => void;
  onSolitaireVariationChange: (variation: SolitaireVariation) => void;
  onAutoMoveToFoundations: () => void;
  onUndoSolitaire: () => void;
  onRedoSolitaire: () => void;
  canUndoSolitaire: boolean;
  canRedoSolitaire: boolean;
  onCardClick: (stack: CardStack, cardIndex: number) => void;
  onCardDoubleClick: (stack: CardStack, cardIndex: number) => void;
  onStackClick: (stack: CardStack) => void;
  onCellClick: (cell: PuzzleCell) => void;
  onCellInput: (cell: PuzzleCell, value: string) => void;
};

const getGivenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => cell.locked).length ?? 0;
const getFilledOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked && cell.value).length ?? 0;
const getOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked).length ?? 0;

export const PuzzleWorkspace = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  seed,
  width,
  height,
  difficulty,
  requireUniqueSolution,
  puzzle,
  solitaireVariation,
  cardStacks,
  selectedCard,
  solitaireStats,
  gridCells,
  selectedGridCell,
  statusMessage,
  isGenerating,
  onSeedChange,
  onWidthChange,
  onHeightChange,
  onSettingsCommit,
  onDifficultyChange,
  onUniqueSolutionChange,
  onGenerate,
  onRandomize,
  onCheck,
  onSolitaireVariationChange,
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
  const isSudoku = selectedDefinition.id === "sudoku";
  const isNonogram = selectedDefinition.id === "nonogram";
  const isWordGuess = selectedDefinition.id === "word-guess";
  const isSolitaire = selectedDefinition.id === "klondike-solitaire";
  const isJigsaw = selectedDefinition.id === "jigsaw";
  const hasBottomSettingsBar = isSudoku || isNonogram || isWordGuess;
  const compactWorkspaceHeader = isSudoku || isNonogram;
  const showHeaderDescription = !(isSudoku || isNonogram || isWordGuess || isSolitaire || isJigsaw);
  const showStatusLine = !hasBottomSettingsBar;
  const isFixedSize = selectedDefinition.minWidth === selectedDefinition.maxWidth && selectedDefinition.minHeight === selectedDefinition.maxHeight;
  const filledOpenCount = getFilledOpenCount(gridCells);
  const openCount = getOpenCount(gridCells);
  const dailyLabel = puzzle ? getDailyPuzzleLabel(puzzle.puzzleId, puzzle.seed) : null;
  const workspaceClass = `${isSudoku ? "sudoku-workspace" : ""} ${isNonogram ? "nonogram-workspace" : ""} ${isWordGuess ? "word-guess-workspace" : ""} ${isSolitaire ? "solitaire-workspace" : ""}`;
  const showSudokuValidationMessage =
    isSudoku && (statusMessage.startsWith("Sudoku solved") || statusMessage.startsWith("Sudoku validation"));
  const showNonogramValidationMessage = isNonogram && (statusMessage.startsWith("Solved") || statusMessage.startsWith("Not solved"));
  const sudokuValidationTone = statusMessage.startsWith("Sudoku solved") ? "success" : statusMessage.includes("incorrect") ? "error" : "progress";
  const nonogramValidationTone = statusMessage.startsWith("Solved") ? "success" : "error";
  const generateDailyPuzzle = () => onSettingsCommit({ seed: getDailyPuzzleSeed(selectedDefinition.id), width, height });
  const seedInput = (
    <SeedControl
      seed={seed}
      onSeedChange={onSeedChange}
      onSeedCommit={(nextSeed) => onSettingsCommit({ seed: nextSeed })}
    />
  );
  const solitaireActionControls = (
    <div class="solitaire-action-row" aria-label="Solitaire controls">
      <button type="button" onClick={onUndoSolitaire} disabled={!canUndoSolitaire} aria-label="Undo Solitaire move" title="Undo">
        ↶
      </button>
      <button type="button" onClick={onRedoSolitaire} disabled={!canRedoSolitaire} aria-label="Redo Solitaire move" title="Redo">
        ↷
      </button>
      <button type="button" onClick={onAutoMoveToFoundations} aria-label="Move all currently legal cards to foundations" title="Auto foundation">
        ♣→
      </button>
    </div>
  );

  const headerSlot = (
    <div class="workspace-copy">
      <span class={`status ${selectedDefinition.status}`}>{selectedDefinition.status}</span>
      <h2>{selectedDefinition.title}</h2>
      {showHeaderDescription ? <p>{selectedDefinition.description}</p> : null}
      {compactWorkspaceHeader ? null : (
        <div class="tag-row">
          {selectedDefinition.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );

  const configurationSlot = !puzzle ? null : hasBottomSettingsBar ? (
    <BottomPuzzleConfiguration
      selectedDefinition={selectedDefinition}
      selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
      seedInput={seedInput}
      width={width}
      height={height}
      difficulty={difficulty}
      requireUniqueSolution={requireUniqueSolution}
      isFixedSize={isFixedSize}
      isNonogram={isNonogram}
      isWordGuess={isWordGuess}
      isSudoku={isSudoku}
      isGenerating={isGenerating}
      onWidthChange={onWidthChange}
      onHeightChange={onHeightChange}
      onSettingsCommit={onSettingsCommit}
      onDifficultyChange={onDifficultyChange}
      onUniqueSolutionChange={onUniqueSolutionChange}
      onToday={generateDailyPuzzle}
      onUseSeed={onGenerate}
      onRandomize={onRandomize}
    />
  ) : (
    <TopPuzzleConfiguration
      selectedDefinition={selectedDefinition}
      selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
      seedInput={seedInput}
      width={width}
      height={height}
      solitaireVariation={solitaireVariation}
      isFixedSize={isFixedSize}
      isGenerating={isGenerating}
      isSolitaire={isSolitaire}
      onWidthChange={onWidthChange}
      onHeightChange={onHeightChange}
      onSettingsCommit={onSettingsCommit}
      onSolitaireVariationChange={onSolitaireVariationChange}
      onToday={generateDailyPuzzle}
      onUseSeed={onGenerate}
      onRandomize={onRandomize}
    />
  );

  const statusSlot = showStatusLine || showSudokuValidationMessage || showNonogramValidationMessage ? (
    <>
      {showStatusLine ? (
        <p class="status-line" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}

      {showSudokuValidationMessage ? (
        <p class={`sudoku-validation-message ${sudokuValidationTone}`} aria-live="polite">
          {statusMessage}
        </p>
      ) : null}

      {showNonogramValidationMessage ? (
        <p class={`sudoku-validation-message ${nonogramValidationTone}`} aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
    </>
  ) : null;

  const boardSlot = puzzle ? (
    <section class="puzzle-panel" aria-label="Generated puzzle preview">
      {puzzle.kind === "cards" ? null : (
        <div class="puzzle-meta">
          {isSudoku ? null : <span>{`${puzzle.width} x ${puzzle.height}`}</span>}
          {puzzle.difficulty ? <span>{puzzle.difficulty}</span> : null}
          {isNonogram ? <span>{puzzle.uniqueSolution ? "Unique" : "Open"}</span> : null}
          {isWordGuess ? <span>Answer-list solvable</span> : null}
          {isSudoku ? (
            <span>{getGivenCount(gridCells)} givens</span>
          ) : isNonogram ? (
            <span>{filledOpenCount}/{openCount} filled</span>
          ) : dailyLabel ? (
            <span>Daily: {dailyLabel}</span>
          ) : null}
          {isSudoku ? <span>Progress: {filledOpenCount} of {openCount}</span> : null}
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
      ) : puzzle.kind === "tiles" ? (
        <TilePuzzlePreview puzzle={puzzle} />
      ) : puzzle.kind === "grid" && puzzle.puzzleId === "word-guess" && gridCells ? (
        <WordGuessGame
          puzzle={puzzle}
          cells={gridCells}
          statusMessage={statusMessage}
          onCellInput={onCellInput}
          onSubmitGuess={onCheck}
        />
      ) : puzzle.kind === "grid" && gridCells ? (
        <GridPuzzlePreview
          puzzle={puzzle}
          cells={gridCells}
          selectedGridCell={selectedGridCell}
          onCellClick={onCellClick}
          onCellInput={onCellInput}
        />
      ) : null}

      {hasBottomSettingsBar || puzzle.kind === "cards" || puzzle.notes.length === 0 ? null : (
        <ul class="notes-list">
          {puzzle.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </section>
  ) : null;

  const gameplaySlot = puzzle && puzzle.kind !== "cards" && !isWordGuess ? (
    <div class="puzzle-actions">
      <button type="button" onClick={onCheck}>
        Check
      </button>
    </div>
  ) : null;

  return (
    <PuzzleWorkspaceLayout
      className={workspaceClass}
      header={headerSlot}
      status={statusSlot}
      board={boardSlot}
      gameplay={gameplaySlot}
      generation={configurationSlot}
    />
  );
};
