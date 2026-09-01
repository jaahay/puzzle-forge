import { useState } from "preact/hooks";

type CurrentSeedDisplayProps = {
  seed: string;
  label?: string;
  showCopyText?: boolean;
  disabledInput?: boolean;
};

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

export const CurrentSeedDisplay = ({
  seed,
  label = "Current seed",
  showCopyText = false,
  disabledInput = false,
}: CurrentSeedDisplayProps) => {
  const [seedCopied, setSeedCopied] = useState(false);

  const copySeed = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(seed);
      }
    } finally {
      setSeedCopied(true);

      if (typeof window !== "undefined") {
        window.setTimeout(() => setSeedCopied(false), 1400);
      }
    }
  };

  const buttonText = showCopyText ? (seedCopied ? "Copied" : "Copy") : (seedCopied ? "✓" : "⧉");

  return (
    <div class={`current-seed-field${showCopyText ? " current-seed-field-text-copy" : ""}${disabledInput ? " current-seed-field-disabled-input" : ""}`}>
      <span class="control-label">{label}</span>
      <div class="seed-control">
        {disabledInput ? (
          <input aria-label={label} value={seed} disabled title={seed} />
        ) : (
          <code title={seed}>{seed}</code>
        )}
        <button type="button" onClick={() => void copySeed()} aria-label={seedCopied ? `${label} copied` : `Copy ${label.toLowerCase()}`} title={seedCopied ? "Copied" : `Copy ${label.toLowerCase()}`}>
          {buttonText}
        </button>
      </div>
    </div>
  );
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
        <CurrentSeedDisplay seed={currentSeed} />
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
