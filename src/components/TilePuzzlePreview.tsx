import type { JSX } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { JigsawGeneratedPuzzle, JigsawPiece } from "../catalog/types";
import { advanceJigsawEdgePanCamera } from "../games/jigsaw/autoPan";
import {
  cloneJigsawAssemblyProgress,
  getJigsawComponentPieceIds,
  getJigsawConnectedPieceCount,
  isJigsawAssemblySolved,
  makeEmptyJigsawAssemblyProgress,
  type JigsawAssemblyProgress,
} from "../games/jigsaw/assembly";
import {
  createJigsawCoarseSections,
  getJigsawCoarseSectionFocusPieceIds,
  isJigsawCoarseSectionComplete,
  shouldOfferJigsawCoarseSections,
  type JigsawCoarseSectionId,
} from "../games/jigsaw/coarseSections";
import {
  beginJigsawDragAction,
  cancelJigsawDragAction,
  completeJigsawDragAction,
  projectJigsawDragAction,
  type JigsawDragAction,
} from "../games/jigsaw/dragAction";
import { getJigsawPieceOutlinePath, getJigsawPieceSeamPaths } from "../games/jigsaw/edgePaths";
import {
  applyJigsawHistoryAction,
  commitJigsawPlacementAction,
  getJigsawHistoryAvailability,
  makeEmptyJigsawHistoryState,
  resolveJigsawActionBaseline,
  type JigsawHistoryAction,
  type JigsawHistoryState,
  type JigsawWorkspaceSnapshot,
} from "../games/jigsaw/history";
import { getJigsawPinchCamera, type JigsawPinchPair, type JigsawPinchPoint } from "../games/jigsaw/pinch";
import {
  createJigsawFitCamera,
  createJigsawOccupiedFitCamera,
  createJigsawWorkingFitCamera,
  createJigsawWorldLayout,
  getJigsawCameraTransform,
  getJigsawPieceCellSpan,
  getJigsawPlacementPosition,
  isUsableJigsawViewport,
  panJigsawCamera,
  zoomJigsawCameraAtPoint,
  type JigsawCamera,
  type JigsawPlacement,
  type JigsawViewport,
  type JigsawViewportInsets,
  type JigsawWorldLayout,
} from "../games/jigsaw/placement";
import {
  hasMeaningfulJigsawWorkspaceProgress,
  resetJigsawWorkspaceState,
  resolveInitialJigsawWorkspaceState,
  restageJigsawWorkspaceState,
  restageJigsawWorkspaceSubset,
  type JigsawWorkspaceState,
} from "../games/jigsaw/workspaceState";
import {
  applyJigsawCameraTransform,
  applyJigsawDragOffset,
  resetJigsawDragOffset,
} from "./JigsawImperativeRenderer";
import {
  getJigsawFitInsetsForOverlays,
  getJigsawPieceClipPathId,
  getJigsawZoomStep,
  getMeasuredJigsawViewport,
  getPieceHitTargetProps,
  getPieceImageClipPathProps,
  getPieceZIndex,
  initializeOrPreserveJigsawCamera,
  resolveJigsawCameraForViewportResize,
  shouldRenderJigsawEdgeSeams,
  shouldRenderJigsawReferencePreview,
  shouldShowJigsawCompletionCelebration,
  shouldShowJigsawSolvedControls,
} from "./JigsawPreviewModel";
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
  initialAssembly?: JigsawAssemblyProgress | null;
  onAssemblyChange?: (assembly: JigsawAssemblyProgress) => void;
  onSolvedChange?: (solved: boolean) => void;
  onHistoryAvailabilityChange?: (availability: JigsawHistoryAvailability) => void;
  onProgressChange?: (report: { hasProgress: boolean; terminal: boolean }) => void;
  onHistoryControllerChange?: (controller: JigsawHistoryController | null) => void;
  completionPhase: CompletionPresentationPhase;
  onCausativeInput: () => void;
  onCompletionAnimationEnd: () => void;
  completionDisabled: boolean;
  onResetPuzzle: () => void;
  onNewPuzzle: () => void;
};

type PlacementState = JigsawWorkspaceState & {
  puzzleId: string;
};

type CameraState = {
  puzzleId: string;
  camera: JigsawCamera;
};

