import { getPuzzleDefinition } from "../catalog/puzzleCatalog";
import type {
  JigsawBoundaryMode,
  JigsawCutStyle,
  JigsawSpecialPiecesMode,
  PuzzleDifficulty,
  PuzzleId,
  SolitaireVariation,
  SudokuVariation,
} from "../catalog/types";
import { getPuzzleImageAsset } from "../games/imageAssets";
import { normalizeJigsawBoundaryMode } from "../games/jigsaw/boundaryContours";
import { normalizeJigsawCutStyle } from "../games/jigsaw/cutStyle";
import { normalizeJigsawSpecialPiecesMode } from "../games/jigsaw/specialPieces";
import { normalizeSeed } from "../games/shared";
import { isDailyDateStamp } from "../games/shared/daily";
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
import { getPuzzleResourceAlias, type PuzzleResourceAlias } from "./puzzleResourceAliases";
import { isPuzzleProvenance, type PuzzleProvenance } from "./puzzleProvenance";
import { defaultPuzzleDifficulty, maxPuzzleSeedLength } from "./runtime";

export type PuzzleResourceKey = `${PuzzleId}/${string}`;

export type PuzzleResourceIdentity = {
  puzzleId: PuzzleId;
  generationId: string;
};

export type GenerationIdDecodeResult =
  | { ok: true; identity: GenerationIdentity }
  | { ok: false; reason: "malformed" | "invalid-identity" };

export type PuzzleResourceSegmentResolution =
  | {
      ok: true;
      identity: GenerationIdentity;
      canonicalResource: PuzzleResourceIdentity;
      requestedSegment: string;
      alias?: PuzzleResourceAlias;
    }
  | { ok: false; reason: "malformed" | "invalid-identity" };

const compactGenerationIdVersion = 1;
const puzzleDifficulties = ["Easy", "Medium", "Hard", "Expert"] as const satisfies readonly PuzzleDifficulty[];

const jigsawCutStyleCodebook = [
  ["classic", 0],
  ["flowing", 1],
  ["geometric", 2],
  ["intricate", 3],
  ["eclectic", 4],
] as const satisfies readonly (readonly [JigsawCutStyle, number])[];

const jigsawBoundaryModeCodebook = [
  ["flat", 0],
  ["contoured", 1],
] as const satisfies readonly (readonly [JigsawBoundaryMode, number])[];
const jigsawSpecialPiecesModeCodebook = [
  ["off", 0],
  ["rare", 1],
  ["always", 2],
] as const satisfies readonly (readonly [JigsawSpecialPiecesMode, number])[];
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

class ByteReader {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  readByte() {
    if (this.offset >= this.bytes.length) throw new Error("Unexpected end of resource id.");
    const value = this.bytes[this.offset];
    this.offset += 1;
    return value;
  }

  readText() {
    const length = this.readByte();
    if (this.offset + length > this.bytes.length) throw new Error("Invalid resource text length.");
    const value = textDecoder.decode(this.bytes.slice(this.offset, this.offset + length));
    this.offset += length;
    return value;
  }

  get done() {
    return this.offset === this.bytes.length;
  }
}

const encodeBase64UrlBytes = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const decodeBase64UrlBytes = (value: string): Uint8Array | null => {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) return null;
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(`${base64}${padding}`);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
};

const pushText = (bytes: number[], value: string) => {
  const encoded = textEncoder.encode(value);
  if (encoded.length === 0 || encoded.length > 255) throw new Error("Resource text field is outside the supported length.");
  bytes.push(encoded.length, ...encoded);
};

const pushByte = (bytes: number[], value: number) => {
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error("Resource byte is outside the supported range.");
  bytes.push(value);
};

const difficultyIndex = (difficulty: PuzzleDifficulty) => {
  const index = puzzleDifficulties.indexOf(difficulty);
  if (index < 0) throw new Error(`Unsupported puzzle difficulty: ${difficulty}`);
  return index;
};

const difficultyAt = (index: number) => puzzleDifficulties[index] as PuzzleDifficulty | undefined;

const hasValidDimensions = (puzzleId: PuzzleId, width: number, height: number) => {
  const definition = getPuzzleDefinition(puzzleId);
  return Number.isInteger(width) &&
    Number.isInteger(height) &&
    width >= definition.minWidth &&
    width <= definition.maxWidth &&
    height >= definition.minHeight &&
    height <= definition.maxHeight;
};

