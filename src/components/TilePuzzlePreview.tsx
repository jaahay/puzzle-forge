import type { JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { JigsawGeneratedPuzzle, JigsawPiece } from "../catalog/types";
import { getJigsawPieceOutlinePath, getJigsawPieceSeamPaths } from "../games/jigsaw/edgePaths";
import {
  createInitialJigsawPlacements,
  createJigsawStageLayout,
  getJigsawPlacementPosition,
  normalizeJigsawPosition,
  restageLooseJigsawPlacements,
  shouldSnapJigsawPlacement,
  type JigsawLayoutMode,
  type JigsawPlacement,
} from "../games/jigsaw/placement";

type TilePuzzlePreviewProps = {
  puzzle: JigsawGeneratedPuzzle;
  resetVersion?: number;
};

type PersistedJigsawPlacementEnvelope = {
  schemaVersion: 3;
  puzzleId: "jigsaw";
  puzzleInstanceId: string;
  seed: string;
  width: number;
  height: number;
  assetId: string;
  edgeModelRevision: number;
  layoutMode: JigsawLayoutMode;
  placements: JigsawPlacement[];
  updatedAt: string;
};

type PlacementState = {
  puzzleId: string;
  layoutMode: JigsawLayoutMode;
  placements: JigsawPlacement[];
};

type PiecePointerEvent = JSX.TargetedPointerEvent<HTMLButtonElement>;
type PieceKeyboardEvent = JSX.TargetedKeyboardEvent<HTMLButtonElement>;

type ActiveDrag = {
  tileId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

const placementSchemaVersion = 3;
const fallbackStageWidth = 760;

const getPlacementStorageKey = (puzzle: JigsawGeneratedPuzzle) =>
  `puzzle-forge.jigsaw.${placementSchemaVersion}.${puzzle.id}.${puzzle.seed}.${puzzle.width}x${puzzle.height}`;

const getPieceClipPathId = (puzzle: JigsawGeneratedPuzzle, tile: JigsawPiece) =>
  `jigsaw-piece-${puzzle.id}-${tile.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");

export const getPieceImageClipPathProps = (clipPathId: string) => ({
  "clip-path": `url(#${clipPathId})`,
});

export const getPieceHitTargetProps = () => ({
  fill: "transparent",
  "pointer-events": "fill",
});

export const getPieceZIndex = (
  tile: Pick<JigsawPiece, "currentIndex">,
  snapped: boolean,
  active: boolean,
  raised: boolean,
) => active ? 1000 : snapped ? 4 : raised ? 900 : 10 + tile.currentIndex;

const isPersistedPlacement = (value: unknown): value is JigsawPlacement => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Partial<JigsawPlacement>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.x === "number" && Number.isFinite(candidate.x) && candidate.x >= 0 && candidate.x <= 1 &&
    typeof candidate.y === "number" && Number.isFinite(candidate.y) && candidate.y >= 0 && candidate.y <= 1 &&
    typeof candidate.snapped === "boolean"
  );
};

const loadPersistedPlacements = (puzzle: JigsawGeneratedPuzzle) => {
  if (typeof window === "undefined") return null;
  const rawEnvelope = window.localStorage.getItem(getPlacementStorageKey(puzzle));
  if (!rawEnvelope) return null;

  try {
    const envelope: unknown = JSON.parse(rawEnvelope);
    if (typeof envelope !== "object" || envelope === null || Array.isArray(envelope)) return null;
    const candidate = envelope as Partial<PersistedJigsawPlacementEnvelope>;
    const expectedIds = new Set(puzzle.tiles.map((tile) => tile.id));
    const placements = Array.isArray(candidate.placements) && candidate.placements.every(isPersistedPlacement)
      ? candidate.placements
      : null;

    if (
      candidate.schemaVersion !== placementSchemaVersion ||
      candidate.puzzleId !== "jigsaw" ||
      candidate.puzzleInstanceId !== puzzle.id ||
      candidate.seed !== puzzle.seed ||
      candidate.width !== puzzle.width ||
      candidate.height !== puzzle.height ||
      candidate.assetId !== puzzle.asset.id ||
      candidate.edgeModelRevision !== puzzle.edgeModel.catalogRevision ||
      (candidate.layoutMode !== "scatter" && candidate.layoutMode !== "tray") ||
      !placements ||
      placements.length !== puzzle.tiles.length ||
      placements.some((placement) => !expectedIds.has(placement.id)) ||
      new Set(placements.map((placement) => placement.id)).size !== expectedIds.size
    ) {
      return null;
    }

    return { layoutMode: candidate.layoutMode, placements };
  } catch {
    return null;
  }
};

