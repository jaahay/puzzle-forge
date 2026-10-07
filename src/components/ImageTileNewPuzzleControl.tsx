import type { ImageTilePuzzleId } from "../catalog/types";
import { getPuzzleImageAsset } from "../games/imageAssets";
import { ArtworkAlbum } from "./ArtworkAlbum";
import { BoundedNumberInput } from "./BoundedNumberInput";
import { NewPuzzleCommand } from "./NewPuzzleCommand";

type ImageTileNewPuzzleControlProps = {
  puzzleId: ImageTilePuzzleId;
  puzzleTitle: string;
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
  onImageChange: (imageId: string) => void;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSeedLoadInputChange: (seed: string) => void;
  onNewPuzzle: () => void;
  onToday: () => void;
  onLoadSeed: () => void;
};

export const ImageTileNewPuzzleControl = ({
  puzzleId,
  puzzleTitle,
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
  onImageChange,
  onWidthChange,
  onHeightChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
}: ImageTileNewPuzzleControlProps) => {
  const selectedAsset = getPuzzleImageAsset(imageId, puzzleId);
  const configurationSummary = `${selectedAsset.title} · ${width}×${height}`;
  const randomConfigurationSummary = `${width}×${height}`;

  return (
    <NewPuzzleCommand
      puzzleTitle={puzzleTitle}
      currentSeed={currentSeed}
      configurationSummary={configurationSummary}
      randomConfigurationSummary={randomConfigurationSummary}
      seedLoadInput={seedLoadInput}
      disabled={disabled}
      panelClassName="image-new-puzzle-options-panel"
      onSeedLoadInputChange={onSeedLoadInputChange}
      onNewPuzzle={onNewPuzzle}
      onToday={onToday}
      onLoadSeed={onLoadSeed}
      info={(
        <>
          <p>Board dimensions configure the next puzzle. New and Surprise Me choose a different eligible artwork; Today and seed loads use the selected artwork.</p>
        </>
      )}
      settings={(
        <>
          <div class="new-puzzle-size-options" role="group" aria-label={`${puzzleTitle} size`}>
            <label>
              <span aria-hidden="true">W</span>
              <BoundedNumberInput
                ariaLabel="Width"
                value={width}
                min={minWidth}
                max={maxWidth}
                disabled={disabled}
                commitOnValidInput
                onCommit={onWidthChange}
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
                onCommit={onHeightChange}
              />
            </label>
          </div>
          <ArtworkAlbum
            puzzleId={puzzleId}
            selectedAsset={selectedAsset}
            disabled={disabled}
            onSelectAsset={(asset) => onImageChange(asset.id)}
            onSurprise={onNewPuzzle}
          />
        </>
      )}
    />
  );
};
