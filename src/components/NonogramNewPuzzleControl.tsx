import { useEffect, useRef } from "preact/hooks";
import { makeRandomSeed } from "../app/runtime";
import type { PuzzleDifficulty } from "../catalog/types";
import { BoundedNumberInput } from "./BoundedNumberInput";
import { InfoIcon, PlayIcon, RandomIcon, TodayDateTile } from "./NewPuzzleActionVisuals";
import { CurrentSeedDisplay } from "./SeedControl";

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
  const commandRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDetailsElement>(null);
  const configurationSummary = `${difficulty} · ${width}×${height} · ${requireUniqueSolution ? "Unique" : "Any solution"}`;

  const closeOptions = (restoreFocus = false) => {
    const options = optionsRef.current;
    if (!options) return;
    options.open = false;
    if (restoreFocus) options.querySelector("summary")?.focus();
  };

  const renewSeedCandidate = () => onSeedLoadInputChange(makeRandomSeed());

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!optionsRef.current?.open) return;
      const target = event.target;
      if (target instanceof Node && !commandRef.current?.contains(target)) closeOptions();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && optionsRef.current?.open) {
        event.preventDefault();
        closeOptions(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const startRandomPuzzle = () => {
    if (disabled) return;
    closeOptions();
    onNewPuzzle();
    renewSeedCandidate();
  };

  const startToday = () => {
    if (disabled) return;
    closeOptions();
    onToday();
    renewSeedCandidate();
  };

  const loadSeed = () => {
    if (disabled || !seedLoadInput.trim()) return;
    closeOptions();
    onLoadSeed();
    renewSeedCandidate();
  };

  return (
    <div class="new-puzzle-command" aria-label={`New Nonogram: ${configurationSummary}`} ref={commandRef}>
      <div class="new-puzzle-split-control">
        <button
          class="new-puzzle-command-primary"
          type="button"
          onClick={startRandomPuzzle}
          disabled={disabled}
          aria-label={`New random Nonogram, ${configurationSummary}`}
          title={`New random puzzle — ${configurationSummary}`}
        >
          New
        </button>
        <details
          class="new-puzzle-options"
          ref={optionsRef}
          onToggle={(event) => {
            if (event.currentTarget.open && !seedLoadInput.trim()) renewSeedCandidate();
          }}
        >
          <summary aria-label={`Change new puzzle options. Current selection: ${configurationSummary}`} title="New puzzle options">
            <span aria-hidden="true">▾</span>
          </summary>
          <div class="new-puzzle-options-panel nonogram-new-puzzle-options-panel" aria-label="New puzzle options">
            <details class="new-puzzle-info">
              <summary aria-label="About new puzzle options" title="About these options">
                <InfoIcon />
              </summary>
              <div class="new-puzzle-info-panel">
                <p>Difficulty, size, and uniqueness apply to every action here. Dice starts a random puzzle; the dated tile starts today's puzzle. The locked seed is the puzzle you're playing. Edit the lower seed and press play to load it.</p>
              </div>
            </details>

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

            <div class="new-puzzle-segmented new-puzzle-uniqueness-options" role="group" aria-label="Solution uniqueness">
              <button
                type="button"
                class={!requireUniqueSolution ? "selected" : undefined}
                aria-pressed={!requireUniqueSolution}
                onClick={() => onUniqueSolutionChange(false)}
                disabled={disabled}
              >
                Any
              </button>
              <button
                type="button"
                class={requireUniqueSolution ? "selected" : undefined}
                aria-pressed={requireUniqueSolution}
                onClick={() => onUniqueSolutionChange(true)}
                disabled={disabled}
              >
                Unique
              </button>
            </div>

            <div class="new-puzzle-quick-actions" aria-label="Quick puzzle actions">
              <button type="button" onClick={startRandomPuzzle} disabled={disabled} aria-label="Start a random puzzle" title="Random puzzle">
                <RandomIcon />
              </button>
              <button type="button" onClick={startToday} disabled={disabled} aria-label="Start today's puzzle" title="Today's puzzle">
                <TodayDateTile />
              </button>
            </div>

            <div class="new-puzzle-seed-stack">
              <div class="new-puzzle-seed-row new-puzzle-current-seed">
                <CurrentSeedDisplay seed={currentSeed} disabledInput />
              </div>
              <div class="new-puzzle-seed-row new-puzzle-seed-entry">
                <input
                  aria-label="Seed to load"
                  value={seedLoadInput}
                  onInput={(event) => onSeedLoadInputChange(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") loadSeed();
                  }}
                />
                <button
                  type="button"
                  onClick={loadSeed}
                  disabled={disabled || !seedLoadInput.trim()}
                  aria-label="Load seed"
                  title="Load seed"
                >
                  <PlayIcon />
                </button>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};
