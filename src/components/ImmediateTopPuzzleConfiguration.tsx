import type { ComponentChildren } from "preact";
import type { PuzzleDefinition } from "../catalog/types";
import { GenerationActions } from "./GenerationActions";
import { PuzzleDimensionControls } from "./PuzzleDimensionControls";

type ImmediateTopPuzzleConfigurationProps = {
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

export const ImmediateTopPuzzleConfiguration = ({
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
}: ImmediateTopPuzzleConfigurationProps) => (
  <div class="control-panel" aria-label="Puzzle controls">
    <label>
      Seed
      {seedInput}
    </label>
    {isFixedSize ? null : (
      <PuzzleDimensionControls
        selectedDefinition={selectedDefinition}
        width={width}
        height={height}
        onWidthChange={onWidthChange}
        onHeightChange={onHeightChange}
        onSettingsCommit={onSettingsCommit}
      />
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
