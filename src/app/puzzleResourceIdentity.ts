import { getPuzzleDefinition } from "../catalog/puzzleCatalog";
import type {
  PuzzleDifficulty,
  PuzzleId,
  SolitaireRedealLimit,
  SolitaireVariation,
  SudokuVariation,
} from "../catalog/types";
import { getPuzzleImageAsset } from "../games/imageAssets";
import { normalizeSeed } from "../games/shared";
import {
  defaultSolitaireVariation,
  normalizeSolitaireVariation,
  solitaireRedealLimits,
} from "../games/solitaire/variation";
import {
  defaultSudokuVariation,
  normalizeSudokuVariation,
  sudokuVariations,
} from "../games/sudoku/variation";
import type { GenerationIdentity } from "./generationIdentity";
import { isPuzzleProvenance, type PuzzleProvenance } from "./puzzleProvenance";
import { defaultPuzzleDifficulty } from "./runtime";

type WireSolitaireVariation = [
  drawMode: SolitaireVariation["drawMode"],
  redeals: SolitaireRedealLimit,
  wasteMode: SolitaireVariation["wasteMode"],
  knownSolvable: 0 | 1,
];

type WireGenerationIdentity = {
  s: string;
  w?: number;
  h?: number;
  d?: PuzzleDifficulty;
  u?: 0 | 1;
  x?: SudokuVariation;
  l?: WireSolitaireVariation;
  i?: string;
  o?: PuzzleProvenance;
};

export type PuzzleResourceKey = `${PuzzleId}/${string}`;

export type PuzzleResourceIdentity = {
  puzzleId: PuzzleId;
  generationId: string;
};

export type GenerationIdDecodeResult =
  | { ok: true; identity: GenerationIdentity }
  | { ok: false; reason: "malformed" | "invalid-identity" };

const puzzleDifficulties = new Set<PuzzleDifficulty>(["Easy", "Medium", "Hard", "Expert"]);
const sudokuVariationSet = new Set<SudokuVariation>(sudokuVariations);
const solitaireRedealLimitSet = new Set<SolitaireRedealLimit>(solitaireRedealLimits);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(`${base64}${padding}`);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const solitaireVariationToWire = (variation: SolitaireVariation): WireSolitaireVariation => [
  variation.drawMode,
  variation.redeals,
  variation.wasteMode,
  variation.knownSolvable ? 1 : 0,
];

const isWireSolitaireVariation = (value: unknown): value is WireSolitaireVariation =>
  Array.isArray(value) &&
  value.length === 4 &&
  (value[0] === "draw-1" || value[0] === "draw-3") &&
  solitaireRedealLimitSet.has(value[1] as SolitaireRedealLimit) &&
  (value[2] === "standard" || value[2] === "relaxed") &&
  (value[3] === 0 || value[3] === 1);

const solitaireVariationFromWire = (wire: WireSolitaireVariation): SolitaireVariation => ({
  drawMode: wire[0],
  redeals: wire[1],
  wasteMode: wire[2],
  knownSolvable: wire[3] === 1,
});

const withProvenance = (
  wire: Omit<WireGenerationIdentity, "o">,
  provenance: PuzzleProvenance | undefined,
): WireGenerationIdentity => provenance ? { ...wire, o: provenance } : wire;

