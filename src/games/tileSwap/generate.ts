import type { TilePuzzlePiece, TileSwapPuzzleGenerator } from "../../catalog/types";
import { getPuzzleImageAsset } from "../imageAssets";
import { createRandom, makeChecksumFromParts, normalizeDimension, normalizeSeed } from "../shared";

export const tileSwapMinimumAxis = 2;
export const tileSwapMaximumAxis = 8;

const shuffleIndexes = (indexes: readonly number[], seed: string) => {
  const random = createRandom(seed);
  const shuffled = [...indexes];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (shuffled.length > 1 && shuffled.every((value, index) => value === indexes[index])) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
};

export const generateTileSwap: TileSwapPuzzleGenerator = ({ seed, width, height, imageId }) => {
  const normalizedSeed = normalizeSeed(seed);
  const boundedWidth = normalizeDimension(width, 4, tileSwapMinimumAxis, tileSwapMaximumAxis);
  const boundedHeight = normalizeDimension(height, 4, tileSwapMinimumAxis, tileSwapMaximumAxis);
  const asset = getPuzzleImageAsset(imageId, "tile-swap");
  const solvedIndexes = Array.from({ length: boundedWidth * boundedHeight }, (_, index) => index);
  const shuffledIndexes = shuffleIndexes(
    solvedIndexes,
    `tile-swap:${normalizedSeed}:${boundedWidth}x${boundedHeight}:${asset.id}`,
  );
  const tiles: TilePuzzlePiece[] = shuffledIndexes.map((solvedIndex, currentIndex) => ({
    id: `tile-${solvedIndex}`,
    currentIndex,
    solvedIndex,
    row: Math.floor(solvedIndex / boundedWidth),
    column: solvedIndex % boundedWidth,
  }));

  return {
    kind: "tiles",
    id: `tile-swap-${asset.id}-${normalizedSeed}-${boundedWidth}x${boundedHeight}`,
    puzzleId: "tile-swap",
    title: "Tile Swap",
    seed: normalizedSeed,
    width: boundedWidth,
    height: boundedHeight,
    tiles,
    asset,
    checksum: makeChecksumFromParts([
      `asset:${asset.id}`,
      ...tiles.map((tile) => `${tile.id}:${tile.currentIndex}:${tile.solvedIndex}`),
    ]),
    createdAt: new Date().toISOString(),
    notes: [`Tile Swap using the bundled ${asset.title} image.`],
  };
};
