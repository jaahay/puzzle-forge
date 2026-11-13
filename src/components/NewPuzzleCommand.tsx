import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useId, useRef, useState } from "preact/hooks";
import { makeRandomSeed, maxPuzzleSeedLength } from "../app/runtime";
import { InfoIcon } from "./InfoIcon";
import { PlayIcon, PuzzlePickerIcon, RandomIcon, RestartPuzzleIcon, TodayDateTile } from "./NewPuzzleActionVisuals";
import { CurrentSeedDisplay } from "./SeedControl";

export const newPuzzleSheetMediaQuery = "(max-width: 700px), (max-height: 520px)";
export const isNewPuzzleSheetBackdropClick = (
  target: EventTarget | null, dialog: EventTarget,
  point: { x: number; y: number },
  bounds: Pick<DOMRect, "top" | "right" | "bottom" | "left">,
) => target === dialog && (
  point.x < bounds.left || point.x > bounds.right ||
  point.y < bounds.top || point.y > bounds.bottom
);

type NewPuzzleCommandActionOptions = {
  disabled: boolean;
  seedLoadInput: string;
  closeOptions: (restoreFocus?: boolean) => void;
  onNewPuzzle: (afterStart?: () => void) => void;
  onToday: (afterStart?: () => void) => void;
  onLoadSeed: (afterStart?: () => void) => void;
  onRestartPuzzle?: (afterRestart?: () => void) => void;
  renewSeedCandidate: () => void;
};

export const createNewPuzzleCommandActions = ({
  disabled,
  seedLoadInput,
  closeOptions,
  onNewPuzzle,
  onToday,
  onLoadSeed,
  onRestartPuzzle,
  renewSeedCandidate,
}: NewPuzzleCommandActionOptions) => ({
  startRandomPuzzle: (restoreMenuFocus = false) => {
    if (disabled) return;
    onNewPuzzle(() => {
      closeOptions(restoreMenuFocus);
      renewSeedCandidate();
    });
  },
  startToday: () => {
    if (disabled) return;
    onToday(() => {
      closeOptions(true);
      renewSeedCandidate();
    });
  },
  loadSeed: () => {
    if (disabled || !seedLoadInput.trim()) return;
    onLoadSeed(() => {
      closeOptions(true);
      renewSeedCandidate();
    });
  },
  restartPuzzle: () => {
    if (disabled || !onRestartPuzzle) return;
    onRestartPuzzle(() => closeOptions(true));
  },
});

type NewPuzzleCommandProps = {
  puzzleTitle: string;
  currentSeed: string;
  configurationSummary: string;
  randomConfigurationSummary?: string;
  dailySummary?: string;
  seedLoadInput: string;
  disabled: boolean;
  settings?: ComponentChildren;
  info?: ComponentChildren;
  panelClassName?: string;
  compactActions?: boolean;
  onSeedLoadInputChange: (seed: string) => void;
  onNewPuzzle: (afterStart?: () => void) => void;
  onToday: (afterStart?: () => void) => void;
  onLoadSeed: (afterStart?: () => void) => void;
  onRestartPuzzle?: (afterRestart?: () => void) => void;
};

