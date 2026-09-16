import type { PuzzleDifficulty, SudokuVariation } from "../catalog/types";
import { sudokuVariationDescriptions, sudokuVariationLabels } from "../games/sudoku/variation";
import { NewPuzzleCommand } from "./NewPuzzleCommand";

type SudokuNewPuzzleControlProps = {
  currentSeed: string;
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

const difficulties: PuzzleDifficulty[] = ["Easy", "Medium", "Hard", "Expert"];
const variations: Array<{ value: SudokuVariation; label: string }> = [
  { value: "classic", label: "Standard" },
  { value: "diagonal", label: "Diagonal" },
  { value: "zero-killer", label: "Zero Killer" },
];

export const SudokuNewPuzzleControl = ({
  currentSeed,
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
  const configurationSummary = `${difficulty} · ${sudokuVariationLabels[sudokuVariation]}`;

  return (
    <NewPuzzleCommand
      puzzleTitle="Sudoku"
      currentSeed={currentSeed}
      configurationSummary={configurationSummary}
      seedLoadInput={seedLoadInput}
      disabled={disabled}
      onSeedLoadInputChange={onSeedLoadInputChange}
      onNewPuzzle={onNewPuzzle}
      onToday={onToday}
      onLoadSeed={onLoadSeed}
      info={(
        <>
          <p>{sudokuVariationDescriptions[sudokuVariation]}</p>
          <p>Random, Today, and ordinary seed loads use the difficulty and ruleset below. Today is deterministic for the local date and selected configuration, so changing either difficulty or ruleset selects a different daily track.</p>
          <p>The locked field is the current puzzle's seed. Edit the lower seed and press play to load another seed.</p>
        </>
      )}
      settings={(
        <>
          <div class="new-puzzle-segmented new-puzzle-difficulty-options" role="group" aria-label="Difficulty">
            {difficulties.map((option) => (
              <button
                key={option}
                type="button"
                class={difficulty === option ? "selected" : undefined}
                aria-pressed={difficulty === option}
                onClick={() => onDifficultyChange(option)}
                disabled={disabled}
              >
                {option}
              </button>
            ))}
          </div>

          <div class="new-puzzle-segmented new-puzzle-mode-options" role="group" aria-label="Sudoku ruleset">
            {variations.map((option) => (
              <button
                key={option.value}
                type="button"
                class={sudokuVariation === option.value ? "selected" : undefined}
                aria-pressed={sudokuVariation === option.value}
                onClick={() => onSudokuVariationChange(option.value)}
                disabled={disabled}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    />
  );
};
