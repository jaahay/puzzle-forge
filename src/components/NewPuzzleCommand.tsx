import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { makeRandomSeed, maxPuzzleSeedLength } from "../app/runtime";
import { InfoIcon, PlayIcon, RandomIcon, TodayDateTile } from "./NewPuzzleActionVisuals";
import { CurrentSeedDisplay } from "./SeedControl";

type NewPuzzleCommandActionOptions = {
  disabled: boolean;
  seedLoadInput: string;
  closeOptions: (restoreFocus?: boolean) => void;
  onNewPuzzle: () => void;
  onToday: () => void;
  onLoadSeed: () => void;
  renewSeedCandidate: () => void;
};

export const createNewPuzzleCommandActions = ({
  disabled,
  seedLoadInput,
  closeOptions,
  onNewPuzzle,
  onToday,
  onLoadSeed,
  renewSeedCandidate,
}: NewPuzzleCommandActionOptions) => ({
  startRandomPuzzle: (restoreMenuFocus = false) => {
    if (disabled) return;
    closeOptions(restoreMenuFocus);
    onNewPuzzle();
    renewSeedCandidate();
  },
  startToday: () => {
    if (disabled) return;
    closeOptions(true);
    onToday();
    renewSeedCandidate();
  },
  loadSeed: () => {
    if (disabled || !seedLoadInput.trim()) return;
    closeOptions(true);
    onLoadSeed();
    renewSeedCandidate();
  },
});

type NewPuzzleCommandProps = {
  puzzleTitle: string;
  currentSeed: string;
  configurationSummary: string;
  dailySummary?: string;
  seedLoadInput: string;
  disabled: boolean;
  settings?: ComponentChildren;
  info?: ComponentChildren;
  panelClassName?: string;
  onSeedLoadInputChange: (seed: string) => void;
  onNewPuzzle: () => void;
  onToday: () => void;
  onLoadSeed: () => void;
};

export const NewPuzzleCommand = ({
  puzzleTitle,
  currentSeed,
  configurationSummary,
  dailySummary = configurationSummary,
  seedLoadInput,
  disabled,
  settings,
  info,
  panelClassName,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
}: NewPuzzleCommandProps) => {
  const commandRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDetailsElement>(null);

  const closeOptions = (restoreFocus = false) => {
    const options = optionsRef.current;
    if (!options) return;
    const wasOpen = options.open;
    options.open = false;
    if (restoreFocus && wasOpen) options.querySelector("summary")?.focus();
  };

  const renewSeedCandidate = () => onSeedLoadInputChange(makeRandomSeed());
  const { startRandomPuzzle, startToday, loadSeed } = createNewPuzzleCommandActions({
    disabled,
    seedLoadInput,
    closeOptions,
    onNewPuzzle,
    onToday,
    onLoadSeed,
    renewSeedCandidate,
  });

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

  const panelClass = ["new-puzzle-options-panel", panelClassName].filter(Boolean).join(" ");

  return (
    <div class="new-puzzle-command" aria-label={`New ${puzzleTitle}: ${configurationSummary}`} ref={commandRef}>
      <div class="new-puzzle-split-control">
        <button
          class="new-puzzle-command-primary"
          type="button"
          onClick={() => startRandomPuzzle(false)}
          disabled={disabled}
          aria-label={`New random ${puzzleTitle}, ${configurationSummary}`}
          title={`New random puzzle — ${configurationSummary}`}
        >
          New
        </button>
        <details
          class="new-puzzle-options"
          ref={optionsRef}
          onToggle={(event) => {
            if (event.currentTarget.open && disabled) {
              event.currentTarget.open = false;
              return;
            }
            if (event.currentTarget.open && !seedLoadInput.trim()) renewSeedCandidate();
          }}
        >
          <summary
            aria-label={`Change new puzzle options. Current selection: ${configurationSummary}`}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            title="New puzzle options"
            onClick={(event) => {
              if (disabled) event.preventDefault();
            }}
          >
            <span class="new-puzzle-command-caret" aria-hidden="true">▾</span>
          </summary>
          <div class={panelClass} aria-label="New puzzle options">
            {info ? (
              <details class="new-puzzle-info">
                <summary aria-label="About new puzzle options" title="About these options">
                  <InfoIcon />
                </summary>
                <div class="new-puzzle-info-panel">{info}</div>
              </details>
            ) : null}

            <div class="new-puzzle-quick-actions" aria-label="Puzzle source">
              <button
                type="button"
                onClick={() => startRandomPuzzle(true)}
                disabled={disabled}
                aria-label={`Start a random ${puzzleTitle}, ${configurationSummary}`}
                title={`Random puzzle — ${configurationSummary}`}
              >
                <RandomIcon />
                <span class="new-puzzle-quick-action-copy"><strong>Random</strong></span>
              </button>
              <button
                type="button"
                onClick={startToday}
                disabled={disabled}
                aria-label={`Start today's ${puzzleTitle}, ${dailySummary}`}
                title={`Today's puzzle — ${dailySummary}`}
              >
                <TodayDateTile />
                <span class="new-puzzle-quick-action-copy"><strong>Today</strong></span>
              </button>
            </div>

            {settings}

            <div class="new-puzzle-seed-stack">
              <div class="new-puzzle-seed-row new-puzzle-current-seed">
                <CurrentSeedDisplay seed={currentSeed} disabledInput />
              </div>
              <div class="new-puzzle-seed-row new-puzzle-seed-entry">
                <input
                  aria-label="Seed to load"
                  value={seedLoadInput}
                  maxLength={maxPuzzleSeedLength}
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
