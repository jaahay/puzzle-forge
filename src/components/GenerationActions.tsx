type GenerationActionsProps = {
  isGenerating: boolean;
  canGenerate: boolean;
  showToday?: boolean;
  showUseSeed?: boolean;
  showReset?: boolean;
  randomLabel?: "New" | "Randomize";
  className?: string;
  onToday?: () => void;
  onUseSeed?: () => void;
  onRandomize: () => void;
  onReset?: () => void;
};

export const GenerationActions = ({
  isGenerating,
  canGenerate,
  showToday = false,
  showUseSeed = false,
  showReset = false,
  randomLabel = "New",
  className = "",
  onToday,
  onUseSeed,
  onRandomize,
  onReset,
}: GenerationActionsProps) => (
  <div class={`puzzle-settings-actions generation-actions ${className}`.trim()}>
    {showToday ? (
      <button type="button" onClick={onToday} disabled={isGenerating || !canGenerate || !onToday}>
        Today
      </button>
    ) : null}

    <button type="button" onClick={onRandomize} disabled={isGenerating || !canGenerate} aria-label="Generate a new random puzzle">
      {randomLabel}
    </button>

    {showReset ? (
      <button type="button" onClick={onReset} disabled={isGenerating || !canGenerate || !onReset} aria-label="Reset the current puzzle">
        Reset
      </button>
    ) : null}

    {showUseSeed ? (
      <button type="button" onClick={onUseSeed} disabled={isGenerating || !canGenerate || !onUseSeed}>
        Use seed
      </button>
    ) : null}
  </div>
);
