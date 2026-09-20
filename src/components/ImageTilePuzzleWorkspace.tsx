import { useCallback, useRef, useState } from "preact/hooks";
import { solvedTerminalState } from "../app/puzzleTerminalState";
import type { ImageTileGeneratedPuzzle, ImageTilePuzzleId } from "../catalog/types";
import type { ImageTileHistoryAction } from "../games/imageTiles/history";
import { CurrentPuzzleHeader, getPuzzleArrivalIdentity, usePuzzleArrival } from "./CurrentPuzzleIdentity";
import { ImageTileNewPuzzleControl } from "./ImageTileNewPuzzleControl";
import { ImageTilePuzzlePreview, type ImageTileHistoryAvailability, type ImageTileHistoryDispatcher } from "./ImageTilePuzzlePreview";
import { PuzzleHistoryActions } from "./PuzzleHistoryActions";
import { PuzzleTerminalDock } from "./PuzzleTerminalDock";
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

type ImageTileHistoryAvailabilityState = ImageTileHistoryAvailability & {
  puzzleInstanceId: string | null;
};

export const ImageTilePuzzleWorkspace = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  puzzle,
  nextPuzzleDraft,
  seedLoadInput,
  statusMessage,
  onStatusMessageChange,
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
  const historyDispatcherRef = useRef<ImageTileHistoryDispatcher | null>(null);
  const [historyAvailability, setHistoryAvailability] = useState<ImageTileHistoryAvailabilityState>({
    puzzleInstanceId: null,
    canUndo: false,
    canRedo: false,
  });
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
  const handleHistoryAvailabilityChange = useCallback((availability: ImageTileHistoryAvailability) => {
    const puzzleInstanceId = imagePuzzle?.id ?? null;
    setHistoryAvailability((current) =>
      current.puzzleInstanceId === puzzleInstanceId &&
      current.canUndo === availability.canUndo &&
      current.canRedo === availability.canRedo
        ? current
        : { puzzleInstanceId, ...availability });
  }, [imagePuzzle?.id]);
  const handleHistoryDispatcherChange = useCallback((dispatcher: ImageTileHistoryDispatcher | null) => {
    historyDispatcherRef.current = dispatcher;
  }, []);

  const requestHistoryAction = (action: ImageTileHistoryAction) => {
    if (!imagePuzzle) return;
    const available = historyAvailability.puzzleInstanceId === imagePuzzle.id &&
      (action === "undo" ? historyAvailability.canUndo : historyAvailability.canRedo);
    const dispatcher = historyDispatcherRef.current;
    if (!available || !dispatcher) return;

    dispatcher(action);
    onStatusMessageChange(action === "undo" ? "Undid last puzzle action." : "Redid last puzzle action.");
  };

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
  const historyActions = imagePuzzle ? (
    <PuzzleHistoryActions
      canUndo={
        historyAvailability.puzzleInstanceId === imagePuzzle.id &&
        historyAvailability.canUndo
      }
      canRedo={
        historyAvailability.puzzleInstanceId === imagePuzzle.id &&
        historyAvailability.canRedo
      }
      disabled={isGenerating}
      onUndo={() => requestHistoryAction("undo")}
      onRedo={() => requestHistoryAction("redo")}
    />
  ) : null;
  const crown = imagePuzzle ? (
    <CurrentPuzzleHeader
      key={puzzleArrivalIdentity ?? undefined}
      puzzle={imagePuzzle}
      historyControl={historyActions}
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
        onHistoryAvailabilityChange={handleHistoryAvailabilityChange}
        onHistoryDispatcherChange={handleHistoryDispatcherChange}
      />
    </section>
  ) : isGenerating ? loadingBoard : null;

  const gameplay = isCompletionPresented ? (
    <PuzzleTerminalDock
      state={solvedTerminalState}
      label="Puzzle solved"
      ariaLabel={`${selectedDefinition.title} solved`}
      disabled={isGenerating}
      onReset={resetPuzzle}
      onNewPuzzle={onNewPuzzle}
    />
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
