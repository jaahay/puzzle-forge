import { describe, expect, it } from "vitest";
import type { JigsawImageAsset } from "../../catalog/types";
import {
  getJigsawSizePresetForDimensions,
  jigsawMaximumAxis,
  jigsawSizePresets,
  jigsawSizeTargetPieces,
  resolveJigsawSizeDimensions,
} from "./size";

const makeAsset = (intrinsicWidth: number, intrinsicHeight: number) => ({
  intrinsicWidth,
  intrinsicHeight,
}) as Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">;

describe("Jigsaw size dimensions", () => {
  it("uses square grids for square artwork at the four target piece counts", () => {
    const square = makeAsset(1600, 1600);

    expect(jigsawSizePresets.map((preset) => resolveJigsawSizeDimensions(square, preset))).toEqual([
      { width: 4, height: 4, pieceCount: 16 },
      { width: 6, height: 6, pieceCount: 36 },
      { width: 8, height: 8, pieceCount: 64 },
      { width: 10, height: 10, pieceCount: 100 },
    ]);
  });

  it("adapts portrait and panorama grids to keep piece shapes sensible", () => {
    const portrait = resolveJigsawSizeDimensions(makeAsset(721, 2048), "Extra large");
    const panorama = resolveJigsawSizeDimensions(makeAsset(3200, 800), "Extra large");

    expect(portrait).toEqual({ width: 6, height: 17, pieceCount: 102 });
    expect(panorama).toEqual({ width: 20, height: 5, pieceCount: 100 });
    expect(portrait.height).toBeGreaterThan(portrait.width);
    expect(panorama.width).toBeGreaterThan(panorama.height);
  });

  it("keeps presets under the custom technical ceiling and near their target counts", () => {
    const artwork = makeAsset(2048, 1630);

    for (const preset of jigsawSizePresets) {
      const resolved = resolveJigsawSizeDimensions(artwork, preset);
      const target = jigsawSizeTargetPieces[preset];
      expect(resolved.width).toBeLessThanOrEqual(jigsawMaximumAxis);
      expect(resolved.height).toBeLessThanOrEqual(jigsawMaximumAxis);
      expect(Math.abs(resolved.pieceCount - target) / target).toBeLessThan(0.15);
    }
  });

  it("recognizes named size dimensions without storing a difficulty concept", () => {
    const artwork = makeAsset(2048, 1630);
    const medium = resolveJigsawSizeDimensions(artwork, "Medium");

    expect(getJigsawSizePresetForDimensions(artwork, medium.width, medium.height)).toBe("Medium");
    expect(getJigsawSizePresetForDimensions(artwork, 5, 4)).toBeNull();
  });
});
