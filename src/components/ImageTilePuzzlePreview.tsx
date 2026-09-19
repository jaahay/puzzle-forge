import type { JSX } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { ImageTileGeneratedPuzzle, TilePuzzlePiece } from "../catalog/types";
import { getImageTileCrop } from "../games/imageTiles/geometry";
import {
  applyImageTileHistoryAction,
  makeEmptyImageTileHistoryState,
  resetImageTileAction,
  swapImageTileAction,
  type ImageTileActionRuntime,
  type ImageTileActionState,
  type ImageTileHistoryAction,
  type ImageTileHistoryState,
} from "../games/imageTiles/history";
import {
  canSlideTileTowardGap,
  hasUniqueTilePositions,
  isImageTileSolved,
  slideTileTowardGap,
} from "../games/imageTiles/state";
import type { CompletionPresentationPhase } from "./usePuzzleCompletionPresentation";

export type ImageTileHistoryDispatcher = (action: ImageTileHistoryAction) => void;

export type ImageTileHistoryAvailability = {
  canUndo: boolean;
  canRedo: boolean;
};

type ImageTilePuzzlePreviewProps = {
  puzzle: ImageTileGeneratedPuzzle;
  resetVersion?: number;
  completionPhase?: CompletionPresentationPhase;
  onCausativeInput?: () => void;
  onCompletionAnimationEnd?: () => void;
  onSolvedChange?: (solved: boolean) => void;
  onHistoryAvailabilityChange?: (availability: ImageTileHistoryAvailability) => void;
  onHistoryDispatcherChange?: (dispatcher: ImageTileHistoryDispatcher | null) => void;
};

type ImageTileProgress = {
  puzzleInstanceId: string;
  tiles: TilePuzzlePiece[];
  emptyIndex?: number;
  moveCount: number;
};

type ImageTileRuntimeState = {
  progress: ImageTileProgress;
  history: ImageTileHistoryState;
};

type PersistedImageTileProgress = {
  schemaVersion: 1;
  puzzleId: ImageTileGeneratedPuzzle["puzzleId"];
  puzzleInstanceId: string;
  assetId: string;
  width: number;
  height: number;
  tileOrder: Array<{ id: string; currentIndex: number }>;
  emptyIndex?: number;
  moveCount: number;
  updatedAt: string;
};

const progressSchemaVersion = 1;
const progressStorageKey = (puzzle: ImageTileGeneratedPuzzle) =>
  `puzzle-forge.image-tile-progress.v${progressSchemaVersion}.${puzzle.puzzleId}`;

const makeInitialProgress = (puzzle: ImageTileGeneratedPuzzle): ImageTileProgress => ({
  puzzleInstanceId: puzzle.id,
  tiles: puzzle.tiles.map((tile) => ({ ...tile })),
  ...(puzzle.puzzleId === "sliding-puzzle" ? { emptyIndex: puzzle.emptyIndex } : {}),
  moveCount: 0,
});

const toImageTileActionState = (progress: ImageTileProgress): ImageTileActionState => ({
  tiles: progress.tiles.map((tile) => ({ ...tile })),
  ...(progress.emptyIndex === undefined ? {} : { emptyIndex: progress.emptyIndex }),
  moveCount: progress.moveCount,
});

const restoreImageTileActionState = (
  progress: ImageTileProgress,
  state: ImageTileActionState,
): ImageTileProgress => ({
  puzzleInstanceId: progress.puzzleInstanceId,
  tiles: state.tiles.map((tile) => ({ ...tile })),
  ...(state.emptyIndex === undefined ? {} : { emptyIndex: state.emptyIndex }),
  moveCount: state.moveCount,
});

const toImageTileActionRuntime = (runtime: ImageTileRuntimeState): ImageTileActionRuntime => ({
  state: toImageTileActionState(runtime.progress),
  history: runtime.history,
});

