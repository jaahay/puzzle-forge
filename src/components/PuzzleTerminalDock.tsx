import type { ComponentChildren } from "preact";
import type { PuzzleTerminalState } from "../app/puzzleTerminalState";

type TerminalOutcome = Exclude<PuzzleTerminalState, { kind: "playing" }>;

type PuzzleTerminalDockProps = {
  state: TerminalOutcome;
  label: string;
  ariaLabel?: string;
  announce?: boolean;
  disabled?: boolean;
  onReset?: () => void;
  onNextPuzzle: () => void;
  resetLabel?: string;
  children?: ComponentChildren;
};

export const getPuzzleTerminalDockPresentation = (state: TerminalOutcome) =>
  state.kind === "solved"
    ? { mark: "✓", tone: "solved" as const }
    : { mark: "—", tone: "failed" as const };

export const PuzzleTerminalDock = ({
  state,
  label,
  ariaLabel,
  announce = true,
  disabled = false,
  onReset,
  onNextPuzzle,
  resetLabel = "Reset",
  children,
}: PuzzleTerminalDockProps) => {
  const presentation = getPuzzleTerminalDockPresentation(state);

  return (
    <section
      class={`completion-dock terminal-dock terminal-${presentation.tone}`}
      aria-live={announce ? "polite" : undefined}
      aria-label={ariaLabel ?? label}
    >
      <div class="completion-dock-copy">
        <span class="completion-dock-mark" aria-hidden="true">{presentation.mark}</span>
        <strong>{label}</strong>
      </div>
      <div class="puzzle-actions">
        {onReset ? <button type="button" onClick={onReset} disabled={disabled}>{resetLabel}</button> : null}
        {children}
        <button class="terminal-next-action" type="button" onClick={onNextPuzzle} disabled={disabled}>
          Next puzzle
        </button>
      </div>
    </section>
  );
};