const pushDimensions = (bytes: number[], identity: GenerationIdentity) => {
  if (!hasValidDimensions(identity.puzzleId, identity.width, identity.height)) {
    throw new Error(`Puzzle dimensions are outside the supported range for ${identity.puzzleId}.`);
  }
  pushByte(bytes, identity.width);
  pushByte(bytes, identity.height);
};

const pushProvenance = (bytes: number[], provenance: PuzzleProvenance | undefined) => {
  if (!provenance) {
    bytes.push(0);
    return;
  }
  if (!isPuzzleProvenance(provenance) || provenance.source !== "daily") {
    throw new Error("Unsupported puzzle provenance.");
  }
  const [year, month, day] = provenance.dateStamp.split("-").map(Number);
  bytes.push(1, (year >>> 8) & 0xff, year & 0xff, month, day);
};

const readProvenance = (reader: ByteReader): PuzzleProvenance | undefined => {
  const kind = reader.readByte();
  if (kind === 0) return undefined;
  if (kind !== 1) throw new Error("Unknown puzzle provenance kind.");
  const year = (reader.readByte() << 8) | reader.readByte();
  const month = reader.readByte();
  const day = reader.readByte();
  const dateStamp = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  if (!isDailyDateStamp(dateStamp)) throw new Error("Invalid daily puzzle date.");
  return { source: "daily", dateStamp };
};

const pushPuzzlePayload = (bytes: number[], identity: GenerationIdentity) => {
  switch (identity.puzzleId) {
    case "sudoku": {
      const variation = normalizeSudokuVariation(identity.sudokuVariation);
      const variationIndex = sudokuVariations.indexOf(variation);
      if (variationIndex < 0) throw new Error(`Unsupported Sudoku variation: ${variation}`);
      pushByte(bytes, difficultyIndex(identity.difficulty) | (variationIndex << 2));
      return;
    }
    case "nonogram":
      pushDimensions(bytes, identity);
      pushByte(bytes, difficultyIndex(identity.difficulty) | (identity.requireUniqueSolution ? 0x04 : 0));
      return;
    case "word-guess":
    case "logic-grid":
      pushDimensions(bytes, identity);
      return;
    case "jigsaw": {
      pushDimensions(bytes, identity);
      pushText(bytes, getPuzzleImageAsset(identity.imageId, identity.puzzleId).id);
      const cutStyle = normalizeJigsawCutStyle(identity.jigsawCutStyle);
      const cutStyleCode = jigsawCutStyleCodebook.find(([style]) => style === cutStyle)?.[1];
      if (cutStyleCode === undefined) throw new Error(`Unsupported Jigsaw cut style: ${cutStyle}`);
      const boundaryMode = normalizeJigsawBoundaryMode(identity.jigsawBoundaryMode);
      const boundaryModeCode = jigsawBoundaryModeCodebook.find(([mode]) => mode === boundaryMode)?.[1];
      if (boundaryModeCode === undefined) throw new Error(`Unsupported Jigsaw boundary mode: ${boundaryMode}`);
      const specialPiecesMode = normalizeJigsawSpecialPiecesMode(identity.jigsawSpecialPiecesMode);
      const specialPiecesModeCode = jigsawSpecialPiecesModeCodebook.find(
        ([mode]) => mode === specialPiecesMode,
      )?.[1];
      if (specialPiecesModeCode === undefined) {
        throw new Error(`Unsupported Jigsaw special pieces mode: ${specialPiecesMode}`);
      }
      pushByte(
        bytes,
        cutStyleCode | (boundaryModeCode << 3) | (specialPiecesModeCode << 4),
      );
      return;
    }
    case "tile-swap":
    case "sliding-puzzle": {
      pushDimensions(bytes, identity);
      pushText(bytes, getPuzzleImageAsset(identity.imageId, identity.puzzleId).id);
      return;
    }
    case "klondike-solitaire": {
      const variation = normalizeSolitaireVariation(identity.solitaireVariation);
      const redealIndex = solitaireRedealLimits.indexOf(variation.redeals);
      if (redealIndex < 0) throw new Error(`Unsupported Solitaire redeal limit: ${variation.redeals}`);
      const flags =
        (variation.drawMode === "draw-3" ? 0x01 : 0) |
        (redealIndex << 1) |
        (variation.wasteMode === "relaxed" ? 0x08 : 0) |
        (variation.knownSolvable ? 0x10 : 0);
      pushByte(bytes, flags);
      return;
    }
    case "peg-solitaire":
      return;
    case "futoshiki":
      pushByte(bytes, difficultyIndex(identity.difficulty));
      return;
    case "kenken":
    case "minesweeper":
    case "slitherlink":
      pushDimensions(bytes, identity);
      pushByte(bytes, difficultyIndex(identity.difficulty) | (identity.requireUniqueSolution ? 0x04 : 0));
      return;
  }
};

