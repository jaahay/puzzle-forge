import type { SlidingPuzzleGenerator, TilePuzzlePiece } from "../../catalog/types";
import { getPuzzleImageAsset } from "../imageAssets";
import { getSlidingNeighborIndexes, isImageTileSolved } from "../imageTiles/state";
import { createRandom, makeChecksumFromParts, normalizeDimension, normalizeSeed } from "../shared";

export const slidingPuzzleMinimumAxis = 2;
export const slidingPuzzleMaximumAxis = 6;
const slidingScrambleRevision = 1;

const applyLegalScramble = (width: number, height: number, seed: string) => {
  const cellCount = width * height;
  const board: Array<number | null> = Array.from({ length: cellCount }, (_, index) =>
    index === cellCount - 1 ? null : index);
  const random = createRandom(seed);
  let emptyIndex = cellCount - 1;
  let previousEmptyIndex: number | null = null;
  const stepCount = Math.max(80, cellCount * 20);

  for (let step = 0; step < stepCount; step += 1) {
    const neighbors = getSlidingNeighborIndexes(emptyIndex, width, height);
    const candidates = previousEmptyIndex !== null && neighbors.length > 1
      ? neighbors.filter((index) => index !== previousEmptyIndex)
      : neighbors;
    const tileIndex = candidates[Math.floor(random() * candidates.length)] ?? neighbors[0];
    if (tileIndex === undefined) break;

    board[emptyIndex] = board[tileIndex];
    board[tileIndex] = null;
    previousEmptyIndex = emptyIndex;
    emptyIndex = tileIndex;
  }

  const tiles: TilePuzzlePiece[] = [];
  board.forEach((solvedIndex, currentIndex) => {
    if (solvedIndex === null) return;
    tiles.push({
      id: `tile-${solvedIndex}`,
      currentIndex,
      solvedIndex,
      row: Math.floor(solvedIndex / width),
      column: solvedIndex % width,
    });
  });

  if (isImageTileSolved(tiles, emptyIndex, cellCount)) {
    const tileIndex = getSlidingNeighborIndexes(emptyIndex, width, height)[0];
    const tile = tiles.find((candidate) => candidate.currentIndex === tileIndex);
    if (tile) {
      const oldEmptyIndex = emptyIndex;
      emptyIndex = tile.currentIndex;
      tile.currentIndex = oldEmptyIndex;
    }
  }

  return { tiles, emptyIndex };
};

export const generateSlidingPuzzle: SlidingPuzzleGenerator = ({ seed, width, height, imageId }) => {
  const normalizedSeed = normalizeSeed(seed);
  const boundedWidth = normalizeDimension(width, 4, slidingPuzzleMinimumAxis, slidingPuzzleMaximumAxis);
  const boundedHeight = normalizeDimension(height, 4, slidingPuzzleMinimumAxis, slidingPuzzleMaximumAxis);
  const asset = getPuzzleImageAsset(imageId, "sliding-puzzle");
  const scrambleIdentity = `scramble@${slidingScrambleRevision}`;
  const { tiles, emptyIndex } = applyLegalScramble(
    boundedWidth,
    boundedHeight,
    `sliding-puzzle:${scrambleIdentity}:${normalizedSeed}:${boundedWidth}x${boundedHeight}:${asset.id}`,
  );

  return {
    kind: "tiles",
    id: `sliding-puzzle-${asset.id}-${scrambleIdentity}-${normalizedSeed}-${boundedWidth}x${boundedHeight}`,
    puzzleId: "sliding-puzzle",
    title: "Sliding Puzzle",
    seed: normalizedSeed,
    width: boundedWidth,
    height: boundedHeight,
    tiles,
    asset,
    emptyIndex,
    checksum: makeChecksumFromParts([
      `asset:${asset.id}`,
      `empty:${emptyIndex}`,
      ...tiles.map((tile) => `${tile.id}:${tile.currentIndex}:${tile.solvedIndex}`),
    ]),
    createdAt: new Date().toISOString(),
    notes: [
      `Sliding Puzzle using the bundled ${asset.title} image.`,
      "Scrambled from the solved board through legal moves, so the generated position is reachable.",
    ],
  };
};
