import type { ComponentChildren } from "preact";
import type { PuzzleDefinition } from "../catalog/types";
import { GenerationActions } from "./GenerationActions";
import { PuzzleDimensionControls } from "./PuzzleDimensionControls";

type TopPuzzleConfigurationProps = {
  selectedDefinition: PuzzleDefinition;
  selectedPuzzleIsGeneratable: boolean;
  seedInput: ComponentChildren;
  width: number;
  height: number;
  isFixedSize: boolean;
  isGenerating: boolean;
  settings?: ComponentChildren;
  className?: string;
  showRandomize?: boolean;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSettingsCommit: (settings: { width?: number; height?: number }) => void;
  onToday: () => void;
  onUseSeed: () => void;
  onRandomize: () => void;
  onReset: () => void;
};

export const TopPuzzleConfiguration = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  seedInput,
  width,
  height,
  isFixedSize,
  isGenerating,
  settings,
  className,
  showRandomize = true,
  onWidthChange,
  onHeightChange,
  onSettingsCommit,
  onToday,
  onUseSeed,
  onRandomize,
  onReset,
}: TopPuzzleConfigurationProps) => (
  <div class={`control-panel ${className ?? ""}`.trim()} aria-label="Puzzle controls">
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
    {settings}
    <GenerationActions
      className="new-puzzle-actions"
      isGenerating={isGenerating}
      canGenerate={selectedPuzzleIsGeneratable}
      showRandomize={showRandomize}
      randomLabel="New puzzle"
      onRandomize={onRandomize}
    />
    <GenerationActions
      className="load-puzzle-actions"
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
    <GenerationActions
      className="current-puzzle-actions"
      isGenerating={isGenerating}
      canGenerate={selectedPuzzleIsGeneratable}
      showReset
      showRandomize={false}
      onRandomize={onRandomize}
      onReset={onReset}
    />
  </div>
);
