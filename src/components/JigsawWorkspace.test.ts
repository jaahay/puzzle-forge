import { describe, expect, it } from "vitest";
import { defaultJigsawImageAsset, jigsawImageAssets } from "../games/jigsaw/imageAssets";
import { makeJigsawImageSelectionSettings } from "./JigsawWorkspace";

describe("Jigsaw image library", () => {
  it("converts a catalog asset into revision-pinned generation settings", () => {
    expect(makeJigsawImageSelectionSettings(defaultJigsawImageAsset)).toEqual({
      jigsawImageId: defaultJigsawImageAsset.id,
      jigsawAssetRevision: defaultJigsawImageAsset.assetRevision,
    });
  });

  it("exposes unique revisioned entries for the picker", () => {
    const identities = jigsawImageAssets.map((asset) => `${asset.id}@${asset.assetRevision}`);
    expect(new Set(identities).size).toBe(identities.length);
    expect(jigsawImageAssets.every((asset) => asset.files.thumbnail.length > 0)).toBe(true);
  });
});
