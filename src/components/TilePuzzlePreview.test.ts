import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../catalog/types";
import {
  clampJigsawCamera,
  createJigsawFitCamera,
  createJigsawWorldLayout,
  getJigsawStagingMode,
} from "../games/jigsaw/placement";
import {
  areJigsawPlacementsSolved,
  getJigsawZoomStep,
  getMeasuredJigsawViewport,
  getPieceHitTargetProps,
  getPieceImageClipPathProps,
  getPieceZIndex,
  initializeOrPreserveJigsawCamera,
  resolveInitialJigsawPlacements,
  shouldRenderJigsawEdgeSeams,
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
  it("is solved only when every expected placement is snapped", () => {
    expect(areJigsawPlacementsSolved([
      { snapped: true },
      { snapped: true },
    ], 2)).toBe(true);
    expect(areJigsawPlacementsSolved([
      { snapped: true },
      { snapped: false },
    ], 2)).toBe(false);
    expect(areJigsawPlacementsSolved([{ snapped: true }], 2)).toBe(false);
  });
  it("suppresses solved edge guides without changing the stored preference", () => {
    expect(shouldRenderJigsawEdgeSeams(false, false)).toBe(false);
    expect(shouldRenderJigsawEdgeSeams(true, false)).toBe(true);
    expect(shouldRenderJigsawEdgeSeams(true, true)).toBe(false);
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
  it("keeps snapped, loose, recently interacted, and active pieces in tabletop order", () => {
    expect(getPieceZIndex({ currentIndex: 0 }, true, false, true)).toBe(4);
    expect(getPieceZIndex({ currentIndex: 0 }, false, false, false)).toBeGreaterThan(4);
    expect(getPieceZIndex({ currentIndex: 63 }, false, false, false)).toBeLessThan(
      getPieceZIndex({ currentIndex: 0 }, false, false, true),
    );
    expect(getPieceZIndex({ currentIndex: 0 }, false, true, true)).toBe(1000);
  });
});

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

  it("preserves camera center and zoom across viewport-only resizes", () => {
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

  it("fits the workspace when a puzzle camera has not initialized yet", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 2048,
      imageHeight: 1536,
      puzzleWidth: 10,
      puzzleHeight: 8,
    });
    const viewport = { width: 1200, height: 800 };

    expect(initializeOrPreserveJigsawCamera(layout, viewport, null)).toEqual(
      createJigsawFitCamera(layout, viewport, "workspace"),
    );
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

  it("restores snapped progress onto fresh staging for the current play surface", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
    });
    const pieces = [makePiece(0), makePiece(1)];
    const placements = resolveInitialJigsawPlacements(
      ["tile-0"],
      layout,
      pieces,
      { width: 900, height: 600 },
    );

    expect(placements).not.toBeNull();
    expect(placements?.find((placement) => placement.id === "tile-0")?.snapped).toBe(true);
    expect(placements?.find((placement) => placement.id === "tile-1")?.snapped).toBe(false);
  });

  it("waits for a real play-surface measurement before staging a fresh puzzle", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 721,
      imageHeight: 2048,
      puzzleWidth: 6,
      puzzleHeight: 17,
    });
    const pieces = Array.from({ length: 48 }, (_, index) => makePiece(index, 6));

    expect(resolveInitialJigsawPlacements(["tile-0"], layout, pieces, null)).toBeNull();
    expect(resolveInitialJigsawPlacements([], layout, pieces, { width: 0, height: 800 })).toBeNull();
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

    const widePlacements = resolveInitialJigsawPlacements([], layout, pieces, wideStage);
    const tallPlacements = resolveInitialJigsawPlacements([], layout, pieces, veryTallStage);

    expect(getJigsawStagingMode(layout, pieces.length, wideStage)).toBe("sides");
    expect(getJigsawStagingMode(layout, pieces.length, veryTallStage)).toBe("top-bottom");
    expect(widePlacements).not.toBeNull();
    expect(tallPlacements).not.toBeNull();
    expect(widePlacements).not.toEqual(tallPlacements);
  });
});
