import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDefinition, PuzzleDifficulty, PuzzleGenerationRequest } from "../catalog/types";
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

type GenerationSettings = Partial<Pick<PuzzleGenerationRequest, "seed" | "width" | "height">>;

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
  onSettingsCommit: (settings?: GenerationSettings) => void;
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
const getFilledOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked && cell.value).length ?? 0;
const getOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked).length ?? 0;
const blurOnEnter = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    event.currentTarget instanceof HTMLElement && event.currentTarget.blur();
  }
};

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
  onSettingsCommit,
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
  const isNonogram = selectedDefinition.id === "nonogram";
  const usesBottomGenerationControls = isSudoku || isNonogram;
  const isFixedSize = selectedDefinition.minWidth === selectedDefinition.maxWidth && selectedDefinition.minHeight === selectedDefinition.maxHeight;
  const filledOpenCount = getFilledOpenCount(gridCells);
  const openCount = getOpenCount(gridCells);
  const showSudokuValidationMessage =
    isSudoku && (statusMessage.startsWith("Sudoku solved") || statusMessage.startsWith("Sudoku validation"));
  const showNonogramValidationMessage = isNonogram && (statusMessage.startsWith("Solved") || statusMessage.startsWith("Not solved"));
  const sudokuValidationTone = statusMessage.startsWith("Sudoku solved") ? "success" : statusMessage.includes("incorrect") ? "error" : "progress";
  const nonogramValidationTone = statusMessage.startsWith("Solved") ? "success" : "error";

  return (
    <section class={`workspace-panel ${isSudoku ? "sudoku-workspace" : ""} ${isNonogram ? "nonogram-workspace" : ""}`} aria-label="Selected puzzle workspace">
      <div class="workspace-copy">
        <span class={`status ${selectedDefinition.status}`}>{selectedDefinition.status}</span>
        <h2>{selectedDefinition.title}</h2>
        {usesBottomGenerationControls ? null : <p>{selectedDefinition.description}</p>}
        {usesBottomGenerationControls ? null : (
          <div class="tag-row">
            {selectedDefinition.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      {usesBottomGenerationControls ? null : (
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

      {usesBottomGenerationControls ? null : (
        <p class="status-line" aria-live="polite">
          {statusMessage}
        </p>
      )}

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

      {puzzle ? (
        <section class="puzzle-panel" aria-label="Generated puzzle preview">
          <div class="puzzle-meta">
            {puzzle.kind === "cards" ? <span>52-card deal</span> : isSudoku ? null : <span>{`${puzzle.width} x ${puzzle.height}`}</span>}
            {puzzle.difficulty ? <span>{puzzle.difficulty}</span> : null}
            {isSudoku ? <span>{getGivenCount(gridCells)} givens</span> : isNonogram ? <span>{filledOpenCount}/{openCount} filled</span> : <span>Seed: {puzzle.seed}</span>}
            {isSudoku ? <span>{filledOpenCount}/{openCount} filled</span> : null}
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

          {puzzle.kind === "cards" || !usesBottomGenerationControls ? (
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
          ) : null}

          {usesBottomGenerationControls ? (
            <div class="puzzle-settings-panel" aria-label={`${selectedDefinition.title} controls`}>
              <div class="puzzle-settings-actions">
                <button type="button" onClick={onCheck}>
                  {isSudoku ? "Check board" : "Check"}
                </button>
              </div>

              {isSudoku ? (
                <label>
                  Difficulty
                  <select value={difficulty} onChange={(event) => onDifficultyChange(event.currentTarget.value as PuzzleDifficulty)}>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                    <option>Expert</option>
                  </select>
                </label>
              ) : null}

              {isNonogram && !isFixedSize ? (
                <>
                  <label>
                    Width
                    <input
                      type="number"
                      min={selectedDefinition.minWidth}
                      max={selectedDefinition.maxWidth}
                      value={width}
                      onBlur={(event) => onSettingsCommit({ width: Number(event.currentTarget.value) })}
                      onInput={(event) => onWidthChange(Number(event.currentTarget.value))}
                      onKeyDown={blurOnEnter}
                    />
                  </label>

                  <label>
                    Height
                    <input
                      type="number"
                      min={selectedDefinition.minHeight}
                      max={selectedDefinition.maxHeight}
                      value={height}
                      onBlur={(event) => onSettingsCommit({ height: Number(event.currentTarget.value) })}
                      onInput={(event) => onHeightChange(Number(event.currentTarget.value))}
                      onKeyDown={blurOnEnter}
                    />
                  </label>
                </>
              ) : null}

              <label>
                Seed
                <input
                  value={seed}
                  onBlur={(event) => onSettingsCommit({ seed: event.currentTarget.value })}
                  onInput={(event) => onSeedChange(event.currentTarget.value)}
                  onKeyDown={blurOnEnter}
                />
              </label>

              <div class="puzzle-settings-actions">
                <button type="button" onClick={onRandomize} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
                  Randomize
                </button>
              </div>

              {isSudoku ? <p class="sudoku-input-hint">Type 1-9. Press 0 to clear. Click outside the board to deselect.</p> : null}
            </div>
          ) : null}

          {usesBottomGenerationControls || puzzle.notes.length === 0 ? null : (
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