export const encodeGenerationId = (identity: GenerationIdentity) => {
  const seed = normalizeSeed(identity.seed);
  if (seed.length > maxPuzzleSeedLength) {
    throw new Error(`Puzzle seeds may contain at most ${maxPuzzleSeedLength} characters.`);
  }

  const bytes: number[] = [compactGenerationIdVersion];
  pushText(bytes, seed);
  pushProvenance(bytes, identity.provenance);
  pushPuzzlePayload(bytes, identity);
  return encodeBase64UrlBytes(Uint8Array.from(bytes));
};

export const makePuzzleResourceKey = (
  puzzleId: PuzzleId,
  generationId: string,
): PuzzleResourceKey => `${puzzleId}/${generationId}`;

export const decodeCanonicalGenerationId = (puzzleId: PuzzleId, generationId: string): GenerationIdDecodeResult => {
  const bytes = decodeBase64UrlBytes(generationId);
  if (!bytes) return { ok: false, reason: "malformed" };

  try {
    const reader = new ByteReader(bytes);
    if (reader.readByte() !== compactGenerationIdVersion) {
      return { ok: false, reason: "invalid-identity" };
    }

    const seed = reader.readText();
    if (!seed || seed.length > maxPuzzleSeedLength || normalizeSeed(seed) !== seed) {
      return { ok: false, reason: "invalid-identity" };
    }

    const provenance = readProvenance(reader);
    const definition = getPuzzleDefinition(puzzleId);
    let width = definition.defaultWidth;
    let height = definition.defaultHeight;
    let difficulty = defaultPuzzleDifficulty;
    let requireUniqueSolution = true;
    let sudokuVariation: SudokuVariation = defaultSudokuVariation;
    let solitaireVariation: SolitaireVariation = defaultSolitaireVariation;
    let jigsawCutStyle: JigsawCutStyle | undefined;
    let jigsawBoundaryMode: JigsawBoundaryMode | undefined;
    let jigsawSpecialPiecesMode: JigsawSpecialPiecesMode | undefined;
    let imageId: string | undefined;

    switch (puzzleId) {
      case "sudoku": {
        const flags = reader.readByte();
        if ((flags & 0xf0) !== 0) return { ok: false, reason: "invalid-identity" };
        const decodedDifficulty = difficultyAt(flags & 0x03);
        const decodedVariation = sudokuVariations[(flags >>> 2) & 0x03];
        if (!decodedDifficulty || !decodedVariation) return { ok: false, reason: "invalid-identity" };
        difficulty = decodedDifficulty;
        sudokuVariation = decodedVariation;
        break;
      }
      case "nonogram": {
        width = reader.readByte();
        height = reader.readByte();
        const flags = reader.readByte();
        if ((flags & 0xf8) !== 0) return { ok: false, reason: "invalid-identity" };
        const decodedDifficulty = difficultyAt(flags & 0x03);
        if (!decodedDifficulty) return { ok: false, reason: "invalid-identity" };
        difficulty = decodedDifficulty;
        requireUniqueSolution = (flags & 0x04) !== 0;
        break;
      }
      case "word-guess":
      case "logic-grid":
        width = reader.readByte();
        height = reader.readByte();
        break;
      case "jigsaw": {
        width = reader.readByte();
        height = reader.readByte();
        imageId = getPuzzleImageAsset(reader.readText(), puzzleId).id;
        const flags = reader.readByte();
        if ((flags & 0xc0) !== 0) return { ok: false, reason: "invalid-identity" };
        const cutStyleCode = flags & 0x07;
        const boundaryModeCode = (flags >>> 3) & 0x01;
        const specialPiecesModeCode = (flags >>> 4) & 0x03;
        const decodedCutStyle = jigsawCutStyleCodebook.find(([, code]) => code === cutStyleCode)?.[0];
        const decodedBoundaryMode = jigsawBoundaryModeCodebook.find(([, code]) => code === boundaryModeCode)?.[0];
        const decodedSpecialPiecesMode = jigsawSpecialPiecesModeCodebook.find(
          ([, code]) => code === specialPiecesModeCode,
        )?.[0];
        if (!decodedCutStyle || !decodedBoundaryMode || !decodedSpecialPiecesMode) {
          return { ok: false, reason: "invalid-identity" };
        }
        jigsawCutStyle = decodedCutStyle;
        jigsawBoundaryMode = decodedBoundaryMode;
        jigsawSpecialPiecesMode = decodedSpecialPiecesMode;
        break;
      }
      case "tile-swap":
      case "sliding-puzzle":
        width = reader.readByte();
        height = reader.readByte();
        imageId = getPuzzleImageAsset(reader.readText(), puzzleId).id;
        break;
      case "klondike-solitaire": {
        const flags = reader.readByte();
        if ((flags & 0xe0) !== 0) return { ok: false, reason: "invalid-identity" };
        const redeals = solitaireRedealLimits[(flags >>> 1) & 0x03];
        if (redeals === undefined) return { ok: false, reason: "invalid-identity" };
        solitaireVariation = {
          drawMode: (flags & 0x01) !== 0 ? "draw-3" : "draw-1",
          redeals,
          wasteMode: (flags & 0x08) !== 0 ? "relaxed" : "standard",
          knownSolvable: (flags & 0x10) !== 0,
        };
        break;
      }
      case "peg-solitaire":
        break;
      case "futoshiki": {
        const decodedDifficulty = difficultyAt(reader.readByte());
        if (!decodedDifficulty) return { ok: false, reason: "invalid-identity" };
        difficulty = decodedDifficulty;
        break;
      }
      case "kenken":
      case "minesweeper":
      case "slitherlink": {
        width = reader.readByte();
        height = reader.readByte();
        const flags = reader.readByte();
        if ((flags & 0xf8) !== 0) return { ok: false, reason: "invalid-identity" };
        const decodedDifficulty = difficultyAt(flags & 0x03);
        if (!decodedDifficulty) return { ok: false, reason: "invalid-identity" };
        difficulty = decodedDifficulty;
        requireUniqueSolution = (flags & 0x04) !== 0;
        break;
      }
    }

    if (!reader.done) return { ok: false, reason: "invalid-identity" };
    if (!hasValidDimensions(puzzleId, width, height)) {
      return { ok: false, reason: "invalid-identity" };
    }

    const identity: GenerationIdentity = {
      puzzleId,
      seed,
      width,
      height,
      difficulty,
      requireUniqueSolution,
      sudokuVariation,
      solitaireVariation,
      ...(jigsawCutStyle ? { jigsawCutStyle } : {}),
      ...(jigsawBoundaryMode ? { jigsawBoundaryMode } : {}),
      ...(jigsawSpecialPiecesMode ? { jigsawSpecialPiecesMode } : {}),
      ...(imageId ? { imageId } : {}),
      ...(provenance ? { provenance } : {}),
    };

    if (encodeGenerationId(identity) !== generationId) {
      return { ok: false, reason: "invalid-identity" };
    }

    return { ok: true, identity };
  } catch {
    return { ok: false, reason: "invalid-identity" };
  }
};

export const resolvePuzzleResourceSegment = (
  puzzleId: PuzzleId,
  requestedSegment: string,
): PuzzleResourceSegmentResolution => {
  const alias = getPuzzleResourceAlias(puzzleId, requestedSegment);
  if (alias) {
    const decoded = decodeCanonicalGenerationId(puzzleId, alias.generationId);
    if (!decoded.ok) return decoded;
    return {
      ok: true,
      identity: decoded.identity,
      canonicalResource: { puzzleId, generationId: alias.generationId },
      requestedSegment,
      alias,
    };
  }

  const decoded = decodeCanonicalGenerationId(puzzleId, requestedSegment);
  if (!decoded.ok) return decoded;
  return {
    ok: true,
    identity: decoded.identity,
    canonicalResource: { puzzleId, generationId: requestedSegment },
    requestedSegment,
  };
};

export const decodeGenerationId = decodeCanonicalGenerationId;
