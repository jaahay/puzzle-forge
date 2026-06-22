import { useState } from "preact/hooks";
import { solitaireHistoryLimitNotice } from "../app/session";
import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDefinition, PuzzleDifficulty, PuzzleGenerationRequest } from "../catalog/types";
import { getWordGuessDailyLabel, getWordGuessDailySeed } from "../games/wordGuess/daily";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCellSelection } from "../interactions/gridRules";
import { CardPuzzlePreview } from "./CardPuzzlePreview";
import { GridPuzzlePreview } from "./GridPuzzlePreview";
import { TilePuzzlePreview } from "./TilePuzzlePreview";
import { WordGuessGame } from "./WordGuessGame";

type SolitaireStats = {
  moveCount: number;
  drawCount: number;
  recycleCount: number;
  autoMoveCount: number;
};

type GenerationSettings = Partial<Pick<PuzzleGenerationRequest, "seed" | "width" | "height" | "difficulty" | "requireUniqueSolution">>;

type PuzzleWorkspaceProps = {
  selectedDefinition: PuzzleDefinition;
  selectedPuzzleIsGeneratable: boolean;
  seed: string;
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
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
  onUniqueSolutionChange: (requireUniqueSolution: boolean) => void;
  onGenerate: () => void;
  onRandomize: () => void;
  onCheck: () => void;
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
  requireUniqueSolution,
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
  onUniqueSolutionChange,
  onGenerate,
  onRandomize,
  onCheck,
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
  const [seedCopied, setSeedCopied] = useState(false);
  const isSudoku = selectedDefinition.id === "sudoku";
  const isNonogram = selectedDefinition.id === "nonogram";
  const isWordGuess = selectedDefinition.id === "word-guess";
  const hasBottomSettingsBar = isSudoku || isNonogram || isWordGuess;
  const compactWorkspaceHeader = isSudoku || isNonogram;
  const showStatusLine = !hasBottomSettingsBar;
  const isFixedSize = selectedDefinition.minWidth === selectedDefinition.maxWidth && selectedDefinition.minHeight === selectedDefinition.maxHeight;
  const filledOpenCount = getFilledOpenCount(gridCells);
  const openCount = getOpenCount(gridCells);
  const wordGuessDailyLabel = isWordGuess && puzzle ? getWordGuessDailyLabel(puzzle.seed) : null;
  const showSudokuValidationMessage =
    isSudoku && (statusMessage.startsWith("Sudoku solved") || statusMessage.startsWith("Sudoku validation"));
  const showNonogramValidationMessage = isNonogram && (statusMessage.startsWith("Solved") || statusMessage.startsWith("Not solved"));
  const sudokuValidationTone = statusMessage.startsWith("Sudoku solved") ? "success" : statusMessage.includes("incorrect") ? "error" : "progress";
  const nonogramValidationTone = statusMessage.startsWith("Solved") ? "success" : "error";
  const generateWordGuessDaily = () => onSettingsCommit({ seed: getWordGuessDailySeed(), width, height });
  const copySeed = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(seed);
      }
    } finally {
      setSeedCopied(true);

      if (typeof window !== "undefined") {
        window.setTimeout(() => setSeedCopied(false), 1400);
      }
    }
  };
  const seedInput = (
    <div class="seed-control">
      <input
        value={seed}
        onBlur={(event) => onSettingsCommit({ seed: event.currentTarget.value })}
        onInput={(event) => onSeedChange(event.currentTarget.value)}
        onKeyDown={blurOnEnter}
      />
      <button type="button" onClick={copySeed}>{seedCopied ? "Copied" : "Copy seed"}</button>
    </div>
  );

  return (
    <section class={`workspace-panel ${isSudoku ? "sudoku-workspace" : ""} ${isNonogram ? "nonogram-workspace" : ""} ${isWordGuess ? "word-guess-workspace" : ""}`} aria-label="Selected puzzle workspace">
      <div class="workspace-copy">
        <span class={`status ${selectedDefinition.status}`}>{selectedDefinition.status}</span>
        <h2>{selectedDefinition.title}</h2>
        {compactWorkspaceHeader ? null : <p>{selectedDefinition.description}</p>}
        {compactWorkspaceHeader ? null : (
          <div class="tag-row">
            {selectedDefinition.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      {hasBottomSettingsBar ? null : (
        <div class="control-panel" aria-label="Puzzle controls">
          <label>
            Seed
            {seedInput}
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

      {puzzle ? (
        <section class="puzzle-panel" aria-label="Generated puzzle preview">
          <div class="puzzle-meta">
            {puzzle.kind === "cards" ? null : isSudoku ? null : <span>{`${puzzle.width} x ${puzzle.height}`}</span>}
            {puzzle.difficulty ? <span>{puzzle.difficulty}</span> : null}
            {isNonogram ? <span>{puzzle.uniqueSolution ? "Unique" : "Open"}</span> : null}
            {isWordGuess ? <span>Answer-list solvable</span> : null}
            {puzzle.kind === "cards" ? <span>Random deal</span> : null}
            {puzzle.kind === "cards" ? <span>Solvability unknown</span> : null}
            {isSudoku ? (
              <span>{getGivenCount(gridCells)} givens</span>
            ) : isNonogram ? (
              <span>{filledOpenCount}/{openCount} filled</span>
            ) : wordGuessDailyLabel ? (
              <span>Daily: {wordGuessDailyLabel}</span>
            ) : puzzle.kind === "cards" ? null : (
              <span>Seed: {puzzle.seed}</span>
            )}
            {isSudoku ? <span>Progress: {filledOpenCount} of {openCount}</span> : null}
            {isSudoku ? <span>Seed: {puzzle.seed}</span> : null}
          </div>

          {puzzle.kind === "cards" ? (
            <>
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
              <p class="solitaire-history-note">{solitaireHistoryLimitNotice}</p>
            </>
          ) : null}

          {puzzle.kind === "cards" && cardStacks ? (
            <CardPuzzlePreview
              stacks={cardStacks}
              selectedCard={selectedCard}
              stats={solitaireStats}
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
              onRandomize={onRandomize}
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

          {puzzle.kind !== "cards" && (!hasBottomSettingsBar) ? (
            <div class="puzzle-actions">
              <button type="button" onClick={onCheck}>
                Check
              </button>
            </div>
          ) : null}

          {hasBottomSettingsBar ? (
            <div class="puzzle-settings-panel" aria-label={`${selectedDefinition.title} controls`}>
              {isWordGuess ? null : (
                <div class="puzzle-settings-actions">
                  <button type="button" onClick={onCheck}>
                    Check
                  </button>
                </div>
              )}

              {isWordGuess ? (
                <>
                  <label>
                    Letters
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
                    Guesses
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
              ) : (
                <label>
                  Difficulty
                  <select value={difficulty} onChange={(event) => onDifficultyChange(event.currentTarget.value as PuzzleDifficulty)}>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                    <option>Expert</option>
                  </select>
                </label>
              )}

              {isNonogram && !isFixedSize ? (
                <div class="puzzle-size-control" aria-label="Nonogram size">
                  <span class="control-label">Size</span>
                  <label class="compact-number-control">
                    <span>W</span>
                    <input
                      aria-label="Width"
                      type="number"
                      min={selectedDefinition.minWidth}
                      max={selectedDefinition.maxWidth}
                      value={width}
                      onBlur={(event) => onSettingsCommit({ width: Number(event.currentTarget.value) })}
                      onInput={(event) => onWidthChange(Number(event.currentTarget.value))}
                      onKeyDown={blurOnEnter}
                    />
                  </label>
                  <span class="size-separator">x</span>
                  <label class="compact-number-control">
                    <span>H</span>
                    <input
                      aria-label="Height"
                      type="number"
                      min={selectedDefinition.minHeight}
                      max={selectedDefinition.maxHeight}
                      value={height}
                      onBlur={(event) => onSettingsCommit({ height: Number(event.currentTarget.value) })}
                      onInput={(event) => onHeightChange(Number(event.currentTarget.value))}
                      onKeyDown={blurOnEnter}
                    />
                  </label>
                </div>
              ) : null}

              {isNonogram ? (
                <div class="puzzle-generation-options" aria-label="Nonogram generation options">
                  <label>
                    Seed
                    {seedInput}
                  </label>

                  <label class="puzzle-checkbox-control">
                    <input
                      checked={requireUniqueSolution}
                      onChange={(event) => onUniqueSolutionChange(event.currentTarget.checked)}
                      type="checkbox"
                    />
                    <span>Unique solution</span>
                  </label>
                </div>
              ) : (
                <label>
                  Seed
                  {seedInput}
                </label>
              )}

              <div class="puzzle-settings-actions">
                {isWordGuess ? (
                  <button type="button" onClick={generateWordGuessDaily} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
                    Today
                  </button>
                ) : null}
                {isWordGuess ? (
                  <button type="button" onClick={onGenerate} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
                    {isGenerating ? "Generating..." : "Use seed"}
                  </button>
                ) : null}
                <button type="button" onClick={onRandomize} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
                  {isWordGuess ? "Random" : "Randomize"}
                </button>
              </div>

              {isWordGuess ? <p class="word-guess-solvability-note">Answer is always selected from this puzzle's answer list and is accepted as a valid guess.</p> : null}
              {isSudoku ? <p class="sudoku-input-hint">Select an empty cell, then type 1-9 or tap a number. Press 0, Backspace, or Clear to empty a cell.</p> : null}
            </div>
          ) : null}

          {hasBottomSettingsBar || puzzle.kind === "cards" || puzzle.notes.length === 0 ? null : (
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
