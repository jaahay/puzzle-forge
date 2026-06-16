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

const MIN_SIZE = 4;
const MAX_SIZE = 12;
const RNG_MODULUS = 2147483647;
const RNG_MULTIPLIER = 48271;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeDimension = (value: number) => clamp(Math.floor(Number.isFinite(value) ? value : MIN_SIZE), MIN_SIZE, MAX_SIZE);

const seedToState = (seed: string) => {
  let state = 17;

  for (const character of seed) {
    state = (state * 31 + character.codePointAt(0)!) % RNG_MODULUS;
  }

  return state === 0 ? 1 : state;
};

const createRandom = (seed: string) => {
  let state = seedToState(seed);

  return () => {
    state = (state * RNG_MULTIPLIER) % RNG_MODULUS;
    return state / RNG_MODULUS;
  };
};

const makeChecksum = (cells: PuzzleCell[]) => {
  const total = cells.reduce((sum, cell) => {
    const lockWeight = cell.locked ? 11 : 5;
    return sum + (cell.value + lockWeight) * (cell.row + 1) * (cell.column + 1);
  }, 0);

  return total.toString(36).padStart(6, "0");
};

const getClueDensity = (width: number, height: number) => {
  const area = width * height;

  if (area <= 25) {
    return 0.58;
  }

  if (area <= 64) {
    return 0.5;
  }

  return 0.43;
};

export const generatePuzzle = ({ id, seed, width, height }: PuzzleRequest): Puzzle => {
  const boundedWidth = normalizeDimension(width);
  const boundedHeight = normalizeDimension(height);
  const random = createRandom(`${seed.trim() || "puzzle-forge"}:${boundedWidth}x${boundedHeight}`);
  const clueDensity = getClueDensity(boundedWidth, boundedHeight);

  const cells: PuzzleCell[] = Array.from({ length: boundedWidth * boundedHeight }, (_, index) => {
    const row = Math.floor(index / boundedWidth);
    const column = index % boundedWidth;
    const diagonalBias = row === column || row + column === boundedWidth - 1 ? 1 : 0;
    const value = 1 + ((Math.floor(random() * 9) + diagonalBias) % 9);
    const locked = random() < clueDensity;

    return { row, column, value, locked };
  });

  const lockedCells = cells.filter((cell) => cell.locked).length;

  if (lockedCells === 0) {
    cells[0] = { ...cells[0], locked: true };
  }

  if (lockedCells === cells.length) {
    cells[cells.length - 1] = { ...cells[cells.length - 1], locked: false };
  }

  return {
    id,
    seed: seed.trim() || "puzzle-forge",
    width: boundedWidth,
    height: boundedHeight,
    cells,
    checksum: makeChecksum(cells),
    createdAt: new Date().toISOString(),
  };
};
