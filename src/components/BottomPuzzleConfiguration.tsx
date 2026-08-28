import type { ComponentChildren } from "preact";
import type { PuzzleDefinition, PuzzleDifficulty, SudokuVariation } from "../catalog/types";
import { GenerationActions } from "./GenerationActions";
import { PuzzleDifficultySelect } from "./PuzzleDifficultySelect";
import { SudokuVariationSelect } from "./SudokuVariationSelect";

type BottomPuzzleConfigurationProps = {
  selectedDefinition: PuzzleDefinition;
  selectedPuzzleIsGeneratable: boolean;
  seedInput: ComponentChildren;
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  sudokuVariation: SudokuVariation;
  isFixedSize: boolean;
  isNonogram: boolean;
  isWordGuess: boolean;
  isSudoku: boolean;
  isGenerating: boolean;
  showRandomize?: boolean;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSettingsCommit: (settings?: { width?: number; height?: number }) => void;
  onDifficultyChange: (difficulty: PuzzleDifficulty) => void;
  onSudokuVariationChange: (variation: SudokuVariation) => void;
  onUniqueSolutionChange: (requireUniqueSolution: boolean) => void;
  onToday: () => void;
  onUseSeed: () => void;
  onRandomize: () => void;
  onReset: () => void;
};

const blurOnEnter = (event: KeyboardEvent) => {
  if (event.key === "Enter") event.currentTarget instanceof HTMLElement && event.currentTarget.blur();
};

const SizeControl = ({ selectedDefinition, width, height, onWidthChange, onHeightChange, onSettingsCommit }: Pick<BottomPuzzleConfigurationProps, "selectedDefinition" | "width" | "height" | "onWidthChange" | "onHeightChange" | "onSettingsCommit">) => (
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

const SeedTools = ({ seedInput, isGenerating, canGenerate, onUseSeed }: Pick<BottomPuzzleConfigurationProps, "seedInput" | "isGenerating" | "onUseSeed"> & { canGenerate: boolean }) => (
  <>
    {seedInput}
    <div class="puzzle-settings-actions seed-actions"><button type="button" onClick={onUseSeed} disabled={isGenerating || !canGenerate}>Load seed</button></div>
  </>
);

export const BottomPuzzleConfiguration = ({ selectedDefinition, selectedPuzzleIsGeneratable, seedInput, width, height, difficulty, requireUniqueSolution, sudokuVariation, isFixedSize, isNonogram, isWordGuess, isSudoku, isGenerating, showRandomize = true, onWidthChange, onHeightChange, onSettingsCommit, onDifficultyChange, onSudokuVariationChange, onUniqueSolutionChange, onToday, onUseSeed, onRandomize, onReset }: BottomPuzzleConfigurationProps) => {
  const newPuzzleAction = <GenerationActions isGenerating={isGenerating} canGenerate={selectedPuzzleIsGeneratable} showRandomize={showRandomize} randomLabel="New puzzle" onRandomize={onRandomize} />;
  const todayAction = <GenerationActions isGenerating={isGenerating} canGenerate={selectedPuzzleIsGeneratable} showToday showRandomize={false} onToday={onToday} onRandomize={onRandomize} />;
  const resetAction = <GenerationActions isGenerating={isGenerating} canGenerate={selectedPuzzleIsGeneratable} showReset showRandomize={false} onRandomize={onRandomize} onReset={onReset} />;
  const seedTools = <SeedTools seedInput={seedInput} isGenerating={isGenerating} canGenerate={selectedPuzzleIsGeneratable} onUseSeed={onUseSeed} />;

  return (
    <div class={`puzzle-settings-panel ${isSudoku ? "sudoku-settings-panel" : ""} ${isNonogram ? "nonogram-settings-panel" : ""} ${isWordGuess ? "word-guess-settings-panel" : ""}`} aria-label={`${selectedDefinition.title} controls`}>
      <span class="puzzle-settings-section-label">Next puzzle</span>
      {isWordGuess ? (
        <>
          <label>Letters<input type="number" min={selectedDefinition.minWidth} max={selectedDefinition.maxWidth} value={width} onBlur={(event) => onSettingsCommit({ width: Number(event.currentTarget.value) })} onInput={(event) => onWidthChange(Number(event.currentTarget.value))} onKeyDown={blurOnEnter} /></label>
          <label>Guesses<input type="number" min={selectedDefinition.minHeight} max={selectedDefinition.maxHeight} value={height} onBlur={(event) => onSettingsCommit({ height: Number(event.currentTarget.value) })} onInput={(event) => onHeightChange(Number(event.currentTarget.value))} onKeyDown={blurOnEnter} /></label>
        </>
      ) : (
        <>
          <label>Difficulty<PuzzleDifficultySelect value={difficulty} onChange={onDifficultyChange} /></label>
          {isSudoku ? <label>Variation<SudokuVariationSelect value={sudokuVariation} onChange={onSudokuVariationChange} /></label> : null}
          {isNonogram && !isFixedSize ? <SizeControl selectedDefinition={selectedDefinition} width={width} height={height} onWidthChange={onWidthChange} onHeightChange={onHeightChange} onSettingsCommit={onSettingsCommit} /> : null}
          {isNonogram ? <label class="puzzle-checkbox-control"><input checked={requireUniqueSolution} onChange={(event) => onUniqueSolutionChange(event.currentTarget.checked)} type="checkbox" /><span>Unique solution</span></label> : null}
        </>
      )}
      {newPuzzleAction}

      <span class="puzzle-settings-section-label">Load</span>
      {todayAction}
      {seedTools}

      <span class="puzzle-settings-section-label">Current puzzle</span>
      {resetAction}
    </div>
  );
};
