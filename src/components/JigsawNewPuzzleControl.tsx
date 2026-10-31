import type {
  JigsawBoundaryMode,
  JigsawCutStyle,
  JigsawEditionChoice,
  JigsawImageAsset,
  JigsawSpecialPiecesMode,
} from "../catalog/types";
import { getPuzzleImageAsset } from "../games/imageAssets";
import {
  jigsawBoundaryModeDescriptions,
  jigsawBoundaryModeLabels,
  jigsawBoundaryModes,
} from "../games/jigsaw/boundaryContours";
import {
  jigsawCutStyleDescriptions,
  jigsawCutStyleLabels,
  jigsawCutStyles,
} from "../games/jigsaw/cutStyle";
import {
  jigsawEditionChoices,
  jigsawEditionDescriptions,
  jigsawEditionLabels,
} from "../games/jigsaw/physicalEdition";
import {
  jigsawSpecialPiecesModeDescriptions,
  jigsawSpecialPiecesModeLabels,
  jigsawSpecialPiecesModes,
} from "../games/jigsaw/specialPieces";
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
  cutStyle: JigsawCutStyle;
  editionChoice: JigsawEditionChoice;
  boundaryMode: JigsawBoundaryMode;
  specialPiecesMode: JigsawSpecialPiecesMode;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  seedLoadInput: string;
  disabled: boolean;
  inCompletionPrompt?: boolean;
  onSettingsChange: (settings: {
    imageId?: string;
    width?: number;
    height?: number;
    jigsawSizeSelection?: JigsawSizeSelection;
    jigsawCutStyle?: JigsawCutStyle;
    jigsawEditionChoice?: JigsawEditionChoice;
    jigsawBoundaryMode?: JigsawBoundaryMode;
    jigsawSpecialPiecesMode?: JigsawSpecialPiecesMode;
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
  cutStyle,
  editionChoice,
  boundaryMode,
  specialPiecesMode,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  seedLoadInput,
  disabled,
  inCompletionPrompt = false,
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
  const boundaryLabel = jigsawBoundaryModeLabels[boundaryMode];
  const specialPiecesLabel = jigsawSpecialPiecesModeLabels[specialPiecesMode];
  const configurationSummary = `${selectedAsset.title} · ${jigsawEditionLabels[editionChoice]} edition · ${jigsawCutStyleLabels[cutStyle]} · ${boundaryLabel} boundary · ${specialPiecesLabel} special pieces · ${sizeSelection} · ~${pieceCount} pieces · ${width}×${height}`;
  const randomConfigurationSummary = sizeSelection === jigsawCustomSizeSelection
    ? `${jigsawEditionLabels[editionChoice]} edition · ${jigsawCutStyleLabels[cutStyle]} · ${boundaryLabel} boundary · ${specialPiecesLabel} special pieces · Custom · ~${pieceCount} pieces · ${width}×${height}`
    : `${jigsawEditionLabels[editionChoice]} edition · ${jigsawCutStyleLabels[cutStyle]} · ${boundaryLabel} boundary · ${specialPiecesLabel} special pieces · ${sizeSelection}`;

  return (
    <NewPuzzleCommand
      puzzleTitle="Jigsaw"
      currentSeed={currentSeed}
      configurationSummary={configurationSummary}
      randomConfigurationSummary={randomConfigurationSummary}
      seedLoadInput={seedLoadInput}
      disabled={disabled}
      panelClassName="image-new-puzzle-options-panel jigsaw-new-puzzle-options-panel"
      inCompletionPrompt={inCompletionPrompt}
      onSeedLoadInputChange={onSeedLoadInputChange}
      onNewPuzzle={onNewPuzzle}
      onToday={onToday}
      onLoadSeed={onLoadSeed}
      info={(
        <>
          <p><strong>Physical edition.</strong> Auto selects an artwork-compatible finish from the seed. The cut style is an independent choice below.</p>
          <p><strong>Cut style.</strong> {jigsawCutStyleDescriptions[cutStyle]}</p>
          <p><strong>Outer boundary.</strong> {jigsawBoundaryModeDescriptions[boundaryMode]}</p>
          <p><strong>Special pieces.</strong> {jigsawSpecialPiecesModeDescriptions[specialPiecesMode]}</p>
          <p><strong>Size.</strong> Named presets target an approximate piece count and adapt to the selected artwork. Custom dimensions stay explicit when artwork changes.</p>
          <p>New and Surprise Me choose a different eligible artwork; Today and seed loads use the selected artwork.</p>
        </>
      )}
      settings={(
        <>
          <div class="jigsaw-edition-settings" role="group" aria-label="Jigsaw physical edition">
            <div class="jigsaw-size-heading"><strong>Physical edition</strong></div>
            <div class="new-puzzle-segmented jigsaw-edition-options">
              {jigsawEditionChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  class={editionChoice === choice ? "selected" : undefined}
                  aria-pressed={editionChoice === choice}
                  disabled={disabled}
                  title={choice === "auto" ? "Choose from suitable editions using the puzzle seed" : jigsawEditionDescriptions[choice]}
                  onClick={() => onSettingsChange({
                    jigsawEditionChoice: choice,
                  })}
                >
                  {jigsawEditionLabels[choice]}
                </button>
              ))}
            </div>
          </div>
          <div class="jigsaw-cut-style-settings" role="group" aria-label="Jigsaw cut style">
            <div class="jigsaw-size-heading">
              <strong>Cut style</strong>
            </div>
            <div class="new-puzzle-segmented jigsaw-cut-style-options">
              {jigsawCutStyles.map((style) => (
                <button
                  type="button"
                  class={cutStyle === style ? "selected" : undefined}
                  aria-pressed={cutStyle === style}
                  disabled={disabled}
                  onClick={() => onSettingsChange({ jigsawCutStyle: style })}
                  key={style}
                >
                  {jigsawCutStyleLabels[style]}
                </button>
              ))}
            </div>
          </div>

          <div class="jigsaw-boundary-settings" role="group" aria-label="Jigsaw outer boundary">
            <div class="jigsaw-size-heading">
              <strong>Outer boundary</strong>
            </div>
            <div class="jigsaw-boundary-options">
              {jigsawBoundaryModes.map((mode) => (
                <button
                  type="button"
                  class="jigsaw-size-option jigsaw-boundary-option"
                  aria-pressed={boundaryMode === mode}
                  disabled={disabled}
                  onClick={() => onSettingsChange({ jigsawBoundaryMode: mode })}
                  key={mode}
                >
                  <strong>{jigsawBoundaryModeLabels[mode]}</strong>
                </button>
              ))}
            </div>
          </div>

          <div class="jigsaw-special-pieces-settings" role="group" aria-label="Jigsaw special pieces">
            <div class="jigsaw-size-heading">
              <strong>Special pieces</strong>
            </div>
            <div class="new-puzzle-segmented jigsaw-special-pieces-options">
              {jigsawSpecialPiecesModes.map((mode) => (
                <button
                  type="button"
                  class={specialPiecesMode === mode ? "selected" : undefined}
                  aria-pressed={specialPiecesMode === mode}
                  disabled={disabled}
                  onClick={() => onSettingsChange({ jigsawSpecialPiecesMode: mode })}
                  key={mode}
                >
                  {jigsawSpecialPiecesModeLabels[mode]}
                </button>
              ))}
            </div>
          </div>

          <div class="jigsaw-size-settings" role="group" aria-label="Jigsaw size">
            <div class="jigsaw-size-heading">
              <strong>Size</strong>
              <span>~{pieceCount} pieces</span>
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
                    <span>~{jigsawSizeTargetPieces[preset]} pieces</span>
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
                  Adapt to {gridAdaptation.width} × {gridAdaptation.height} (~{gridAdaptation.pieceCount} pieces).
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
            selectedAsset={selectedAsset}
            disabled={disabled}
            onSelectAsset={(asset) => onSettingsChange(makeJigsawImageSelectionSettings(asset, sizeSelection))}
            onSurprise={() => onNewPuzzle()}
          />
        </>
      )}
    />
  );
};
