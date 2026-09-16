import type { PuzzleDifficulty } from "../catalog/types";
import { NewPuzzleCommand } from "./NewPuzzleCommand";

type FutoshikiNewPuzzleControlProps = {
  currentSeed: string;
  difficulty: PuzzleDifficulty;
  seedLoadInput: string;
  disabled: boolean;
  onDifficultyChange: (difficulty: PuzzleDifficulty) => void;
  onSeedLoadInputChange: (seed: string) => void;
  onNewPuzzle: () => void;
  onToday: () => void;
  onLoadSeed: () => void;
};

const difficulties: PuzzleDifficulty[] = ["Easy", "Medium", "Hard", "Expert"];

export const FutoshikiNewPuzzleControl = ({
  currentSeed,
  difficulty,
  seedLoadInput,
  disabled,
  onDifficultyChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
}: FutoshikiNewPuzzleControlProps) => (
  <NewPuzzleCommand
    puzzleTitle="Futoshiki"
    currentSeed={currentSeed}
    configurationSummary={difficulty}
    seedLoadInput={seedLoadInput}
    disabled={disabled}
    onSeedLoadInputChange={onSeedLoadInputChange}
    onNewPuzzle={onNewPuzzle}
    onToday={onToday}
    onLoadSeed={onLoadSeed}
    info={(
      <>
        <p>Difficulty configures the next Futoshiki only. Changing it here does not alter the puzzle currently being played.</p>
        <p>Random, Today, and ordinary seed loads all use the selected difficulty. Today is deterministic for the local date and difficulty.</p>
      </>
    )}
    settings={(
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
    )}
  />
);
