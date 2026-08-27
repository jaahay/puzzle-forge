import { useCallback, useState } from "preact/hooks";
import type { ImageTileGeneratedPuzzle, ImageTilePuzzleId } from "../catalog/types";
import { getPuzzleImageAssetsFor } from "../games/imageAssets";
import { getDailyPuzzleSeed } from "../games/shared/daily";
import { TopPuzzleConfiguration } from "./PuzzleConfiguration";
import type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { SeedControl } from "./SeedControl";
import { ImageTilePuzzlePreview } from "./ImageTilePuzzlePreview";
import { usePuzzleCompletionPresentation } from "./usePuzzleCompletionPresentation";

const asImageTilePuzzle = (
  puzzle: PuzzleWorkspaceProps["puzzle"],
  puzzleId: ImageTilePuzzleId,
): ImageTileGeneratedPuzzle | null =>
  puzzle?.kind === "tiles" && puzzle.puzzleId === puzzleId ? puzzle : null;

type CompletionState = {
  puzzleInstanceId: string | null;
  solved: boolean;
};

export const ImageTilePuzzleWorkspace = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  seed,
  width,
  height,
  puzzle,
  solitaireVariation,
  statusMessage,
  isGenerating,
  onSeedChange,
  onWidthChange,
  onHeightChange,
  onSettingsCommit,
  onGenerate,
  onRandomize,
  onReset,
  onSolitaireVariationChange,
}: PuzzleWorkspaceProps) => {
  const puzzleId: ImageTilePuzzleId = selectedDefinition.id === "sliding-puzzle" ? "sliding-puzzle" : "tile-swap";
  const imagePuzzle = asImageTilePuzzle(puzzle, puzzleId);
  const [resetVersion, setResetVersion] = useState(0);
  const [completionState, setCompletionState] = useState<CompletionState>({ puzzleInstanceId: null, solved: false });
  const isSolved = Boolean(
    imagePuzzle &&
    completionState.puzzleInstanceId === imagePuzzle.id &&
    completionState.solved,
  );
  const completionPresentation = usePuzzleCompletionPresentation({
    enabled: Boolean(imagePuzzle),
    identity: imagePuzzle?.id ?? `${puzzleId}:pending`,
    solved: isSolved,
    trackedKeys: ["Enter", " "],
  });
  const isCompletionPresented = isSolved && completionPresentation.phase === "completed";
  const eligibleArtwork = getPuzzleImageAssetsFor(puzzleId);
  const isFixedSize = selectedDefinition.minWidth === selectedDefinition.maxWidth && selectedDefinition.minHeight === selectedDefinition.maxHeight;
  const handleSolvedChange = useCallback((solved: boolean) => {
    const puzzleInstanceId = imagePuzzle?.id ?? null;
    setCompletionState((current) =>
      current.puzzleInstanceId === puzzleInstanceId && current.solved === solved
        ? current
        : { puzzleInstanceId, solved });
  }, [imagePuzzle?.id]);

  const resetPuzzle = () => {
    onReset();
    setResetVersion((current) => current + 1);
    setCompletionState({ puzzleInstanceId: imagePuzzle?.id ?? null, solved: false });
  };
  const generateDailyPuzzle = () => onSettingsCommit({
    seed: getDailyPuzzleSeed(puzzleId),
    width,
    height,
  });
  const seedInput = (
    <SeedControl
      seed={seed}
      onSeedChange={onSeedChange}
      onSeedCommit={(nextSeed) => onSettingsCommit({ seed: nextSeed })}
    />
  );

  const artworkControl = imagePuzzle ? (
    <section class="image-tile-artwork" aria-label="Selected artwork">
      <img class="image-tile-artwork-thumb" src={imagePuzzle.asset.files.thumbnail} alt="" />
      <div class="image-tile-artwork-copy">
        <span>Artwork</span>
        <strong>{imagePuzzle.asset.title}</strong>
      </div>
      <label class="image-tile-artwork-select">
        Choose artwork
        <select
          value={imagePuzzle.asset.id}
          disabled={isGenerating}
          onChange={(event) => onSettingsCommit({ imageId: event.currentTarget.value })}
        >
          {eligibleArtwork.map((asset) => <option value={asset.id} key={asset.id}>{asset.title}</option>)}
        </select>
      </label>
      <p class="image-tile-artwork-credit">
        {imagePuzzle.asset.credit.text}
        {imagePuzzle.asset.credit.sourceRecordUrl ? (
          <> <a href={imagePuzzle.asset.credit.sourceRecordUrl} target="_blank" rel="noreferrer">Source</a></>
        ) : null}
      </p>
    </section>
  ) : null;

  const generation = (
    <TopPuzzleConfiguration
      selectedDefinition={selectedDefinition}
      selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
      seedInput={seedInput}
      width={width}
      height={height}
      solitaireVariation={solitaireVariation}
      isFixedSize={isFixedSize}
      isGenerating={isGenerating}
      isSolitaire={false}
      showRandomize={!isCompletionPresented}
      onWidthChange={onWidthChange}
      onHeightChange={onHeightChange}
      onSettingsCommit={onSettingsCommit}
      onSolitaireVariationChange={onSolitaireVariationChange}
      onToday={generateDailyPuzzle}
      onUseSeed={onGenerate}
      onRandomize={onRandomize}
      onReset={resetPuzzle}
    />
  );

  const loadingBoard = (
    <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label={`${selectedDefinition.title} is generating`}>
      <div class="puzzle-loading-copy"><strong>Generating {selectedDefinition.title}</strong><span>{statusMessage}</span></div>
      <div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</div>
    </section>
  );

  const board = imagePuzzle ? (
    <section class="puzzle-panel image-tile-puzzle-panel" aria-label={`Generated ${selectedDefinition.title} puzzle`}>
      {artworkControl}
      <ImageTilePuzzlePreview
        key={imagePuzzle.id}
        puzzle={imagePuzzle}
        resetVersion={resetVersion}
        completionPhase={completionPresentation.phase}
        onCausativeInput={completionPresentation.recordCausativeInput}
        onCompletionAnimationEnd={completionPresentation.completePresentation}
        onSolvedChange={handleSolvedChange}
      />
    </section>
  ) : isGenerating ? loadingBoard : null;

  const gameplay = isCompletionPresented ? (
    <section class="completion-dock" aria-live="polite" aria-label={`${selectedDefinition.title} solved`}>
      <div class="completion-dock-copy">
        <span class="completion-dock-mark" aria-hidden="true">✓</span>
        <strong>Puzzle solved</strong>
      </div>
      <div class="puzzle-actions">
        <button type="button" onClick={onRandomize}>New puzzle</button>
      </div>
    </section>
  ) : null;

  return (
    <PuzzleWorkspaceLayout
      className="image-tile-workspace"
      status={<p class="status-line" aria-live="polite">{statusMessage}</p>}
      board={board}
      gameplay={gameplay}
      generation={generation}
      enableImmersive
    />
  );
};
