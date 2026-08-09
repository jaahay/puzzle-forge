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
  it("keeps loose pieces above snapped pieces and the active piece above both", () => {
    expect(getPieceZIndex({ currentIndex: 0 }, true, false)).toBe(4);
    expect(getPieceZIndex({ currentIndex: 0 }, false, false)).toBeGreaterThan(4);
    expect(getPieceZIndex({ currentIndex: 63 }, false, true)).toBe(1000);
  });
});
