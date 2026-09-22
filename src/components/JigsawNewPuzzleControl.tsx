import type { JigsawImageAsset } from "../catalog/types";
import { getPuzzleImageAsset } from "../games/imageAssets";
import {
  getJigsawSizePresetForDimensions,
  jigsawSizePresets,
  jigsawSizeTargetPieces,
  resolveJigsawSizeDimensions,
  type JigsawSizePreset,
} from "../games/jigsaw/size";
import { ArtworkAlbum } from "./ArtworkAlbum";
import { BoundedNumberInput } from "./BoundedNumberInput";
import { NewPuzzleCommand } from "./NewPuzzleCommand";

export const jigsawCustomPreset = "Custom" as const;
export type JigsawPresetSelection = JigsawSizePreset | typeof jigsawCustomPreset;

export const makeJigsawImageSelectionSettings = (
  asset: JigsawImageAsset,
  preset: JigsawPresetSelection,
) => {
  if (preset === jigsawCustomPreset) {
    return { imageId: asset.id };
  }

  const dimensions = resolveJigsawSizeDimensions(asset, preset);
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
    getJigsawSizePresetForDimensions(selectedAsset, width, height) ?? jigsawCustomPreset;
  const pieceCount = width * height;
  const configurationSummary = `${selectedAsset.title} · ${selectedPreset} · ${pieceCount} pieces · ${width}×${height}`;

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
          <p>Size preset, custom dimensions, and artwork configure the next Jigsaw only. Changing them here does not rebuild the puzzle currently being played.</p>
          <p>Named size presets target an approximate piece count and adapt their dimensions to the selected artwork. Custom dimensions remain explicit when artwork changes.</p>
        </>
      )}
      settings={(
        <>
          <div class="jigsaw-size-settings" role="group" aria-label="Jigsaw size">
            <div class="jigsaw-size-heading">
              <strong>Size</strong>
              <span>{selectedPreset} · {pieceCount} pieces · {width} × {height}</span>
            </div>
            <div class="jigsaw-size-options">
              {jigsawSizePresets.map((preset) => {
                const dimensions = resolveJigsawSizeDimensions(selectedAsset, preset);
                return (
                  <button
                    type="button"
                    class="jigsaw-size-option"
                    aria-pressed={selectedPreset === preset}
                    disabled={disabled}
                    onClick={() => onSettingsChange({ width: dimensions.width, height: dimensions.height })}
                    key={preset}
                  >
                    <strong>{preset}</strong>
                    <span>~{jigsawSizeTargetPieces[preset]} pieces · {dimensions.width} × {dimensions.height}</span>
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
