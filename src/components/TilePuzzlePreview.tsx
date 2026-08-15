import type { JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { JigsawGeneratedPuzzle, JigsawPiece } from "../catalog/types";
import { getJigsawPieceOutlinePath, getJigsawPieceSeamPaths } from "../games/jigsaw/edgePaths";
import {
  clampJigsawCamera,
  createInitialJigsawPlacements,
  createJigsawFitCamera,
  createJigsawWorldLayout,
  getJigsawCameraTransform,
  getJigsawPlacementPosition,
  normalizeJigsawWorldPosition,
  panJigsawCamera,
  screenToJigsawWorld,
  shouldSnapJigsawPlacement,
  zoomJigsawCameraAtPoint,
  jigsawCameraMaximumZoom,
  jigsawCameraMinimumZoom,
  type JigsawCamera,
  type JigsawPlacement,
  type JigsawViewport,
  type JigsawWorldLayout,
} from "../games/jigsaw/placement";

type TilePuzzlePreviewProps = {
  puzzle: JigsawGeneratedPuzzle;
  resetVersion?: number;
};

type PersistedJigsawPlacementEnvelope = {
  schemaVersion: 4;
  puzzleId: "jigsaw";
  puzzleInstanceId: string;
  seed: string;
  width: number;
  height: number;
  assetId: string;
  edgeModelRevision: number;
  placements: JigsawPlacement[];
  updatedAt: string;
};

type PlacementState = {
  puzzleId: string;
  placements: JigsawPlacement[];
};

type CameraState = {
  puzzleId: string;
  camera: JigsawCamera;
};

type PiecePointerEvent = JSX.TargetedPointerEvent<HTMLButtonElement>;
type PieceKeyboardEvent = JSX.TargetedKeyboardEvent<HTMLButtonElement>;
type StagePointerEvent = JSX.TargetedPointerEvent<HTMLDivElement>;
type StageKeyboardEvent = JSX.TargetedKeyboardEvent<HTMLDivElement>;

type ActiveDrag = {
  tileId: string;
  pointerId: number;
  offsetWorldX: number;
  offsetWorldY: number;
};

type ActivePan = {
  pointerId: number;
  lastClientX: number;
  lastClientY: number;
};

const placementSchemaVersion = 4;
const fallbackViewport: JigsawViewport = { width: 760, height: 560 };
const edgePanZone = 56;
const edgePanSpeed = 18;
const keyboardPanStep = 56;
const jigsawZoomStops = [
  jigsawCameraMinimumZoom,
  0.1,
  0.15,
  0.2,
  0.25,
  0.33,
  0.5,
  0.67,
  0.8,
  1,
  1.25,
  1.5,
  2,
  3,
  jigsawCameraMaximumZoom,
];
const zoomStepEpsilon = 0.001;

export const getJigsawZoomStep = (currentZoom: number, direction: "in" | "out") => {
  if (direction === "in") {
    return jigsawZoomStops.find((stop) => stop > currentZoom + zoomStepEpsilon) ?? jigsawCameraMaximumZoom;
  }

  return [...jigsawZoomStops]
    .reverse()
    .find((stop) => stop < currentZoom - zoomStepEpsilon) ?? jigsawCameraMinimumZoom;
};

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

const isPersistedPlacement = (value: unknown, layout: JigsawWorldLayout): value is JigsawPlacement => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Partial<JigsawPlacement>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.worldX === "number" && Number.isFinite(candidate.worldX) &&
    candidate.worldX >= 0 && candidate.worldX <= layout.worldWidth &&
    typeof candidate.worldY === "number" && Number.isFinite(candidate.worldY) &&
    candidate.worldY >= 0 && candidate.worldY <= layout.worldHeight &&
    typeof candidate.snapped === "boolean"
  );
};