type PiecePointerEvent = JSX.TargetedPointerEvent<HTMLButtonElement>;
type StagePointerEvent = JSX.TargetedPointerEvent<HTMLDivElement>;
type StageKeyboardEvent = JSX.TargetedKeyboardEvent<HTMLDivElement>;

type ActiveDrag = JigsawDragAction & {
  pieceElements: HTMLButtonElement[];
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
const jigsawSectionLabels: Record<JigsawCoarseSectionId, string> = {
  "top-left": "Top left",
  "top-right": "Top right",
  "bottom-left": "Bottom left",
  "bottom-right": "Bottom right",
};
const jigsawSectionGlyphs: Record<JigsawCoarseSectionId, string> = {
  "top-left": "↖",
  "top-right": "↗",
  "bottom-left": "↙",
  "bottom-right": "↘",
};
const JigsawToolsIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h10" />
    <path d="M18 7h2" />
    <path d="M4 17h2" />
    <path d="M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </svg>
);

const JigsawFitIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 4H4v4" />
    <path d="M16 4h4v4" />
    <path d="M20 16v4h-4" />
    <path d="M4 16v4h4" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

const JigsawExpandIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 4H4v5" />
    <path d="m4 4 6 6" />
    <path d="M15 20h5v-5" />
    <path d="m20 20-6-6" />
  </svg>
);

