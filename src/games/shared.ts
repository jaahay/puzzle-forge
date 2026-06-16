import type { GeneratedPuzzle, PuzzleCell, PuzzleId } from "../catalog/types";

const RNG_MODULUS = 2147483647;
const RNG_MULTIPLIER = 48271;

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const normalizeDimension = (value: number, fallback: number, min: number, max: number) =>
  clamp(Math.floor(Number.isFinite(value) ? value : fallback), min, max);

const seedToState = (seed: string) => {
  let state = 17;

  for (const character of seed) {
    state = (state * 31 + (character.codePointAt(0) ?? 0)) % RNG_MODULUS;
  }

  return state === 0 ? 1 : state;
};

export const createRandom = (seed: string) => {
  let state = seedToState(seed);

  return () => {
    state = (state * RNG_MULTIPLIER) % RNG_MODULUS;
    return state / RNG_MODULUS;
  };
};

export const normalizeSeed = (seed: string) => seed.trim() || "puzzle-forge";

export const makeChecksum = (cells: PuzzleCell[]) => {
  const total = cells.reduce((sum, cell) => {
    const valueWeight = Array.from(cell.value).reduce((valueSum, character) => valueSum + character.charCodeAt(0), 0);
    const toneWeight = cell.locked ? 13 : 7;
    return sum + (valueWeight + toneWeight) * (cell.row + 1) * (cell.column + 1);
  }, 0);

  return total.toString(36).padStart(6, "0");
};

export const createGeneratedPuzzle = ({
  id,
  puzzleId,
  title,
  seed,
  width,
  height,
  cells,
  notes,
}: {
  id: string;
  puzzleId: PuzzleId;
  title: string;
  seed: string;
  width: number;
  height: number;
  cells: PuzzleCell[];
  notes: string[];
}): GeneratedPuzzle => ({
  id,
  puzzleId,
  title,
  seed,
  width,
  height,
  cells,
  checksum: makeChecksum(cells),
  createdAt: new Date().toISOString(),
  notes,
});