const identityToWire = (identity: GenerationIdentity): WireGenerationIdentity => {
  const seed = normalizeSeed(identity.seed);

  switch (identity.puzzleId) {
    case "sudoku":
      return withProvenance({
        s: seed,
        d: identity.difficulty,
        x: normalizeSudokuVariation(identity.sudokuVariation),
      }, identity.provenance);
    case "nonogram":
      return withProvenance({
        s: seed,
        w: identity.width,
        h: identity.height,
        d: identity.difficulty,
        u: identity.requireUniqueSolution ? 1 : 0,
      }, identity.provenance);
    case "word-guess":
    case "logic-grid":
      return withProvenance({
        s: seed,
        w: identity.width,
        h: identity.height,
      }, identity.provenance);
    case "jigsaw":
    case "tile-swap":
    case "sliding-puzzle":
      return withProvenance({
        s: seed,
        w: identity.width,
        h: identity.height,
        i: getPuzzleImageAsset(identity.imageId, identity.puzzleId).id,
      }, identity.provenance);
    case "klondike-solitaire":
      return withProvenance({
        s: seed,
        l: solitaireVariationToWire(normalizeSolitaireVariation(identity.solitaireVariation)),
      }, identity.provenance);
    case "peg-solitaire":
      return withProvenance({ s: seed }, identity.provenance);
    case "futoshiki":
      return withProvenance({
        s: seed,
        d: identity.difficulty,
      }, identity.provenance);
    case "kenken":
    case "minesweeper":
    case "slitherlink":
      return withProvenance({
        s: seed,
        w: identity.width,
        h: identity.height,
        d: identity.difficulty,
        u: identity.requireUniqueSolution ? 1 : 0,
      }, identity.provenance);
  }
};

export const encodeGenerationId = (identity: GenerationIdentity) =>
  encodeBase64Url(JSON.stringify(identityToWire(identity)));

export const makePuzzleResourceKey = (
  puzzleId: PuzzleId,
  generationId: string,
): PuzzleResourceKey => `${puzzleId}/${generationId}`;

export const decodeGenerationId = (puzzleId: PuzzleId, generationId: string): GenerationIdDecodeResult => {
  let decoded: unknown;
  try {
    decoded = JSON.parse(decodeBase64Url(generationId));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (!isRecord(decoded)) return { ok: false, reason: "invalid-identity" };

  if (
    typeof decoded.s !== "string" ||
    decoded.s.length === 0 ||
    (decoded.w !== undefined && !isPositiveInteger(decoded.w)) ||
    (decoded.h !== undefined && !isPositiveInteger(decoded.h)) ||
    (decoded.d !== undefined && (typeof decoded.d !== "string" || !puzzleDifficulties.has(decoded.d as PuzzleDifficulty))) ||
    (decoded.u !== undefined && decoded.u !== 0 && decoded.u !== 1) ||
    (decoded.x !== undefined && (typeof decoded.x !== "string" || !sudokuVariationSet.has(decoded.x as SudokuVariation))) ||
    (decoded.l !== undefined && !isWireSolitaireVariation(decoded.l)) ||
    (decoded.i !== undefined && (typeof decoded.i !== "string" || decoded.i.length === 0)) ||
    (decoded.o !== undefined && !isPuzzleProvenance(decoded.o))
  ) {
    return { ok: false, reason: "invalid-identity" };
  }

  const definition = getPuzzleDefinition(puzzleId);
  if (
    (decoded.w !== undefined && (decoded.w < definition.minWidth || decoded.w > definition.maxWidth)) ||
    (decoded.h !== undefined && (decoded.h < definition.minHeight || decoded.h > definition.maxHeight))
  ) {
    return { ok: false, reason: "invalid-identity" };
  }

  const identity: GenerationIdentity = {
    puzzleId,
    seed: normalizeSeed(decoded.s),
    width: (decoded.w as number | undefined) ?? definition.defaultWidth,
    height: (decoded.h as number | undefined) ?? definition.defaultHeight,
    difficulty: (decoded.d as PuzzleDifficulty | undefined) ?? defaultPuzzleDifficulty,
    requireUniqueSolution: decoded.u === undefined ? true : decoded.u === 1,
    sudokuVariation: decoded.x === undefined
      ? defaultSudokuVariation
      : normalizeSudokuVariation(decoded.x as SudokuVariation),
    solitaireVariation: decoded.l === undefined
      ? defaultSolitaireVariation
      : solitaireVariationFromWire(decoded.l as WireSolitaireVariation),
    ...(decoded.i !== undefined ? { imageId: decoded.i as string } : {}),
    ...(decoded.o !== undefined ? { provenance: decoded.o as PuzzleProvenance } : {}),
  };

  try {
    if (encodeGenerationId(identity) !== generationId) {
      return { ok: false, reason: "invalid-identity" };
    }
  } catch {
    return { ok: false, reason: "invalid-identity" };
  }

  return { ok: true, identity };
};
