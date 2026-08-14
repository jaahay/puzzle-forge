import { describe, expect, it } from "vitest";
import { defaultJigsawImageAsset, jigsawImageAssets } from "../games/jigsaw/imageAssets";
import { jigsawCustomPreset, makeJigsawImageSelectionSettings } from "./JigsawWorkspace";

describe("Jigsaw image library", () => {
  it("preserves explicit custom dimensions across image changes", () => {
    expect(makeJigsawImageSelectionSettings(defaultJigsawImageAsset, jigsawCustomPreset)).toEqual({
      imageId: defaultJigsawImageAsset.id,
    });
  });

  it("carries an active difficulty across image changes with aspect-aware dimensions", () => {
    const portrait = jigsawImageAssets.find((asset) => asset.id === "snowy-gorge");
    expect(portrait).toBeDefined();

    expect(makeJigsawImageSelectionSettings(portrait!, "Expert")).toEqual({
      imageId: "snowy-gorge",
      width: 6,
      height: 17,
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
