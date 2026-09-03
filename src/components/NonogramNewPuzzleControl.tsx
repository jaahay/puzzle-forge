import { useEffect, useRef, useState } from "preact/hooks";
import { makeRandomSeed } from "../app/runtime";
import type { PuzzleDifficulty } from "../catalog/types";
import { getDailyPuzzleProfile } from "../games/shared/daily";
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

type EnactmentSource = "random" | "today" | "seed";

const difficulties: PuzzleDifficulty[] = ["Easy", "Medium", "Hard", "Expert"];
const dailyProfile = getDailyPuzzleProfile("nonogram");
const enactmentDurationMs = 180;

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
  const enactmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [enactingSource, setEnactingSource] = useState<EnactmentSource | null>(null);
  const configurationSummary = `${difficulty} · ${width}×${height} · ${requireUniqueSolution ? "Exactly one solution" : "May be multiple solutions"}`;
  const dailySummary = dailyProfile
    ? `${dailyProfile.width}×${dailyProfile.height} · ${dailyProfile.difficulty} · one solution`
    : "Today's profile";

  const closeOptions = (restoreFocus = false) => {
    const options = optionsRef.current;
    if (!options) return;
    options.open = false;
    if (restoreFocus) options.querySelector("summary")?.focus();
  };

  const renewSeedCandidate = () => onSeedLoadInputChange(makeRandomSeed());
  const selectedEnactmentClass = (selected: boolean) =>
    [selected ? "selected" : "", selected && enactingSource ? "new-puzzle-enacting" : ""]
      .filter(Boolean)
      .join(" ") || undefined;

  const enactPuzzle = (source: EnactmentSource, enact: () => void) => {
    setEnactingSource(source);
    enact();
    renewSeedCandidate();

    const reduceMotion = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      closeOptions();
      setEnactingSource(null);
      return;
    }

    if (enactmentTimerRef.current) clearTimeout(enactmentTimerRef.current);
    enactmentTimerRef.current = setTimeout(() => {
      closeOptions();
      setEnactingSource(null);
      enactmentTimerRef.current = null;
    }, enactmentDurationMs);
  };

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
      if (enactmentTimerRef.current) clearTimeout(enactmentTimerRef.current);
    };
  }, []);

  const startRandomPuzzle = () => {
    if (disabled) return;
    enactPuzzle("random", onNewPuzzle);
  };

  const startToday = () => {
    if (disabled) return;
    enactPuzzle("today", () => {
      if (dailyProfile) {
        onDifficultyChange(dailyProfile.difficulty);
        onWidthChange(dailyProfile.width);
        onHeightChange(dailyProfile.height);
        onUniqueSolutionChange(dailyProfile.requireUniqueSolution);
      }
      onToday();
    });
  };

  const loadSeed = () => {
    if (disabled || !seedLoadInput.trim()) return;
    enactPuzzle("seed", onLoadSeed);
  };

  return (
    <div class="new-puzzle-command" aria-label={`New Nonogram: ${configurationSummary}`} ref={commandRef}>
      <div class="new-puzzle-split-control">
        <button
          class={`new-puzzle-command-primary${enactingSource === "random" ? " new-puzzle-enacting" : ""}`}
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
                <p>A Nonogram's clues can sometimes describe more than one completed grid. Requiring exactly one solution makes the generator test the clues and retry until only one grid satisfies them. When that requirement is off, the test is skipped; the puzzle may still happen to be unique, but it is not guaranteed.</p>
                <p>Random and ordinary seed loads use the settings below. Today is always 8×8, Medium, with exactly one solution, and choosing it reconciles those settings to the daily profile.</p>
                <p>The locked seed is the puzzle you're playing. Edit the lower seed and press play to load it.</p>
              </div>
            </details>

            <div class="new-puzzle-quick-actions" aria-label="Puzzle source">
              <button
                class={enactingSource === "random" ? "new-puzzle-enacting" : undefined}
                type="button"
                onClick={startRandomPuzzle}
                disabled={disabled}
                aria-label={`Start a random puzzle, ${configurationSummary}`}
                title={`Random puzzle — ${configurationSummary}`}
              >
                <RandomIcon />
                <span class="new-puzzle-quick-action-copy"><strong>Random</strong></span>
              </button>
              <button
                class={enactingSource === "today" ? "new-puzzle-enacting" : undefined}
                type="button"
                onClick={startToday}
                disabled={disabled}
                aria-label={`Start today's puzzle, ${dailySummary}`}
                title={`Today's puzzle — ${dailySummary}`}
              >
                <TodayDateTile />
                <span class="new-puzzle-quick-action-copy"><strong>Today</strong></span>
              </button>
            </div>

            <div class="new-puzzle-segmented new-puzzle-difficulty-options" role="group" aria-label="Difficulty">
              {difficulties.map((option) => (
                <button
                  key={option}
                  type="button"
                  class={selectedEnactmentClass(difficulty === option)}
                  aria-pressed={difficulty === option}
                  onClick={() => onDifficultyChange(option)}
                  disabled={disabled}
                >
                  {option}
                </button>
              ))}
            </div>

            <div class="new-puzzle-size-options" role="group" aria-label="Nonogram size">
              <label class={enactingSource ? "new-puzzle-enacting" : undefined}>
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
              <label class={enactingSource ? "new-puzzle-enacting" : undefined}>
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

            <label class={`new-puzzle-uniqueness-control${enactingSource ? " new-puzzle-enacting" : ""}`}>
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

            <div class="new-puzzle-seed-stack">
              <div class="new-puzzle-seed-row new-puzzle-current-seed">
                <CurrentSeedDisplay seed={currentSeed} disabledInput />
              </div>
              <div class={`new-puzzle-seed-row new-puzzle-seed-entry${enactingSource === "seed" ? " new-puzzle-enacting" : ""}`}>
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
