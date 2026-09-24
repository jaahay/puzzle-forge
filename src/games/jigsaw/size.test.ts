import { describe, expect, it } from "vitest";
import type { JigsawImageAsset } from "../../catalog/types";
import {
  getJigsawGridAdaptation,
  getJigsawPieceDistortion,
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

  it("adapts pathological custom grids around their current piece count", () => {
    const panorama = makeAsset(3200, 800);
    const portrait = makeAsset(800, 3200);

    expect(getJigsawGridAdaptation(panorama, 8, 8)).toEqual({
      width: 16,
      height: 4,
      pieceCount: 64,
    });
    expect(getJigsawGridAdaptation(portrait, 8, 8)).toEqual({
      width: 4,
      height: 16,
      pieceCount: 64,
    });
    expect(getJigsawPieceDistortion(panorama, 16, 4)).toBe(1);
    expect(getJigsawPieceDistortion(portrait, 4, 16)).toBe(1);
  });

  it("does not recommend adaptation for already sensible custom piece shapes", () => {
    const square = makeAsset(1600, 1600);
    const panorama = makeAsset(3200, 800);

    expect(getJigsawGridAdaptation(square, 8, 8)).toBeNull();
    expect(getJigsawGridAdaptation(square, 8, 6)).toBeNull();
    expect(getJigsawGridAdaptation(panorama, 16, 4)).toBeNull();
  });

  it("keeps adapted custom grids within fifteen percent of the requested piece count", () => {
    const panorama = makeAsset(3200, 800);
    const adapted = getJigsawGridAdaptation(panorama, 7, 7);

    expect(adapted).not.toBeNull();
    expect(Math.abs((adapted?.pieceCount ?? 0) - 49) / 49).toBeLessThanOrEqual(0.15);
  });

  it("does not recommend Adapt when the count budget cannot produce a sane piece shape", () => {
    const extremePanorama = makeAsset(8000, 1000);

    expect(getJigsawPieceDistortion(extremePanorama, 4, 4)).toBe(8);
    expect(getJigsawGridAdaptation(extremePanorama, 4, 4)).toBeNull();
  });
});
