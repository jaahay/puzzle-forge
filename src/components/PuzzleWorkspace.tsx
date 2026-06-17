import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDefinition, PuzzleDifficulty } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCellSelection } from "../interactions/gridRules";
import { CardPuzzlePreview } from "./CardPuzzlePreview";
import { GridPuzzlePreview } from "./GridPuzzlePreview";

type SolitaireStats = {
  moveCount: number;
  drawCount: number;
  recycleCount: number;
  autoMoveCount: number;
};

type PuzzleWorkspaceProps = {
  selectedDefinition: PuzzleDefinition;
  selectedPuzzleIsGeneratable: boolean;
  seed: string;
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  puzzle: GeneratedPuzzle | null;
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
  onDifficultyChange: (difficulty: PuzzleDifficulty) => void;
  onGenerate: () => void;
  onRandomize: () => void;
  onCheck: () => void;
  onAutoMoveToFoundations: () => void;
  onCardClick: (stack: CardStack, cardIndex: number) => void;
  onStackClick: (stack: CardStack) => void;
  onCellClick: (cell: PuzzleCell) => void;
  onCellInput: (cell: PuzzleCell, value: string) => void;
};

const getGivenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => cell.locked).length ?? 0;

export const PuzzleWorkspace = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  seed,
  width,
  height,
  difficulty,
  puzzle,
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
  onDifficultyChange,
  onGenerate,
  onRandomize,
  onCheck,
  onAutoMoveToFoundations,
  onCardClick,
  onStackClick,
  onCellClick,
  onCellInput,
}: PuzzleWorkspaceProps) => {
  const isSudoku = selectedDefinition.id === "sudoku";
  const isFixedSize = selectedDefinition.minWidth === selectedDefinition.maxWidth && selectedDefinition.minHeight === selectedDefinition.maxHeight;

  return (
    <section class={`workspace-panel ${isSudoku ? "sudoku-workspace" : ""}`} aria-label="Selected puzzle workspace">
      <div class="workspace-copy">
        <span class={`status ${selectedDefinition.status}`}>{selectedDefinition.status}</span>
        <h2>{selectedDefinition.title}</h2>
        {isSudoku ? null : <p>{selectedDefinition.description}</p>}
        {isSudoku ? null : (
          <div class="tag-row">
            {selectedDefinition.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      {isSudoku ? null : (
        <div class="control-panel" aria-label="Puzzle controls">
          <label>
            Seed
            <input value={seed} onInput={(event) => onSeedChange(event.currentTarget.value)} />
          </label>

          {isFixedSize ? null : (
            <>
              <label>
                Width
                <input
                  type="number"
                  min={selectedDefinition.minWidth}
                  max={selectedDefinition.maxWidth}
                  value={width}
                  onInput={(event) => onWidthChange(Number(event.currentTarget.value))}
                />
              </label>

              <label>
                Height
                <input
                  type="number"
                  min={selectedDefinition.minHeight}
                  max={selectedDefinition.maxHeight}
                  value={height}
                  onInput={(event) => onHeightChange(Number(event.currentTarget.value))}
                />
              </label>
            </>
          )}

          <div class="control-actions">
            <button type="button" onClick={onGenerate} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
              {isGenerating ? "Generating..." : "Generate"}
            </button>
            <button type="button" onClick={onRandomize} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
              Randomize
            </button>
          </div>
        </div>
      )}

      <p class="status-line" aria-live="polite">
        {statusMessage}
      </p>

      {puzzle ? (
        <section class="puzzle-panel" aria-label="Generated puzzle preview">
          <div class="puzzle-meta">
            {puzzle.kind === "cards" ? <span>52-card deal</span> : isSudoku ? null : <span>{`${puzzle.width} x ${puzzle.height}`}</span>}
            {puzzle.difficulty ? <span>{puzzle.difficulty}</span> : null}
            {isSudoku ? <span>{getGivenCount(gridCells)} givens</span> : <span>Seed: {puzzle.seed}</span>}
          </div>

          {puzzle.kind === "cards" && cardStacks ? (
            <CardPuzzlePreview
              stacks={cardStacks}
              selectedCard={selectedCard}
              stats={solitaireStats}
              onCardClick={onCardClick}
              onStackClick={onStackClick}
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

          <div class="puzzle-actions">
            {puzzle.kind === "cards" ? (
              <button type="button" onClick={onAutoMoveToFoundations}>
                Auto foundation
              </button>
            ) : null}
            <button type="button" onClick={onCheck}>
              Check
            </button>
          </div>

          {isSudoku ? (
            <div class="sudoku-seed-panel" aria-label="Sudoku generation controls">
              <label>
                Difficulty
                <select value={difficulty} onChange={(event) => onDifficultyChange(event.currentTarget.value as PuzzleDifficulty)}>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                  <option>Expert</option>
                </select>
              </label>
              <label>
                Seed
                <input value={seed} onInput={(event) => onSeedChange(event.currentTarget.value)} />
              </label>
              <div class="control-actions">
                <button type="button" onClick={onGenerate} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
                  {isGenerating ? "Generating..." : "Generate from seed"}
                </button>
                <button type="button" onClick={onRandomize} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
                  New random
                </button>
              </div>
            </div>
          ) : null}

          {isSudoku || puzzle.notes.length === 0 ? null : (
            <ul class="notes-list">
              {puzzle.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </section>
  );
};
