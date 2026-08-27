import type { ImageBackedPuzzleId, PuzzleId, PuzzleImageAsset } from "../catalog/types";
import {
  defaultJigsawImageAsset,
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
  const eligibleAssets = getPuzzleImageAssetsFor(puzzleId);
  if (eligibleAssets.length === 0) {
    throw new Error(`No bundled artwork is available for ${puzzleId}.`);
  }

  if (!imageId) {
    return eligibleAssets[0];
  }

  const asset = eligibleAssets.find((candidate) => candidate.id === imageId);
  if (!asset) {
    if (puzzleId === "jigsaw") {
      throw new Error(`Unknown bundled Jigsaw image: ${imageId}`);
    }
    throw new Error(`Unknown or unavailable bundled artwork for ${puzzleId}: ${imageId}`);
  }

  return asset;
};

export const getSurprisePuzzleImageAsset = (
  puzzleId: ImageBackedPuzzleId,
  currentImageId: string | undefined,
  randomValue = Math.random(),
): PuzzleImageAsset => {
  const eligibleAssets = getPuzzleImageAssetsFor(puzzleId);
  if (eligibleAssets.length === 0) {
    throw new Error(`No bundled artwork is available for ${puzzleId}.`);
  }

  const candidates = eligibleAssets.length > 1
    ? eligibleAssets.filter((asset) => asset.id !== currentImageId)
    : eligibleAssets;
  const boundedRandomValue = Number.isFinite(randomValue)
    ? Math.min(Math.max(randomValue, 0), 0.9999999999999999)
    : 0;

  return candidates[Math.floor(boundedRandomValue * candidates.length)] ?? candidates[0];
};
