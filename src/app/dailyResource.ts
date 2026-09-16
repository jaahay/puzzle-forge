import { getPuzzleDefinition, isGeneratable } from "../catalog/puzzleCatalog";
import type {
  PuzzleDifficulty,
  PuzzleId,
  SolitaireRedealLimit,
  SolitaireVariation,
  SudokuVariation,
} from "../catalog/types";
import { getPuzzleImageAsset, isImageBackedPuzzleId } from "../games/imageAssets";
import {
  defaultSolitaireVariation,
  solitaireRedealLimits,
} from "../games/solitaire/variation";
import {
  defaultSudokuVariation,
  sudokuVariations,
} from "../games/sudoku/variation";
import type { GenerationIdentity, GenerationRuntimeSettings } from "./generationIdentity";
import { resolveGenerationIdentity, type GenerationSettings } from "./generationSettings";
import { encodeGenerationId, type PuzzleResourceIdentity } from "./puzzleResourceIdentity";
import { defaultPuzzleDifficulty } from "./runtime";

export type DailyResourceQueryResult =
  | { ok: true; query: string; settings: GenerationSettings }
  | { ok: false; reason: "invalid-query" };

export type DailyResourceResolution =
  | {
      ok: true;
      identity: GenerationIdentity;
      canonicalResource: PuzzleResourceIdentity;
      query: string;
    }
  | { ok: false; reason: "invalid-date" | "invalid-query" | "unavailable" };

const difficulties = ["Easy", "Medium", "Hard", "Expert"] as const satisfies readonly PuzzleDifficulty[];
const difficultyByQueryValue = new Map(difficulties.map((difficulty) => [difficulty.toLowerCase(), difficulty]));
const dailyDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const sizePattern = /^(\d+)x(\d+)$/;
const queryKeyOrder = [
  "size",
  "difficulty",
  "variation",
  "unique",
  "image",
  "draw",
  "redeals",
  "waste",
  "solvable",
] as const;

const isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
const daysInMonth = (year: number, month: number) => [
  31,
  isLeapYear(year) ? 29 : 28,
  31,
  30,
  31,
  30,
  31,
  31,
  30,
  31,
  30,
  31,
][month - 1] ?? 0;

export const isDailyResourceDate = (dateStamp: string) => {
  if (!dailyDatePattern.test(dateStamp)) return false;
  const [year, month, day] = dateStamp.split("-").map(Number);
  return year >= 0 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
};

const makeDefaultRuntimeSettings = (puzzleId: PuzzleId): GenerationRuntimeSettings => {
  const definition = getPuzzleDefinition(puzzleId);
  return {
    seed: "",
    width: definition.defaultWidth,
    height: definition.defaultHeight,
    difficulty: defaultPuzzleDifficulty,
    requireUniqueSolution: true,
    sudokuVariation: defaultSudokuVariation,
    solitaireVariation: defaultSolitaireVariation,
  };
};

const resolveDailyIdentity = (
  puzzleId: PuzzleId,
  dateStamp: string,
  settings: GenerationSettings = {},
): GenerationIdentity => resolveGenerationIdentity({
  puzzleId,
  currentPuzzle: null,
  runtimeSettings: makeDefaultRuntimeSettings(puzzleId),
  settings: {
    ...settings,
    seed: undefined,
    provenance: { source: "daily", dateStamp },
  },
  makeSeed: () => "daily",
});

const parseBoolean = (value: string) => value === "true" ? true : value === "false" ? false : null;

const allowedQueryKeys = (puzzleId: PuzzleId): ReadonlySet<string> => {
  switch (puzzleId) {
    case "sudoku":
      return new Set(["difficulty", "variation"]);
    case "nonogram":
      return new Set(["size", "difficulty", "unique"]);
    case "word-guess":
    case "logic-grid":
      return new Set(["size"]);
    case "jigsaw":
    case "tile-swap":
    case "sliding-puzzle":
      return new Set(["size", "image"]);
    case "klondike-solitaire":
      return new Set(["draw", "redeals", "waste", "solvable"]);
    case "futoshiki":
      return new Set(["difficulty"]);
    case "kenken":
    case "minesweeper":
    case "slitherlink":
      return new Set(["size", "difficulty", "unique"]);
    case "peg-solitaire":
      return new Set();
  }
};

