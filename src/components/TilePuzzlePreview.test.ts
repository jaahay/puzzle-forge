import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../catalog/types";
import {
  clampJigsawCamera,
  createInitialJigsawPlacements,
  createJigsawFitCamera,
  createJigsawWorkingFitCamera,
  createJigsawWorldLayout,
  getJigsawStagingMode,
} from "../games/jigsaw/placement";
import {
  areJigsawPlacementsSolved,
  getJigsawFitInsetsForOverlays,
  getJigsawZoomStep,
  getMeasuredJigsawViewport,
  getPieceHitTargetProps,
  getPieceImageClipPathProps,
  getPieceZIndex,
  initializeOrPreserveJigsawCamera,
  resolveInitialJigsawState,
  resolveJigsawCameraForViewportResize,
  shouldRenderJigsawEdgeSeams,
  shouldRenderJigsawReferencePreview,
  shouldShowJigsawCompletionCelebration,
  shouldShowJigsawSolvedControls,
} from "./TilePuzzlePreview";

const makePiece = (solvedIndex: number, width = 4): JigsawPiece => ({
  id: `tile-${solvedIndex}`,
  currentIndex: solvedIndex,
  solvedIndex,
  row: Math.floor(solvedIndex / width),
  column: solvedIndex % width,
  edges: [],
});

describe("TilePuzzlePreview SVG clipping", () => {
  it("uses Preact's raw kebab-case clip-path SVG attribute", () => {
    expect(getPieceImageClipPathProps("jigsaw-piece-test")).toEqual({
      "clip-path": "url(#jigsaw-piece-test)",
    });
  });

  it("uses the closed piece silhouette as the pointer hit target", () => {
    expect(getPieceHitTargetProps()).toEqual({
      fill: "transparent",
      "pointer-events": "fill",
    });
  });
});

describe("TilePuzzlePreview completion", () => {
  it("is solved only when every piece belongs to one assembled component", () => {
    expect(areJigsawPlacementsSolved({
      joinedComponents: [["tile-0", "tile-1"]],
    }, 2)).toBe(true);
    expect(areJigsawPlacementsSolved({
      joinedComponents: [["tile-0", "tile-1"], ["tile-2", "tile-3"]],
    }, 4)).toBe(false);
    expect(areJigsawPlacementsSolved({ joinedComponents: [] }, 2)).toBe(false);
  });
  it("suppresses solved edge guides without changing the stored preference", () => {  it("suppresses solved edge guides without changing the stored preference", () => {
    expect(shouldRenderJigsawEdgeSeams(false, false)).toBe(false);
    expect(shouldRenderJigsawEdgeSeams(true, false)).toBe(true);
    expect(shouldRenderJigsawEdgeSeams(true, true)).toBe(false);
  });

  it("suppresses the reference image while solved without changing its stored toggle", () => {
    expect(shouldRenderJigsawReferencePreview(false, false)).toBe(false);
    expect(shouldRenderJigsawReferencePreview(true, false)).toBe(true);
    expect(shouldRenderJigsawReferencePreview(true, true)).toBe(false);
  });

  it("separates transient celebration from persistent solved controls", () => {
    expect(shouldShowJigsawCompletionCelebration(true, "celebrating")).toBe(true);
    expect(shouldShowJigsawCompletionCelebration(true, "completed")).toBe(false);
    expect(shouldShowJigsawCompletionCelebration(false, "celebrating")).toBe(false);

    expect(shouldShowJigsawSolvedControls(true, "completed")).toBe(true);
    expect(shouldShowJigsawSolvedControls(true, "celebrating")).toBe(false);
    expect(shouldShowJigsawSolvedControls(false, "completed")).toBe(false);
  });

});

describe("TilePuzzlePreview piece stacking", () => {
  it("keeps loose, recently interacted, and active pieces in tabletop order", () => {
    expect(getPieceZIndex({ currentIndex: 0 }, false, false)).toBe(10);
    expect(getPieceZIndex({ currentIndex: 63 }, false, false)).toBe(73);
    expect(getPieceZIndex({ currentIndex: 0 }, false, true)).toBe(900);
    expect(getPieceZIndex({ currentIndex: 0 }, true, true)).toBe(1000);
  });
});

describe("TilePuzzlePreview camera controls", () => {});

describe("TilePuzzlePreview camera controls", () => {
  it("steps through human-friendly zoom levels around arbitrary fitted zoom values", () => {
    expect(getJigsawZoomStep(0.28, "out")).toBe(0.25);
    expect(getJigsawZoomStep(0.28, "in")).toBe(0.33);
    expect(getJigsawZoomStep(0.42, "out")).toBe(0.33);
    expect(getJigsawZoomStep(0.42, "in")).toBe(0.5);
    expect(getJigsawZoomStep(0.72, "out")).toBe(0.67);
    expect(getJigsawZoomStep(0.72, "in")).toBe(0.8);
  });

  it("moves cleanly around the 100 percent zoom stop", () => {
    expect(getJigsawZoomStep(1, "out")).toBe(0.8);
    expect(getJigsawZoomStep(1, "in")).toBe(1.25);
  });

  it("preserves an already initialized camera during initialization reconciliation", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 2048,
      imageHeight: 1536,
      puzzleWidth: 10,
      puzzleHeight: 8,
    });
    const compactViewport = { width: 760, height: 560 };
    const expandedViewport = { width: 1600, height: 900 };
    const camera = { centerX: 0, centerY: 0, zoom: 1 };

    expect(clampJigsawCamera(layout, expandedViewport, camera)).not.toEqual(camera);
    expect(initializeOrPreserveJigsawCamera(layout, expandedViewport, camera)).toBe(camera);
    expect(initializeOrPreserveJigsawCamera(layout, compactViewport, camera)).toBe(camera);
  });

  it("refits untouched camera state on viewport changes while preserving user-adjusted camera state", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 2048,
      imageHeight: 1536,
      puzzleWidth: 10,
      puzzleHeight: 8,
    });
    const viewport = { width: 390, height: 844 };
    const pieces = Array.from({ length: 24 }, (_, index) => makePiece(index, 6));
    const placements = resolveInitialJigsawState({ joinedComponents: [] }, layout, pieces, viewport)?.placements ?? null;
    expect(placements).not.toBeNull();
    if (!placements) return;

    const currentCamera = { centerX: 120, centerY: 180, zoom: 0.67 };
    const insets = { top: 64, right: 12, bottom: 76, left: 76 };

    expect(resolveJigsawCameraForViewportResize(
      layout,
      viewport,
      placements,
      currentCamera,
      true,
      insets,
    )).toBe(currentCamera);
    expect(resolveJigsawCameraForViewportResize(
      layout,
      viewport,
      placements,
      currentCamera,
      false,
      insets,
    )).toEqual(createJigsawWorkingFitCamera(layout, viewport, placements, 28, insets));
  });

  it("starts from a board-first working fit when a puzzle camera has not initialized yet", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 2048,
      imageHeight: 1536,
      puzzleWidth: 10,
      puzzleHeight: 8,
    });
    const viewport = { width: 1200, height: 800 };
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index));
    const placements = resolveInitialJigsawState({ joinedComponents: [] }, layout, pieces, viewport)?.placements ?? null;
    expect(placements).not.toBeNull();
    if (!placements) return;

    expect(initializeOrPreserveJigsawCamera(layout, viewport, null, placements)).toEqual(
      createJigsawWorkingFitCamera(layout, viewport, placements),
    );
  });
});

