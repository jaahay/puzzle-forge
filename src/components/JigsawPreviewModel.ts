import type { JigsawGeneratedPuzzle, JigsawPiece } from "../catalog/types";
import {
  createJigsawFitCamera,
  createJigsawOccupiedFitCamera,
  createJigsawWorkingFitCamera,
  isUsableJigsawViewport,
  jigsawCameraMaximumZoom,
  jigsawCameraMinimumZoom,
  type JigsawCamera,
  type JigsawPlacement,
  type JigsawViewport,
  type JigsawViewportInsets,
  type JigsawWorldLayout,
} from "../games/jigsaw/placement";
import type { JigsawPositionedVisualIsland } from "../games/jigsaw/visualIslands";
import type { CompletionPresentationPhase } from "./usePuzzleCompletionPresentation";

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
  pieces: readonly JigsawPiece[] = [],
  insets: Partial<JigsawViewportInsets> = {},
) => currentCamera ?? (
  placements
    ? createJigsawOccupiedFitCamera(layout, viewport, placements, 28, insets, pieces)
    : createJigsawFitCamera(layout, viewport, "workspace")
);

export const resolveJigsawCameraForViewportResize = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  placements: readonly JigsawPlacement[],
  currentCamera: JigsawCamera,
  userAdjusted: boolean,
  insets: Partial<JigsawViewportInsets> = {},
  pieces: readonly JigsawPiece[] = [],
  isOverview = false,
) => userAdjusted
  ? currentCamera
  : isOverview
    ? createJigsawOccupiedFitCamera(layout, viewport, placements, 28, insets, pieces)
    : createJigsawWorkingFitCamera(layout, viewport, placements, 28, insets, pieces);

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

    // A small corner control should not reserve an entire vertical strip on
    // a narrow phone. Reserve the edge consuming the smallest fraction of the
    // play surface; the board remains centered and all controls stay clear.
    const candidates: { edge: keyof JigsawViewportInsets; inset: number; share: number }[] = [
      { edge: "top", inset: Math.max(0, rect.bottom - stageRect.top + 8),
        share: Math.max(0, rect.bottom - stageRect.top + 8) / stageHeight },
      { edge: "right", inset: Math.max(0, stageRect.right - rect.left + 8),
        share: Math.max(0, stageRect.right - rect.left + 8) / stageWidth },
      { edge: "bottom", inset: Math.max(0, stageRect.bottom - rect.top + 8),
        share: Math.max(0, stageRect.bottom - rect.top + 8) / stageHeight },
      { edge: "left", inset: Math.max(0, rect.right - stageRect.left + 8),
        share: Math.max(0, rect.right - stageRect.left + 8) / stageWidth },
    ];
    const nearestEdge = candidates.reduce((best, candidate) =>
      candidate.share < best.share ? candidate : best);
    insets[nearestEdge.edge] = Math.max(insets[nearestEdge.edge], nearestEdge.inset);
  }

  return {
    top: Math.min(insets.top, stageHeight * 0.45),
    right: Math.min(insets.right, stageWidth * 0.45),
    bottom: Math.min(insets.bottom, stageHeight * 0.45),
    left: Math.min(insets.left, stageWidth * 0.45),
  };
};

export const getJigsawPieceClipPathId = (
  puzzle: JigsawGeneratedPuzzle,
  tile: JigsawPiece,
) => `jigsaw-piece-${puzzle.id}-${tile.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");

export const getPieceImageClipPathProps = (clipPathId: string) => ({
  "clip-path": `url(#${clipPathId})`,
});

export const getPieceHitTargetProps = () => ({
  fill: "transparent",
  "pointer-events": "fill",
});

export const getPieceZIndex = (
  tile: Pick<JigsawPiece, "currentIndex">,
  active: boolean,
  raised: boolean,
) => active ? 1000 : raised ? 900 : 10 + tile.currentIndex;

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

/** Joined regions settle behind smaller, still-accessible pieces; raising is temporary. */
export const getJigsawIslandStackOrder = (
  island: Pick<JigsawPositionedVisualIsland, "members">,
  pieceCount: number,
  active: boolean,
  raised: boolean,
  anchored: boolean,
): number => {
  const stride = pieceCount + 1;
  const aboveBoard = 10;
  if (active) return aboveBoard + stride * (stride + 2);
  if (raised) return aboveBoard + stride * (stride + 1);
  if (anchored) return aboveBoard;
  const sizeLayer = pieceCount - island.members.length + 1;
  const originalOrder = island.members.reduce(
    (highest, { piece }) => Math.max(highest, piece.currentIndex), 0);
  return aboveBoard + sizeLayer * stride + originalOrder;
};

/** Pointer capture keeps events on the dragged piece; hit-test through it for hover feedback. */
export const findJigsawDragHoverIsland = (
  hitStack: readonly Element[],
  draggedIsland: Element | null,
  stage: Element,
): HTMLElement | null => {
  for (const element of hitStack) {
    if (!element.matches(".tile-puzzle-piece-hit-target")) continue;
    const island = element.closest<HTMLElement>(".jigsaw-island");
    if (island && island !== draggedIsland && stage.contains(island)) return island;
  }
  return null;
};