const appendCanonicalQuery = (identity: GenerationIdentity) => {
  const definition = getPuzzleDefinition(identity.puzzleId);
  const values = new Map<string, string>();

  switch (identity.puzzleId) {
    case "sudoku":
      if (identity.difficulty !== defaultPuzzleDifficulty) values.set("difficulty", identity.difficulty.toLowerCase());
      if (identity.sudokuVariation !== defaultSudokuVariation) values.set("variation", identity.sudokuVariation);
      break;
    case "nonogram":
      if (identity.width !== definition.defaultWidth || identity.height !== definition.defaultHeight) {
        values.set("size", `${identity.width}x${identity.height}`);
      }
      if (identity.difficulty !== defaultPuzzleDifficulty) values.set("difficulty", identity.difficulty.toLowerCase());
      if (!identity.requireUniqueSolution) values.set("unique", "false");
      break;
    case "word-guess":
    case "logic-grid":
      if (identity.width !== definition.defaultWidth || identity.height !== definition.defaultHeight) {
        values.set("size", `${identity.width}x${identity.height}`);
      }
      break;
    case "jigsaw":
    case "tile-swap":
    case "sliding-puzzle": {
      if (identity.width !== definition.defaultWidth || identity.height !== definition.defaultHeight) {
        values.set("size", `${identity.width}x${identity.height}`);
      }
      const defaultImageId = getPuzzleImageAsset(undefined, identity.puzzleId).id;
      const imageId = getPuzzleImageAsset(identity.imageId, identity.puzzleId).id;
      if (imageId !== defaultImageId) values.set("image", imageId);
      break;
    }
    case "klondike-solitaire": {
      const variation = identity.solitaireVariation;
      if (variation.drawMode !== defaultSolitaireVariation.drawMode) values.set("draw", variation.drawMode === "draw-3" ? "3" : "1");
      if (variation.redeals !== defaultSolitaireVariation.redeals) values.set("redeals", String(variation.redeals));
      if (variation.wasteMode !== defaultSolitaireVariation.wasteMode) values.set("waste", variation.wasteMode);
      if (variation.knownSolvable !== defaultSolitaireVariation.knownSolvable) values.set("solvable", String(variation.knownSolvable));
      break;
    }
    case "futoshiki":
      if (identity.difficulty !== defaultPuzzleDifficulty) values.set("difficulty", identity.difficulty.toLowerCase());
      break;
    case "kenken":
    case "minesweeper":
    case "slitherlink":
      if (identity.width !== definition.defaultWidth || identity.height !== definition.defaultHeight) {
        values.set("size", `${identity.width}x${identity.height}`);
      }
      if (identity.difficulty !== defaultPuzzleDifficulty) values.set("difficulty", identity.difficulty.toLowerCase());
      if (!identity.requireUniqueSolution) values.set("unique", "false");
      break;
    case "peg-solitaire":
      break;
  }

  const params = new URLSearchParams();
  queryKeyOrder.forEach((key) => {
    const value = values.get(key);
    if (value !== undefined) params.set(key, value);
  });
  return params.toString();
};

