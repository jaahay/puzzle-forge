import { useEffect, useRef, useState } from "preact/hooks";
import type { ImageBackedPuzzleId, PuzzleImageAsset } from "../catalog/types";
import { getPuzzleImageAssetsFor, getSurprisePuzzleImageAsset } from "../games/imageAssets";

type ArtworkAlbumProps = {
  puzzleId: ImageBackedPuzzleId;
  puzzleTitle: string;
  selectedAsset: PuzzleImageAsset;
  disabled?: boolean;
  onSelectAsset: (asset: PuzzleImageAsset) => void;
};

export const ArtworkAlbum = ({
  puzzleId,
  puzzleTitle,
  selectedAsset,
  disabled = false,
  onSelectAsset,
}: ArtworkAlbumProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const chooseButtonRef = useRef<HTMLButtonElement>(null);
  const eligibleAssets = getPuzzleImageAssetsFor(puzzleId);
  const titleId = `artwork-album-title-${puzzleId}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const closeAlbum = () => {
    setIsOpen(false);
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
  };

  const selectAsset = (asset: PuzzleImageAsset) => {
    closeAlbum();
    if (asset.id !== selectedAsset.id) {
      onSelectAsset(asset);
    }
  };

  const surpriseMe = () => {
    const asset = getSurprisePuzzleImageAsset(puzzleId, selectedAsset.id);
    closeAlbum();
    if (asset.id !== selectedAsset.id) {
      onSelectAsset(asset);
    }
  };

  return (
    <section class="artwork-control" aria-label="Selected artwork">
      <img class="artwork-control-thumb" src={selectedAsset.files.thumbnail} alt="" />
      <div class="artwork-control-copy">
        <span>Artwork</span>
        <strong>{selectedAsset.title}</strong>
      </div>
      <div class="artwork-control-actions">
        <button
          ref={chooseButtonRef}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
        >
          Choose artwork
        </button>
        <button
          type="button"
          disabled={disabled || eligibleAssets.length < 2}
          onClick={surpriseMe}
        >
          Surprise Me
        </button>
      </div>
      <p class="artwork-control-credit">
        {selectedAsset.credit.text}
        {selectedAsset.credit.sourceRecordUrl ? (
          <> <a href={selectedAsset.credit.sourceRecordUrl} target="_blank" rel="noreferrer">Source</a></>
        ) : null}
      </p>

      <dialog
        ref={dialogRef}
        class="artwork-album-dialog"
        aria-labelledby={titleId}
        onClose={() => {
          setIsOpen(false);
          chooseButtonRef.current?.focus();
        }}
      >
        <div class="artwork-album-shell">
          <header class="artwork-album-header">
            <div>
              <span>Artwork Album</span>
              <h2 id={titleId}>Choose artwork for {puzzleTitle}</h2>
              <p>{eligibleAssets.length} eligible bundled artworks</p>
            </div>
            <button type="button" class="artwork-album-close" aria-label="Close artwork album" onClick={closeAlbum}>×</button>
          </header>

          <div class="artwork-album-grid">
            {eligibleAssets.map((asset) => {
              const selected = asset.id === selectedAsset.id;
              return (
                <button
                  type="button"
                  class="artwork-album-option"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => selectAsset(asset)}
                  key={asset.id}
                >
                  <img src={asset.files.thumbnail} alt="" />
                  <span class="artwork-album-option-copy">
                    <strong>{asset.title}</strong>
                    <span>{asset.orientation}</span>
                  </span>
                  {selected ? <span class="artwork-album-selected">Selected</span> : null}
                </button>
              );
            })}
          </div>

          <footer class="artwork-album-footer">
            <button
              type="button"
              disabled={disabled || eligibleAssets.length < 2}
              onClick={surpriseMe}
            >
              Surprise Me
            </button>
            <span>Chooses a different eligible artwork when possible.</span>
          </footer>
        </div>
      </dialog>
    </section>
  );
};
