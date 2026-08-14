import { describe, expect, it } from "vitest";
import type { JigsawImageAsset } from "../../catalog/types";
import {
  getJigsawDifficultyForDimensions,
  jigsawDifficultyOrder,
  jigsawDifficultyTargetPieces,
  jigsawMaximumAxis,
  resolveJigsawDifficultyDimensions,
} from "./difficulty";

const makeAsset = (intrinsicWidth: number, intrinsicHeight: number) => ({
  intrinsicWidth,
  intrinsicHeight,
}) as Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">;

describe("Jigsaw difficulty dimensions", () => {
  it("uses square grids for square artwork at the four target piece counts", () => {
    const square = makeAsset(1600, 1600);

    expect(jigsawDifficultyOrder.map((difficulty) => resolveJigsawDifficultyDimensions(square, difficulty))).toEqual([
      { width: 4, height: 4, pieceCount: 16 },
      { width: 6, height: 6, pieceCount: 36 },
      { width: 8, height: 8, pieceCount: 64 },
      { width: 10, height: 10, pieceCount: 100 },
    ]);
  });

  it("adapts portrait and panorama grids to keep piece shapes sensible", () => {
    const portrait = resolveJigsawDifficultyDimensions(makeAsset(721, 2048), "Expert");
    const panorama = resolveJigsawDifficultyDimensions(makeAsset(3200, 800), "Expert");

    expect(portrait).toEqual({ width: 6, height: 17, pieceCount: 102 });
    expect(panorama).toEqual({ width: 20, height: 5, pieceCount: 100 });
    expect(portrait.height).toBeGreaterThan(portrait.width);
    expect(panorama.width).toBeGreaterThan(panorama.height);
  });

  it("keeps presets under the custom technical ceiling and near their target counts", () => {
    const artwork = makeAsset(2048, 1630);

    for (const difficulty of jigsawDifficultyOrder) {
      const resolved = resolveJigsawDifficultyDimensions(artwork, difficulty);
      const target = jigsawDifficultyTargetPieces[difficulty];
      expect(resolved.width).toBeLessThanOrEqual(jigsawMaximumAxis);
      expect(resolved.height).toBeLessThanOrEqual(jigsawMaximumAxis);
      expect(Math.abs(resolved.pieceCount - target) / target).toBeLessThan(0.15);
    }
  });

  it("recognizes preset dimensions without storing difficulty in puzzle identity", () => {
    const artwork = makeAsset(2048, 1630);
    const medium = resolveJigsawDifficultyDimensions(artwork, "Medium");

    expect(getJigsawDifficultyForDimensions(artwork, medium.width, medium.height)).toBe("Medium");
    expect(getJigsawDifficultyForDimensions(artwork, 5, 4)).toBeNull();
  });
});
