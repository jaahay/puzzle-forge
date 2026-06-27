import { useState } from "preact/hooks";

type SeedControlProps = {
  seed: string;
  onSeedChange: (seed: string) => void;
  onSeedCommit: (seed: string) => void;
};

const blurOnEnter = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    event.currentTarget instanceof HTMLElement && event.currentTarget.blur();
  }
};

export const SeedControl = ({ seed, onSeedChange, onSeedCommit }: SeedControlProps) => {
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

  return (
    <div class="seed-control">
      <input
        value={seed}
        onBlur={(event) => onSeedCommit(event.currentTarget.value)}
        onInput={(event) => onSeedChange(event.currentTarget.value)}
        onKeyDown={blurOnEnter}
      />
      <button type="button" onClick={copySeed} aria-label={seedCopied ? "Seed copied" : "Copy seed"} title={seedCopied ? "Copied" : "Copy seed"}>
        {seedCopied ? "✓" : "⧉"}
      </button>
    </div>
  );
};
