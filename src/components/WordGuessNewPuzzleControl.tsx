import { BoundedNumberInput } from "./BoundedNumberInput";
import { NewPuzzleCommand } from "./NewPuzzleCommand";

type WordGuessNewPuzzleControlProps = {
  currentSeed: string;
  width: number;
  height: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  seedLoadInput: string;
  disabled: boolean;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSeedLoadInputChange: (seed: string) => void;
  onNewPuzzle: () => void;
  onToday: () => void;
  onLoadSeed: () => void;
};

export const WordGuessNewPuzzleControl = ({
  currentSeed,
  width,
  height,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  seedLoadInput,
  disabled,
  onWidthChange,
  onHeightChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
}: WordGuessNewPuzzleControlProps) => {
  const configurationSummary = `${width} letters · ${height} guesses`;

  return (
    <NewPuzzleCommand
      puzzleTitle="Word Guess"
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
          <p>Word length and guess count configure the next Word Guess only. Changing them here does not alter the current game.</p>
          <p>Random, Today, and ordinary seed loads all use the selected dimensions. Today is deterministic for the local date and selected profile.</p>
        </>
      )}
      settings={(
        <div class="new-puzzle-size-options" role="group" aria-label="Word Guess dimensions">
          <label>
            <span>Letters</span>
            <BoundedNumberInput
              ariaLabel="Letters"
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
            <span>Guesses</span>
            <BoundedNumberInput
              ariaLabel="Guesses"
              value={height}
              min={minHeight}
              max={maxHeight}
              disabled={disabled}
              commitOnValidInput
              onCommit={onHeightChange}
            />
          </label>
        </div>
      )}
    />
  );
};