const restoreImageTileActionRuntime = (
  current: ImageTileRuntimeState,
  next: ImageTileActionRuntime,
): ImageTileRuntimeState => ({
  progress: restoreImageTileActionState(current.progress, next.state),
  history: next.history,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getImageTileBoardStyle = (width: number, height: number): JSX.CSSProperties => {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const viewportWidthCap = (72 * safeWidth) / safeHeight;

  return {
    gridTemplateColumns: `repeat(${safeWidth}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${safeHeight}, minmax(0, 1fr))`,
    aspectRatio: `${safeWidth} / ${safeHeight}`,
    width: `min(100%, 42rem, ${viewportWidthCap}vh)`,
  };
};

export const shouldRevealSlidingCompletionGap = (
  solved: boolean,
  completionPhase?: CompletionPresentationPhase,
) =>
  solved &&
  (completionPhase === undefined || completionPhase === "celebrating" || completionPhase === "completed");

export const getImageTileInstruction = (
  solved: boolean,
  sliding: boolean,
  selectedTileId: string | null,
) =>
  solved
    ? "Puzzle complete."
    : sliding
      ? "Choose any tile in the empty space's row or column. The tiles between it and the gap slide together."
      : selectedTileId
        ? "Choose a second tile to exchange with the selected tile."
        : "Choose one tile, then another, to exchange their positions.";

export const restoreImageTileProgress = (
  puzzle: ImageTileGeneratedPuzzle,
  value: unknown,
): ImageTileProgress | null => {
  if (!isRecord(value)) return null;
  const candidate = value as Partial<PersistedImageTileProgress>;
  if (
    candidate.schemaVersion !== progressSchemaVersion ||
    candidate.puzzleId !== puzzle.puzzleId ||
    candidate.puzzleInstanceId !== puzzle.id ||
    candidate.assetId !== puzzle.asset.id ||
    candidate.width !== puzzle.width ||
    candidate.height !== puzzle.height ||
    !Number.isInteger(candidate.moveCount) ||
    Number(candidate.moveCount) < 0 ||
    !Array.isArray(candidate.tileOrder) ||
    candidate.tileOrder.length !== puzzle.tiles.length
  ) return null;

  const currentIndexById = new Map<string, number>();
  for (const entry of candidate.tileOrder) {
    if (!isRecord(entry) || typeof entry.id !== "string" || !Number.isInteger(entry.currentIndex)) return null;
    if (currentIndexById.has(entry.id)) return null;
    currentIndexById.set(entry.id, Number(entry.currentIndex));
  }
  if (puzzle.tiles.some((tile) => !currentIndexById.has(tile.id))) return null;

  const tiles = puzzle.tiles.map((tile) => ({ ...tile, currentIndex: currentIndexById.get(tile.id) ?? tile.currentIndex }));
  const boardCellCount = puzzle.width * puzzle.height;
  if (!hasUniqueTilePositions(tiles, boardCellCount)) return null;

  if (puzzle.puzzleId === "sliding-puzzle") {
    if (!Number.isInteger(candidate.emptyIndex)) return null;
    const emptyIndex = Number(candidate.emptyIndex);
    if (emptyIndex < 0 || emptyIndex >= boardCellCount || tiles.some((tile) => tile.currentIndex === emptyIndex)) return null;
    return { puzzleInstanceId: puzzle.id, tiles, emptyIndex, moveCount: Number(candidate.moveCount) };
  }

  if (tiles.length !== boardCellCount) return null;
  return { puzzleInstanceId: puzzle.id, tiles, moveCount: Number(candidate.moveCount) };
};

const loadImageTileProgress = (puzzle: ImageTileGeneratedPuzzle) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(progressStorageKey(puzzle));
    return raw ? restoreImageTileProgress(puzzle, JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

const saveImageTileProgress = (puzzle: ImageTileGeneratedPuzzle, progress: ImageTileProgress) => {
  if (typeof window === "undefined") return;
  const envelope: PersistedImageTileProgress = {
    schemaVersion: progressSchemaVersion,
    puzzleId: puzzle.puzzleId,
    puzzleInstanceId: puzzle.id,
    assetId: puzzle.asset.id,
    width: puzzle.width,
    height: puzzle.height,
    tileOrder: progress.tiles.map(({ id, currentIndex }) => ({ id, currentIndex })),
    ...(puzzle.puzzleId === "sliding-puzzle" ? { emptyIndex: progress.emptyIndex } : {}),
    moveCount: progress.moveCount,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(progressStorageKey(puzzle), JSON.stringify(envelope));
  } catch {
    // Progress persistence is best-effort; gameplay remains available without browser storage.
  }
};

export const ImageTilePuzzlePreview = ({
  puzzle,
  resetVersion = 0,
  completionPhase,
  onCausativeInput,
  onCompletionAnimationEnd,
  onSolvedChange,
  onHistoryAvailabilityChange,
  onHistoryDispatcherChange,
}: ImageTilePuzzlePreviewProps) => {
  const [runtime, setRuntime] = useState<ImageTileRuntimeState>(() => ({
    progress: loadImageTileProgress(puzzle) ?? makeInitialProgress(puzzle),
    history: makeEmptyImageTileHistoryState(),
  }));
  const progress = runtime.progress;
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const lastResetVersion = useRef(resetVersion);
  const boardCellCount = puzzle.width * puzzle.height;
  const isSliding = puzzle.puzzleId === "sliding-puzzle";
  const isSolved = isImageTileSolved(progress.tiles, progress.emptyIndex, isSliding ? boardCellCount : undefined);
  const showCompletionEffect = isSolved && completionPhase === "celebrating";
  const showSolvedPresentation = isSolved && (completionPhase === undefined || completionPhase === "completed");
  const revealSlidingCompletionGap = isSliding && shouldRevealSlidingCompletionGap(isSolved, completionPhase);

  useEffect(() => {
    if (lastResetVersion.current === resetVersion) return;
    lastResetVersion.current = resetVersion;
    setRuntime((current) => {
      const initialProgress = makeInitialProgress(puzzle);
      if (puzzle.puzzleId !== "tile-swap") {
        return { progress: initialProgress, history: makeEmptyImageTileHistoryState() };
      }

      const reset = resetImageTileAction(
        toImageTileActionRuntime(current),
        toImageTileActionState(initialProgress),
      );
      return reset ? restoreImageTileActionRuntime(current, reset) : current;
    });
    setSelectedTileId(null);
  }, [puzzle, resetVersion]);

  const dispatchHistoryAction = useCallback((action: ImageTileHistoryAction) => {
    if (puzzle.puzzleId !== "tile-swap") return;

    setRuntime((current) => {
      const next = applyImageTileHistoryAction(toImageTileActionRuntime(current), action);
      return next ? restoreImageTileActionRuntime(current, next) : current;
    });
    setSelectedTileId(null);
  }, [puzzle.puzzleId]);

  useEffect(() => {
    if (!onHistoryDispatcherChange || puzzle.puzzleId !== "tile-swap") return;
    onHistoryDispatcherChange(dispatchHistoryAction);
    return () => onHistoryDispatcherChange(null);
  }, [dispatchHistoryAction, onHistoryDispatcherChange, puzzle.puzzleId]);

  useEffect(() => {
    onHistoryAvailabilityChange?.({
      canUndo: puzzle.puzzleId === "tile-swap" && runtime.history.undoStack.length > 0,
      canRedo: puzzle.puzzleId === "tile-swap" && runtime.history.redoStack.length > 0,
    });
  }, [
    onHistoryAvailabilityChange,
    puzzle.puzzleId,
    runtime.history.undoStack.length,
    runtime.history.redoStack.length,
  ]);

  useEffect(() => {
    saveImageTileProgress(puzzle, progress);
  }, [progress, puzzle]);

  useEffect(() => {
    onSolvedChange?.(isSolved);
  }, [isSolved, onSolvedChange]);

  const moveTile = (tile: TilePuzzlePiece) => {
    if (isSolved) return;

    if (isSliding) {
      if (progress.emptyIndex === undefined || !canSlideTileTowardGap(tile, progress.emptyIndex, puzzle.width, puzzle.height)) return;
      onCausativeInput?.();
      setRuntime((current) => {
        if (current.progress.emptyIndex === undefined) return current;
        const next = slideTileTowardGap(
          current.progress.tiles,
          tile.id,
          current.progress.emptyIndex,
          puzzle.width,
          puzzle.height,
        );
        if (!next.moved) return current;
        return {
          ...current,
          progress: {
            ...current.progress,
            tiles: next.tiles,
            emptyIndex: next.emptyIndex,
            moveCount: current.progress.moveCount + 1,
          },
        };
      });
      return;
    }

    if (!selectedTileId) {
      setSelectedTileId(tile.id);
      return;
    }
    if (selectedTileId === tile.id) {
      setSelectedTileId(null);
      return;
    }

    onCausativeInput?.();
    setRuntime((current) => {
      const next = swapImageTileAction(
        toImageTileActionRuntime(current),
        selectedTileId,
        tile.id,
      );
      return next ? restoreImageTileActionRuntime(current, next) : current;
    });
    setSelectedTileId(null);
  };

  const tileByCurrentIndex = new Map(progress.tiles.map((tile) => [tile.currentIndex, tile] as const));
  const boardStyle = getImageTileBoardStyle(puzzle.width, puzzle.height);
  const frameStyle = {
    aspectRatio: boardStyle.aspectRatio,
    width: boardStyle.width,
  } as JSX.CSSProperties;

  return (
    <section class="image-tile-preview" aria-label={`${puzzle.title} board`}>
      <div class="image-tile-summary">
        <span>{showSolvedPresentation ? "Solved" : `${progress.moveCount} ${progress.moveCount === 1 ? "move" : "moves"}`}</span>
        <span>{puzzle.asset.title}</span>
        <span>{puzzle.width} × {puzzle.height}</span>
      </div>

      <p class="image-tile-instruction">
        <span class="image-tile-instruction-sizer" aria-hidden="true">
          {getImageTileInstruction(false, isSliding, null)}
        </span>
        {!isSliding ? (
          <span class="image-tile-instruction-sizer" aria-hidden="true">
            {getImageTileInstruction(false, false, "selected")}
          </span>
        ) : null}
        <span class="image-tile-instruction-copy">
          {getImageTileInstruction(isSolved, isSliding, selectedTileId)}
        </span>
      </p>

      <div class="image-tile-tools">
        <button type="button" aria-pressed={showPreview} onClick={() => setShowPreview((current) => !current)}>
          {showPreview ? "Hide reference" : "Show reference"}
        </button>
      </div>

      {showPreview ? (
        <div class="image-tile-reference" style={frameStyle}>
          <img src={puzzle.asset.files.puzzle} alt={puzzle.asset.alt} />
        </div>
      ) : null}

      <div
        class={`image-tile-board ${showSolvedPresentation ? "solved" : ""} ${showCompletionEffect ? "just-solved" : ""}`}
        style={boardStyle}
        aria-label={`${puzzle.title}, ${puzzle.width} by ${puzzle.height}`}
        onAnimationEnd={(event) => {
          if (showCompletionEffect && event.target === event.currentTarget) onCompletionAnimationEnd?.();
        }}
      >
        {Array.from({ length: boardCellCount }, (_, currentIndex) => {
          const tile = tileByCurrentIndex.get(currentIndex);
          if (!tile) {
            if (revealSlidingCompletionGap) {
              const solvedIndex = boardCellCount - 1;
              const row = Math.floor(solvedIndex / puzzle.width);
              const column = solvedIndex % puzzle.width;
              const crop = getImageTileCrop(puzzle.asset, puzzle.width, puzzle.height, row, column);
              return (
                <span class="image-tile-gap completed" role="img" aria-label="Completed final image section" key={`gap-${currentIndex}`}>
                  <img
                    class="image-tile-image"
                    src={puzzle.asset.files.puzzle}
                    alt=""
                    draggable={false}
                    style={{
                      width: `${crop.widthPercent}%`,
                      height: `${crop.heightPercent}%`,
                      left: `${crop.leftPercent}%`,
                      top: `${crop.topPercent}%`,
                    }}
                  />
                </span>
              );
            }
            return <span class="image-tile-gap" role="img" aria-label="Empty space" key={`gap-${currentIndex}`} />;
          }

          const crop = getImageTileCrop(puzzle.asset, puzzle.width, puzzle.height, tile.row, tile.column);
          const canMove = isSliding
            ? progress.emptyIndex !== undefined && canSlideTileTowardGap(tile, progress.emptyIndex, puzzle.width, puzzle.height)
            : true;
          const selected = selectedTileId === tile.id;
          const imageStyle = {
            width: `${crop.widthPercent}%`,
            height: `${crop.heightPercent}%`,
            left: `${crop.leftPercent}%`,
            top: `${crop.topPercent}%`,
          } as JSX.CSSProperties;
          const unavailable = isSolved || (isSliding && !canMove);
          const actionLabel = isSliding
            ? canMove ? "Slide row or column toward empty space" : "Not in the empty space's row or column"
            : selected ? "Selected; choose again to cancel" : "Select to swap";

          return (
            <button
              type="button"
              class={`image-tile ${selected ? "selected" : ""} ${canMove ? "can-move" : ""}`}
              aria-pressed={isSliding ? undefined : selected}
              aria-disabled={unavailable}
              disabled={unavailable}
              aria-label={`Image tile ${tile.solvedIndex + 1}. ${actionLabel}.`}
              onClick={() => moveTile(tile)}
              key={tile.id}
            >
              <img
                class="image-tile-image"
                src={puzzle.asset.files.puzzle}
                alt=""
                draggable={false}
                style={imageStyle}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
};
