import type { JSX } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { JigsawGeneratedPuzzle, JigsawPiece } from "../catalog/types";
import { advanceJigsawEdgePanCamera } from "../games/jigsaw/autoPan";
import { getJigsawPieceOutlinePath, getJigsawPieceSeamPaths } from "../games/jigsaw/edgePaths";
import {
  applyJigsawHistoryAction,
  cloneJigsawPlacements,
  commitJigsawPlacementAction,
  getJigsawHistoryAvailability,
  makeEmptyJigsawHistoryState,
  resolveJigsawActionBaseline,
  type JigsawHistoryAction,
  type JigsawHistoryState,
} from "../games/jigsaw/history";
import { getJigsawPinchCamera, type JigsawPinchPair, type JigsawPinchPoint } from "../games/jigsaw/pinch";
import {
  createInitialJigsawPlacements,
  createJigsawFitCamera,
  createJigsawOccupiedFitCamera,
  createJigsawWorkingFitCamera,
  createJigsawWorldLayout,
  getJigsawCameraTransform,
  getJigsawPlacementPosition,
  getJigsawSolvedPosition,
  isUsableJigsawViewport,
  normalizeJigsawWorldPosition,
  panJigsawCamera,
  restageLooseJigsawPlacements,
  screenToJigsawWorld,
  stageLooseJigsawPlacements,
  shouldSnapJigsawPlacement,
  zoomJigsawCameraAtPoint,
  jigsawCameraMaximumZoom,
  jigsawCameraMinimumZoom,
  type JigsawCamera,
  type JigsawPlacement,
  type JigsawViewport,
  type JigsawViewportInsets,
  type JigsawWorldLayout,
} from "../games/jigsaw/placement";
import type { CompletionPresentationPhase } from "./usePuzzleCompletionPresentation";
import { usePuzzleWorkspaceDisplayMode } from "./PuzzleWorkspaceLayout";

export type JigsawHistoryAvailability = {
  canUndo: boolean;
  canRedo: boolean;
};

export type JigsawHistoryController = {
  puzzleInstanceId: string;
  can: (action: JigsawHistoryAction) => boolean;
  dispatch: (action: JigsawHistoryAction) => boolean;
};

type TilePuzzlePreviewProps = {
  puzzle: JigsawGeneratedPuzzle;
  resetVersion?: number;
  initialSnappedPieceIds?: string[] | null;
  onSnappedPieceIdsChange?: (pieceIds: string[]) => void;
  onSolvedChange?: (solved: boolean) => void;
  onHistoryAvailabilityChange?: (availability: JigsawHistoryAvailability) => void;
  onHistoryControllerChange?: (controller: JigsawHistoryController | null) => void;
  completionPhase: CompletionPresentationPhase;
  onCausativeInput: () => void;
  onCompletionAnimationEnd: () => void;
  completionDisabled: boolean;
  onResetPuzzle: () => void;
  onNewPuzzle: () => void;
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
type StagePointerEvent = JSX.TargetedPointerEvent<HTMLDivElement>;
type StageKeyboardEvent = JSX.TargetedKeyboardEvent<HTMLDivElement>;

type ActiveDrag = {
  puzzleId: string;
  tileId: string;
  pointerId: number;
  offsetWorldX: number;
  offsetWorldY: number;
  originWorldX: number;
  originWorldY: number;
  startPlacements: JigsawPlacement[];
  clientX: number;
  clientY: number;
  pieceElement: HTMLButtonElement;
};

type ActivePan = {
  pointerId: number;
  lastClientX: number;
  lastClientY: number;
};

type ActivePinch = {
  pointerIds: readonly [number, number];
  startPoints: JigsawPinchPair;
  startCamera: JigsawCamera;
};

const fallbackViewport: JigsawViewport = { width: 760, height: 560 };
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

export const initializeOrPreserveJigsawCamera = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  currentCamera: JigsawCamera | null,
  placements: readonly JigsawPlacement[] | null = null,
) => currentCamera ?? (
  placements
    ? createJigsawWorkingFitCamera(layout, viewport, placements)
    : createJigsawFitCamera(layout, viewport, "workspace")
);

export const resolveJigsawCameraForViewportResize = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  placements: readonly JigsawPlacement[],
  currentCamera: JigsawCamera,
  userAdjusted: boolean,
  insets: Partial<JigsawViewportInsets> = {},
) => userAdjusted
  ? currentCamera
  : createJigsawWorkingFitCamera(layout, viewport, placements, 28, insets);

export const getMeasuredJigsawViewport = (
  stage: Pick<HTMLElement, "clientWidth" | "clientHeight"> | null,
): JigsawViewport | null => {
  if (!stage) return null;
  const viewport = {
    width: stage.clientWidth,
    height: stage.clientHeight,
  };
  return isUsableJigsawViewport(viewport) ? viewport : null;
};

type JigsawOverlayRect = Pick<DOMRect, "left" | "top" | "right" | "bottom" | "width" | "height">;