const loadPersistedPlacements = (puzzle: JigsawGeneratedPuzzle, layout: JigsawWorldLayout) => {
  if (typeof window === "undefined") return null;
  const rawEnvelope = window.localStorage.getItem(getPlacementStorageKey(puzzle));
  if (!rawEnvelope) return null;

  try {
    const envelope: unknown = JSON.parse(rawEnvelope);
    if (typeof envelope !== "object" || envelope === null || Array.isArray(envelope)) return null;
    const candidate = envelope as Partial<PersistedJigsawPlacementEnvelope>;
    const expectedIds = new Set(puzzle.tiles.map((tile) => tile.id));
    const placements = Array.isArray(candidate.placements) && candidate.placements.every((placement) => isPersistedPlacement(placement, layout))
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
      !placements ||
      placements.length !== puzzle.tiles.length ||
      placements.some((placement) => !expectedIds.has(placement.id)) ||
      new Set(placements.map((placement) => placement.id)).size !== expectedIds.size
    ) {
      return null;
    }

    return placements;
  } catch {
    return null;
  }
};

const savePersistedPlacements = (
  puzzle: JigsawGeneratedPuzzle,
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

const getEdgePanDelta = (position: number, extent: number) => {
  if (position < edgePanZone) {
    return -edgePanSpeed * (1 - Math.max(0, position) / edgePanZone);
  }
  if (position > extent - edgePanZone) {
    return edgePanSpeed * (1 - Math.max(0, extent - position) / edgePanZone);
  }
  return 0;
};

export const TilePuzzlePreview = ({ puzzle, resetVersion = 0 }: TilePuzzlePreviewProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const panRef = useRef<ActivePan | null>(null);
  const lastResetVersion = useRef(resetVersion);
  const [viewport, setViewport] = useState<JigsawViewport>({ width: 0, height: 0 });
  const [placementState, setPlacementState] = useState<PlacementState | null>(null);
  const [cameraState, setCameraState] = useState<CameraState | null>(null);
  const [activeTileId, setActiveTileId] = useState<string | null>(null);
  const [raisedTileId, setRaisedTileId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEdgeSeams, setShowEdgeSeams] = useState(false);

  const layout = useMemo(() => createJigsawWorldLayout({
    imageWidth: puzzle.asset.intrinsicWidth,
    imageHeight: puzzle.asset.intrinsicHeight,
    puzzleWidth: puzzle.width,
    puzzleHeight: puzzle.height,
  }), [puzzle.asset.intrinsicHeight, puzzle.asset.intrinsicWidth, puzzle.height, puzzle.width]);

  const renderViewport = viewport.width > 0 && viewport.height > 0 ? viewport : fallbackViewport;
  const activeCamera = cameraState?.puzzleId === puzzle.id
    ? cameraState.camera
    : createJigsawFitCamera(layout, renderViewport, "workspace");
  const wheelStateRef = useRef({
    puzzleId: puzzle.id,
    camera: activeCamera,
    layout,
    viewport: renderViewport,
  });
  wheelStateRef.current = {
    puzzleId: puzzle.id,
    camera: activeCamera,
    layout,
    viewport: renderViewport,
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => setViewport({
      width: stage.clientWidth,
      height: stage.clientHeight,
    });
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
    panRef.current = null;
    setActiveTileId(null);
    setRaisedTileId(null);
    setIsPanning(false);
  }, [puzzle.id]);

  useEffect(() => {
    setPlacementState((current) => {
      if (current?.puzzleId === puzzle.id) return current;
      const persisted = loadPersistedPlacements(puzzle, layout);
      return {
        puzzleId: puzzle.id,
        placements: persisted ?? createInitialJigsawPlacements(layout, puzzle.tiles),
      };
    });
  }, [layout, puzzle, puzzle.id, puzzle.tiles]);

  useEffect(() => {
    if (viewport.width <= 0 || viewport.height <= 0) return;
    setCameraState((current) => current?.puzzleId === puzzle.id
      ? { puzzleId: puzzle.id, camera: clampJigsawCamera(layout, viewport, current.camera) }
      : { puzzleId: puzzle.id, camera: createJigsawFitCamera(layout, viewport, "workspace") });
  }, [layout, puzzle.id, viewport.height, viewport.width]);

  useEffect(() => {
    if (!placementState || placementState.puzzleId !== puzzle.id) return;
    savePersistedPlacements(puzzle, placementState.placements);
  }, [placementState, puzzle]);

  const setCamera = (camera: JigsawCamera) => {
    setCameraState({ puzzleId: puzzle.id, camera });
  };

  const fitView = (target: "workspace" | "board") => {
    if (viewport.width <= 0 || viewport.height <= 0) return;
    setCamera(createJigsawFitCamera(layout, viewport, target));
  };

  const scatterPieces = () => {
    dragRef.current = null;
    panRef.current = null;
    setActiveTileId(null);
    setRaisedTileId(null);
    setIsPanning(false);
    setPlacementState({
      puzzleId: puzzle.id,
      placements: createInitialJigsawPlacements(layout, puzzle.tiles),
    });
    if (viewport.width > 0 && viewport.height > 0) {
      setCamera(createJigsawFitCamera(layout, viewport, "workspace"));
    }
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

  const getStagePoint = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const stageRect = stage.getBoundingClientRect();
    return {
      x: clientX - stageRect.left,
      y: clientY - stageRect.top,
    };
  };

  const getPointerPlacement = (
    clientX: number,
    clientY: number,
    drag: ActiveDrag,
    camera = activeCamera,
  ) => {
    const stagePoint = getStagePoint(clientX, clientY);
    if (!stagePoint) return null;
    const worldPoint = screenToJigsawWorld(camera, renderViewport, stagePoint.x, stagePoint.y);
    return normalizeJigsawWorldPosition(
      layout,
      worldPoint.x - drag.offsetWorldX,
      worldPoint.y - drag.offsetWorldY,
    );
  };

  const beginDrag = (event: PiecePointerEvent, tile: JigsawPiece, placement: JigsawPlacement) => {
    if (placement.snapped || isSolved) return;
    const stagePoint = getStagePoint(event.clientX, event.clientY);
    if (!stagePoint) return;
    const worldPoint = screenToJigsawWorld(activeCamera, renderViewport, stagePoint.x, stagePoint.y);
    const position = getJigsawPlacementPosition(layout, tile, placement);
    const target = event.currentTarget as HTMLButtonElement;
    dragRef.current = {
      tileId: tile.id,
      pointerId: event.pointerId,
      offsetWorldX: worldPoint.x - position.left,
      offsetWorldY: worldPoint.y - position.top,
    };
    target.focus({ preventScroll: true });
    target.setPointerCapture(event.pointerId);
    setRaisedTileId(tile.id);
    setActiveTileId(tile.id);
    event.stopPropagation();
    event.preventDefault();
  };

  const moveDrag = (event: PiecePointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const stagePoint = getStagePoint(event.clientX, event.clientY);
    if (!stagePoint) return;

    const panX = getEdgePanDelta(stagePoint.x, renderViewport.width);
    const panY = getEdgePanDelta(stagePoint.y, renderViewport.height);
    const nextCamera = panX || panY
      ? panJigsawCamera(layout, renderViewport, activeCamera, panX, panY)
      : activeCamera;
    if (nextCamera !== activeCamera && (nextCamera.centerX !== activeCamera.centerX || nextCamera.centerY !== activeCamera.centerY)) {
      setCamera(nextCamera);
    }

    const nextPosition = getPointerPlacement(event.clientX, event.clientY, drag, nextCamera);
    if (!nextPosition) return;
    setPlacementState((current) => current?.puzzleId === puzzle.id ? {
      ...current,
      placements: updatePlacement(current.placements, drag.tileId, (placement) => ({ ...placement, ...nextPosition, snapped: false })),
    } : current);
    event.stopPropagation();
    event.preventDefault();
  };

  const finishDrag = (event: PiecePointerEvent, tile: JigsawPiece) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || drag.tileId !== tile.id) return;
    const nextPosition = getPointerPlacement(event.clientX, event.clientY, drag);
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
    event.stopPropagation();
    event.preventDefault();
  };

  const cancelDrag = (event: PiecePointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setActiveTileId(null);
    event.stopPropagation();
  };

  const beginPan = (event: StagePointerEvent) => {
    if (dragRef.current) return;
    const target = event.target as Element | null;
    if (target?.closest(".tile-puzzle-piece")) return;
    if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 1) return;

    panRef.current = {
      pointerId: event.pointerId,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
    };
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
    event.preventDefault();
  };

  const movePan = (event: StagePointerEvent) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - pan.lastClientX;
    const deltaY = event.clientY - pan.lastClientY;
    pan.lastClientX = event.clientX;
    pan.lastClientY = event.clientY;
    setCamera(panJigsawCamera(layout, renderViewport, activeCamera, -deltaX, -deltaY));
    event.preventDefault();
  };

  const finishPan = (event: StagePointerEvent) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    panRef.current = null;
    setIsPanning(false);
    event.preventDefault();
  };

  const handleWheel = (event: WheelEvent) => {
    const stagePoint = getStagePoint(event.clientX, event.clientY);
    if (!stagePoint) return;
    const current = wheelStateRef.current;

    const nextCamera = event.ctrlKey || event.metaKey
      ? zoomJigsawCameraAtPoint(
          current.layout,
          current.viewport,
          current.camera,
          current.camera.zoom * Math.exp(-event.deltaY * 0.002),
          stagePoint.x,
          stagePoint.y,
        )
      : panJigsawCamera(
          current.layout,
          current.viewport,
          current.camera,
          event.shiftKey && Math.abs(event.deltaX) < 1 ? event.deltaY : event.deltaX,
          event.shiftKey && Math.abs(event.deltaX) < 1 ? 0 : event.deltaY,
        );

    wheelStateRef.current = { ...current, camera: nextCamera };
    setCameraState({ puzzleId: current.puzzleId, camera: nextCamera });
    event.preventDefault();
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, []);

  const setZoomAtCenter = (zoom: number) => {
    setCamera(zoomJigsawCameraAtPoint(
      layout,
      renderViewport,
      activeCamera,
      zoom,
      renderViewport.width / 2,
      renderViewport.height / 2,
    ));
  };

  const zoomView = (direction: "in" | "out") => {
    setZoomAtCenter(getJigsawZoomStep(activeCamera.zoom, direction));
  };

  const handleStageKeyDown = (event: StageKeyboardEvent) => {
    const target = event.target as Element | null;
    if (target?.closest(".tile-puzzle-piece")) return;

    if (event.key === "Escape" && event.target === event.currentTarget) {
      event.currentTarget.blur();
      event.preventDefault();
      return;
    }

    const direction = event.key;
    if (!["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(direction)) return;
    const step = event.shiftKey ? keyboardPanStep * 2 : keyboardPanStep;
    const deltaX = direction === "ArrowRight" ? step : direction === "ArrowLeft" ? -step : 0;
    const deltaY = direction === "ArrowDown" ? step : direction === "ArrowUp" ? -step : 0;
    setCamera(panJigsawCamera(layout, renderViewport, activeCamera, deltaX, deltaY));
    event.preventDefault();
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
    const nextPosition = normalizeJigsawWorldPosition(layout, nextLeft, nextTop);
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
  const cameraTransform = getJigsawCameraTransform(activeCamera, renderViewport);
  const worldStyle = {
    width: `${layout.worldWidth}px`,
    height: `${layout.worldHeight}px`,
    transform: `translate3d(${cameraTransform.translateX}px, ${cameraTransform.translateY}px, 0) scale(${cameraTransform.scale})`,
  } as JSX.CSSProperties;
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

      <div class="jigsaw-camera-tools" aria-label="Jigsaw view controls">
        <button type="button" onClick={() => zoomView("out")} aria-label="Zoom out">−</button>
        <button
          type="button"
          onClick={() => setZoomAtCenter(1)}
          aria-label={`Reset zoom to 100 percent. Current zoom ${Math.round(activeCamera.zoom * 100)} percent`}
          title="Reset zoom to 100%"
        >
          {Math.round(activeCamera.zoom * 100)}%
        </button>
        <button type="button" onClick={() => zoomView("in")} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => fitView("board")}>Fit board</button>
        <button type="button" onClick={() => fitView("workspace")}>Fit workspace</button>
      </div>

      {showPreview ? (
        <div class="tile-puzzle-art-preview" aria-label={puzzle.asset.alt} style={previewStyle} />
      ) : null}

      <div
        class={`jigsaw-freeform-stage ${isSolved ? "solved" : ""} ${isPanning ? "panning" : ""}`}
        ref={stageRef}
        onPointerDown={beginPan}
        onPointerMove={movePan}
        onPointerUp={finishPan}
        onPointerCancel={finishPan}
        onKeyDown={handleStageKeyDown}
        tabIndex={0}
        aria-label="Jigsaw workspace. Drag the background or use the mouse wheel or trackpad to pan. When focused, use the arrow keys to pan. Pinch or Control plus wheel to zoom."
      >
        <div class="jigsaw-world-layer" style={worldStyle}>
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
      </div>
    </section>
  );
};
