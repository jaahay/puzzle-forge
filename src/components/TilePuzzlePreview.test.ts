import { describe, expect, it } from "vitest";
import { getPieceHitTargetProps, getPieceImageClipPathProps, getPieceZIndex } from "./TilePuzzlePreview";

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
