import type { PuzzleDifficulty } from "../catalog/types";
import { BoundedNumberInput } from "./BoundedNumberInput";
import { NewPuzzleCommand } from "./NewPuzzleCommand";

type NonogramNewPuzzleControlProps = {
  currentSeed: string;
  difficulty: PuzzleDifficulty;
  width: number;
  height: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  requireUniqueSolution: boolean;
  seedLoadInput: string;
  disabled: boolean;
  onDifficultyChange: (difficulty: PuzzleDifficulty) => void;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onUniqueSolutionChange: (requireUniqueSolution: boolean) => void;
  onSeedLoadInputChange: (seed: string) => void;
  onNewPuzzle: () => void;
  onToday: () => void;
  onLoadSeed: () => void;
};

const difficulties: PuzzleDifficulty[] = ["Easy", "Medium", "Hard", "Expert"];

export const NonogramNewPuzzleControl = ({
  currentSeed,
  difficulty,
  width,
  height,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  requireUniqueSolution,
  seedLoadInput,
  disabled,
  onDifficultyChange,
  onWidthChange,
  onHeightChange,
  onUniqueSolutionChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
}: NonogramNewPuzzleControlProps) => {
  const configurationSummary = `${difficulty} · ${width}×${height} · ${requireUniqueSolution ? "Exactly one solution" : "May be multiple solutions"}`;

  return (
    <NewPuzzleCommand
      puzzleTitle="Nonogram"
      currentSeed={currentSeed}
      configurationSummary={configurationSummary}
      seedLoadInput={seedLoadInput}
      disabled={disabled}
      panelClassName="nonogram-new-puzzle-options-panel"
      onSeedLoadInputChange={onSeedLoadInputChange}
      onNewPuzzle={onNewPuzzle}
      onToday={onToday}
      onLoadSeed={onLoadSeed}
      info={(
        <>
          <p>A Nonogram's clues can sometimes describe more than one completed grid. Requiring exactly one solution makes the generator test the clues and retry until only one grid satisfies them. When that requirement is off, the test is skipped; the puzzle may still happen to be unique, but it is not guaranteed.</p>
          <p>Random, Today, and ordinary seed loads use the settings below. Today is deterministic for the local date and selected difficulty, size, and uniqueness requirement, so each meaningful configuration has its own daily track.</p>
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

          <div class="new-puzzle-size-options" role="group" aria-label="Nonogram size">
            <label>
              <span aria-hidden="true">W</span>
              <BoundedNumberInput
                ariaLabel="Width"
                value={width}
                min={minWidth}
                max={maxWidth}
                disabled={disabled}
                commitOnValidInput
                onCommit={onWidthChange}
              />
            </label>
            <span class="new-puzzle-size-separator" aria-hidden="true">×</span>
            <label>
              <span aria-hidden="true">H</span>
              <BoundedNumberInput
                ariaLabel="Height"
                value={height}
                min={minHeight}
                max={maxHeight}
                disabled={disabled}
                commitOnValidInput
                onCommit={onHeightChange}
              />
            </label>
          </div>

          <label class="new-puzzle-uniqueness-control">
            <input
              type="checkbox"
              checked={requireUniqueSolution}
              onChange={(event) => onUniqueSolutionChange(event.currentTarget.checked)}
              disabled={disabled}
            />
            <span class="new-puzzle-uniqueness-copy">
              <strong>Require exactly one solution</strong>
              <span>{requireUniqueSolution ? "Clues are checked before play." : "Off — more than one solution may fit the clues."}</span>
            </span>
          </label>
        </>
      )}
    />
  );
};
