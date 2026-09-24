import type { JigsawImageAsset } from "../catalog/types";
import { getPuzzleImageAsset } from "../games/imageAssets";
import {
  getJigsawGridAdaptation,
  getJigsawPieceAspectRatio,
  jigsawCustomSizeSelection,
  jigsawSizePresets,
  jigsawSizeTargetPieces,
  resolveJigsawSizeDimensions,
  type JigsawSizeSelection,
} from "../games/jigsaw/size";
import { ArtworkAlbum } from "./ArtworkAlbum";
import { BoundedNumberInput } from "./BoundedNumberInput";
import { NewPuzzleCommand } from "./NewPuzzleCommand";

export const makeJigsawImageSelectionSettings = (
  asset: JigsawImageAsset,
  sizeSelection: JigsawSizeSelection,
) => {
  if (sizeSelection === jigsawCustomSizeSelection) {
    return { imageId: asset.id };
  }

  const dimensions = resolveJigsawSizeDimensions(asset, sizeSelection);
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
  sizeSelection: JigsawSizeSelection;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  seedLoadInput: string;
  disabled: boolean;
  onSettingsChange: (settings: {
    imageId?: string;
    width?: number;
    height?: number;
    jigsawSizeSelection?: JigsawSizeSelection;
  }) => void;
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
  sizeSelection,
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
  const pieceCount = width * height;
  const gridAdaptation = sizeSelection === jigsawCustomSizeSelection
    ? getJigsawGridAdaptation(selectedAsset, width, height)
    : null;
  const stretchedPieceDirection = gridAdaptation
    ? (getJigsawPieceAspectRatio(selectedAsset, width, height) > 1 ? "wide" : "tall")
    : null;
  const configurationSummary = `${selectedAsset.title} · ${sizeSelection} · ${pieceCount} pieces · ${width}×${height}`;

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
          <p>Named size presets target an approximate piece count and adapt their dimensions to the selected artwork. Custom dimensions remain explicit when artwork changes; unusually stretched Custom grids can be adapted explicitly while keeping approximately the same piece count.</p>
        </>
      )}
      settings={(
        <>
          <div class="jigsaw-size-settings" role="group" aria-label="Jigsaw size">
            <div class="jigsaw-size-heading">
              <strong>Size</strong>
              <span>{sizeSelection} · {pieceCount} pieces · {width} × {height}</span>
            </div>
            <div class="jigsaw-size-options">
              {jigsawSizePresets.map((preset) => {
                const dimensions = resolveJigsawSizeDimensions(selectedAsset, preset);
                return (
                  <button
                    type="button"
                    class="jigsaw-size-option"
                    aria-pressed={sizeSelection === preset}
                    disabled={disabled}
                    onClick={() => onSettingsChange({
                      width: dimensions.width,
                      height: dimensions.height,
                      jigsawSizeSelection: preset,
                    })}
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
                onEdit={() => onSettingsChange({
                  jigsawSizeSelection: jigsawCustomSizeSelection,
                })}
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
                onEdit={() => onSettingsChange({
                  jigsawSizeSelection: jigsawCustomSizeSelection,
                })}
                onCommit={(nextHeight) => onSettingsChange({ height: nextHeight })}
              />
            </label>
          </div>

          {gridAdaptation ? (
            <div class="jigsaw-grid-adaptation">
              <div
                class="jigsaw-grid-adaptation-copy"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <strong>Grid may stretch pieces</strong>
                <span>
                  These dimensions make pieces very {stretchedPieceDirection} for this artwork.
                  Adapt to {gridAdaptation.width} × {gridAdaptation.height} ({gridAdaptation.pieceCount} pieces).
                </span>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSettingsChange({
                  width: gridAdaptation.width,
                  height: gridAdaptation.height,
                  jigsawSizeSelection: jigsawCustomSizeSelection,
                })}
              >
                Adapt grid
              </button>
            </div>
          ) : null}

          <ArtworkAlbum
            puzzleId="jigsaw"
            puzzleTitle="Jigsaw"
            selectedAsset={selectedAsset}
            disabled={disabled}
            onSelectAsset={(asset) => onSettingsChange(makeJigsawImageSelectionSettings(asset, sizeSelection))}
          />
        </>
      )}
    />
  );
};
