import { describe, expect, it } from "vitest";
import { defaultJigsawImageAsset, jigsawImageAssets } from "../games/jigsaw/imageAssets";
import { makeJigsawImageSelectionSettings } from "./JigsawWorkspace";

describe("Jigsaw image library", () => {
  it("converts a catalog asset into image selection settings", () => {
    expect(makeJigsawImageSelectionSettings(defaultJigsawImageAsset)).toEqual({
      imageId: defaultJigsawImageAsset.id,
    });
  });

  it("exposes the twelve bundled images with unique ids and same-origin derivatives", () => {
    const imageIds = jigsawImageAssets.map((asset) => asset.id);

    expect(jigsawImageAssets).toHaveLength(12);
    expect(new Set(imageIds).size).toBe(imageIds.length);
    expect(
      jigsawImageAssets.every(
        (asset) =>
          asset.files.puzzle === `/jigsaw/${asset.id}/puzzle.webp` &&
          asset.files.preview === `/jigsaw/${asset.id}/preview.webp` &&
          asset.files.thumbnail === `/jigsaw/${asset.id}/thumbnail.webp`,
      ),
    ).toBe(true);
    expect(jigsawImageAssets.every((asset) => asset.credit.sourceRecordUrl?.startsWith("https://www.metmuseum.org/"))).toBe(true);
  });
});
