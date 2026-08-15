import { describe, expect, it } from "vitest";
import { getJigsawZoomStep, getPieceHitTargetProps, getPieceImageClipPathProps, getPieceZIndex } from "./TilePuzzlePreview";

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
});