export const NewPuzzleCommand = ({
  puzzleTitle,
  currentSeed,
  configurationSummary,
  randomConfigurationSummary = configurationSummary,
  dailySummary = configurationSummary,
  seedLoadInput,
  disabled,
  settings,
  info,
  panelClassName,
  compactActions = false,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
  onRestartPuzzle,
}: NewPuzzleCommandProps) => {
  const commandRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDetailsElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const sheetTitleId = useId();
  const [infoOpen, setInfoOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [isSheetViewport, setIsSheetViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia(newPuzzleSheetMediaQuery).matches,
  );

  const closeInfo = (restoreFocus = false) => {
    if (!infoOpen) return false;
    setInfoOpen(false);
    if (restoreFocus) infoButtonRef.current?.focus({ preventScroll: true });
    return true;
  };

  const closeOptions = (restoreFocus = false) => {
    const options = optionsRef.current;
    if (!options) return;
    const wasOpen = options.open;
    setInfoOpen(false);
    if (sheetRef.current?.open) sheetRef.current.close();
    options.open = false;
    setOptionsOpen(false);
    if (restoreFocus && wasOpen) options.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
  };

  const renewSeedCandidate = () => onSeedLoadInputChange(makeRandomSeed());
  const { startRandomPuzzle, startToday, loadSeed, restartPuzzle } = createNewPuzzleCommandActions({
    disabled,
    seedLoadInput,
    closeOptions,
    onNewPuzzle,
    onToday,
    onLoadSeed,
    onRestartPuzzle,
    renewSeedCandidate,
  });

  useEffect(() => {
    const query = window.matchMedia(newPuzzleSheetMediaQuery);
    const sync = () => setIsSheetViewport(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isSheetViewport || !optionsOpen) return;
    const dialog = sheetRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    const viewport = window.visualViewport;
    const updateViewport = () => {
      const visibleHeight = viewport?.height ?? window.innerHeight;
      const hiddenBottom = viewport
        ? Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height)
        : 0;
      dialog.style.setProperty("--new-puzzle-visible-height", `${visibleHeight}px`);
      dialog.style.setProperty("--new-puzzle-viewport-bottom", `${hiddenBottom}px`);
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    dialog.querySelector<HTMLButtonElement>(".new-puzzle-sheet-close")?.focus({ preventScroll: true });
    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [isSheetViewport, optionsOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handlePointerDown = (event: PointerEvent) => {
      if (isSheetViewport || !optionsRef.current?.open) return;
      const target = event.target;
      if (target instanceof Node && !commandRef.current?.contains(target)) closeOptions();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSheetViewport || event.key !== "Escape" || !optionsRef.current?.open) return;
      // Let an active confirmation own Escape before the underlying menu.
      if (event.target instanceof Element && event.target.closest('[role="alertdialog"][aria-modal="true"]')) return;

      event.preventDefault();
      event.stopPropagation();
      if (infoOpen) {
        closeInfo(true);
        return;
      }
      closeOptions(true);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [infoOpen, isSheetViewport]);

  const panelClass = ["new-puzzle-options-panel", panelClassName].filter(Boolean).join(" ");

  const panel = (
          <div class={panelClass} aria-label="New puzzle options">
            <div class="new-puzzle-info">
              <button
                ref={infoButtonRef}
                type="button"
                aria-expanded={infoOpen}
                aria-label="About new puzzle options"
                title="About these options"
                onClick={() => setInfoOpen((open) => !open)}
              >
                <InfoIcon />
              </button>
              {infoOpen ? (
                <div class="new-puzzle-info-panel">
                  {info}
                  <div class="new-puzzle-info-seed">
                    <strong>Current seed</strong>
                    <div class="new-puzzle-current-seed">
                      <CurrentSeedDisplay seed={currentSeed} disabledInput />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div class="new-puzzle-operational" hidden={infoOpen}>
              <div class="new-puzzle-quick-actions" aria-label="Puzzle source">
                <button
                  type="button"
                  onClick={() => startRandomPuzzle(true)}
                  disabled={disabled}
                  aria-label={`Start a random ${puzzleTitle}, ${randomConfigurationSummary}`}
                  title={`Random puzzle — ${randomConfigurationSummary}`}
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

              {onRestartPuzzle ? (
                <button
                  class="new-puzzle-restart-current"
                  type="button"
                  onClick={restartPuzzle}
                  disabled={disabled}
                  title="Restart the current puzzle from the beginning"
                >
                  <RestartPuzzleIcon />
                  <span>Restart this puzzle</span>
                </button>
              ) : null}

              {settings}

              <div class="new-puzzle-seed-entry">
                <span class="new-puzzle-seed-label" aria-hidden="true">Seed</span>
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
  );
  const sheetHost = typeof document === "undefined" ? null :
    commandRef.current?.closest(".puzzle-workspace-layout") ?? document.fullscreenElement ?? document.body;

  return (
    <div class={`new-puzzle-command${compactActions ? " is-icon-only" : ""}`} aria-label={`New ${puzzleTitle}: ${configurationSummary}`} ref={commandRef}>
      <div class="new-puzzle-split-control">
        <button
          class="new-puzzle-command-primary"
          type="button"
          onClick={() => startRandomPuzzle(false)}
          disabled={disabled}
          aria-label={`New random ${puzzleTitle}, ${randomConfigurationSummary}`}
          title={`New random puzzle — ${randomConfigurationSummary}`}
        >
          {compactActions ? <RandomIcon /> : "New"}
        </button>
        <details
          class="new-puzzle-options"
          ref={optionsRef}
          onToggle={(event) => {
            if (!event.currentTarget.open) {
              setInfoOpen(false);
              setOptionsOpen(false);
              return;
            }
            if (disabled) {
              event.currentTarget.open = false;
              return;
            }
            if (!seedLoadInput.trim()) renewSeedCandidate();
            setOptionsOpen(true);
          }}
        >
          <summary
            aria-label={`Change new puzzle options. Current selection: ${configurationSummary}`}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            title={compactActions ? "Choose puzzle and settings" : "New puzzle options"}
            onClick={(event) => {
              if (disabled) event.preventDefault();
            }}
          >
            {compactActions ? <PuzzlePickerIcon /> : <span class="new-puzzle-command-caret" aria-hidden="true">▾</span>}
          </summary>
          {isSheetViewport ? (optionsOpen && sheetHost ? createPortal(
            <dialog class="new-puzzle-mobile-sheet" ref={sheetRef} aria-labelledby={sheetTitleId}
              onCancel={(event) => {
                if (document.querySelector('[role="alertdialog"][aria-modal="true"]')) {
                  event.preventDefault();
                } else if (infoOpen) {
                  event.preventDefault();
                  closeInfo(true);
                }
              }}
              onClose={() => { if (optionsRef.current?.open) closeOptions(true); }}
              onClick={(event) => {
                if (document.querySelector('[role="alertdialog"][aria-modal="true"]')) return;
                if (isNewPuzzleSheetBackdropClick(event.target, event.currentTarget,
                  { x: event.clientX, y: event.clientY }, event.currentTarget.getBoundingClientRect(),
                )) closeOptions(true);
              }}>
              <header class="new-puzzle-sheet-header">
                <h2 id={sheetTitleId}>New {puzzleTitle}</h2>
                <button class="new-puzzle-sheet-close" type="button"
                  aria-label="Close new puzzle options" onClick={() => closeOptions(true)}>Close</button>
              </header>
              <div class="new-puzzle-sheet-scroll">{panel}</div>
            </dialog>, sheetHost,
          ) : null) : panel}
        </details>
      </div>
    </div>
  );
};
