import type { JigsawImageAsset } from "../../catalog/types";

export const jigsawImageCatalog = {
  "wheat-field-cypresses": {
    kind: "image",
    id: "wheat-field-cypresses",
    assetRevision: 1,
    title: "Wheat Field with Cypresses",
    alt: "A golden wheat field beneath swirling clouds, with dark green cypresses rising beside distant blue hills.",
    orientation: "landscape",
    intrinsicWidth: 4000,
    intrinsicHeight: 3184,
    files: {
      puzzle: "/jigsaw/wheat-field-cypresses/puzzle.webp",
      preview: "/jigsaw/wheat-field-cypresses/preview.webp",
      thumbnail: "/jigsaw/wheat-field-cypresses/thumbnail.webp",
    },
    credit: {
      text: "Vincent van Gogh, Wheat Field with Cypresses, 1889. The Metropolitan Museum of Art, Open Access.",
      sourceName: "The Metropolitan Museum of Art",
      sourceRecordUrl: "https://www.metmuseum.org/art/collection/search/436535",
    },
  },
} as const satisfies Record<string, JigsawImageAsset>;

export type JigsawImageAssetId = keyof typeof jigsawImageCatalog;

export const jigsawImageAssets = Object.values(jigsawImageCatalog);
export const defaultJigsawImageAsset = jigsawImageCatalog["wheat-field-cypresses"];

export const getJigsawImageAsset = (
  imageId: string | undefined,
  assetRevision?: number,
): JigsawImageAsset => {
  const asset = imageId ? jigsawImageCatalog[imageId as JigsawImageAssetId] : defaultJigsawImageAsset;

  if (!asset) {
    throw new Error(`Unknown bundled Jigsaw image: ${imageId}`);
  }

  if (assetRevision !== undefined && asset.assetRevision !== assetRevision) {
    throw new Error(`Unsupported revision ${assetRevision} for bundled Jigsaw image ${asset.id}`);
  }

  return asset;
};
