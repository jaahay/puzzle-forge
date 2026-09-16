import type { GeneratedPuzzle } from "../catalog/types";
import { isDailyDateStamp } from "../games/shared/daily";

export type PuzzleProvenance = {
  source: "daily";
  dateStamp: string;
};

type GeneratedPuzzleWithProvenance = GeneratedPuzzle & {
  provenance?: PuzzleProvenance;
};

const clonePuzzleProvenance = (provenance: PuzzleProvenance): PuzzleProvenance => ({ ...provenance });

export const isPuzzleProvenance = (value: unknown): value is PuzzleProvenance => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.source === "daily" &&
    typeof candidate.dateStamp === "string" &&
    isDailyDateStamp(candidate.dateStamp);
};

export const getPuzzleProvenance = (puzzle: GeneratedPuzzle): PuzzleProvenance | undefined => {
  const provenance = (puzzle as GeneratedPuzzleWithProvenance).provenance;
  return provenance ? clonePuzzleProvenance(provenance) : undefined;
};

export const withPuzzleProvenance = (
  puzzle: GeneratedPuzzle,
  provenance?: PuzzleProvenance,
): GeneratedPuzzle => {
  const nextPuzzle = { ...puzzle } as GeneratedPuzzleWithProvenance;
  if (provenance) {
    nextPuzzle.provenance = clonePuzzleProvenance(provenance);
  } else {
    delete nextPuzzle.provenance;
  }
  return nextPuzzle;
};

export const puzzleProvenanceMatches = (
  puzzle: GeneratedPuzzle,
  provenance?: PuzzleProvenance,
) => {
  const current = getPuzzleProvenance(puzzle);
  if (!current || !provenance) return current === undefined && provenance === undefined;
  return current.source === provenance.source && current.dateStamp === provenance.dateStamp;
};