export const canonicalizeDailyResourceQuery = (
  puzzleId: PuzzleId,
  search: string,
): DailyResourceQueryResult => {
  const source = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(source);
  const allowed = allowedQueryKeys(puzzleId);
  const seen = new Set<string>();

  for (const [key] of params) {
    if (!allowed.has(key) || seen.has(key)) return { ok: false, reason: "invalid-query" };
    seen.add(key);
  }

  const definition = getPuzzleDefinition(puzzleId);
  const settings: GenerationSettings = {};

  if (params.has("size")) {
    const match = sizePattern.exec(params.get("size") ?? "");
    if (!match) return { ok: false, reason: "invalid-query" };
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (
      width < definition.minWidth || width > definition.maxWidth ||
      height < definition.minHeight || height > definition.maxHeight
    ) return { ok: false, reason: "invalid-query" };
    settings.width = width;
    settings.height = height;
  }

  if (params.has("difficulty")) {
    const difficulty = difficultyByQueryValue.get(params.get("difficulty") ?? "");
    if (!difficulty) return { ok: false, reason: "invalid-query" };
    settings.difficulty = difficulty;
  }

  if (params.has("variation")) {
    const variation = params.get("variation") as SudokuVariation | null;
    if (!variation || !sudokuVariations.includes(variation)) return { ok: false, reason: "invalid-query" };
    settings.sudokuVariation = variation;
  }

  if (params.has("unique")) {
    const unique = parseBoolean(params.get("unique") ?? "");
    if (unique === null) return { ok: false, reason: "invalid-query" };
    settings.requireUniqueSolution = unique;
  }

  if (params.has("image")) {
    if (!isImageBackedPuzzleId(puzzleId)) return { ok: false, reason: "invalid-query" };
    try {
      settings.imageId = getPuzzleImageAsset(params.get("image") ?? undefined, puzzleId).id;
    } catch {
      return { ok: false, reason: "invalid-query" };
    }
  }

  if (puzzleId === "klondike-solitaire") {
    const variation: SolitaireVariation = { ...defaultSolitaireVariation };
    if (params.has("draw")) {
      const draw = params.get("draw");
      if (draw !== "1" && draw !== "3") return { ok: false, reason: "invalid-query" };
      variation.drawMode = draw === "3" ? "draw-3" : "draw-1";
    }
    if (params.has("redeals")) {
      const value = params.get("redeals") ?? "";
      const redeals: SolitaireRedealLimit = value === "unlimited" ? "unlimited" : Number(value) as SolitaireRedealLimit;
      if (!solitaireRedealLimits.includes(redeals)) return { ok: false, reason: "invalid-query" };
      variation.redeals = redeals;
    }
    if (params.has("waste")) {
      const waste = params.get("waste");
      if (waste !== "standard" && waste !== "relaxed") return { ok: false, reason: "invalid-query" };
      variation.wasteMode = waste;
    }
    if (params.has("solvable")) {
      const solvable = parseBoolean(params.get("solvable") ?? "");
      if (solvable === null) return { ok: false, reason: "invalid-query" };
      variation.knownSolvable = solvable;
    }
    settings.solitaireVariation = variation;
  }

  try {
    const identity = resolveDailyIdentity(puzzleId, "2000-01-01", settings);
    return { ok: true, query: appendCanonicalQuery(identity), settings };
  } catch {
    return { ok: false, reason: "invalid-query" };
  }
};

export const makeDailyResourceQuery = (
  puzzleId: PuzzleId,
  settings: GenerationSettings = {},
) => appendCanonicalQuery(resolveDailyIdentity(puzzleId, "2000-01-01", settings));

export const makeDailyResourceLocatorPath = (identity: GenerationIdentity) => {
  const provenance = identity.provenance;
  if (provenance?.source !== "daily") return null;
  const query = appendCanonicalQuery(identity);
  const pathname = `/${identity.puzzleId}/daily/${provenance.dateStamp}`;
  return query ? `${pathname}?${query}` : pathname;
};

export const resolveDailyResource = (
  puzzleId: PuzzleId,
  dateStamp: string,
  search = "",
): DailyResourceResolution => {
  const definition = getPuzzleDefinition(puzzleId);
  if (!isGeneratable(definition)) return { ok: false, reason: "unavailable" };
  if (!isDailyResourceDate(dateStamp)) return { ok: false, reason: "invalid-date" };

  const parsed = canonicalizeDailyResourceQuery(puzzleId, search);
  if (!parsed.ok) return parsed;

  try {
    const identity = resolveDailyIdentity(puzzleId, dateStamp, parsed.settings);
    const generationId = encodeGenerationId(identity);
    return {
      ok: true,
      identity,
      canonicalResource: { puzzleId, generationId },
      query: appendCanonicalQuery(identity),
    };
  } catch {
    return { ok: false, reason: "invalid-query" };
  }
};
