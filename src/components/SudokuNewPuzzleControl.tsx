import { useEffect, useRef } from "preact/hooks";
import type { PuzzleDifficulty, SudokuVariation } from "../catalog/types";
import { makeRandomSeed } from "../app/runtime";
import { sudokuVariationDescriptions, sudokuVariationLabels } from "../games/sudoku/variation";
import { CurrentSeedDisplay } from "./SeedControl";

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

const RandomIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="9" cy="9" r="1" />
    <circle cx="15" cy="15" r="1" />
    <circle cx="15" cy="9" r="1" />
    <circle cx="9" cy="15" r="1" />
  </svg>
);

const TodayIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="6" width="16" height="14" rx="2" />
    <path d="M8 4v4M16 4v4M4 10h16" />
    <path d="M8 14h2M12 14h2M16 14h1M8 17h2M12 17h2" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5l11 7-11 7z" />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10v6M12 7.2v.1" />
  </svg>
);

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
  const commandRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDetailsElement>(null);
  const configurationSummary = `${difficulty} · ${sudokuVariationLabels[sudokuVariation]}`;

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
    <div class="new-puzzle-command" aria-label={`New Sudoku: ${configurationSummary}`} ref={commandRef}>
      <div class="new-puzzle-split-control">
        <button
          class="new-puzzle-command-primary"
          type="button"
          onClick={startRandomPuzzle}
          disabled={disabled}
          aria-label={`New random Sudoku, ${configurationSummary}`}
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
          <div class="new-puzzle-options-panel" aria-label="New puzzle options">
            <details class="new-puzzle-info">
              <summary aria-label="About new puzzle options" title="About these options">
                <InfoIcon />
              </summary>
              <div class="new-puzzle-info-panel">
                <p>{sudokuVariationDescriptions[sudokuVariation]}</p>
                <p>Difficulty and mode apply to every action here. Dice starts a random puzzle; the calendar starts today's puzzle. The locked seed is the puzzle you're playing. Edit the lower seed and press play to load it.</p>
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

            <div class="new-puzzle-segmented new-puzzle-mode-options" role="group" aria-label="Sudoku mode">
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

            <div class="new-puzzle-quick-actions" aria-label="Quick puzzle actions">
              <button type="button" onClick={startRandomPuzzle} disabled={disabled} aria-label="Start a random puzzle" title="Random puzzle">
                <RandomIcon />
              </button>
              <button type="button" onClick={startToday} disabled={disabled} aria-label="Start today's puzzle" title="Today's puzzle">
                <TodayIcon />
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
