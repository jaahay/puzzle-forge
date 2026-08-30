import { useCallback, useState } from "preact/hooks";
import type { ImageTileGeneratedPuzzle, ImageTilePuzzleId } from "../catalog/types";
import { ArtworkAlbum } from "./ArtworkAlbum";
import { ImmediateTopPuzzleConfiguration } from "./PuzzleConfiguration";
import type { ImmediateImageWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { SeedControl } from "./SeedControl";
import { ImageTilePuzzlePreview } from "./ImageTilePuzzlePreview";
import { usePuzzleCompletionPresentation } from "./usePuzzleCompletionPresentation";

const asImageTilePuzzle = (
  puzzle: ImmediateImageWorkspaceProps["puzzle"],
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
  statusMessage,
  isGenerating,
  onSeedChange,
  onWidthChange,
  onHeightChange,
  onSettingsCommit,
  onGenerate,
  onToday,
  onRandomize,
  onReset,
}: ImmediateImageWorkspaceProps) => {
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
  const seedInput = (
    <SeedControl
      seed={seed}
      onSeedChange={onSeedChange}
      onSeedCommit={(nextSeed) => onSettingsCommit({ seed: nextSeed })}
    />
  );

  const artworkControl = imagePuzzle ? (
    <ArtworkAlbum
      puzzleId={puzzleId}
      puzzleTitle={selectedDefinition.title}
      selectedAsset={imagePuzzle.asset}
      disabled={isGenerating}
      onSelectAsset={(asset) => onSettingsCommit({ imageId: asset.id })}
    />
  ) : null;

  const generation = (
    <ImmediateTopPuzzleConfiguration
      selectedDefinition={selectedDefinition}
      selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
      seedInput={seedInput}
      width={width}
      height={height}
      isFixedSize={isFixedSize}
      isGenerating={isGenerating}
      showRandomize={!isCompletionPresented}
      onWidthChange={onWidthChange}
      onHeightChange={onHeightChange}
      onSettingsCommit={onSettingsCommit}
      onToday={onToday}
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
        <button type="button" onClick={onRandomize} disabled={isGenerating}>New puzzle</button>
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
