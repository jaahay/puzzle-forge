import type { JigsawImageAsset, PuzzleDifficulty } from "../catalog/types";
import { getPuzzleImageAsset } from "../games/imageAssets";
import {
  getJigsawDifficultyForDimensions,
  jigsawDifficultyOrder,
  resolveJigsawDifficultyDimensions,
} from "../games/jigsaw/difficulty";
import { ArtworkAlbum } from "./ArtworkAlbum";
import { BoundedNumberInput } from "./BoundedNumberInput";
import { NewPuzzleCommand } from "./NewPuzzleCommand";

export const jigsawCustomPreset = "Custom" as const;
export type JigsawPresetSelection = PuzzleDifficulty | typeof jigsawCustomPreset;

export const makeJigsawImageSelectionSettings = (
  asset: JigsawImageAsset,
  preset: JigsawPresetSelection,
) => {
  if (preset === jigsawCustomPreset) {
    return { imageId: asset.id };
  }

  const dimensions = resolveJigsawDifficultyDimensions(asset, preset);
  return {
    imageId: asset.id,
    width: dimensions.width,
    height: dimensions.height,
  };
};

type JigsawNewPuzzleControlProps = {
  currentSeed: string;
  imageId: string | undefined;
  width: number;
  height: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  seedLoadInput: string;
  disabled: boolean;
  onSettingsChange: (settings: { imageId?: string; width?: number; height?: number }) => void;
  onSeedLoadInputChange: (seed: string) => void;
  onNewPuzzle: () => void;
  onToday: () => void;
  onLoadSeed: () => void;
};

export const JigsawNewPuzzleControl = ({
  currentSeed,
  imageId,
  width,
  height,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  seedLoadInput,
  disabled,
  onSettingsChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
}: JigsawNewPuzzleControlProps) => {
  const selectedAsset = getPuzzleImageAsset(imageId, "jigsaw");
  const selectedPreset: JigsawPresetSelection =
    getJigsawDifficultyForDimensions(selectedAsset, width, height) ?? jigsawCustomPreset;
  const configurationSummary = `${selectedAsset.title} · ${selectedPreset} · ${width}×${height}`;

  return (
    <NewPuzzleCommand
      puzzleTitle="Jigsaw"
      currentSeed={currentSeed}
      configurationSummary={configurationSummary}
      seedLoadInput={seedLoadInput}
      disabled={disabled}
      panelClassName="image-new-puzzle-options-panel jigsaw-new-puzzle-options-panel"
      onSeedLoadInputChange={onSeedLoadInputChange}
      onNewPuzzle={onNewPuzzle}
      onToday={onToday}
      onLoadSeed={onLoadSeed}
      info={(
        <>
          <p>Difficulty preset, custom dimensions, and artwork configure the next Jigsaw only. Changing them here does not rebuild the puzzle currently being played.</p>
          <p>Named difficulty presets adapt their dimensions to the selected artwork. Custom dimensions remain explicit when artwork changes.</p>
        </>
      )}
      settings={(
        <>
          <div class="jigsaw-difficulty-settings" role="group" aria-label="Jigsaw difficulty">
            <div class="jigsaw-difficulty-heading">
              <strong>Difficulty</strong>
              <span>{selectedPreset} · {width} × {height}</span>
            </div>
            <div class="jigsaw-difficulty-options">
              {jigsawDifficultyOrder.map((difficulty) => {
                const dimensions = resolveJigsawDifficultyDimensions(selectedAsset, difficulty);
                return (
                  <button
                    type="button"
                    class="jigsaw-difficulty-option"
                    aria-pressed={selectedPreset === difficulty}
                    disabled={disabled}
                    onClick={() => onSettingsChange({ width: dimensions.width, height: dimensions.height })}
                    key={difficulty}
                  >
                    <strong>{difficulty}</strong>
                    <span>{dimensions.width} × {dimensions.height} · {dimensions.pieceCount}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div class="new-puzzle-size-options" role="group" aria-label="Custom Jigsaw size">
            <label>
              <span aria-hidden="true">W</span>
              <BoundedNumberInput
                ariaLabel="Width"
                value={width}
                min={minWidth}
                max={maxWidth}
                disabled={disabled}
                commitOnValidInput
                onCommit={(nextWidth) => onSettingsChange({ width: nextWidth })}
              />
            </label>
            <span class="new-puzzle-size-separator" aria-hidden="true">×</span>
            <label>
              <span aria-hidden="true">H</span>
              <BoundedNumberInput
                ariaLabel="Height"
                value={height}
                min={minHeight}
                max={maxHeight}
                disabled={disabled}
                commitOnValidInput
                onCommit={(nextHeight) => onSettingsChange({ height: nextHeight })}
              />
            </label>
          </div>

          <ArtworkAlbum
            puzzleId="jigsaw"
            puzzleTitle="Jigsaw"
            selectedAsset={selectedAsset}
            disabled={disabled}
            onSelectAsset={(asset) => onSettingsChange(makeJigsawImageSelectionSettings(asset, selectedPreset))}
          />
        </>
      )}
    />
  );
};
