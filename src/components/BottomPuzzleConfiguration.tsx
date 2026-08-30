import type { ComponentChildren } from "preact";
import type { PuzzleDefinition, PuzzleDifficulty, SudokuVariation } from "../catalog/types";
import { GenerationActions } from "./GenerationActions";
import { PuzzleDifficultySelect } from "./PuzzleDifficultySelect";
import { SudokuVariationSelect } from "./SudokuVariationSelect";

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

type SudokuConfigurationProps = CommonConfigurationProps & DifficultyConfigurationProps & {
  kind: "sudoku";
  sudokuVariation: SudokuVariation;
  onSudokuVariationChange: (variation: SudokuVariation) => void;
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
  | SudokuConfigurationProps
  | NonogramConfigurationProps
  | WordGuessConfigurationProps
  | FutoshikiConfigurationProps;

const blurOnEnter = (event: KeyboardEvent) => {
  if (event.key === "Enter") event.currentTarget instanceof HTMLElement && event.currentTarget.blur();
};

const SizeControl = ({
  selectedDefinition,
  width,
  height,
  onWidthChange,
  onHeightChange,
  onSettingsCommit,
}: Pick<
  NonogramConfigurationProps,
  "selectedDefinition" | "width" | "height" | "onWidthChange" | "onHeightChange" | "onSettingsCommit"
>) => (
  <div class="puzzle-size-control" aria-label="Nonogram size">
    <span class="control-label">Size</span>
    <label class="compact-number-control">
      <span>W</span>
      <input aria-label="Width" type="number" min={selectedDefinition.minWidth} max={selectedDefinition.maxWidth} value={width} onBlur={(event) => onSettingsCommit({ width: Number(event.currentTarget.value) })} onInput={(event) => onWidthChange(Number(event.currentTarget.value))} onKeyDown={blurOnEnter} />
    </label>
    <label class="compact-number-control">
      <span>H</span>
      <input aria-label="Height" type="number" min={selectedDefinition.minHeight} max={selectedDefinition.maxHeight} value={height} onBlur={(event) => onSettingsCommit({ height: Number(event.currentTarget.value) })} onInput={(event) => onHeightChange(Number(event.currentTarget.value))} onKeyDown={blurOnEnter} />
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
  const newPuzzleAction = <GenerationActions isGenerating={isGenerating} canGenerate={selectedPuzzleIsGeneratable} showRandomize={showRandomize} randomLabel="New puzzle" onRandomize={onRandomize} />;
  const todayAction = <GenerationActions className="load-puzzle-actions" isGenerating={isGenerating} canGenerate={selectedPuzzleIsGeneratable} showToday showRandomize={false} onToday={onToday} onRandomize={onRandomize} />;
  const resetAction = <GenerationActions className="current-puzzle-actions" isGenerating={isGenerating} canGenerate={selectedPuzzleIsGeneratable} showReset showRandomize={false} onRandomize={onRandomize} onReset={onReset} />;
  const seedTools = <SeedTools seedInput={seedInput} isGenerating={isGenerating} canGenerate={selectedPuzzleIsGeneratable} onUseSeed={onUseSeed} />;

  let settings: ComponentChildren;
  switch (props.kind) {
    case "sudoku":
      settings = (
        <>
          <label>Difficulty<PuzzleDifficultySelect value={props.difficulty} onChange={props.onDifficultyChange} /></label>
          <label>Mode<SudokuVariationSelect value={props.sudokuVariation} onChange={props.onSudokuVariationChange} /></label>
        </>
      );
      break;
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
          <label>Letters<input type="number" min={selectedDefinition.minWidth} max={selectedDefinition.maxWidth} value={props.width} onBlur={(event) => props.onSettingsCommit({ width: Number(event.currentTarget.value) })} onInput={(event) => props.onWidthChange(Number(event.currentTarget.value))} onKeyDown={blurOnEnter} /></label>
          <label>Guesses<input type="number" min={selectedDefinition.minHeight} max={selectedDefinition.maxHeight} value={props.height} onBlur={(event) => props.onSettingsCommit({ height: Number(event.currentTarget.value) })} onInput={(event) => props.onHeightChange(Number(event.currentTarget.value))} onKeyDown={blurOnEnter} /></label>
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
