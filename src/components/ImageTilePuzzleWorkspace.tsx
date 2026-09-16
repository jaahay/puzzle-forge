import { useCallback, useState } from "preact/hooks";
import type { ImageTileGeneratedPuzzle, ImageTilePuzzleId } from "../catalog/types";
import { CurrentPuzzleHeader, getPuzzleArrivalIdentity, usePuzzleArrival } from "./CurrentPuzzleIdentity";
import { ImageTileNewPuzzleControl } from "./ImageTileNewPuzzleControl";
import { ImageTilePuzzlePreview } from "./ImageTilePuzzlePreview";
import type { ImageWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { usePuzzleCompletionPresentation } from "./usePuzzleCompletionPresentation";

const asImageTilePuzzle = (
  puzzle: ImageWorkspaceProps["puzzle"],
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
  puzzle,
  nextPuzzleDraft,
  seedLoadInput,
  statusMessage,
  isGenerating,
  onReset,
  onNextPuzzleDraftChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
}: ImageWorkspaceProps) => {
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
  const puzzleArrivalIdentity = imagePuzzle ? getPuzzleArrivalIdentity(imagePuzzle) : null;
  const isPuzzleArriving = usePuzzleArrival(puzzleArrivalIdentity);
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

  const newPuzzleControl = imagePuzzle ? (
    <ImageTileNewPuzzleControl
      puzzleId={puzzleId}
      puzzleTitle={selectedDefinition.title}
      currentSeed={imagePuzzle.seed}
      imageId={nextPuzzleDraft.imageId}
      width={nextPuzzleDraft.width}
      height={nextPuzzleDraft.height}
      minWidth={selectedDefinition.minWidth}
      maxWidth={selectedDefinition.maxWidth}
      minHeight={selectedDefinition.minHeight}
      maxHeight={selectedDefinition.maxHeight}
      seedLoadInput={seedLoadInput}
      disabled={isGenerating || !selectedPuzzleIsGeneratable}
      onImageChange={(imageId) => onNextPuzzleDraftChange({ imageId })}
      onWidthChange={(width) => onNextPuzzleDraftChange({ width })}
      onHeightChange={(height) => onNextPuzzleDraftChange({ height })}
      onSeedLoadInputChange={onSeedLoadInputChange}
      onNewPuzzle={onNewPuzzle}
      onToday={onToday}
      onLoadSeed={onLoadSeed}
    />
  ) : null;
  const crown = imagePuzzle ? (
    <CurrentPuzzleHeader
      key={puzzleArrivalIdentity ?? undefined}
      puzzle={imagePuzzle}
      newPuzzleControl={newPuzzleControl}
      isArriving={isPuzzleArriving}
    />
  ) : null;

  const loadingBoard = (
    <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label={`${selectedDefinition.title} is generating`}>
      <div class="puzzle-loading-copy"><strong>Generating {selectedDefinition.title}</strong><span>{statusMessage}</span></div>
      <div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</div>
    </section>
  );

  const board = imagePuzzle ? (
    <section
      key={puzzleArrivalIdentity ?? undefined}
      class={`puzzle-panel image-tile-puzzle-panel${isPuzzleArriving ? " puzzle-arrival" : ""}`}
      aria-label={`Generated ${selectedDefinition.title} puzzle`}
    >
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
        <button type="button" onClick={resetPuzzle} disabled={isGenerating}>Reset</button>
        <button
          class="new-puzzle-primary"
          type="button"
          onClick={onNewPuzzle}
          disabled={isGenerating}
          aria-label={`Start a new ${selectedDefinition.title} with the selected next-puzzle settings`}
        >
          New puzzle
        </button>
      </div>
    </section>
  ) : imagePuzzle ? (
    <div class="puzzle-actions">
      <button type="button" onClick={resetPuzzle} disabled={isGenerating}>Reset</button>
    </div>
  ) : null;

  return (
    <PuzzleWorkspaceLayout
      className="image-tile-workspace"
      crown={crown}
      status={<p class="status-line" aria-live="polite">{statusMessage}</p>}
      board={board}
      gameplay={gameplay}
      enableImmersive
    />
  );
};
