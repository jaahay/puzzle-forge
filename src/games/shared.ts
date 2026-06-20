import type { GeneratedPuzzle, GridGeneratedPuzzle, GridPuzzleClues, PuzzleCell, PuzzleDifficulty, PuzzleId } from "../catalog/types";

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

export const makeChecksumFromParts = (parts: string[]) => {
  const total = parts.reduce((sum, part, index) => {
    const valueWeight = Array.from(part).reduce((valueSum, character) => valueSum + character.charCodeAt(0), 0);
    return sum + valueWeight * (index + 1);
  }, 0);

  return total.toString(36).padStart(6, "0");
};

export const makeChecksum = (cells: PuzzleCell[]) => {
  const parts = cells.map((cell) => `${cell.row}:${cell.column}:${cell.value}:${cell.locked ? "locked" : "open"}:${cell.tone}`);

  return makeChecksumFromParts(parts);
};

export const createGeneratedPuzzle = ({
  id,
  puzzleId,
  title,
  seed,
  width,
  height,
  difficulty,
  uniqueSolution,
  cells,
  notes,
  answerKey,
  clues,
}: {
  id: string;
  puzzleId: PuzzleId;
  title: string;
  seed: string;
  width: number;
  height: number;
  difficulty?: PuzzleDifficulty;
  uniqueSolution?: boolean;
  cells: PuzzleCell[];
  notes: string[];
  answerKey?: string[];
  clues?: GridPuzzleClues;
}): GridGeneratedPuzzle => ({
  kind: "grid",
  id,
  puzzleId,
  title,
  seed,
  width,
  height,
  difficulty,
  uniqueSolution,
  cells,
  answerKey,
  clues,
  checksum: makeChecksum(cells),
  createdAt: new Date().toISOString(),
  notes,
});

