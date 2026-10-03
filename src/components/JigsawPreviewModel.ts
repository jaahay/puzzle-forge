import type { JigsawGeneratedPuzzle, JigsawPiece } from "../catalog/types";
import {
  createJigsawFitCamera,
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
