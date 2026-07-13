import type { TilePuzzleGenerator } from "../../catalog/types";
import { createGeneratedTilePuzzle, createRandom, normalizeDimension, normalizeSeed } from "../shared";
import { getJigsawImageAsset } from "./imageAssets";

const shuffle = <T>(items: T[], seed: string) => {
  const random = createRandom(seed);
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (shuffled.every((item, index) => item === items[index]) && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
};

export const generateJigsaw: TilePuzzleGenerator = ({ seed, width, height, jigsawImageId }) => {
  const normalizedSeed = normalizeSeed(seed);
  const boundedWidth = normalizeDimension(width, 4, 2, 8);
  const boundedHeight = normalizeDimension(height, 4, 2, 8);
  const asset = getJigsawImageAsset(jigsawImageId);
  const solvedIndexes = Array.from({ length: boundedWidth * boundedHeight }, (_, index) => index);
  const shuffledIndexes = shuffle(
    solvedIndexes,
    `jigsaw:${normalizedSeed}:${boundedWidth}x${boundedHeight}:${asset.id}`,
  );
  const tiles = shuffledIndexes.map((solvedIndex, currentIndex) => ({
    id: `tile-${solvedIndex}`,
    currentIndex,
    solvedIndex,
    row: Math.floor(solvedIndex / boundedWidth),
    column: solvedIndex % boundedWidth,
  }));

  return createGeneratedTilePuzzle({
    id: `jigsaw-${asset.id}-${normalizedSeed}-${boundedWidth}x${boundedHeight}`,
    puzzleId: "jigsaw",
    title: "Jigsaw",
    seed: normalizedSeed,
    width: boundedWidth,
    height: boundedHeight,
    tiles,
    asset,
    notes: [`Square-piece Jigsaw using the bundled ${asset.title} image.`],
  });
};
