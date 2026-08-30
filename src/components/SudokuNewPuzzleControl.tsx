import { useRef } from "preact/hooks";
import type { PuzzleDifficulty, SudokuVariation } from "../catalog/types";
import { sudokuVariationLabels } from "../games/sudoku/variation";
import { PuzzleDifficultySelect } from "./PuzzleDifficultySelect";
import { SudokuVariationSelect } from "./SudokuVariationSelect";

type SudokuNewPuzzleControlProps = {
  difficulty: PuzzleDifficulty;
  sudokuVariation: SudokuVariation;
  seedLoadInput: string;
  disabled: boolean;
  onDifficultyChange: (difficulty: PuzzleDifficulty) => void;
  onSudokuVariationChange: (variation: SudokuVariation) => void;
  onSeedLoadInputChange: (seed: string) => void;
  onNewPuzzle: () => void;
  onToday: () => void;
  onLoadSeed: () => void;
};

export const SudokuNewPuzzleControl = ({
  difficulty,
  sudokuVariation,
  seedLoadInput,
  disabled,
  onDifficultyChange,
  onSudokuVariationChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
}: SudokuNewPuzzleControlProps) => {
  const optionsRef = useRef<HTMLDetailsElement>(null);
  const configurationSummary = `${difficulty} · ${sudokuVariationLabels[sudokuVariation]}`;

  const closeOptions = () => {
    if (optionsRef.current) optionsRef.current.open = false;
  };

  const startToday = () => {
    closeOptions();
    onToday();
  };

  const loadSeed = () => {
    if (!seedLoadInput.trim()) return;
    closeOptions();
    onLoadSeed();
  };

  return (
    <div class="new-puzzle-command" aria-label={`New Sudoku: ${configurationSummary}`}>
      <div class="new-puzzle-split-control">
        <button
          class="new-puzzle-command-primary"
          type="button"
          onClick={onNewPuzzle}
          disabled={disabled}
          aria-label={`New Sudoku, ${configurationSummary}`}
        >
          <span>New puzzle</span>
          <small>{configurationSummary}</small>
        </button>
        <details class="new-puzzle-options" ref={optionsRef}>
          <summary aria-label={`Change new puzzle options. Current selection: ${configurationSummary}`} title="New puzzle options">
            <span aria-hidden="true">▾</span>
          </summary>
          <div class="new-puzzle-options-panel" aria-label="New puzzle options">
            <div class="new-puzzle-settings-grid">
              <label>
                Difficulty
                <PuzzleDifficultySelect value={difficulty} onChange={onDifficultyChange} />
              </label>
              <label>
                Mode
                <SudokuVariationSelect value={sudokuVariation} onChange={onSudokuVariationChange} />
              </label>
            </div>

            <div class="new-puzzle-options-actions">
              <button type="button" onClick={startToday} disabled={disabled}>Today</button>
            </div>

            <div class="new-puzzle-seed-tools">
              <label>
                Seed
                <input
                  aria-label="Seed to load"
                  value={seedLoadInput}
                  onInput={(event) => onSeedLoadInputChange(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") loadSeed();
                  }}
                />
              </label>
              <button
                type="button"
                onClick={loadSeed}
                disabled={disabled || !seedLoadInput.trim()}
              >
                Load seed
              </button>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};
