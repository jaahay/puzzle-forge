import { getPuzzleDefinition, isGeneratable } from "../catalog/puzzleCatalog";
import type {
  PuzzleDifficulty,
  PuzzleId,
  SolitaireVariation,
  SudokuVariation,
} from "../catalog/types";
import { getPuzzleImageAsset, isImageBackedPuzzleId } from "../games/imageAssets";
import { normalizeSeed } from "../games/shared";
import { getDailyPuzzleSeedForProfile } from "../games/shared/daily";
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

export type PuzzleResourceSemanticLocator = {
  kind: "daily";
  dateStamp: string;
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
      semanticLocator?: PuzzleResourceSemanticLocator;
    }
  | { ok: false; reason: "malformed" | "invalid-identity" };

const compactGenerationIdVersion = 1;
const puzzleDifficulties = ["Easy", "Medium", "Hard", "Expert"] as const satisfies readonly PuzzleDifficulty[];
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const dailyLocatorPrefix = "Daily-";
const dailyDateStampPattern = /^\d{4}-\d{2}-\d{2}$/;

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

const parseDailyDateStamp = (dateStamp: string) => {
  if (!dailyDateStampPattern.test(dateStamp)) return null;
  const [year, month, day] = dateStamp.split("-").map(Number);
  if (year < 0 || year > 9999 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
};

const pushProvenance = (bytes: number[], provenance: PuzzleProvenance | undefined) => {
  if (!provenance) {
    bytes.push(0);
    return;
  }
  if (!isPuzzleProvenance(provenance) || provenance.source !== "daily") {
    throw new Error("Unsupported puzzle provenance.");
  }
  const date = parseDailyDateStamp(provenance.dateStamp);
  if (!date) throw new Error("Invalid daily puzzle date.");
  bytes.push(1, (date.year >>> 8) & 0xff, date.year & 0xff, date.month, date.day);
};

const readProvenance = (reader: ByteReader): PuzzleProvenance | undefined => {
  const kind = reader.readByte();
  if (kind === 0) return undefined;
  if (kind !== 1) throw new Error("Unknown puzzle provenance kind.");
  const year = (reader.readByte() << 8) | reader.readByte();
  const month = reader.readByte();
  const day = reader.readByte();
  const dateStamp = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  if (!parseDailyDateStamp(dateStamp)) throw new Error("Invalid daily puzzle date.");
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
      pushByte(bytes, identity.width);
      pushByte(bytes, identity.height);
      pushByte(bytes, difficultyIndex(identity.difficulty) | (identity.requireUniqueSolution ? 0x04 : 0));
      return;
    case "word-guess":
    case "logic-grid":
      pushByte(bytes, identity.width);
      pushByte(bytes, identity.height);
      return;
    case "jigsaw":
    case "tile-swap":
    case "sliding-puzzle": {
      pushByte(bytes, identity.width);
      pushByte(bytes, identity.height);
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
      pushByte(bytes, identity.width);
      pushByte(bytes, identity.height);
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

const decodeCanonicalGenerationId = (puzzleId: PuzzleId, generationId: string): GenerationIdDecodeResult => {
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
      case "jigsaw":
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
    if (
      width < definition.minWidth ||
      width > definition.maxWidth ||
      height < definition.minHeight ||
      height > definition.maxHeight
    ) {
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

const makeDefaultDailyIdentity = (puzzleId: PuzzleId, dateStamp: string): GenerationIdentity | null => {
  const definition = getPuzzleDefinition(puzzleId);
  if (!isGeneratable(definition) || !parseDailyDateStamp(dateStamp)) return null;

  const provenance = { source: "daily" as const, dateStamp };
  const profile = {
    width: definition.defaultWidth,
    height: definition.defaultHeight,
    difficulty: defaultPuzzleDifficulty,
    requireUniqueSolution: true,
    sudokuVariation: defaultSudokuVariation,
  };
  const seed = getDailyPuzzleSeedForProfile(puzzleId, dateStamp, profile);
  const imageId = isImageBackedPuzzleId(puzzleId)
    ? getPuzzleImageAsset(undefined, puzzleId).id
    : undefined;

  return {
    puzzleId,
    seed,
    width: profile.width,
    height: profile.height,
    difficulty: profile.difficulty,
    requireUniqueSolution: profile.requireUniqueSolution,
    sudokuVariation: profile.sudokuVariation,
    solitaireVariation: defaultSolitaireVariation,
    ...(imageId ? { imageId } : {}),
    provenance,
  };
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

  if (requestedSegment.startsWith(dailyLocatorPrefix)) {
    const dateStamp = requestedSegment.slice(dailyLocatorPrefix.length);
    const identity = makeDefaultDailyIdentity(puzzleId, dateStamp);
    if (!identity) return { ok: false, reason: "invalid-identity" };
    const generationId = encodeGenerationId(identity);
    return {
      ok: true,
      identity,
      canonicalResource: { puzzleId, generationId },
      requestedSegment,
      semanticLocator: { kind: "daily", dateStamp },
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

export const decodeGenerationId = (puzzleId: PuzzleId, generationId: string): GenerationIdDecodeResult => {
  const resolved = resolvePuzzleResourceSegment(puzzleId, generationId);
  return resolved.ok ? { ok: true, identity: resolved.identity } : resolved;
};
