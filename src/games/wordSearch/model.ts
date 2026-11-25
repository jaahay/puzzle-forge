import type { PuzzleDifficulty } from "../../catalog/types";
import type { WordSearchTheme } from "./themes";

export type WordSearchDirection = readonly [row: number, column: number];
export const allWordSearchDirections: readonly WordSearchDirection[] = [
  [0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1],
];

export type WordSearchProfile = {
  size: number;
  targetCount: number;
  maxWordLength: number;
  directions: readonly WordSearchDirection[];
  // Natural reading, reverse orthogonal, diagonal: soft distribution preferences.
  directionShares: readonly [number, number, number];
  overlapWeight: number;
  minDirections: number;
  filler: WordSearchFillerProfile;
};

export type WordSearchFillerProfile = {
  uniformShare: number;
  targetShare: number;
  nearMatches: number;
};

export const wordSearchProfiles: Record<PuzzleDifficulty, WordSearchProfile> = {
  Easy: { size: 8, targetCount: 6, maxWordLength: 6, directions: allWordSearchDirections.slice(0, 2), directionShares: [1, 0, 0], overlapWeight: 0, minDirections: 2, filler: { uniformShare: 0.45, targetShare: 0, nearMatches: 0 } },
  Medium: { size: 10, targetCount: 9, maxWordLength: 8, directions: allWordSearchDirections.slice(0, 6), directionShares: [0.65, 0.15, 0.2], overlapWeight: 1, minDirections: 3, filler: { uniformShare: 0.25, targetShare: 0.25, nearMatches: 1 } },
  Hard: { size: 10, targetCount: 10, maxWordLength: 8, directions: allWordSearchDirections, directionShares: [0.45, 0.25, 0.3], overlapWeight: 3, minDirections: 4, filler: { uniformShare: 0.15, targetShare: 0.5, nearMatches: 2 } },
  Expert: { size: 12, targetCount: 12, maxWordLength: 10, directions: allWordSearchDirections, directionShares: [0.3, 0.2, 0.5], overlapWeight: 5, minDirections: 5, filler: { uniformShare: 0.1, targetShare: 0.75, nearMatches: 3 } },
};

export type WordSearchTarget = {
  word: string;
  start: number;
  end: number;
};

export type WordSearchBoard = {
  seed: string;
  difficulty: PuzzleDifficulty;
  theme: WordSearchTheme;
  size: number;
  letters: readonly string[];
  targets: readonly WordSearchTarget[];
  checksum: string;
};

// Cells use a single row-major index. Endpoints can describe either reading direction.
export const wordSearchPath = (size: number, start: number, end: number): number[] => {
  if (!Number.isInteger(size) || size < 1 || !Number.isInteger(start) || !Number.isInteger(end)
      || start < 0 || end < 0 || start >= size * size || end >= size * size) return [];
  const rowDelta = Math.floor(end / size) - Math.floor(start / size);
  const columnDelta = end % size - start % size;
  if (rowDelta !== 0 && columnDelta !== 0 && Math.abs(rowDelta) !== Math.abs(columnDelta)) return [];
  const step = Math.sign(rowDelta) * size + Math.sign(columnDelta);
  return Array.from({ length: Math.max(Math.abs(rowDelta), Math.abs(columnDelta)) + 1 },
    (_, i) => start + i * step);
};

// Project a drag onto the nearest of eight rays and clamp it inside the board.
// The resulting preview is exactly the path that will be submitted.
export const snapWordSearchEnd = (size: number, start: number, row: number, column: number): number => {
  if (!Number.isInteger(start) || start < 0 || start >= size * size || !Number.isFinite(row) || !Number.isFinite(column)) return start;
  const r = Math.floor(start / size), c = start % size;
  const dr = row - r, dc = column - c;
  if (dr === 0 && dc === 0) return start;
  let best = allWordSearchDirections[0]!;
  let score = -Infinity;
  for (const dir of allWordSearchDirections) {
    const projection = (dr * dir[0] + dc * dir[1]) / Math.hypot(...dir);
    if (projection > score) { score = projection; best = dir; }
  }
  const [vr, vc] = best;
  const steps = Math.max(0, Math.round((dr * vr + dc * vc) / (vr * vr + vc * vc)));
  const rowLimit = vr === 0 ? Infinity : vr > 0 ? size - 1 - r : r;
  const colLimit = vc === 0 ? Infinity : vc > 0 ? size - 1 - c : c;
  return start + Math.min(steps, rowLimit, colLimit) * (vr * size + vc);
};