describe("TilePuzzlePreview fit safe areas", () => {
  it("reserves the nearest stage edge for immersive overlay chrome", () => {
    const stage = { left: 0, top: 0, right: 1000, bottom: 700, width: 1000, height: 700 };
    const insets = getJigsawFitInsetsForOverlays(stage, [
      { left: 12, top: 12, right: 312, bottom: 60, width: 300, height: 48 },
      { left: 300, top: 642, right: 700, bottom: 690, width: 400, height: 48 },
      { left: 10, top: 120, right: 90, bottom: 520, width: 80, height: 400 },
    ]);

    expect(insets.top).toBe(68);
    expect(insets.bottom).toBe(66);
    expect(insets.left).toBe(98);
    expect(insets.right).toBe(0);
  });
});

describe("TilePuzzlePreview placement initialization", () => {
  it("uses the measured play surface and rejects unavailable measurements", () => {
    expect(getMeasuredJigsawViewport(null)).toBeNull();
    expect(getMeasuredJigsawViewport({ clientWidth: 0, clientHeight: 700 })).toBeNull();
    expect(getMeasuredJigsawViewport({ clientWidth: 1180, clientHeight: 640 })).toEqual({
      width: 1180,
      height: 640,
    });
  });

  it("restores joined component membership with one rigid translation", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
    });
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index));
    const viewport = { width: 600, height: 1200 };
    const state = resolveInitialJigsawState(
      { joinedComponents: [["tile-0", "tile-1", "tile-2"]] },
      layout,
      pieces,
      viewport,
    );

    expect(state?.assembly).toEqual({
      joinedComponents: [["tile-0", "tile-1", "tile-2"]],
    });
    expect(state).not.toBeNull();
    if (!state) return;

    const memberPlacements = ["tile-0", "tile-1", "tile-2"].map((pieceId) => {
      const piece = pieces.find((candidate) => candidate.id === pieceId)!;
      const placement = state.placements.find((candidate) => candidate.id === pieceId)!;
      const solvedLeft = layout.boardX + piece.column * layout.pieceWidth;
      const solvedTop = layout.boardY + piece.row * layout.pieceHeight;
      return {
        x: placement.worldX - solvedLeft,
        y: placement.worldY - solvedTop,
      };
    });
    expect(memberPlacements[1]).toEqual(memberPlacements[0]);
    expect(memberPlacements[2]).toEqual(memberPlacements[0]);
  });

  it("waits for a real play-surface measurement before staging a fresh puzzle", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 721,
      imageHeight: 2048,
      puzzleWidth: 6,
      puzzleHeight: 17,
    });
    const pieces = Array.from({ length: 48 }, (_, index) => makePiece(index, 6));

    expect(resolveInitialJigsawState({ joinedComponents: [] }, layout, pieces, null)).toBeNull();
    expect(resolveInitialJigsawState({ joinedComponents: [] }, layout, pieces, { width: 0, height: 800 })).toBeNull();
  });

  it("stages a fresh puzzle from the supplied play-surface shape", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 721,
      imageHeight: 2048,
      puzzleWidth: 6,
      puzzleHeight: 17,
    });
    const pieces = Array.from({ length: 48 }, (_, index) => makePiece(index, 6));
    const wideStage = { width: 1180, height: 640 };
    const veryTallStage = { width: 360, height: 1440 };

    const widePlacements = resolveInitialJigsawState(
      { joinedComponents: [] },
      layout,
      pieces,
      wideStage,
    )?.placements ?? null;
    const tallPlacements = resolveInitialJigsawState(
      { joinedComponents: [] },
      layout,
      pieces,
      veryTallStage,
    )?.placements ?? null;

    expect(getJigsawStagingMode(layout, pieces.length, wideStage)).toBe("sides");
    expect(getJigsawStagingMode(layout, pieces.length, veryTallStage)).toBe("top-bottom");
    expect(widePlacements).not.toBeNull();
    expect(tallPlacements).not.toBeNull();
    expect(widePlacements).not.toEqual(tallPlacements);
  });
});
