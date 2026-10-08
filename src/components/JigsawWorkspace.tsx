import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { CurrentPuzzleHeader, getPuzzleArrivalIdentity, usePuzzleArrival } from "./CurrentPuzzleIdentity";
import { defaultJigsawBoundaryMode } from "../games/jigsaw/boundaryContours";
import { defaultJigsawCutStyle } from "../games/jigsaw/cutStyle";
import { defaultJigsawSpecialPiecesMode } from "../games/jigsaw/specialPieces";
import type { JigsawHistoryAction } from "../games/jigsaw/history";
import { jigsawCustomSizeSelection } from "../games/jigsaw/size";
import { JigsawNewPuzzleControl } from "./JigsawNewPuzzleControl";
import { PuzzleHistoryActions } from "./PuzzleHistoryActions";
import type { JigsawWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { TilePuzzlePreview, type JigsawHistoryAvailability, type JigsawHistoryController } from "./TilePuzzlePreview";
import { usePuzzleCompletionPresentation } from "./usePuzzleCompletionPresentation";

export const JigsawWorkspace = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  puzzle,
  nextPuzzleDraft,
  seedLoadInput,
  statusMessage,
  onStatusMessageChange,
  isGenerating,
  onReset,
  onRuntimeProgressChange,
  onNextPuzzleDraftChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
  jigsawAssembly,
  onJigsawAssemblyChange,
}: JigsawWorkspaceProps) => {
  const [resetVersion, setResetVersion] = useState(0);
  const [completionState, setCompletionState] = useState<{ puzzleInstanceId: string; solved: boolean } | null>(null);
  const [historyAvailability, setHistoryAvailability] = useState<{
    puzzleInstanceId: string | null;
    canUndo: boolean;
    canRedo: boolean;
  }>({ puzzleInstanceId: null, canUndo: false, canRedo: false });
  const historyControllerRef = useRef<JigsawHistoryController | null>(null);
  const jigsawPuzzle = puzzle?.kind === "tiles" && puzzle.puzzleId === "jigsaw" ? puzzle : null;
  const puzzleInstanceId = jigsawPuzzle?.id ?? null;
  const puzzleArrivalIdentity = jigsawPuzzle ? getPuzzleArrivalIdentity(jigsawPuzzle) : null;
  const isPuzzleArriving = usePuzzleArrival(puzzleArrivalIdentity);
  const showStatus = Boolean(statusMessage);
  const isSolved = Boolean(
    puzzleInstanceId &&
    completionState?.puzzleInstanceId === puzzleInstanceId &&
    completionState.solved,
  );
  const completion = usePuzzleCompletionPresentation({
    enabled: Boolean(jigsawPuzzle),
    identity: puzzleInstanceId ?? "jigsaw:pending",
    solved: isSolved,
  });
  const handleSolvedChange = useCallback((solved: boolean) => {
    if (!puzzleInstanceId) return;
    setCompletionState((current) =>
      current?.puzzleInstanceId === puzzleInstanceId && current.solved === solved
        ? current
        : { puzzleInstanceId, solved });
  }, [puzzleInstanceId]);

  const handleHistoryAvailabilityChange = useCallback((availability: JigsawHistoryAvailability) => {
    setHistoryAvailability((current) =>
      current.puzzleInstanceId === puzzleInstanceId &&
      current.canUndo === availability.canUndo &&
      current.canRedo === availability.canRedo
        ? current
        : { puzzleInstanceId, ...availability });
  }, [puzzleInstanceId]);

  const handleHistoryControllerChange = useCallback((controller: JigsawHistoryController | null) => {
    historyControllerRef.current = controller;
  }, []);

  const canHistoryActionNow = useCallback((action: JigsawHistoryAction) => {
    const controller = historyControllerRef.current;
    return Boolean(
      puzzleInstanceId &&
      controller?.puzzleInstanceId === puzzleInstanceId &&
      controller.can(action),
    );
  }, [puzzleInstanceId]);

  const requestHistoryAction = (action: JigsawHistoryAction) => {
    const controller = historyControllerRef.current;
    if (
      !puzzleInstanceId ||
      controller?.puzzleInstanceId !== puzzleInstanceId ||
      !controller.dispatch(action)
    ) return;

    onStatusMessageChange(
      action === "undo" ? "Undid last puzzle action." : "Redid last puzzle action.",
    );
  };

  useEffect(() => {
    if (!puzzleInstanceId) return;
    onRuntimeProgressChange(puzzleInstanceId, {
      hasProgress: Boolean(jigsawAssembly?.joinedComponents.length) ||
        (historyAvailability.puzzleInstanceId === puzzleInstanceId && historyAvailability.canUndo),
      terminal: isSolved,
    });
  }, [puzzleInstanceId, jigsawAssembly, historyAvailability, isSolved, onRuntimeProgressChange]);

  const resetJigsaw = () => onReset(() => {
    if (puzzleInstanceId) setCompletionState({ puzzleInstanceId, solved: false });
    setResetVersion((current) => current + 1);
  });

  const newPuzzleControl = jigsawPuzzle ? (
    <JigsawNewPuzzleControl
      currentSeed={jigsawPuzzle.seed}
      imageId={nextPuzzleDraft.imageId}
      width={nextPuzzleDraft.width}
      height={nextPuzzleDraft.height}
      sizeSelection={nextPuzzleDraft.jigsawSizeSelection ?? jigsawCustomSizeSelection}
      cutStyle={nextPuzzleDraft.jigsawCutStyle ?? defaultJigsawCutStyle}
      boundaryMode={nextPuzzleDraft.jigsawBoundaryMode ?? defaultJigsawBoundaryMode}
      specialPiecesMode={
        nextPuzzleDraft.jigsawSpecialPiecesMode ?? defaultJigsawSpecialPiecesMode
      }
      minWidth={selectedDefinition.minWidth}
      maxWidth={selectedDefinition.maxWidth}
      minHeight={selectedDefinition.minHeight}
      maxHeight={selectedDefinition.maxHeight}
      seedLoadInput={seedLoadInput}
      disabled={isGenerating || !selectedPuzzleIsGeneratable}
      onSettingsChange={onNextPuzzleDraftChange}
      onSeedLoadInputChange={onSeedLoadInputChange}
      onNewPuzzle={onNewPuzzle}
      onToday={onToday}
      onLoadSeed={onLoadSeed}
    />
  ) : null;
  const historyActions = jigsawPuzzle ? (
    <PuzzleHistoryActions
      canUndo={
        historyAvailability.puzzleInstanceId === jigsawPuzzle.id &&
        historyAvailability.canUndo
      }
      canRedo={
        historyAvailability.puzzleInstanceId === jigsawPuzzle.id &&
        historyAvailability.canRedo
      }
      disabled={isGenerating}
      canUndoNow={() => canHistoryActionNow("undo")}
      canRedoNow={() => canHistoryActionNow("redo")}
      onUndo={() => requestHistoryAction("undo")}
      onRedo={() => requestHistoryAction("redo")}
    />
  ) : null;
  const crown = jigsawPuzzle ? (
    <CurrentPuzzleHeader
      key={puzzleArrivalIdentity ?? undefined}
      puzzle={jigsawPuzzle}
      historyControl={historyActions}
      newPuzzleControl={newPuzzleControl}
      isArriving={isPuzzleArriving}
    />
  ) : null;

  const loadingBoard = (
    <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label="Jigsaw is generating">
      <div class="puzzle-loading-copy"><strong>Generating Jigsaw</strong><span>{statusMessage}</span></div>
      <div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</div>
    </section>
  );
  const board = jigsawPuzzle ? (
    <section
      key={puzzleArrivalIdentity ?? undefined}
      class={`puzzle-panel jigsaw-puzzle-panel${isPuzzleArriving ? " puzzle-arrival" : ""}`}
      aria-label="Generated Jigsaw puzzle"
    >
      <TilePuzzlePreview
        puzzle={jigsawPuzzle}
        resetVersion={resetVersion}
        initialAssembly={jigsawAssembly}
        onAssemblyChange={onJigsawAssemblyChange}
        onSolvedChange={handleSolvedChange}
        onHistoryAvailabilityChange={handleHistoryAvailabilityChange}
        onHistoryControllerChange={handleHistoryControllerChange}
        completionPhase={completion.phase}
        onCausativeInput={completion.recordCausativeInput}
        onCompletionAnimationEnd={completion.completePresentation}
        completionDisabled={isGenerating}
        onResetPuzzle={resetJigsaw}
        onNewPuzzle={onNewPuzzle}
      />
    </section>
  ) : isGenerating ? loadingBoard : null;

  const gameplay = jigsawPuzzle && !isSolved ? (
    <div class="puzzle-actions">
      <button type="button" onClick={resetJigsaw} disabled={isGenerating}>Reset</button>
    </div>
  ) : null;

  return (
    <PuzzleWorkspaceLayout
      className="jigsaw-workspace"
      crown={crown}
      status={showStatus ? <p class="status-line" aria-live="polite">{statusMessage}</p> : null}
      board={board}
      gameplay={gameplay}
      enableImmersive
      immersiveEntry="descendant"
    />
  );
};
