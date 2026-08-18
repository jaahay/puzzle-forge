import { describe, expect, it } from "vitest";
import { clampJigsawCamera, createJigsawFitCamera, createJigsawWorldLayout } from "../games/jigsaw/placement";
import {
  getJigsawZoomStep,
  getPieceHitTargetProps,
  getPieceImageClipPathProps,
  getPieceZIndex,
  initializeOrPreserveJigsawCamera,
} from "./TilePuzzlePreview";

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