export const getJigsawFitInsetsForOverlays = (
  stageRect: JigsawOverlayRect,
  overlayRects: readonly JigsawOverlayRect[],
): JigsawViewportInsets => {
  const insets: JigsawViewportInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  const stageWidth = Math.max(1, stageRect.width);
  const stageHeight = Math.max(1, stageRect.height);

  for (const rect of overlayRects) {
    const overlaps = rect.right > stageRect.left && rect.left < stageRect.right &&
      rect.bottom > stageRect.top && rect.top < stageRect.bottom;
    if (!overlaps || rect.width <= 0 || rect.height <= 0) continue;

    const horizontal = rect.width >= rect.height * 1.35;
    if (horizontal) {
      const topDistance = Math.abs(rect.top - stageRect.top);
      const bottomDistance = Math.abs(stageRect.bottom - rect.bottom);
      if (topDistance <= bottomDistance) {
        insets.top = Math.max(insets.top, rect.bottom - stageRect.top + 8);
      } else {
        insets.bottom = Math.max(insets.bottom, stageRect.bottom - rect.top + 8);
      }
    } else {
      const leftDistance = Math.abs(rect.left - stageRect.left);
      const rightDistance = Math.abs(stageRect.right - rect.right);
      if (leftDistance <= rightDistance) {
        insets.left = Math.max(insets.left, rect.right - stageRect.left + 8);
      } else {
        insets.right = Math.max(insets.right, stageRect.right - rect.left + 8);
      }
    }
  }

  return {
    top: Math.min(insets.top, stageHeight * 0.45),
    right: Math.min(insets.right, stageWidth * 0.45),
    bottom: Math.min(insets.bottom, stageHeight * 0.45),
    left: Math.min(insets.left, stageWidth * 0.45),
  };
};

export const resolveInitialJigsawPlacements = (
  snappedPieceIds: readonly string[],
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  stagingViewport: JigsawViewport | null,
) => {
  if (!isUsableJigsawViewport(stagingViewport)) return null;

  const snappedIds = new Set(snappedPieceIds);
  const fixedPlacements = pieces
    .filter((piece) => snappedIds.has(piece.id))
    .map((piece) => {
      const solved = getJigsawSolvedPosition(layout, piece);
      return {
        id: piece.id,
        worldX: solved.left,
        worldY: solved.top,
        snapped: true,
      };
    });

  return stageLooseJigsawPlacements(layout, pieces, fixedPlacements, stagingViewport);
};

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

export const areJigsawPlacementsSolved = (
  placements: readonly Pick<JigsawPlacement, "snapped">[],
  pieceCount: number,
) => placements.length === pieceCount && placements.every((placement) => placement.snapped);

export const shouldRenderJigsawEdgeSeams = (showEdgeSeams: boolean, isSolved: boolean) =>
  showEdgeSeams && !isSolved;

export const shouldRenderJigsawReferencePreview = (showPreview: boolean, isSolved: boolean) =>
  showPreview && !isSolved;

export const shouldShowJigsawCompletionCelebration = (
  isSolved: boolean,
  phase: CompletionPresentationPhase,
) => isSolved && phase === "celebrating";

export const shouldShowJigsawSolvedControls = (
  isSolved: boolean,
  phase: CompletionPresentationPhase,
) => isSolved && phase === "completed";

const updatePlacement = (
  placements: JigsawPlacement[],
  tileId: string,
  updater: (placement: JigsawPlacement) => JigsawPlacement,
) => placements.map((placement) => placement.id === tileId ? updater(placement) : placement);

