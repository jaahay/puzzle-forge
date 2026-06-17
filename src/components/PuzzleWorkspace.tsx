import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDefinition } from "../catalog/types";
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
  onGenerate: () => void;
  onRandomize: () => void;
  onCheck: () => void;
  onAutoMoveToFoundations: () => void;
  onCardClick: (stack: CardStack, cardIndex: number) => void;
  onStackClick: (stack: CardStack) => void;
  onCellClick: (cell: PuzzleCell) => void;
  onCellInput: (cell: PuzzleCell, value: string) => void;
};

export const PuzzleWorkspace = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  seed,
  width,
  height,
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
  onGenerate,
  onRandomize,
  onCheck,
  onAutoMoveToFoundations,
  onCardClick,
  onStackClick,
  onCellClick,
  onCellInput,
}: PuzzleWorkspaceProps) => (
  <section class="workspace-panel" aria-label="Selected puzzle workspace">
    <div class="workspace-copy">
      <span class={`status ${selectedDefinition.status}`}>{selectedDefinition.status}</span>
      <h2>{selectedDefinition.title}</h2>
      <p>{selectedDefinition.description}</p>
      <div class="tag-row">
        {selectedDefinition.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </div>

    <div class="control-panel" aria-label="Puzzle controls">
      <label>
        Seed
        <input value={seed} onInput={(event) => onSeedChange(event.currentTarget.value)} />
      </label>

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

      <div class="control-actions">
        <button type="button" onClick={onGenerate} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
          {isGenerating ? "Generating..." : "Generate"}
        </button>
        <button type="button" onClick={onRandomize} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
          Randomize
        </button>
      </div>
    </div>

    <p class="status-line" aria-live="polite">
      {statusMessage}
    </p>

    {puzzle ? (
      <section class="puzzle-panel" aria-label="Generated puzzle preview">
        <div class="puzzle-meta">
          <span>{puzzle.kind === "cards" ? "52-card deal" : `${puzzle.width} x ${puzzle.height}`}</span>
          <span>Seed: {puzzle.seed}</span>
          <span>Checksum: {puzzle.checksum}</span>
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

        <ul class="notes-list">
          {puzzle.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    ) : null}
  </section>
);
