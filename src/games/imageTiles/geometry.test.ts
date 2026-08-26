import { describe, expect, it } from "vitest";
import type { PuzzleImageAsset } from "../../catalog/types";
import { getImageTileCrop } from "./geometry";

const makeAsset = (intrinsicWidth: number, intrinsicHeight: number): PuzzleImageAsset => ({
  kind: "image",
  id: "test-art",
  title: "Test art",
  alt: "Test art",
  orientation: intrinsicWidth === intrinsicHeight ? "square" : intrinsicWidth > intrinsicHeight ? "landscape" : "portrait",
  intrinsicWidth,
  intrinsicHeight,
  files: { puzzle: "/test.webp", preview: "/test.webp", thumbnail: "/test.webp" },
  credit: { text: "Test", sourceName: "Test" },
});

describe("image tile crop geometry", () => {
  it("center-crops a wide source without changing its aspect ratio", () => {
    const asset = makeAsset(2000, 1000);
    const crop = getImageTileCrop(asset, 4, 4, 0, 0);

    expect(crop.heightPercent).toBe(400);
    expect(crop.widthPercent).toBe(800);
    expect(crop.widthPercent / crop.heightPercent).toBeCloseTo(2);
    expect(crop.leftPercent).toBe(-200);
    expect(crop.topPercent).toBe(0);
  });

  it("center-crops a tall source without changing its aspect ratio", () => {
    const asset = makeAsset(1000, 2000);
    const crop = getImageTileCrop(asset, 4, 4, 0, 0);

    expect(crop.widthPercent).toBe(400);
    expect(crop.heightPercent).toBe(800);
    expect(crop.widthPercent / crop.heightPercent).toBeCloseTo(0.5);
    expect(crop.leftPercent).toBe(0);
    expect(crop.topPercent).toBe(-200);
  });

  it("advances exactly one tile width or height between solved neighbors", () => {
    const asset = makeAsset(1600, 1200);
    const origin = getImageTileCrop(asset, 4, 3, 0, 0);
    const right = getImageTileCrop(asset, 4, 3, 0, 1);
    const below = getImageTileCrop(asset, 4, 3, 1, 0);

    expect(right.leftPercent - origin.leftPercent).toBe(-100);
    expect(below.topPercent - origin.topPercent).toBe(-100);
  });
});
