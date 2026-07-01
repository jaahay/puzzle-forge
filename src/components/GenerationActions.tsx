type GenerationActionsProps = {
  isGenerating: boolean;
  canGenerate: boolean;
  showToday?: boolean;
  showUseSeed?: boolean;
  randomLabel?: "Random" | "Randomize";
  className?: string;
  onToday?: () => void;
  onUseSeed?: () => void;
  onRandomize: () => void;
};

export const GenerationActions = ({
  isGenerating,
  canGenerate,
  showToday = false,
  showUseSeed = false,
  randomLabel = "Randomize",
  className = "",
  onToday,
  onUseSeed,
  onRandomize,
}: GenerationActionsProps) => (
  <div class={`puzzle-settings-actions generation-actions ${className}`.trim()}>
    {showToday ? (
      <button type="button" onClick={onToday} disabled={isGenerating || !canGenerate || !onToday}>
        Today
      </button>
    ) : null}

    {showUseSeed ? (
      <button type="button" onClick={onUseSeed} disabled={isGenerating || !canGenerate || !onUseSeed}>
        Use seed
      </button>
    ) : null}

    <button type="button" onClick={onRandomize} disabled={isGenerating || !canGenerate}>
      {randomLabel}
    </button>
  </div>
);
