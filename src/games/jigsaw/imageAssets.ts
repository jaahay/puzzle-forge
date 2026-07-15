import type { JigsawImageAsset } from "../../catalog/types";

export const jigsawImageCatalog = {
  "aurora-lake": {
    kind: "image",
    id: "aurora-lake",
    assetRevision: 1,
    title: "Aurora Lake",
    alt: "A geometric night landscape with an aurora above mountains and a lake.",
    orientation: "square",
    intrinsicWidth: 1200,
    intrinsicHeight: 1200,
    files: {
      puzzle: "/jigsaw/aurora-lake.svg",
      preview: "/jigsaw/aurora-lake.svg",
      thumbnail: "/jigsaw/aurora-lake.svg",
    },
    credit: {
      text: "Puzzle Forge original artwork",
      sourceName: "Puzzle Forge",
    },
  },
} as const satisfies Record<string, JigsawImageAsset>;

export type JigsawImageAssetId = keyof typeof jigsawImageCatalog;

export const jigsawImageAssets = Object.values(jigsawImageCatalog);
export const defaultJigsawImageAsset = jigsawImageCatalog["aurora-lake"];

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
