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
  showRandomize?: boolean;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSettingsCommit: (settings: { width?: number; height?: number }) => void;
  onSolitaireVariationChange: (variation: SolitaireVariation) => void;
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

const DimensionControls = ({
  selectedDefinition,
  width,
  height,
  onWidthChange,
  onHeightChange,
  onSettingsCommit,
}: Pick<TopPuzzleConfigurationProps, "selectedDefinition" | "width" | "height" | "onWidthChange" | "onHeightChange" | "onSettingsCommit">) => (
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
);

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
  showRandomize = true,
  onWidthChange,
  onHeightChange,
  onSettingsCommit,
  onSolitaireVariationChange,
  onToday,
  onUseSeed,
  onRandomize,
  onReset,
}: TopPuzzleConfigurationProps) => (
  <div class={`control-panel ${isSolitaire ? "solitaire-control-panel" : ""}`} aria-label="Puzzle controls">
    <span class="puzzle-settings-section-label">Next puzzle</span>
    {isFixedSize ? null : (
      <DimensionControls
        selectedDefinition={selectedDefinition}
        width={width}
        height={height}
        onWidthChange={onWidthChange}
        onHeightChange={onHeightChange}
        onSettingsCommit={onSettingsCommit}
      />
    )}
    {isSolitaire ? <SolitaireSettings variation={solitaireVariation} onVariationChange={onSolitaireVariationChange} /> : null}
    <GenerationActions
      isGenerating={isGenerating}
      canGenerate={selectedPuzzleIsGeneratable}
      showRandomize={showRandomize}
      randomLabel="New puzzle"
      onRandomize={onRandomize}
    />

    <span class="puzzle-settings-section-label">Load</span>
    <GenerationActions
      isGenerating={isGenerating}
      canGenerate={selectedPuzzleIsGeneratable}
      showToday
      showRandomize={false}
      onToday={onToday}
      onRandomize={onRandomize}
    />
    {seedInput}
    <GenerationActions
      isGenerating={isGenerating}
      canGenerate={selectedPuzzleIsGeneratable}
      showUseSeed
      showRandomize={false}
      onUseSeed={onUseSeed}
      onRandomize={onRandomize}
    />

    <span class="puzzle-settings-section-label">Current puzzle</span>
    <GenerationActions
      isGenerating={isGenerating}
      canGenerate={selectedPuzzleIsGeneratable}
      showReset
      showRandomize={false}
      onRandomize={onRandomize}
      onReset={onReset}
    />
  </div>
);
