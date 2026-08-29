import { useState } from "preact/hooks";

type SeedControlProps = {
  seed: string;
  currentSeed?: string;
  onSeedChange: (seed: string) => void;
  onSeedCommit?: (seed: string) => void;
};

const blurOnEnter = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    event.currentTarget instanceof HTMLElement && event.currentTarget.blur();
  }
};

export const SeedControl = ({ seed, currentSeed, onSeedChange, onSeedCommit }: SeedControlProps) => {
  const [seedCopied, setSeedCopied] = useState(false);

  const copySeed = async (value: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      }
    } finally {
      setSeedCopied(true);

      if (typeof window !== "undefined") {
        window.setTimeout(() => setSeedCopied(false), 1400);
      }
    }
  };

  if (currentSeed !== undefined) {
    return (
      <div class="seed-tools">
        <div class="current-seed-field">
          <span class="control-label">Current seed</span>
          <div class="seed-control">
            <code title={currentSeed}>{currentSeed}</code>
            <button type="button" onClick={() => copySeed(currentSeed)} aria-label={seedCopied ? "Current seed copied" : "Copy current seed"} title={seedCopied ? "Copied" : "Copy current seed"}>
              {seedCopied ? "✓" : "⧉"}
            </button>
          </div>
        </div>
        <label class="seed-load-control">
          <span>Seed</span>
          <input
            aria-label="Seed to load"
            value={seed}
            onInput={(event) => onSeedChange(event.currentTarget.value)}
            onKeyDown={blurOnEnter}
          />
        </label>
      </div>
    );
  }

  return (
    <div class="seed-control">
      <input
        value={seed}
        onBlur={(event) => onSeedCommit?.(event.currentTarget.value)}
        onInput={(event) => onSeedChange(event.currentTarget.value)}
        onKeyDown={blurOnEnter}
      />
      <button type="button" onClick={() => copySeed(seed)} aria-label={seedCopied ? "Seed copied" : "Copy seed"} title={seedCopied ? "Copied" : "Copy seed"}>
        {seedCopied ? "✓" : "⧉"}
      </button>
    </div>
  );
};