const savePersistedPlacements = (
  puzzle: JigsawGeneratedPuzzle,
  layoutMode: JigsawLayoutMode,
  placements: JigsawPlacement[],
) => {
  if (typeof window === "undefined") return;
  const envelope: PersistedJigsawPlacementEnvelope = {
    schemaVersion: placementSchemaVersion,
    puzzleId: "jigsaw",
    puzzleInstanceId: puzzle.id,
    seed: puzzle.seed,
    width: puzzle.width,
    height: puzzle.height,
    assetId: puzzle.asset.id,
    edgeModelRevision: puzzle.edgeModel.catalogRevision,
    layoutMode,
    placements,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(getPlacementStorageKey(puzzle), JSON.stringify(envelope));
};

const updatePlacement = (
  placements: JigsawPlacement[],
  tileId: string,
  updater: (placement: JigsawPlacement) => JigsawPlacement,
) => placements.map((placement) => placement.id === tileId ? updater(placement) : placement);

export const TilePuzzlePreview = ({ puzzle, resetVersion = 0 }: TilePuzzlePreviewProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const lastResetVersion = useRef(resetVersion);
  const [stageWidth, setStageWidth] = useState(0);
  const [placementState, setPlacementState] = useState<PlacementState | null>(null);
  const [activeTileId, setActiveTileId] = useState<string | null>(null);
  const [raisedTileId, setRaisedTileId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEdgeSeams, setShowEdgeSeams] = useState(false);

  const layout = useMemo(() => createJigsawStageLayout({
    stageWidth: stageWidth || fallbackStageWidth,
    imageWidth: puzzle.asset.intrinsicWidth,
    imageHeight: puzzle.asset.intrinsicHeight,
    puzzleWidth: puzzle.width,
    puzzleHeight: puzzle.height,
    pieceCount: puzzle.tiles.length,
  }), [stageWidth, puzzle.asset.intrinsicHeight, puzzle.asset.intrinsicWidth, puzzle.height, puzzle.tiles.length, puzzle.width]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => setStageWidth(stage.clientWidth);
    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(stage);
      return () => observer.disconnect();
    }

    if (typeof window === "undefined") return;
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    dragRef.current = null;
    setActiveTileId(null);
    setRaisedTileId(null);
  }, [puzzle.id]);

  useEffect(() => {
    if (stageWidth <= 0) return;

    setPlacementState((current) => {
      if (!current || current.puzzleId !== puzzle.id) {
        const persisted = loadPersistedPlacements(puzzle);
        const placements = persisted
          ? persisted.layoutMode === layout.mode
            ? persisted.placements
            : restageLooseJigsawPlacements(layout, puzzle.tiles, persisted.placements)
          : createInitialJigsawPlacements(layout, puzzle.tiles);
        return { puzzleId: puzzle.id, layoutMode: layout.mode, placements };
      }

      if (current.layoutMode !== layout.mode) {
        return {
          puzzleId: puzzle.id,
          layoutMode: layout.mode,
          placements: restageLooseJigsawPlacements(layout, puzzle.tiles, current.placements),
        };
      }

      return current;
    });
  }, [layout.mode, puzzle.id, puzzle.tiles, stageWidth]);

  useEffect(() => {
    if (!placementState || placementState.puzzleId !== puzzle.id) return;
    savePersistedPlacements(puzzle, placementState.layoutMode, placementState.placements);
  }, [placementState, puzzle]);

  const scatterPieces = () => {
    dragRef.current = null;
    setActiveTileId(null);
    setRaisedTileId(null);
    setPlacementState({
      puzzleId: puzzle.id,
      layoutMode: layout.mode,
      placements: createInitialJigsawPlacements(layout, puzzle.tiles),
    });
  };

  useEffect(() => {
    if (lastResetVersion.current === resetVersion) return;
    lastResetVersion.current = resetVersion;
    scatterPieces();
  }, [resetVersion]);

  const placements = placementState?.puzzleId === puzzle.id ? placementState.placements : [];
  const placementById = new Map(placements.map((placement) => [placement.id, placement] as const));
  const solvedCount = placements.filter((placement) => placement.snapped).length;
  const isSolved = placements.length === puzzle.tiles.length && solvedCount === puzzle.tiles.length;

  const getPointerPlacement = (event: PiecePointerEvent, drag: ActiveDrag) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const stageRect = stage.getBoundingClientRect();
    return normalizeJigsawPosition(
      layout,
      event.clientX - stageRect.left - drag.offsetX,
      event.clientY - stageRect.top - drag.offsetY,
    );
  };

  const beginDrag = (event: PiecePointerEvent, tile: JigsawPiece, placement: JigsawPlacement) => {
    if (placement.snapped || isSolved) return;
    const target = event.currentTarget as HTMLButtonElement;
    const pieceRect = target.getBoundingClientRect();
    dragRef.current = {
      tileId: tile.id,
      pointerId: event.pointerId,
      offsetX: event.clientX - pieceRect.left,
      offsetY: event.clientY - pieceRect.top,
    };
    target.focus({ preventScroll: true });
    target.setPointerCapture(event.pointerId);
    setRaisedTileId(tile.id);
    setActiveTileId(tile.id);
    event.preventDefault();
  };

  const moveDrag = (event: PiecePointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextPosition = getPointerPlacement(event, drag);
    if (!nextPosition) return;
    setPlacementState((current) => current?.puzzleId === puzzle.id ? {
      ...current,
      placements: updatePlacement(current.placements, drag.tileId, (placement) => ({ ...placement, ...nextPosition, snapped: false })),
    } : current);
    event.preventDefault();
  };

  const finishDrag = (event: PiecePointerEvent, tile: JigsawPiece) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || drag.tileId !== tile.id) return;
    const nextPosition = getPointerPlacement(event, drag);
    const target = event.currentTarget as HTMLButtonElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setActiveTileId(null);

    if (!nextPosition) return;
    const snaps = shouldSnapJigsawPlacement(layout, tile, nextPosition);
    setPlacementState((current) => current?.puzzleId === puzzle.id ? {
      ...current,
      placements: updatePlacement(current.placements, tile.id, (placement) => ({ ...placement, ...nextPosition, snapped: snaps })),
    } : current);
    event.preventDefault();
  };

  const cancelDrag = (event: PiecePointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setActiveTileId(null);
  };

  const movePieceWithKeyboard = (event: PieceKeyboardEvent, tile: JigsawPiece, placement: JigsawPlacement) => {
    if (placement.snapped || isSolved) return;
    const direction = event.key;
    if (!["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(direction)) return;
    setRaisedTileId(tile.id);

    const current = getJigsawPlacementPosition(layout, tile, placement);
    const step = Math.max(8, Math.min(layout.pieceWidth, layout.pieceHeight) * (event.shiftKey ? 0.48 : 0.18));
    const nextLeft = current.left + (direction === "ArrowRight" ? step : direction === "ArrowLeft" ? -step : 0);
    const nextTop = current.top + (direction === "ArrowDown" ? step : direction === "ArrowUp" ? -step : 0);
    const nextPosition = normalizeJigsawPosition(layout, nextLeft, nextTop);
    const snaps = shouldSnapJigsawPlacement(layout, tile, nextPosition);

    setPlacementState((currentState) => currentState?.puzzleId === puzzle.id ? {
      ...currentState,
      placements: updatePlacement(currentState.placements, tile.id, (currentPlacement) => ({
        ...currentPlacement,
        ...nextPosition,
        snapped: snaps,
      })),
    } : currentState);
    event.preventDefault();
  };

  const previewStyle = {
    backgroundImage: `url(${puzzle.asset.files.preview})`,
    aspectRatio: `${puzzle.asset.intrinsicWidth} / ${puzzle.asset.intrinsicHeight}`,
  };
  const stageStyle = { height: `${layout.stageHeight}px` } as JSX.CSSProperties;
  const boardStyle = {
    left: `${layout.boardX}px`,
    top: `${layout.boardY}px`,
    width: `${layout.boardWidth}px`,
    height: `${layout.boardHeight}px`,
  } as JSX.CSSProperties;

  return (
    <section class="tile-puzzle-preview" aria-label={`${puzzle.title} jigsaw puzzle`}>
      <div class="tile-puzzle-summary">
        <span>{isSolved ? "Solved" : `${solvedCount}/${puzzle.tiles.length} placed`}</span>
        <span>{puzzle.asset.title}</span>
        <span>{puzzle.width} x {puzzle.height}</span>
      </div>

      <div class="tile-puzzle-tools">
        <button type="button" onClick={() => setShowPreview((current) => !current)}>{showPreview ? "Hide preview" : "Preview image"}</button>
        <button type="button" onClick={scatterPieces}>Scatter pieces</button>
        <button
          type="button"
          aria-pressed={showEdgeSeams}
          onClick={() => setShowEdgeSeams((current) => !current)}
        >
          {showEdgeSeams ? "Hide edge guides" : "Show edge guides"}
        </button>
      </div>

      {showPreview ? (
        <div class="tile-puzzle-art-preview" aria-label={puzzle.asset.alt} style={previewStyle} />
      ) : null}

      <div
        class={`jigsaw-freeform-stage ${layout.mode} ${isSolved ? "solved" : ""}`}
        ref={stageRef}
        style={stageStyle}
      >
        <div class="jigsaw-assembly-board" style={boardStyle} aria-hidden="true">
          <span>Assembly board</span>
        </div>

        {puzzle.tiles.map((tile) => {
          const placement = placementById.get(tile.id);
          if (!placement) return null;
          const position = getJigsawPlacementPosition(layout, tile, placement);
          const active = tile.id === activeTileId;
          const raised = tile.id === raisedTileId;
          const outlinePath = getJigsawPieceOutlinePath(tile);
          const clipPathId = getPieceClipPathId(puzzle, tile);
          const pieceStyle = {
            width: `${layout.pieceWidth}px`,
            height: `${layout.pieceHeight}px`,
            transform: `translate3d(${position.left}px, ${position.top}px, 0)`,
            zIndex: getPieceZIndex(tile, placement.snapped, active, raised),
          } as JSX.CSSProperties;

          return (
            <button
              class={`tile-puzzle-piece ${placement.snapped ? "placed" : "loose"} ${active ? "dragging" : ""}`}
              key={tile.id}
              style={pieceStyle}
              onPointerDown={(event) => beginDrag(event, tile, placement)}
              onPointerMove={moveDrag}
              onPointerUp={(event) => finishDrag(event, tile)}
              onPointerCancel={cancelDrag}
              onKeyDown={(event) => movePieceWithKeyboard(event, tile, placement)}
              type="button"
              disabled={placement.snapped}
              aria-label={`Piece ${tile.solvedIndex + 1}, ${placement.snapped ? "placed" : "loose"}`}
            >
              <svg
                class="tile-puzzle-piece-visual"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <clipPath id={clipPathId} clipPathUnits="userSpaceOnUse">
                    <path d={outlinePath} />
                  </clipPath>
                </defs>
                <image
                  class="tile-puzzle-piece-image"
                  href={puzzle.asset.files.puzzle}
                  x={-tile.column * 100}
                  y={-tile.row * 100}
                  width={puzzle.width * 100}
                  height={puzzle.height * 100}
                  preserveAspectRatio="none"
                  {...getPieceImageClipPathProps(clipPathId)}
                />
                <path class="tile-puzzle-piece-hit-target" d={outlinePath} {...getPieceHitTargetProps()} />
                <path class="tile-puzzle-piece-outline" d={outlinePath} />
                {showEdgeSeams ? getJigsawPieceSeamPaths(tile).map((seam) => (
                  <path
                    class={`tile-puzzle-edge-seam ${seam.boundary ? "boundary" : "interior"} ${seam.polarity}`}
                    d={seam.d}
                    key={seam.edgeId}
                  />
                )) : null}
              </svg>
            </button>
          );
        })}
      </div>
    </section>
  );
};