export const TilePuzzlePreview = ({
  puzzle,
  resetVersion = 0,
  initialAssembly = null,
  onAssemblyChange,
  onSolvedChange,
  onHistoryAvailabilityChange,
  onProgressChange,
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
  const pieceElementsRef = useRef(new Map<string, HTMLButtonElement>());
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
  const baselinePlacementsRef = useRef<{ puzzleId: string; placements: JigsawPlacement[] } | null>(null);
  const progressChangeRef = useRef(onProgressChange);
  progressChangeRef.current = onProgressChange;
  const [cameraState, setCameraState] = useState<CameraState | null>(null);
  const [activeTileId, setActiveTileId] = useState<string | null>(null);
  const [raisedTileId, setRaisedTileId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEdgeSeams, setShowEdgeSeams] = useState(false);
  const [snapToFrame, setSnapToFrame] = useState(false);
  const [showCompactTools, setShowCompactTools] = useState(false);
  const [fitIsOverview, setFitIsOverview] = useState(false);
  const [focusedSectionId, setFocusedSectionId] = useState<JigsawCoarseSectionId | null>(null);
  const cameraWasUserAdjustedRef = useRef(false);
  const displayMode = usePuzzleWorkspaceDisplayMode();
  const markManualCameraAdjustment = () => {
    cameraWasUserAdjustedRef.current = true;
    setFitIsOverview(false);
  };

  useEffect(() => {
    setShowCompactTools(false);
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
  const coarseSections = useMemo(
    () => shouldOfferJigsawCoarseSections(puzzle.tiles.length)
      ? createJigsawCoarseSections(puzzle.tiles, puzzle.width, puzzle.height)
      : [],
    [puzzle.height, puzzle.tiles, puzzle.width],
  );

  const publishCurrentProgress = useCallback(() => {
    const current = placementStateRef.current;
    if (current?.puzzleId !== puzzle.id) return;
    const baseline = baselinePlacementsRef.current;
    progressChangeRef.current?.({
      hasProgress: hasMeaningfulJigsawWorkspaceProgress(
        layout,
        baseline?.puzzleId === puzzle.id ? baseline.placements : null,
        current.placements,
        current.assembly,
      ),
      terminal: isJigsawAssemblySolved(current.assembly, puzzle.tiles.length),
    });
  }, [layout, puzzle.id, puzzle.tiles.length]);

  const publishHistoryAvailability = useCallback((
    history: JigsawHistoryState,
    blocked = false,
  ) => {
    onHistoryAvailabilityChange?.(getJigsawHistoryAvailability(history, blocked));
    publishCurrentProgress();
  }, [onHistoryAvailabilityChange, publishCurrentProgress]);

  const replaceHistory = useCallback((history: JigsawHistoryState) => {
    historyRef.current = history;
    publishHistoryAvailability(history);
  }, [publishHistoryAvailability]);

  const publishAssemblyProgress = useCallback((assembly: JigsawAssemblyProgress) => {
    onAssemblyChange?.(cloneJigsawAssemblyProgress(assembly));
    publishCurrentProgress();
  }, [onAssemblyChange, publishCurrentProgress]);

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
  const activeAssembly = placementState?.puzzleId === puzzle.id
    ? placementState.assembly
    : makeEmptyJigsawAssemblyProgress();
  const focusedSection = focusedSectionId === null
    ? null
    : coarseSections.find((section) => section.id === focusedSectionId) ?? null;
  const focusedPieceIds = focusedSection
    ? getJigsawCoarseSectionFocusPieceIds(
        focusedSection,
        activeAssembly,
        puzzle.tiles,
      )
    : puzzle.tiles.map((piece) => piece.id);
  const visiblePieceIds = new Set(focusedPieceIds);
  const visiblePieces = focusedSection
    ? puzzle.tiles.filter((piece) => visiblePieceIds.has(piece.id))
    : puzzle.tiles;
  const visiblePlacements = activePlacements && focusedSection
    ? activePlacements.filter((placement) => visiblePieceIds.has(placement.id))
    : activePlacements;
  const activeCamera = cameraState?.puzzleId === puzzle.id
    ? cameraState.camera
    : visiblePlacements
      ? createJigsawWorkingFitCamera(
          layout,
          renderViewport,
          visiblePlacements,
          28,
          {},
          visiblePieces,
        )
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
    baselinePlacementsRef.current = null;
    replaceHistory(makeEmptyJigsawHistoryState());
    setActiveTileId(null);
    setRaisedTileId(null);
    setIsPanning(false);
    setFocusedSectionId(null);
    setFitIsOverview(false);
    cameraWasUserAdjustedRef.current = false;
  }, [puzzle.id, replaceHistory]);

  useEffect(() => {
    if (initialAssembly === null) return;
    const initialized = updatePlacementState((current) => {
      if (current?.puzzleId === puzzle.id) return current;
      const stagingViewport = getMeasuredJigsawViewport(stageRef.current);
      const initial = resolveInitialJigsawWorkspaceState(initialAssembly, layout, puzzle.tiles, stagingViewport);
      if (!initial) return current;
      const baseline = resetJigsawWorkspaceState(layout, puzzle.tiles, stagingViewport);
      if (baseline) baselinePlacementsRef.current = {
        puzzleId: puzzle.id,
        placements: baseline.placements.map((placement) => ({ ...placement })),
      };
      return { puzzleId: puzzle.id, ...initial };
    });
    if (initialized?.puzzleId === puzzle.id) publishCurrentProgress();
  }, [initialAssembly, layout, publishCurrentProgress, puzzle.id, puzzle.tiles, updatePlacementState, viewport.height, viewport.width]);

  useEffect(() => {
    if (!isUsableJigsawViewport(viewport) || !activePlacements) return;
    setCameraState((current) => {
      if (current?.puzzleId === puzzle.id) return current;
      return {
        puzzleId: puzzle.id,
        camera: initializeOrPreserveJigsawCamera(
          layout,
          viewport,
          null,
          activePlacements,
          puzzle.tiles,
          getCurrentFitInsets(),
        ),
      };
    });
  }, [activePlacements, layout, puzzle.id, viewport.height, viewport.width]);

  const setCamera = (camera: JigsawCamera) => {
    wheelStateRef.current = { ...wheelStateRef.current, puzzleId: puzzle.id, camera };
    setCameraState({ puzzleId: puzzle.id, camera });
  };

  const getCurrentFitInsets = (): JigsawViewportInsets => {
    const stage = stageRef.current;
    const workspace = stage?.closest<HTMLElement>(".jigsaw-workspace");
    if (!stage || !workspace) return { top: 0, right: 0, bottom: 0, left: 0 };

    const overlayElements = Array.from(workspace.querySelectorAll<HTMLElement>(
      ".jigsaw-tools-toggle, .tile-puzzle-tools, .jigsaw-camera-tools, .tile-puzzle-summary, .puzzle-workspace-display-tools",
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
      puzzle.tiles,
    );
    if (nextCamera === currentCameraState) return;
    setCamera(nextCamera);
  }, [layout, puzzle.id, viewport.height, viewport.width]);

  const toggleFitView = () => {
    if (!isUsableJigsawViewport(viewport)) return;
    const current = placementStateRef.current;
    if (!current || current.puzzleId !== puzzle.id) return;
    const placements = focusedSection
      ? current.placements.filter((placement) => visiblePieceIds.has(placement.id))
      : current.placements;
    if (placements.length === 0) return;
    cameraWasUserAdjustedRef.current = true;
    const insets = getCurrentFitInsets();
    setCamera(fitIsOverview
      ? createJigsawWorkingFitCamera(layout, viewport, placements, 28, insets, puzzle.tiles)
      : createJigsawOccupiedFitCamera(layout, viewport, placements, 28, insets, puzzle.tiles));
    setFitIsOverview(!fitIsOverview);
  };

  const selectSectionFocus = (sectionId: JigsawCoarseSectionId | null) => {
    if (dragRef.current || pinchRef.current || panRef.current) return;
    const section = sectionId === null
      ? null
      : coarseSections.find((candidate) => candidate.id === sectionId) ?? null;
    if (sectionId !== null && !section) return;

    setFocusedSectionId(sectionId);
    setShowCompactTools(false);
    setFitIsOverview(false);

    const current = placementStateRef.current;
    if (
      !current ||
      current.puzzleId !== puzzle.id ||
      !isUsableJigsawViewport(viewport)
    ) return;

    const eligibleIds = section
      ? new Set(getJigsawCoarseSectionFocusPieceIds(
          section,
          current.assembly,
          puzzle.tiles,
        ))
      : null;
    const placements = eligibleIds
      ? current.placements.filter((placement) => eligibleIds.has(placement.id))
      : current.placements;
    if (placements.length === 0) return;

    cameraWasUserAdjustedRef.current = true;
    setFitIsOverview(true);
    setCamera(createJigsawOccupiedFitCamera(
      layout,
      viewport,
      placements,
      28,
      getCurrentFitInsets(),
      puzzle.tiles,
    ));
  };

  const getCurrentSnapshot = (): JigsawWorkspaceSnapshot | null => {
    const current = placementStateRef.current;
    if (!current || current.puzzleId !== puzzle.id) return null;
    return { placements: current.placements, assembly: current.assembly };
  };

  const getStagingActionBaseline = () => {
    const current = getCurrentSnapshot();
    if (!current) return null;
    const activeDrag = dragRef.current?.puzzleId === puzzle.id ? dragRef.current : null;
    return resolveJigsawActionBaseline(current, activeDrag?.startSnapshot ?? null);
  };

  const applyStagedPlacements = (
    nextPlacements: JigsawPlacement[],
    nextAssembly: JigsawAssemblyProgress,
    baseline: JigsawWorkspaceSnapshot | null,
    stagingViewport: JigsawViewport,
    fitPlacements: readonly JigsawPlacement[] = nextPlacements,
  ) => {
    stopDragAnimation();
    updatePlacementState(() => ({
      puzzleId: puzzle.id,
      placements: nextPlacements,
      assembly: cloneJigsawAssemblyProgress(nextAssembly),
    }));
    dragRef.current = null;
    panRef.current = null;
    touchPointsRef.current.clear();
    pinchRef.current = null;
    setActiveTileId(null);
    setRaisedTileId(null);
    setIsPanning(false);
    publishAssemblyProgress(nextAssembly);
    if (baseline) {
      replaceHistory(commitJigsawPlacementAction(
        historyRef.current,
        baseline,
        { placements: nextPlacements, assembly: nextAssembly },
      ));
    }
    cameraWasUserAdjustedRef.current = false;
    setFitIsOverview(false);
    setCamera(createJigsawWorkingFitCamera(
      layout,
      stagingViewport,
      fitPlacements,
      28,
      getCurrentFitInsets(),
      puzzle.tiles,
    ));
    return true;
  };

  const resetPieces = () => {
    const stagingViewport = getMeasuredJigsawViewport(stageRef.current);
    if (!stagingViewport) return false;
    const next = resetJigsawWorkspaceState(layout, puzzle.tiles, stagingViewport);
    if (!next) return false;

    baselinePlacementsRef.current = {
      puzzleId: puzzle.id,
      placements: next.placements.map((placement) => ({ ...placement })),
    };
    const reset = applyStagedPlacements(
      next.placements,
      next.assembly,
      null,
      stagingViewport,
    );
    if (reset) replaceHistory(makeEmptyJigsawHistoryState());
    return reset;
  };

  const restagePieces = () => {
    const stagingViewport = getMeasuredJigsawViewport(stageRef.current);
    const baseline = getStagingActionBaseline();
    if (!stagingViewport || !baseline) return false;
    const focusPieceIds = focusedSection
      ? getJigsawCoarseSectionFocusPieceIds(
          focusedSection,
          baseline.assembly,
          puzzle.tiles,
        )
      : null;
    const next = focusPieceIds
      ? restageJigsawWorkspaceSubset(
          layout,
          puzzle.tiles,
          baseline.assembly,
          baseline.placements,
          focusPieceIds,
          stagingViewport,
        )
      : restageJigsawWorkspaceState(
          layout,
          puzzle.tiles,
          baseline.assembly,
          stagingViewport,
        );
    if (!next) return false;

    const focusIds = focusPieceIds ? new Set(focusPieceIds) : null;
    const fitPlacements = focusIds
      ? next.placements.filter((placement) => focusIds.has(placement.id))
      : next.placements;

    return applyStagedPlacements(
      next.placements,
      next.assembly,
      baseline,
      stagingViewport,
      fitPlacements,
    );
  };

  useEffect(() => {
    if (lastResetVersion.current === resetVersion) return;
    if (!resetPieces()) return;
    setFocusedSectionId(null);
    lastResetVersion.current = resetVersion;
  }, [layout, puzzle.id, puzzle.tiles, resetVersion, viewport.height, viewport.width]);

  const placements = activePlacements ?? [];
  const placementById = new Map(placements.map((placement) => [placement.id, placement] as const));
  const connectedCount = getJigsawConnectedPieceCount(activeAssembly);
  const isSolved = isJigsawAssemblySolved(activeAssembly, puzzle.tiles.length);
  const assemblySummary = isSolved ? "Solved" : `${connectedCount} joined`;

  useEffect(() => {
    if (!isSolved) return;
    setShowCompactTools(false);
    setFocusedSectionId(null);
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

    const transition = applyJigsawHistoryAction(historyRef.current, {
      placements: current.placements,
      assembly: current.assembly,
    }, action);
    if (!transition) return false;

    updatePlacementState(() => ({
      puzzleId: puzzle.id,
      placements: transition.snapshot.placements,
      assembly: transition.snapshot.assembly,
    }));
    publishAssemblyProgress(transition.snapshot.assembly);
    replaceHistory(transition.history);
    setActiveTileId(null);
    setRaisedTileId(null);
    return true;
  }, [canHistoryAction, publishAssemblyProgress, puzzle.id, replaceHistory, updatePlacementState]);

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
    applyJigsawCameraTransform(worldLayer, state.camera, state.viewport);
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
        markManualCameraAdjustment();
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
            ...cancelJigsawDragAction(interruptedDrag),
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

  const renderDraggedPieceImmediately = (drag: ActiveDrag, state = wheelStateRef.current) => {
    const stagePoint = getStagePoint(drag.clientX, drag.clientY);
    if (!stagePoint) return null;
    const projection = projectJigsawDragAction(
      state.layout,
      puzzle.tiles,
      state.camera,
      state.viewport,
      stagePoint,
      drag,
    );
    if (!projection) return null;
    applyJigsawDragOffset(drag.pieceElements, projection.dragX, projection.dragY);
    return projection.placements;
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
        markManualCameraAdjustment();
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
    if (isSolved || pinchRef.current) return;
    const stagePoint = getStagePoint(event.clientX, event.clientY);
    if (!stagePoint) return;
    const current = wheelStateRef.current;
    const position = getJigsawPlacementPosition(current.layout, placement, tile);
    const currentPlacementState = placementStateRef.current;
    if (!currentPlacementState || currentPlacementState.puzzleId !== puzzle.id) return;
    const pieceIds = getJigsawComponentPieceIds(currentPlacementState.assembly, tile.id);
    const pieceElements = pieceIds.flatMap((pieceId) => {
      const element = pieceElementsRef.current.get(pieceId);
      return element ? [element] : [];
    });
    resetJigsawDragOffset(pieceElements);
    const target = event.currentTarget as HTMLButtonElement;
    const action = beginJigsawDragAction({
      puzzleId: puzzle.id,
      tileId: tile.id,
      pieceIds,
      pointerId: event.pointerId,
      camera: current.camera,
      viewport: current.viewport,
      stagePoint,
      origin: position,
      snapshot: {
        placements: currentPlacementState.placements,
        assembly: currentPlacementState.assembly,
      },
      clientX: event.clientX,
      clientY: event.clientY,
    });
    dragRef.current = { ...action, pieceElements };
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
    if (!drag || drag.puzzleId !== puzzle.id || drag.pointerId !== event.pointerId || drag.tileId !== tile.id) return;
    drag.clientX = event.clientX;
    drag.clientY = event.clientY;
    stopDragAnimation();
    const movedPlacements = renderDraggedPieceImmediately(drag);
    setCamera(wheelStateRef.current.camera);
    const target = event.currentTarget as HTMLButtonElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);

    if (!movedPlacements) {
      updatePlacementState((current) => current?.puzzleId === puzzle.id ? {
        ...current,
        ...cancelJigsawDragAction(drag),
      } : current);
      dragRef.current = null;
      setActiveTileId(null);
      publishHistoryAvailability(historyRef.current);
      return;
    }

    const completed = completeJigsawDragAction(
      layout,
      puzzle.tiles,
      historyRef.current,
      movedPlacements,
      drag,
      {
        eligiblePieceIds: focusedSection ? visiblePieceIds : undefined,
        snapToFrame,
      },
    );
    const nextSnapshot = completed.snapshot;
    const nextState = updatePlacementState((current) => current?.puzzleId === puzzle.id ? {
      ...current,
      ...nextSnapshot,
    } : current);
    dragRef.current = null;
    setActiveTileId(null);
    if (nextState?.puzzleId === puzzle.id) {
      if (completed.solved) onCausativeInput();
      publishAssemblyProgress(nextState.assembly);
      replaceHistory(completed.history);
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
      ...cancelJigsawDragAction(drag),
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
    if (deltaX !== 0 || deltaY !== 0) markManualCameraAdjustment();
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
    markManualCameraAdjustment();

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
    markManualCameraAdjustment();
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
    markManualCameraAdjustment();
    setCamera(panJigsawCamera(current.layout, current.viewport, current.camera, deltaX, deltaY));
    event.preventDefault();
  };

  const toolsId = `jigsaw-tools-${puzzle.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
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
      <div class="jigsaw-workbench-toolbar">
        <div class="jigsaw-camera-tools" aria-label="Jigsaw view controls">
          <button type="button" onClick={() => zoomView("out")} aria-label="Zoom out">−</button>
          <output class="jigsaw-zoom-level" aria-label="Current zoom">
            {Math.round(activeCamera.zoom * 100)}%
          </output>
          <button type="button" onClick={() => zoomView("in")} aria-label="Zoom in">+</button>
          <button
            class="jigsaw-fit-action"
            type="button"
            aria-label={fitIsOverview ? "Return to working view" : focusedSection ? "Fit section" : "Show all pieces"}
            title={fitIsOverview ? "Return to working view" : focusedSection ? "Fit section" : "Show all pieces"}
            onClick={toggleFitView}
          >
            <JigsawFitIcon />
          </button>
          {!displayMode.isExpanded ? (
            <button
              class="jigsaw-expand-workspace"
              type="button"
              onClick={displayMode.enterExpanded}
              aria-label="Expand workspace"
              title="Expand workspace"
            >
              <JigsawExpandIcon />
            </button>
          ) : null}
        </div>

        {!isSolved ? (
          <button
            class="jigsaw-tools-toggle"
            type="button"
            aria-label="Jigsaw tools"
            title="Jigsaw tools"
            aria-expanded={showCompactTools}
            aria-controls={toolsId}
            onClick={() => setShowCompactTools((current) => !current)}
          >
            <JigsawToolsIcon />
          </button>
        ) : null}
      </div>
      {(isSolved || connectedCount > 0 || focusedSection) ? (
        <div class="tile-puzzle-summary">
          {(isSolved || connectedCount > 0) ? <span>{assemblySummary}</span> : null}
          {focusedSection ? (
            <span class="jigsaw-section-summary">
              {jigsawSectionLabels[focusedSection.id]}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        id={toolsId}
        class={`tile-puzzle-tools ${showCompactTools ? "is-open" : ""}`}
        hidden={isSolved}
      >
        <div class="jigsaw-tools-mobile-actions" role="group" aria-label="Zoom controls">
          <button type="button" onClick={() => zoomView("out")}>Zoom out</button>
          <button type="button" onClick={() => zoomView("in")}>Zoom in</button>
        </div>
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
          class="jigsaw-restage-action"
          type="button"
          onClick={() => {
            restagePieces();
            setShowCompactTools(false);
          }}
        >
          {focusedSection ? "Restage section" : "Restage pieces"}
        </button>
        <button
          type="button"
          aria-pressed={showEdgeSeams}
          onClick={() => {
            setShowEdgeSeams((current) => !current);
            setShowCompactTools(false);
          }}
        >
          {showEdgeSeams ? "Hide edge guides" : "Show edge guides"}
        </button>
        <button
          type="button"
          aria-pressed={snapToFrame}
          onClick={() => {
            setSnapToFrame((current) => !current);
            setShowCompactTools(false);
          }}
        >
          Snap to frame
        </button>
        {coarseSections.length > 0 ? (
          <div class="jigsaw-section-tools" role="group" aria-label="Puzzle section focus">
            <span class="jigsaw-section-tools-label">Focus</span>
            <button
              class="jigsaw-section-all"
              type="button"
              aria-pressed={focusedSection === null}
              onClick={() => selectSectionFocus(null)}
            >
              All
            </button>
            <div class="jigsaw-section-grid">
              {coarseSections.map((section) => {
                const complete = isJigsawCoarseSectionComplete(section, activeAssembly);
                const label = jigsawSectionLabels[section.id];
                return (
                  <button
                    class={complete ? "is-complete" : ""}
                    type="button"
                    aria-label={`Focus ${label.toLowerCase()} section${complete ? ", complete" : ""}`}
                    title={`${label} section${complete ? " — complete" : ""}`}
                    aria-pressed={focusedSection?.id === section.id}
                    onClick={() => selectSectionFocus(section.id)}
                  >
                    <span aria-hidden="true">{jigsawSectionGlyphs[section.id]}</span>
                    {complete ? <span class="jigsaw-section-complete" aria-hidden="true">✓</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
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
          <div class="jigsaw-assembly-board" style={boardStyle} aria-hidden="true" />

          {visiblePieces.map((tile) => {
            const placement = placementById.get(tile.id);
            if (!placement) return null;
            const position = getJigsawPlacementPosition(layout, placement, tile);
            const cellSpan = getJigsawPieceCellSpan(tile);
            const activeDrag = dragRef.current;
            const active =
              activeTileId !== null &&
              activeDrag?.puzzleId === puzzle.id &&
              activeDrag.pieceIds.includes(tile.id);
            const raised = tile.id === raisedTileId;
            const outlinePath = getJigsawPieceOutlinePath(tile, puzzle.edgeModel);
            const clipPathId = getJigsawPieceClipPathId(puzzle, tile);
            const pieceStyle = {
              width: `${layout.pieceWidth * cellSpan.width}px`,
              height: `${layout.pieceHeight * cellSpan.height}px`,
              "--jigsaw-piece-x": `${position.left}px`,
              "--jigsaw-piece-y": `${position.top}px`,
              zIndex: getPieceZIndex(tile, active, raised),
            } as JSX.CSSProperties;

            return (
              <button
                class={`tile-puzzle-piece ${getJigsawComponentPieceIds(activeAssembly, tile.id).length > 1 ? "joined" : "loose"} ${active ? "dragging" : ""}`}
                key={tile.id}
                ref={(element) => {
                  if (element) pieceElementsRef.current.set(tile.id, element);
                  else pieceElementsRef.current.delete(tile.id);
                }}
                style={pieceStyle}
                onPointerDown={(event) => beginDrag(event, tile, placement)}
                onPointerMove={moveDrag}
                onPointerUp={(event) => finishDrag(event, tile)}
                onPointerCancel={cancelDrag}
                type="button"
                tabIndex={-1}
                aria-label={`Piece ${tile.solvedIndex + 1}, ${getJigsawComponentPieceIds(activeAssembly, tile.id).length > 1 ? "joined" : "loose"}`}
              >
                <svg
                  class="tile-puzzle-piece-visual"
                  viewBox={`0 0 ${cellSpan.width * 100} ${cellSpan.height * 100}`}
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
                  {shouldRenderJigsawEdgeSeams(showEdgeSeams, isSolved) ? getJigsawPieceSeamPaths(tile, puzzle.edgeModel).map((seam) => (
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
