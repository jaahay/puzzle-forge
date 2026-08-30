import { getPuzzleDefinition } from "../catalog/puzzleCatalog";
import type { PuzzleDifficulty, PuzzleId, SolitaireRedealLimit, SolitaireVariation, SudokuVariation } from "../catalog/types";
import { solitaireRedealLimits } from "../games/solitaire/variation";
import { puzzleIds } from "./sessionConstants";
import type { NextPuzzleDraft } from "./generationSettings";

const storageKey = "puzzle-forge.next-puzzle-drafts.v1";
const schemaVersion = 1;
const puzzleDifficulties = ["Easy", "Medium", "Hard", "Expert"] as const satisfies readonly PuzzleDifficulty[];

export type NextPuzzleDraftCache = Partial<Record<PuzzleId, NextPuzzleDraft>>;

type PersistedNextPuzzleDrafts = {
  schemaVersion: typeof schemaVersion;
  drafts: NextPuzzleDraftCache;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPuzzleDifficulty = (value: unknown): value is PuzzleDifficulty =>
  typeof value === "string" && puzzleDifficulties.includes(value as PuzzleDifficulty);

const isSudokuVariation = (value: unknown): value is SudokuVariation =>
  value === "classic" || value === "diagonal" || value === "zero-killer";

const isSolitaireRedealLimit = (value: unknown): value is SolitaireRedealLimit =>
  solitaireRedealLimits.includes(value as SolitaireRedealLimit);

const isSolitaireVariation = (value: unknown): value is SolitaireVariation =>
  isRecord(value) &&
  (value.drawMode === "draw-1" || value.drawMode === "draw-3") &&
  isSolitaireRedealLimit(value.redeals) &&
  (value.wasteMode === "standard" || value.wasteMode === "relaxed") &&
  typeof value.knownSolvable === "boolean";

const isDimensionForPuzzle = (puzzleId: PuzzleId, axis: "width" | "height", value: unknown): value is number => {
  if (typeof value !== "number" || !Number.isInteger(value)) return false;
  const definition = getPuzzleDefinition(puzzleId);
  const minimum = axis === "width" ? definition.minWidth : definition.minHeight;
  const maximum = axis === "width" ? definition.maxWidth : definition.maxHeight;
  return value >= minimum && value <= maximum;
};

const parseDraft = (puzzleId: PuzzleId, value: unknown): NextPuzzleDraft | null => {
  if (
    !isRecord(value) ||
    !isDimensionForPuzzle(puzzleId, "width", value.width) ||
    !isDimensionForPuzzle(puzzleId, "height", value.height) ||
    !isPuzzleDifficulty(value.difficulty) ||
    typeof value.requireUniqueSolution !== "boolean" ||
    !isSudokuVariation(value.sudokuVariation) ||
    !isSolitaireVariation(value.solitaireVariation)
  ) {
    return null;
  }

  return {
    width: value.width,
    height: value.height,
    difficulty: value.difficulty,
    requireUniqueSolution: value.requireUniqueSolution,
    sudokuVariation: value.sudokuVariation,
    solitaireVariation: { ...value.solitaireVariation },
  };
};

export const parseNextPuzzleDraftCache = (value: unknown): NextPuzzleDraftCache => {
  if (!isRecord(value) || value.schemaVersion !== schemaVersion || !isRecord(value.drafts)) return {};

  const drafts: NextPuzzleDraftCache = {};
  for (const puzzleId of puzzleIds) {
    const draft = parseDraft(puzzleId, value.drafts[puzzleId]);
    if (draft) drafts[puzzleId] = draft;
  }
  return drafts;
};

export const loadNextPuzzleDraftCache = (): NextPuzzleDraftCache => {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? parseNextPuzzleDraftCache(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
};

export const saveNextPuzzleDraftCache = (drafts: NextPuzzleDraftCache) => {
  if (typeof window === "undefined") return;

  const validatedDrafts = parseNextPuzzleDraftCache({ schemaVersion, drafts });
  const envelope: PersistedNextPuzzleDrafts = { schemaVersion, drafts: validatedDrafts };

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(envelope));
  } catch {
    // Generation preferences are optional; gameplay remains available without browser storage.
  }
};
