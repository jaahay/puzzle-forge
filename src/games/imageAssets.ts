import type { ImageBackedPuzzleId, PuzzleId, PuzzleImageAsset } from "../catalog/types";
import {
  defaultJigsawImageAsset,
  getJigsawImageAsset,
  jigsawImageAssets,
  jigsawImageCatalog,
} from "./jigsaw/imageAssets";

export const imageBackedPuzzleIds = ["jigsaw", "tile-swap", "sliding-puzzle"] as const satisfies readonly ImageBackedPuzzleId[];

export const isImageBackedPuzzleId = (puzzleId: PuzzleId): puzzleId is ImageBackedPuzzleId =>
  imageBackedPuzzleIds.includes(puzzleId as ImageBackedPuzzleId);

export const puzzleImageCatalog = jigsawImageCatalog;
export const puzzleImageAssets: PuzzleImageAsset[] = [...jigsawImageAssets];
export const defaultPuzzleImageAsset: PuzzleImageAsset = defaultJigsawImageAsset;

export const getPuzzleImageAssetsFor = (puzzleId: ImageBackedPuzzleId) =>
  puzzleImageAssets.filter((asset) => !asset.eligiblePuzzleIds || asset.eligiblePuzzleIds.includes(puzzleId));

export const getPuzzleImageAsset = (
  imageId: string | undefined,
  puzzleId: ImageBackedPuzzleId,
): PuzzleImageAsset => {
  const asset = getJigsawImageAsset(imageId);
  if (asset.eligiblePuzzleIds && !asset.eligiblePuzzleIds.includes(puzzleId)) {
    throw new Error(`${asset.title} is not available for ${puzzleId}.`);
  }
  return asset;
};
