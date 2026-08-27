import type { TilePuzzlePiece } from "../../catalog/types";

export const getSlidingNeighborIndexes = (
  index: number,
  width: number,
  height: number,
): number[] => {
  const row = Math.floor(index / width);
  const column = index % width;
  const neighbors: number[] = [];

  if (row > 0) neighbors.push(index - width);
  if (column < width - 1) neighbors.push(index + 1);
  if (row < height - 1) neighbors.push(index + width);
  if (column > 0) neighbors.push(index - 1);

  return neighbors;
};

export const hasUniqueTilePositions = (
  tiles: readonly TilePuzzlePiece[],
  boardCellCount: number,
) => {
  const positions = tiles.map((tile) => tile.currentIndex);
  return positions.every((position) => Number.isInteger(position) && position >= 0 && position < boardCellCount) &&
    new Set(positions).size === positions.length;
};

export const isImageTileSolved = (
  tiles: readonly TilePuzzlePiece[],
  emptyIndex?: number,
  boardCellCount?: number,
) => {
  const tilesSolved = tiles.every((tile) => tile.currentIndex === tile.solvedIndex);
  if (!tilesSolved) return false;
  if (emptyIndex === undefined || boardCellCount === undefined) return true;
  return emptyIndex === boardCellCount - 1;
};

export const swapTilePositions = (
  tiles: readonly TilePuzzlePiece[],
  firstTileId: string,
  secondTileId: string,
): TilePuzzlePiece[] => {
  if (firstTileId === secondTileId) return [...tiles];

  const first = tiles.find((tile) => tile.id === firstTileId);
  const second = tiles.find((tile) => tile.id === secondTileId);
  if (!first || !second) return [...tiles];

  return tiles.map((tile) => {
    if (tile.id === firstTileId) return { ...tile, currentIndex: second.currentIndex };
    if (tile.id === secondTileId) return { ...tile, currentIndex: first.currentIndex };
    return tile;
  });
};

export const canSlideTile = (
  tile: Pick<TilePuzzlePiece, "currentIndex">,
  emptyIndex: number,
  width: number,
  height: number,
) => getSlidingNeighborIndexes(emptyIndex, width, height).includes(tile.currentIndex);

const getSlidingLineStep = (
  tileIndex: number,
  emptyIndex: number,
  width: number,
  height: number,
): number | null => {
  const cellCount = width * height;
  if (
    !Number.isInteger(tileIndex) ||
    !Number.isInteger(emptyIndex) ||
    tileIndex < 0 ||
    tileIndex >= cellCount ||
    emptyIndex < 0 ||
    emptyIndex >= cellCount ||
    tileIndex === emptyIndex
  ) return null;

  const tileRow = Math.floor(tileIndex / width);
  const emptyRow = Math.floor(emptyIndex / width);
  if (tileRow === emptyRow) return 1;
  if (tileIndex % width === emptyIndex % width) return width;
  return null;
};

export const canSlideTileTowardGap = (
  tile: Pick<TilePuzzlePiece, "currentIndex">,
  emptyIndex: number,
  width: number,
  height: number,
) => getSlidingLineStep(tile.currentIndex, emptyIndex, width, height) !== null;

export const slideTileTowardGap = (
  tiles: readonly TilePuzzlePiece[],
  tileId: string,
  emptyIndex: number,
  width: number,
  height: number,
): { tiles: TilePuzzlePiece[]; emptyIndex: number; moved: boolean } => {
  const tile = tiles.find((candidate) => candidate.id === tileId);
  if (!tile) return { tiles: [...tiles], emptyIndex, moved: false };

  const step = getSlidingLineStep(tile.currentIndex, emptyIndex, width, height);
  if (step === null) return { tiles: [...tiles], emptyIndex, moved: false };

  const shift = tile.currentIndex < emptyIndex ? step : -step;
  const shiftedIndexes = new Set<number>();
  for (let index = tile.currentIndex; index !== emptyIndex; index += shift) {
    shiftedIndexes.add(index);
  }

  const occupiedIndexes = new Set(tiles.map((candidate) => candidate.currentIndex));
  if ([...shiftedIndexes].some((index) => !occupiedIndexes.has(index))) {
    return { tiles: [...tiles], emptyIndex, moved: false };
  }

  return {
    tiles: tiles.map((candidate) => shiftedIndexes.has(candidate.currentIndex)
      ? { ...candidate, currentIndex: candidate.currentIndex + shift }
      : candidate),
    emptyIndex: tile.currentIndex,
    moved: true,
  };
};

export const slideTileIntoGap = (
  tiles: readonly TilePuzzlePiece[],
  tileId: string,
  emptyIndex: number,
  width: number,
  height: number,
): { tiles: TilePuzzlePiece[]; emptyIndex: number; moved: boolean } => {
  const tile = tiles.find((candidate) => candidate.id === tileId);
  if (!tile || !canSlideTile(tile, emptyIndex, width, height)) {
    return { tiles: [...tiles], emptyIndex, moved: false };
  }

  const nextEmptyIndex = tile.currentIndex;
  return {
    tiles: tiles.map((candidate) => candidate.id === tileId
      ? { ...candidate, currentIndex: emptyIndex }
      : candidate),
    emptyIndex: nextEmptyIndex,
    moved: true,
  };
};
