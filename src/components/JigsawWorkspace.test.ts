import { describe, expect, it } from "vitest";
import { defaultJigsawImageAsset, jigsawImageAssets } from "../games/jigsaw/imageAssets";
import { makeJigsawImageSelectionSettings } from "./JigsawWorkspace";

describe("Jigsaw image library", () => {
  it("converts a catalog asset into image selection settings", () => {
    expect(makeJigsawImageSelectionSettings(defaultJigsawImageAsset)).toEqual({
      imageId: defaultJigsawImageAsset.id,
    });
  });

  it("exposes unique image ids with thumbnails for the picker", () => {
    const imageIds = jigsawImageAssets.map((asset) => asset.id);
    expect(new Set(imageIds).size).toBe(imageIds.length);
    expect(jigsawImageAssets.every((asset) => asset.files.thumbnail.length > 0)).toBe(true);
  });
});
