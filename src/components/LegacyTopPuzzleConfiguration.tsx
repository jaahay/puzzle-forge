import type { ComponentChildren } from "preact";
import type { PuzzleDefinition } from "../catalog/types";
import { GenerationActions } from "./GenerationActions";

type LegacyTopPuzzleConfigurationProps = {
  selectedDefinition: PuzzleDefinition;
  selectedPuzzleIsGeneratable: boolean;
  seedInput: ComponentChildren;
  width: number;
  height: number;
  isFixedSize: boolean;
  isGenerating: boolean;
  showRandomize?: boolean;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSettingsCommit: (settings: { width?: number; height?: number }) => void;
  onToday: () => void;
  onUseSeed: () => void;
  onRandomize: () => void;
  onReset: () => void;
};

const blurOnEnter = (event: KeyboardEvent) => {
  if (event.key === "Enter" && event.currentTarget instanceof HTMLElement) {
    event.currentTarget.blur();
  }
};

export const LegacyTopPuzzleConfiguration = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  seedInput,
  width,
  height,
  isFixedSize,
  isGenerating,
  showRandomize = true,
  onWidthChange,
  onHeightChange,
  onSettingsCommit,
  onToday,
  onUseSeed,
  onRandomize,
  onReset,
}: LegacyTopPuzzleConfigurationProps) => (
  <div class="control-panel" aria-label="Puzzle controls">
    <label>
      Seed
      {seedInput}
    </label>
    {isFixedSize ? null : (
      <>
        <label>
          Width
          <input
            type="number"
            min={selectedDefinition.minWidth}
            max={selectedDefinition.maxWidth}
            value={width}
            onBlur={(event) => onSettingsCommit({ width: Number(event.currentTarget.value) })}
            onInput={(event) => onWidthChange(Number(event.currentTarget.value))}
            onKeyDown={blurOnEnter}
          />
        </label>
        <label>
          Height
          <input
            type="number"
            min={selectedDefinition.minHeight}
            max={selectedDefinition.maxHeight}
            value={height}
            onBlur={(event) => onSettingsCommit({ height: Number(event.currentTarget.value) })}
            onInput={(event) => onHeightChange(Number(event.currentTarget.value))}
            onKeyDown={blurOnEnter}
          />
        </label>
      </>
    )}
    <GenerationActions
      isGenerating={isGenerating}
      canGenerate={selectedPuzzleIsGeneratable}
      showToday
      showUseSeed
      showReset
      showRandomize={showRandomize}
      randomLabel="New"
      onToday={onToday}
      onUseSeed={onUseSeed}
      onRandomize={onRandomize}
      onReset={onReset}
    />
  </div>
);
