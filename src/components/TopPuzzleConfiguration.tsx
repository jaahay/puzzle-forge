import type { ComponentChildren } from "preact";
import type { PuzzleDefinition, SolitaireVariation } from "../catalog/types";
import { GenerationActions } from "./GenerationActions";
import { SolitaireSettings } from "./SolitaireSettings";

type TopPuzzleConfigurationProps = {
  selectedDefinition: PuzzleDefinition;
  selectedPuzzleIsGeneratable: boolean;
  seedInput: ComponentChildren;
  width: number;
  height: number;
  solitaireVariation: SolitaireVariation;
  isFixedSize: boolean;
  isGenerating: boolean;
  isSolitaire: boolean;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSettingsCommit: (settings?: { width?: number; height?: number }) => void;
  onSolitaireVariationChange: (variation: SolitaireVariation) => void;
  onToday: () => void;
  onUseSeed: () => void;
  onRandomize: () => void;
};

const blurOnEnter = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    event.currentTarget instanceof HTMLElement && event.currentTarget.blur();
  }
};

export const TopPuzzleConfiguration = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  seedInput,
  width,
  height,
  solitaireVariation,
  isFixedSize,
  isGenerating,
  isSolitaire,
  onWidthChange,
  onHeightChange,
  onSettingsCommit,
  onSolitaireVariationChange,
  onToday,
  onUseSeed,
  onRandomize,
}: TopPuzzleConfigurationProps) => (
  <div class={`control-panel ${isSolitaire ? "solitaire-control-panel" : ""}`} aria-label="Puzzle controls">
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

    {isSolitaire ? (
      <SolitaireSettings
        variation={solitaireVariation}
        isGenerating={isGenerating}
        canGenerate={selectedPuzzleIsGeneratable}
        onVariationChange={onSolitaireVariationChange}
        onToday={onToday}
        onGenerate={onUseSeed}
        onRandomize={onRandomize}
      />
    ) : (
      <GenerationActions
        isGenerating={isGenerating}
        canGenerate={selectedPuzzleIsGeneratable}
        showToday
        showUseSeed
        randomLabel="Random"
        onToday={onToday}
        onUseSeed={onUseSeed}
        onRandomize={onRandomize}
      />
    )}
  </div>
);