export const TilePuzzlePreview = ({
  puzzle,
  resetVersion = 0,
  initialSnappedPieceIds = null,
  onSnappedPieceIdsChange,
  onSolvedChange,
  onHistoryAvailabilityChange,
  onHistoryControllerChange,
  completionPhase,
  onCausativeInput,
  onCompletionAnimationEnd,
  completionDisabled,
  onResetPuzzle,
  onNewPuzzle,
}: TilePuzzlePreviewProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const worldLayerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const dragAnimationTimeRef = useRef<number | null>(null);
  const panRef = useRef<ActivePan | null>(null);
  const touchPointsRef = useRef(new Map<number, JigsawPinchPoint>());
  const pinchRef = useRef<ActivePinch | null>(null);
  const lastResetVersion = useRef(resetVersion);

  const stopDragAnimation = () => {
    if (dragAnimationFrameRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(dragAnimationFrameRef.current);
    }
    dragAnimationFrameRef.current = null;
    dragAnimationTimeRef.current = null;
  };
  const [viewport, setViewport] = useState<JigsawViewport>({ width: 0, height: 0 });
  const [placementState, setPlacementState] = useState<PlacementState | null>(null);
  const placementStateRef = useRef<PlacementState | null>(null);
  const historyRef = useRef<JigsawHistoryState>(makeEmptyJigsawHistoryState());
  const [cameraState, setCameraState] = useState<CameraState | null>(null);
  const [activeTileId, setActiveTileId] = useState<string | null>(null);
  const [raisedTileId, setRaisedTileId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEdgeSeams, setShowEdgeSeams] = useState(false);
  const [showCompactTools, setShowCompactTools] = useState(false);
  const [showFitMenu, setShowFitMenu] = useState(false);
  const cameraWasUserAdjustedRef = useRef(false);
  const displayMode = usePuzzleWorkspaceDisplayMode();

  useEffect(() => {
    setShowCompactTools(false);
    setShowFitMenu(false);
  }, [displayMode.isExpanded, puzzle.id]);

  useEffect(() => () => {
    stopDragAnimation();
    dragRef.current = null;
  }, []);

  const layout = useMemo(() => createJigsawWorldLayout({
    imageWidth: puzzle.asset.intrinsicWidth,
    imageHeight: puzzle.asset.intrinsicHeight,
    puzzleWidth: puzzle.width,
    puzzleHeight: puzzle.height,
  }), [puzzle.asset.intrinsicHeight, puzzle.asset.intrinsicWidth, puzzle.height, puzzle.width]);

  const publishHistoryAvailability = useCallback((
    history: JigsawHistoryState,
    blocked = false,
  ) => {
    onHistoryAvailabilityChange?.(getJigsawHistoryAvailability(history, blocked));
  }, [onHistoryAvailabilityChange]);

  const replaceHistory = useCallback((history: JigsawHistoryState) => {
    historyRef.current = history;
    publishHistoryAvailability(history);
  }, [publishHistoryAvailability]);

  const publishSnappedProgress = useCallback((placements: readonly JigsawPlacement[]) => {
    onSnappedPieceIdsChange?.(
      placements.filter((placement) => placement.snapped).map((placement) => placement.id),
    );
  }, [onSnappedPieceIdsChange]);

  const updatePlacementState = useCallback((
    updater: (current: PlacementState | null) => PlacementState | null,
  ) => {
    const current = placementStateRef.current;
    const next = updater(current);
    if (next === current) return current;
    placementStateRef.current = next;
    setPlacementState(next);
    return next;
  }, []);

  const renderViewport = isUsableJigsawViewport(viewport) ? viewport : fallbackViewport;
  const activePlacements = placementState?.puzzleId === puzzle.id ? placementState.placements : null;
  const activeCamera = cameraState?.puzzleId === puzzle.id
    ? cameraState.camera
    : activePlacements
      ? createJigsawWorkingFitCamera(layout, renderViewport, activePlacements)
      : createJigsawFitCamera(layout, renderViewport, "workspace");
  const wheelStateRef = useRef({
    puzzleId: puzzle.id,
    camera: activeCamera,
    layout,
    viewport: renderViewport,
  });
  const preserveImperativeCamera =
    (pinchRef.current !== null || dragRef.current?.puzzleId === puzzle.id) &&
    wheelStateRef.current.puzzleId === puzzle.id;
  const renderCamera = preserveImperativeCamera ? wheelStateRef.current.camera : activeCamera;
  wheelStateRef.current = {
    puzzleId: puzzle.id,
    camera: renderCamera,
    layout,
    viewport: renderViewport,
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const measuredViewport = getMeasuredJigsawViewport(stage);
      if (!measuredViewport) return;
      setViewport((current) =>
        current.width === measuredViewport.width && current.height === measuredViewport.height
          ? current
          : measuredViewport);
    };
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
    stopDragAnimation();
    dragRef.current = null;
    panRef.current = null;
    touchPointsRef.current.clear();
    pinchRef.current = null;
    placementStateRef.current = null;
    replaceHistory(makeEmptyJigsawHistoryState());
    setActiveTileId(null);
    setRaisedTileId(null);
    setIsPanning(false);
    cameraWasUserAdjustedRef.current = false;
  }, [puzzle.id, replaceHistory]);

  useEffect(() => {
    if (initialSnappedPieceIds === null) return;
    updatePlacementState((current) => {
      if (current?.puzzleId === puzzle.id) return current;
      const placements = resolveInitialJigsawPlacements(
        initialSnappedPieceIds,
        layout,
        puzzle.tiles,
        getMeasuredJigsawViewport(stageRef.current),
      );
      return placements ? { puzzleId: puzzle.id, placements } : current;
    });
  }, [initialSnappedPieceIds, layout, puzzle.id, puzzle.tiles, updatePlacementState, viewport.height, viewport.width]);

  useEffect(() => {
    if (!isUsableJigsawViewport(viewport) || !activePlacements) return;
    setCameraState((current) => {
      if (current?.puzzleId === puzzle.id) return current;
      return {
        puzzleId: puzzle.id,
        camera: initializeOrPreserveJigsawCamera(layout, viewport, null, activePlacements),
      };
    });
  }, [activePlacements, layout, puzzle.id, viewport.height, viewport.width]);

  const setCamera = (camera: JigsawCamera) => {
    wheelStateRef.current = { ...wheelStateRef.current, puzzleId: puzzle.id, camera };
    setCameraState({ puzzleId: puzzle.id, camera });
  };

  const getCurrentFitInsets = (): JigsawViewportInsets => {
    const stage = stageRef.current;
    const workspace = stage?.closest<HTMLElement>(".jigsaw-workspace.is-immersive");
    if (!stage || !workspace) return { top: 0, right: 0, bottom: 0, left: 0 };

    const overlayElements = Array.from(workspace.querySelectorAll<HTMLElement>(
      ".jigsaw-tools-toggle, .tile-puzzle-tools, .jigsaw-camera-tools, .puzzle-workspace-display-tools",
    ));
    const view = stage.ownerDocument.defaultView;
    const isVisible = (element: HTMLElement) => {
      const style = view?.getComputedStyle(element);
      return style
        ? style.display !== "none" && style.visibility !== "hidden"
        : element.getClientRects().length > 0;
    };
    const toolsToggle = workspace.querySelector<HTMLElement>(".jigsaw-tools-toggle");
    const usesToolsDisclosure = Boolean(toolsToggle && isVisible(toolsToggle));
    const overlayRects = overlayElements
      .filter((element) =>
        isVisible(element) &&
        !(usesToolsDisclosure && element.classList.contains("tile-puzzle-tools")))
      .map((element) => element.getBoundingClientRect());
    return getJigsawFitInsetsForOverlays(stage.getBoundingClientRect(), overlayRects);
  };

  useEffect(() => {
    if (!isUsableJigsawViewport(viewport)) return;
    const currentPlacementState = placementStateRef.current;
    const currentCameraState = cameraState?.puzzleId === puzzle.id ? cameraState.camera : null;
    if (!currentPlacementState || currentPlacementState.puzzleId !== puzzle.id || !currentCameraState) return;

    const nextCamera = resolveJigsawCameraForViewportResize(
      layout,
      viewport,
      currentPlacementState.placements,
      currentCameraState,
      cameraWasUserAdjustedRef.current,
      getCurrentFitInsets(),
    );
    if (nextCamera === currentCameraState) return;
    setCamera(nextCamera);
  }, [layout, puzzle.id, viewport.height, viewport.width]);

  const fitView = (target: "all" | "board") => {
    cameraWasUserAdjustedRef.current = true;
    if (!isUsableJigsawViewport(viewport)) return;
    const insets = getCurrentFitInsets();
    if (target === "board") {
      setCamera(createJigsawFitCamera(layout, viewport, "board", 32, insets));
      return;
    }

    const current = placementStateRef.current;
    if (!current || current.puzzleId !== puzzle.id) return;
    setCamera(createJigsawOccupiedFitCamera(layout, viewport, current.placements, 28, insets));
  };

  const getStagingActionBaseline = () => {
    const current = placementStateRef.current;
    if (!current || current.puzzleId !== puzzle.id) return null;
    const activeDrag = dragRef.current?.puzzleId === puzzle.id ? dragRef.current : null;
    return resolveJigsawActionBaseline(current.placements, activeDrag?.startPlacements ?? null);
  };

  const applyStagedPlacements = (
    nextPlacements: JigsawPlacement[],
    baseline: JigsawPlacement[] | null,
    stagingViewport: JigsawViewport,
  ) => {
    stopDragAnimation();
    updatePlacementState(() => ({
      puzzleId: puzzle.id,
      placements: nextPlacements,
    }));
    dragRef.current = null;
    panRef.current = null;
    touchPointsRef.current.clear();
    pinchRef.current = null;
    setActiveTileId(null);
    setRaisedTileId(null);
    setIsPanning(false);
    publishSnappedProgress(nextPlacements);
    if (baseline) {
      replaceHistory(commitJigsawPlacementAction(
        historyRef.current,
        baseline,
        nextPlacements,
      ));
    }
    cameraWasUserAdjustedRef.current = false;
    setCamera(createJigsawWorkingFitCamera(
      layout,
      stagingViewport,
      nextPlacements,
      28,
      getCurrentFitInsets(),
    ));
    return true;
  };

  const resetPieces = () => {
    const stagingViewport = getMeasuredJigsawViewport(stageRef.current);
    if (!stagingViewport) return false;

    return applyStagedPlacements(
      createInitialJigsawPlacements(layout, puzzle.tiles, stagingViewport),
      getStagingActionBaseline(),
      stagingViewport,
    );
  };

  const restageLoosePieces = () => {
    const stagingViewport = getMeasuredJigsawViewport(stageRef.current);
    const baseline = getStagingActionBaseline();
    if (!stagingViewport || !baseline) return false;

    return applyStagedPlacements(
      restageLooseJigsawPlacements(layout, puzzle.tiles, baseline, stagingViewport),
      baseline,
      stagingViewport,
    );
  };

  useEffect(() => {
    if (lastResetVersion.current === resetVersion) return;
    if (!resetPieces()) return;
    lastResetVersion.current = resetVersion;
  }, [layout, puzzle.id, puzzle.tiles, resetVersion, viewport.height, viewport.width]);

  const placements = activePlacements ?? [];
  const placementById = new Map(placements.map((placement) => [placement.id, placement] as const));
  const solvedCount = placements.filter((placement) => placement.snapped).length;
  const isSolved = areJigsawPlacementsSolved(placements, puzzle.tiles.length);

  useEffect(() => {
    if (!isSolved) return;
    setShowCompactTools(false);
    setShowFitMenu(false);
  }, [isSolved, puzzle.id]);

  useEffect(() => {
    onSolvedChange?.(isSolved);
  }, [isSolved, onSolvedChange, puzzle.id]);

  const canHistoryAction = useCallback((action: JigsawHistoryAction) => {
    if (dragRef.current || pinchRef.current) return false;
    const history = historyRef.current;
    return action === "undo" ? history.undoStack.length > 0 : history.redoStack.length > 0;
  }, []);

  const dispatchHistoryAction = useCallback((action: JigsawHistoryAction) => {
    if (!canHistoryAction(action)) return false;
    const current = placementStateRef.current;
    if (!current || current.puzzleId !== puzzle.id) return false;

    const transition = applyJigsawHistoryAction(historyRef.current, current.placements, action);
    if (!transition) return false;

    updatePlacementState(() => ({
      puzzleId: puzzle.id,
      placements: transition.placements,
    }));
    publishSnappedProgress(transition.placements);
    replaceHistory(transition.history);
    setActiveTileId(null);
    setRaisedTileId(null);
    return true;
  }, [canHistoryAction, publishSnappedProgress, puzzle.id, replaceHistory, updatePlacementState]);

  useEffect(() => {
    if (!onHistoryControllerChange) return;
    const controller: JigsawHistoryController = {
      puzzleInstanceId: puzzle.id,
      can: canHistoryAction,
      dispatch: dispatchHistoryAction,
    };
    onHistoryControllerChange(controller);
    return () => onHistoryControllerChange(null);
  }, [canHistoryAction, dispatchHistoryAction, onHistoryControllerChange, puzzle.id]);

  const getStagePoint = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const stageRect = stage.getBoundingClientRect();
    return {
      x: clientX - stageRect.left,
      y: clientY - stageRect.top,
    };
  };

  const getPinchPair = (pointerIds: ActivePinch["pointerIds"]): JigsawPinchPair | null => {
    const first = touchPointsRef.current.get(pointerIds[0]);
    const second = touchPointsRef.current.get(pointerIds[1]);
    return first && second ? [first, second] : null;
  };

  const renderCameraImmediately = (state = wheelStateRef.current) => {
    const worldLayer = worldLayerRef.current;
    if (!worldLayer) return;
    const transform = getJigsawCameraTransform(state.camera, state.viewport);
    worldLayer.style.transform = `translate3d(${transform.translateX}px, ${transform.translateY}px, 0) scale(${transform.scale})`;
  };

  const beginTouchPinch = (event: StagePointerEvent) => {
    if (event.pointerType !== "touch") return;
    const target = event.target as Element | null;
    if (target?.closest(".jigsaw-solved-card")) return;
    const point = getStagePoint(event.clientX, event.clientY);
    if (!point) return;
    touchPointsRef.current.set(event.pointerId, point);

    if (!pinchRef.current && touchPointsRef.current.size >= 2) {
      const pointerIds = Array.from(touchPointsRef.current.keys()).slice(0, 2) as [number, number];
      const startPoints = getPinchPair(pointerIds);
      if (startPoints) {
        cameraWasUserAdjustedRef.current = true;
        pinchRef.current = {
          pointerIds,
          startPoints,
          startCamera: wheelStateRef.current.camera,
        };
        publishHistoryAvailability(historyRef.current, true);
        const interruptedDrag = dragRef.current?.puzzleId === puzzle.id ? dragRef.current : null;
        if (interruptedDrag) {
          updatePlacementState((current) => current?.puzzleId === puzzle.id ? {
            ...current,
            placements: cloneJigsawPlacements(interruptedDrag.startPlacements),
          } : current);
        }
        stopDragAnimation();
        dragRef.current = null;
        panRef.current = null;
        setActiveTileId(null);
        setIsPanning(false);
      }
    }

    if (pinchRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const moveTouchPinch = (event: StagePointerEvent) => {
    if (event.pointerType !== "touch" || !touchPointsRef.current.has(event.pointerId)) return;
    const point = getStagePoint(event.clientX, event.clientY);
    if (!point) return;
    touchPointsRef.current.set(event.pointerId, point);

    const pinch = pinchRef.current;
    if (!pinch) return;
    const currentPoints = getPinchPair(pinch.pointerIds);
    if (currentPoints) {
      const nextCamera = getJigsawPinchCamera(
        layout,
        renderViewport,
        pinch.startCamera,
        pinch.startPoints,
        currentPoints,
      );
      wheelStateRef.current = { ...wheelStateRef.current, camera: nextCamera };
      renderCameraImmediately();
    }

    event.preventDefault();
    event.stopPropagation();
  };

  const endTouchPinch = (event: StagePointerEvent) => {
    if (event.pointerType !== "touch") return;
    const pinch = pinchRef.current;
    const wasPinching = Boolean(pinch);
    touchPointsRef.current.delete(event.pointerId);

    if (pinch?.pointerIds.includes(event.pointerId)) {
      pinchRef.current = null;
      setCamera(wheelStateRef.current.camera);
      publishHistoryAvailability(historyRef.current);
    }

    if (wasPinching) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const getPointerPlacement = (
    clientX: number,
    clientY: number,
    drag: ActiveDrag,
    state = wheelStateRef.current,
  ) => {
    const stagePoint = getStagePoint(clientX, clientY);
    if (!stagePoint) return null;
    const worldPoint = screenToJigsawWorld(state.camera, state.viewport, stagePoint.x, stagePoint.y);
    return normalizeJigsawWorldPosition(
      state.layout,
      worldPoint.x - drag.offsetWorldX,
      worldPoint.y - drag.offsetWorldY,
    );
  };

  const renderDraggedPieceImmediately = (drag: ActiveDrag, state = wheelStateRef.current) => {
    const nextPosition = getPointerPlacement(drag.clientX, drag.clientY, drag, state);
    if (!nextPosition) return null;
    drag.pieceElement.style.setProperty(
      "--jigsaw-drag-x",
      `${nextPosition.worldX - drag.originWorldX}px`,
    );
    drag.pieceElement.style.setProperty(
      "--jigsaw-drag-y",
      `${nextPosition.worldY - drag.originWorldY}px`,
    );
    return nextPosition;
  };

  const runDragAnimationFrame = (time: number) => {
    const drag = dragRef.current;
    if (!drag) {
      stopDragAnimation();
      return;
    }

    const previousTime = dragAnimationTimeRef.current;
    dragAnimationTimeRef.current = time;
    const current = wheelStateRef.current;
    if (drag.puzzleId !== current.puzzleId) {
      stopDragAnimation();
      return;
    }
    const stagePoint = getStagePoint(drag.clientX, drag.clientY);
    if (stagePoint && previousTime !== null) {
      const nextCamera = advanceJigsawEdgePanCamera(
        current.layout,
        current.viewport,
        current.camera,
        stagePoint,
        time - previousTime,
      );
      if (
        nextCamera.centerX !== current.camera.centerX ||
        nextCamera.centerY !== current.camera.centerY ||
        nextCamera.zoom !== current.camera.zoom
      ) {
        cameraWasUserAdjustedRef.current = true;
        wheelStateRef.current = { ...current, camera: nextCamera };
        renderCameraImmediately(wheelStateRef.current);
      }
    }

    renderDraggedPieceImmediately(drag, wheelStateRef.current);
    dragAnimationFrameRef.current = window.requestAnimationFrame(runDragAnimationFrame);
  };

  const startDragAnimation = () => {
    stopDragAnimation();
    if (typeof window === "undefined") return;
    dragAnimationFrameRef.current = window.requestAnimationFrame(runDragAnimationFrame);
  };

  const beginDrag = (event: PiecePointerEvent, tile: JigsawPiece, placement: JigsawPlacement) => {
    if (placement.snapped || isSolved || pinchRef.current) return;
    const stagePoint = getStagePoint(event.clientX, event.clientY);
    if (!stagePoint) return;
    const current = wheelStateRef.current;
    const worldPoint = screenToJigsawWorld(
      current.camera,
      current.viewport,
      stagePoint.x,
      stagePoint.y,
    );
    const position = getJigsawPlacementPosition(current.layout, tile, placement);
    const currentPlacementState = placementStateRef.current;
    if (!currentPlacementState || currentPlacementState.puzzleId !== puzzle.id) return;
    const target = event.currentTarget as HTMLButtonElement;
    target.style.setProperty("--jigsaw-drag-x", "0px");
    target.style.setProperty("--jigsaw-drag-y", "0px");
    dragRef.current = {
      puzzleId: puzzle.id,
      tileId: tile.id,
      pointerId: event.pointerId,
      offsetWorldX: worldPoint.x - position.left,
      offsetWorldY: worldPoint.y - position.top,
      originWorldX: position.left,
      originWorldY: position.top,
      startPlacements: cloneJigsawPlacements(currentPlacementState.placements),
      clientX: event.clientX,
      clientY: event.clientY,
      pieceElement: target,
    };
    publishHistoryAvailability(historyRef.current, true);
    stageRef.current?.focus({ preventScroll: true });
    target.setPointerCapture(event.pointerId);
    setRaisedTileId(tile.id);
    setActiveTileId(tile.id);
    startDragAnimation();
    event.stopPropagation();
    event.preventDefault();
  };

  const moveDrag = (event: PiecePointerEvent) => {
    if (pinchRef.current) return;
    const drag = dragRef.current;
    if (!drag || drag.puzzleId !== puzzle.id || drag.pointerId !== event.pointerId) return;
    drag.clientX = event.clientX;
    drag.clientY = event.clientY;
    renderDraggedPieceImmediately(drag);
    event.stopPropagation();
    event.preventDefault();
  };

  const finishDrag = (event: PiecePointerEvent, tile: JigsawPiece) => {
    const drag = dragRef.current;
    if (
      !drag ||
      drag.puzzleId !== puzzle.id ||
      drag.pointerId !== event.pointerId ||
      drag.tileId !== tile.id
    ) return;
    drag.clientX = event.clientX;
    drag.clientY = event.clientY;
    stopDragAnimation();
    const nextPosition = getPointerPlacement(event.clientX, event.clientY, drag);
    setCamera(wheelStateRef.current.camera);
    const target = event.currentTarget as HTMLButtonElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);

    if (!nextPosition) {
      updatePlacementState((current) => current?.puzzleId === puzzle.id ? {
        ...current,
        placements: cloneJigsawPlacements(drag.startPlacements),
      } : current);
      dragRef.current = null;
      setActiveTileId(null);
      publishHistoryAvailability(historyRef.current);
      return;
    }
    const snaps = shouldSnapJigsawPlacement(layout, tile, nextPosition);
    const nextState = updatePlacementState((current) => current?.puzzleId === puzzle.id ? {
      ...current,
      placements: updatePlacement(current.placements, tile.id, (placement) => ({
        ...placement,
        ...nextPosition,
        snapped: snaps,
      })),
    } : current);
    dragRef.current = null;
    setActiveTileId(null);
    if (nextState?.puzzleId === puzzle.id) {
      if (areJigsawPlacementsSolved(nextState.placements, puzzle.tiles.length)) {
        onCausativeInput();
      }
      publishSnappedProgress(nextState.placements);
      replaceHistory(commitJigsawPlacementAction(
        historyRef.current,
        drag.startPlacements,
        nextState.placements,
      ));
    } else {
      publishHistoryAvailability(historyRef.current);
    }
    event.stopPropagation();
    event.preventDefault();
  };

  const cancelDrag = (event: PiecePointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.puzzleId !== puzzle.id || drag.pointerId !== event.pointerId) return;
    stopDragAnimation();
    setCamera(wheelStateRef.current.camera);
    updatePlacementState((current) => current?.puzzleId === puzzle.id ? {
      ...current,
      placements: cloneJigsawPlacements(drag.startPlacements),
    } : current);
    dragRef.current = null;
    setActiveTileId(null);
    publishHistoryAvailability(historyRef.current);
    event.stopPropagation();
  };

  const beginPan = (event: StagePointerEvent) => {
    if (dragRef.current || pinchRef.current) return;
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
    if (pinchRef.current) return;
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - pan.lastClientX;
    const deltaY = event.clientY - pan.lastClientY;
    pan.lastClientX = event.clientX;
    pan.lastClientY = event.clientY;
    if (deltaX !== 0 || deltaY !== 0) cameraWasUserAdjustedRef.current = true;
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
    const target = event.target as Element | null;
    if (target?.closest(".jigsaw-solved-card")) return;
    const stagePoint = getStagePoint(event.clientX, event.clientY);
    if (!stagePoint) return;
    const current = wheelStateRef.current;
    cameraWasUserAdjustedRef.current = true;

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
    const current = wheelStateRef.current;
    cameraWasUserAdjustedRef.current = true;
    setCamera(zoomJigsawCameraAtPoint(
      current.layout,
      current.viewport,
      current.camera,
      zoom,
      current.viewport.width / 2,
      current.viewport.height / 2,
    ));
  };

  const zoomView = (direction: "in" | "out") => {
    setZoomAtCenter(getJigsawZoomStep(wheelStateRef.current.camera.zoom, direction));
  };

  const handleStageKeyDown = (event: StageKeyboardEvent) => {
    if (event.key === "Escape" && event.target === event.currentTarget) {
      event.currentTarget.blur();
      event.preventDefault();
      return;
    }
    if (event.target !== event.currentTarget) return;

    const direction = event.key;
    if (!["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(direction)) return;
    const step = event.shiftKey ? keyboardPanStep * 2 : keyboardPanStep;
    const deltaX = direction === "ArrowRight" ? step : direction === "ArrowLeft" ? -step : 0;
    const deltaY = direction === "ArrowDown" ? step : direction === "ArrowUp" ? -step : 0;
    const current = wheelStateRef.current;
    cameraWasUserAdjustedRef.current = true;
    setCamera(panJigsawCamera(current.layout, current.viewport, current.camera, deltaX, deltaY));
    event.preventDefault();
  };

  const toolsId = `jigsaw-tools-${puzzle.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const fitMenuId = `jigsaw-fit-${puzzle.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const previewStyle = {
    backgroundImage: `url(${puzzle.asset.files.preview})`,
    aspectRatio: `${puzzle.asset.intrinsicWidth} / ${puzzle.asset.intrinsicHeight}`,
  };
  const cameraTransform = getJigsawCameraTransform(renderCamera, renderViewport);
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
      </div>

      {!isSolved ? (
        <button
          class="jigsaw-tools-toggle"
          type="button"
          aria-expanded={showCompactTools}
          aria-controls={toolsId}
          onClick={() => setShowCompactTools((current) => !current)}
        >
          Tools
        </button>
      ) : null}

      <div
        id={toolsId}
        class={`tile-puzzle-tools ${isSolved ? "is-solved" : ""} ${showCompactTools ? "is-open" : ""}`}
      >
        <button
          type="button"
          onClick={() => {
            setShowPreview((current) => !current);
            setShowCompactTools(false);
          }}
        >
          {showPreview ? "Hide preview" : "Preview image"}
        </button>
        <button
          type="button"
          onClick={() => {
            restageLoosePieces();
            setShowCompactTools(false);
          }}
          disabled={isSolved}
        >
          Restage pieces
        </button>
        <button
          type="button"
          aria-pressed={showEdgeSeams}
          onClick={() => {
            setShowEdgeSeams((current) => !current);
            setShowCompactTools(false);
          }}
          disabled={isSolved}
        >
          {isSolved
            ? (showEdgeSeams ? "Edge guides hidden" : "Edge guides off")
            : (showEdgeSeams ? "Hide edge guides" : "Show edge guides")}
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
        <div class="jigsaw-fit-control">
          <button
            class="jigsaw-fit-toggle"
            type="button"
            aria-expanded={showFitMenu}
            aria-controls={fitMenuId}
            onClick={() => setShowFitMenu((current) => !current)}
          >
            Fit
          </button>
          <div id={fitMenuId} class={`jigsaw-fit-menu ${showFitMenu ? "is-open" : ""}`}>
            <button
              type="button"
              onClick={() => {
                fitView("board");
                setShowFitMenu(false);
              }}
            >
              Fit board
            </button>
            <button
              type="button"
              onClick={() => {
                fitView("all");
                setShowFitMenu(false);
              }}
            >
              Show all
            </button>
          </div>
        </div>
        {!displayMode.isExpanded ? (
          <button
            class="jigsaw-expand-workspace"
            type="button"
            onClick={displayMode.enterExpanded}
          >
            Expand workspace
          </button>
        ) : null}
      </div>

      {shouldRenderJigsawReferencePreview(showPreview, isSolved) ? (
        <div class="tile-puzzle-art-preview" aria-label={puzzle.asset.alt} style={previewStyle} />
      ) : null}

      <div
        class={`jigsaw-freeform-stage ${isSolved ? "solved" : ""} completion-${completionPhase} ${isPanning ? "panning" : ""}`}
        ref={stageRef}
        onPointerDownCapture={beginTouchPinch}
        onPointerMoveCapture={moveTouchPinch}
        onPointerUpCapture={endTouchPinch}
        onPointerCancelCapture={endTouchPinch}
        onPointerDown={beginPan}
        onPointerMove={movePan}
        onPointerUp={finishPan}
        onPointerCancel={finishPan}
        onKeyDown={handleStageKeyDown}
        tabIndex={0}
        aria-label="Jigsaw workspace. Drag the background or use the mouse wheel or trackpad to pan. When focused, use the arrow keys to pan. Pinch or Control plus wheel to zoom."
      >
        <div class="jigsaw-world-layer" ref={worldLayerRef} style={worldStyle}>
          <div class="jigsaw-assembly-board" style={boardStyle} aria-hidden="true">
            <span>Assembly board</span>
          </div>

          {puzzle.tiles.map((tile) => {
            const placement = placementById.get(tile.id);
            if (!placement) return null;
            const position = getJigsawPlacementPosition(layout, tile, placement);
            const activeDrag = dragRef.current;
            const active =
              tile.id === activeTileId &&
              activeDrag?.puzzleId === puzzle.id &&
              activeDrag.tileId === tile.id;
            const raised = tile.id === raisedTileId;
            const outlinePath = getJigsawPieceOutlinePath(tile);
            const clipPathId = getPieceClipPathId(puzzle, tile);
            const pieceStyle = {
              width: `${layout.pieceWidth}px`,
              height: `${layout.pieceHeight}px`,
              "--jigsaw-piece-x": `${position.left}px`,
              "--jigsaw-piece-y": `${position.top}px`,
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
                type="button"
                tabIndex={-1}
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
                  {shouldRenderJigsawEdgeSeams(showEdgeSeams, isSolved) ? getJigsawPieceSeamPaths(tile).map((seam) => (
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
        {shouldShowJigsawCompletionCelebration(isSolved, completionPhase) ? (
          <div class="jigsaw-solved-presentation is-celebrating" aria-hidden="true">
            <div
              class="jigsaw-solved-card is-celebrating"
              onAnimationEnd={onCompletionAnimationEnd}
            >
              <div class="jigsaw-solved-copy">
                <span class="jigsaw-solved-mark" aria-hidden="true">✓</span>
                <strong>Puzzle solved</strong>
              </div>
            </div>
          </div>
        ) : null}
        {shouldShowJigsawSolvedControls(isSolved, completionPhase) ? (
          <div class="jigsaw-solved-presentation is-completed">
            <div
              class="jigsaw-solved-card is-completed"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div class="jigsaw-solved-copy" role="status" aria-live="polite" aria-atomic="true">
                <span class="jigsaw-solved-mark" aria-hidden="true">✓</span>
                <strong>Solved</strong>
              </div>
              <div class="jigsaw-solved-actions" aria-label="Solved Jigsaw actions">
                <button type="button" onClick={onResetPuzzle} disabled={completionDisabled}>Reset</button>
                <button
                  class="new-puzzle-primary"
                  type="button"
                  onClick={onNewPuzzle}
                  disabled={completionDisabled}
                >
                  New puzzle
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};
