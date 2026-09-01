import type { ComponentChildren } from "preact";
import type { PuzzleDefinition, PuzzleDifficulty } from "../catalog/types";
import { BoundedNumberInput } from "./BoundedNumberInput";
import { GenerationActions } from "./GenerationActions";
import { PuzzleDifficultySelect } from "./PuzzleDifficultySelect";

type CommonConfigurationProps = {
  selectedDefinition: PuzzleDefinition;
  selectedPuzzleIsGeneratable: boolean;
  seedInput: ComponentChildren;
  isGenerating: boolean;
  showRandomize?: boolean;
  onToday: () => void;
  onUseSeed: () => void;
  onRandomize: () => void;
  onReset: () => void;
};

type DimensionConfigurationProps = {
  width: number;
  height: number;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSettingsCommit: (settings: { width?: number; height?: number }) => void;
};

type DifficultyConfigurationProps = {
  difficulty: PuzzleDifficulty;
  onDifficultyChange: (difficulty: PuzzleDifficulty) => void;
};

type NonogramConfigurationProps = CommonConfigurationProps & DimensionConfigurationProps & DifficultyConfigurationProps & {
  kind: "nonogram";
  requireUniqueSolution: boolean;
  isFixedSize: boolean;
  onUniqueSolutionChange: (requireUniqueSolution: boolean) => void;
};

type WordGuessConfigurationProps = CommonConfigurationProps & DimensionConfigurationProps & {
  kind: "word-guess";
};

type FutoshikiConfigurationProps = CommonConfigurationProps & DifficultyConfigurationProps & {
  kind: "futoshiki";
};

export type BottomPuzzleConfigurationProps =
  | NonogramConfigurationProps
  | WordGuessConfigurationProps
  | FutoshikiConfigurationProps;

const SizeControl = ({
  selectedDefinition,
  width,
  height,
  onSettingsCommit,
}: Pick<
  NonogramConfigurationProps,
  "selectedDefinition" | "width" | "height" | "onSettingsCommit"
>) => (
  <div class="puzzle-size-control" aria-label="Nonogram size">
    <span class="control-label">Size</span>
    <label class="compact-number-control">
      <span>W</span>
      <BoundedNumberInput
        ariaLabel="Width"
        value={width}
        min={selectedDefinition.minWidth}
        max={selectedDefinition.maxWidth}
        onCommit={(nextWidth) => onSettingsCommit({ width: nextWidth })}
      />
    </label>
    <label class="compact-number-control">
      <span>H</span>
      <BoundedNumberInput
        ariaLabel="Height"
        value={height}
        min={selectedDefinition.minHeight}
        max={selectedDefinition.maxHeight}
        onCommit={(nextHeight) => onSettingsCommit({ height: nextHeight })}
      />
    </label>
  </div>
);

const SeedTools = ({ seedInput, isGenerating, canGenerate, onUseSeed }: {
  seedInput: ComponentChildren;
  isGenerating: boolean;
  canGenerate: boolean;
  onUseSeed: () => void;
}) => (
  <>
    {seedInput}
    <div class="puzzle-settings-actions seed-actions"><button type="button" onClick={onUseSeed} disabled={isGenerating || !canGenerate}>Load seed</button></div>
  </>
);

export const BottomPuzzleConfiguration = (props: BottomPuzzleConfigurationProps) => {
  const {
    kind,
    selectedDefinition,
    selectedPuzzleIsGeneratable,
    seedInput,
    isGenerating,
    showRandomize = true,
    onToday,
    onUseSeed,
    onRandomize,
    onReset,
  } = props;
  const newPuzzleAction = showRandomize ? <GenerationActions className="new-puzzle-actions" isGenerating={isGenerating} canGenerate={selectedPuzzleIsGeneratable} randomLabel="New puzzle" onRandomize={onRandomize} /> : null;
  const todayAction = <GenerationActions className="load-puzzle-actions" isGenerating={isGenerating} canGenerate={selectedPuzzleIsGeneratable} showToday showRandomize={false} onToday={onToday} onRandomize={onRandomize} />;
  const resetAction = <GenerationActions className="current-puzzle-actions" isGenerating={isGenerating} canGenerate={selectedPuzzleIsGeneratable} showReset showRandomize={false} onRandomize={onRandomize} onReset={onReset} />;
  const seedTools = <SeedTools seedInput={seedInput} isGenerating={isGenerating} canGenerate={selectedPuzzleIsGeneratable} onUseSeed={onUseSeed} />;

  let settings: ComponentChildren;
  switch (props.kind) {
    case "nonogram":
      settings = (
        <>
          <label>Difficulty<PuzzleDifficultySelect value={props.difficulty} onChange={props.onDifficultyChange} /></label>
          {props.isFixedSize ? null : <SizeControl {...props} />}
          <label class="puzzle-checkbox-control"><input checked={props.requireUniqueSolution} onChange={(event) => props.onUniqueSolutionChange(event.currentTarget.checked)} type="checkbox" /><span>Unique solution</span></label>
        </>
      );
      break;
    case "word-guess":
      settings = (
        <>
          <label>
            Letters
            <BoundedNumberInput
              value={props.width}
              min={selectedDefinition.minWidth}
              max={selectedDefinition.maxWidth}
              onCommit={(width) => props.onSettingsCommit({ width })}
            />
          </label>
          <label>
            Guesses
            <BoundedNumberInput
              value={props.height}
              min={selectedDefinition.minHeight}
              max={selectedDefinition.maxHeight}
              onCommit={(height) => props.onSettingsCommit({ height })}
            />
          </label>
        </>
      );
      break;
    case "futoshiki":
      settings = <label>Difficulty<PuzzleDifficultySelect value={props.difficulty} onChange={props.onDifficultyChange} /></label>;
      break;
  }

  return (
    <div class={`puzzle-settings-panel ${kind}-settings-panel`} aria-label={`${selectedDefinition.title} controls`}>
      {settings}
      {newPuzzleAction}
      {todayAction}
      {seedTools}
      {resetAction}
    </div>
  );
};
