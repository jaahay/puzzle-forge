export type PuzzleCell = {
  row: number;
  column: number;
  value: number;
  locked: boolean;
};

export type Puzzle = {
  id: string;
  seed: string;
  width: number;
  height: number;
  cells: PuzzleCell[];
  checksum: string;
  createdAt: string;
};

export type PuzzleRequest = {
  id: string;
  seed: string;
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const scoreSeed = (seed: string) =>
  Array.from(seed).reduce((score, character, index) => score + character.charCodeAt(0) * (index + 17), 97);

const sample = (base: number, index: number) => {
  const value = Math.sin(base + index * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const makeChecksum = (cells: PuzzleCell[]) =>
  cells
    .reduce((sum, cell) => sum + (cell.value + 3) * (cell.row + 1) * (cell.column + 1), 0)
    .toString(36)
    .padStart(6, "0");

export const generatePuzzle = ({ id, seed, width, height }: PuzzleRequest): Puzzle => {
  const boundedWidth = clamp(Math.floor(width), 4, 12);
  const boundedHeight = clamp(Math.floor(height), 4, 12);
  const base = scoreSeed(`${seed}:${boundedWidth}x${boundedHeight}`);

  const cells: PuzzleCell[] = Array.from({ length: boundedWidth * boundedHeight }, (_, index) => {
    const row = Math.floor(index / boundedWidth);
    const column = index % boundedWidth;
    const value = 1 + Math.floor(sample(base, index) * 9);
    const locked = sample(base, index + 1000) > 0.46;

    return { row, column, value, locked };
  });

  if (!cells.some((cell) => cell.locked)) {
    cells[0] = { ...cells[0], locked: true };
  }

  return {
    id,
    seed,
    width: boundedWidth,
    height: boundedHeight,
    cells,
    checksum: makeChecksum(cells),
    createdAt: new Date().toISOString(),
  };
};
