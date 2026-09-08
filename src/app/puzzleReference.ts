import type {
  GeneratedPuzzle,
  ImageBackedPuzzleId,
  PuzzleDifficulty,
  PuzzleGenerationParams,
  SudokuVariation,
} from "../catalog/types";
import { getPuzzleDefinition } from "../catalog/puzzleCatalog";
import { getPuzzleImageAssetsFor, isImageBackedPuzzleId } from "../games/imageAssets";
import { sudokuVariations } from "../games/sudoku/variation";
import { getPuzzleProvenance, isPuzzleProvenance, type PuzzleProvenance } from "./puzzleProvenance";

export const puzzleReferencePrefix = "pf1.";
export const puzzleReferenceSchemaVersion = 1 as const;

export const puzzleGeneratorRevisions = {
  sudoku: 1,
  nonogram: 1,
  jigsaw: 1,
  "tile-swap": 1,
  "sliding-puzzle": 1,
} as const;

type ReferencedPuzzleId = keyof typeof puzzleGeneratorRevisions;

type BasePuzzleReferenceV1 = {
  schemaVersion: 1;
  puzzleId: ReferencedPuzzleId;
  generatorVersion: 1;
  seed: string;
  width: number;
  height: number;
  provenance?: PuzzleProvenance;
};

export type SudokuPuzzleReferenceV1 = BasePuzzleReferenceV1 & {
  puzzleId: "sudoku";
  difficulty: PuzzleDifficulty;
  sudokuVariation: SudokuVariation;
};

export type NonogramPuzzleReferenceV1 = BasePuzzleReferenceV1 & {
  puzzleId: "nonogram";
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
};

export type ImageBackedPuzzleReferenceV1 = BasePuzzleReferenceV1 & {
  puzzleId: ImageBackedPuzzleId;
  imageId: string;
};

export type PuzzleReferenceV1 =
  | SudokuPuzzleReferenceV1
  | NonogramPuzzleReferenceV1
  | ImageBackedPuzzleReferenceV1;

export type PuzzleReferenceGenerationOptions = PuzzleGenerationParams & {
  provenance?: PuzzleProvenance;
};

export type PuzzleReferenceDecodeResult =
  | { ok: true; reference: PuzzleReferenceV1 }
  | {
      ok: false;
      reason: "malformed" | "unsupported-version" | "unsupported-puzzle" | "unsupported-generator" | "invalid-fields";
    };

const difficulties = new Set<PuzzleDifficulty>(["Easy", "Medium", "Hard", "Expert"]);
const referencedPuzzleIds = new Set<ReferencedPuzzleId>(Object.keys(puzzleGeneratorRevisions) as ReferencedPuzzleId[]);

const cloneProvenance = (provenance?: PuzzleProvenance): PuzzleProvenance | undefined =>
  provenance ? { ...provenance } : undefined;

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDifficulty = (value: unknown): value is PuzzleDifficulty =>
  typeof value === "string" && difficulties.has(value as PuzzleDifficulty);

const isSudokuVariation = (value: unknown): value is SudokuVariation =>
  typeof value === "string" && sudokuVariations.includes(value as SudokuVariation);

const isValidDimensions = (puzzleId: ReferencedPuzzleId, width: unknown, height: unknown) => {
  if (!Number.isInteger(width) || !Number.isInteger(height)) return false;
  const definition = getPuzzleDefinition(puzzleId);
  return Number(width) >= definition.minWidth &&
    Number(width) <= definition.maxWidth &&
    Number(height) >= definition.minHeight &&
    Number(height) <= definition.maxHeight;
};

const readProvenance = (candidate: Record<string, unknown>) => {
  if (candidate.provenance === undefined) return { valid: true as const, provenance: undefined };
  if (!isPuzzleProvenance(candidate.provenance)) return { valid: false as const, provenance: undefined };
  return { valid: true as const, provenance: { ...candidate.provenance } };
};

export const getPuzzleReference = (puzzle: GeneratedPuzzle): PuzzleReferenceV1 | null => {
  const provenance = cloneProvenance(getPuzzleProvenance(puzzle));

  if (puzzle.puzzleId === "sudoku" && puzzle.kind === "grid" && puzzle.difficulty) {
    return {
      schemaVersion: puzzleReferenceSchemaVersion,
      puzzleId: "sudoku",
      generatorVersion: puzzleGeneratorRevisions.sudoku,
      seed: puzzle.seed,
      width: puzzle.width,
      height: puzzle.height,
      difficulty: puzzle.difficulty,
      sudokuVariation: puzzle.sudokuVariation ?? "classic",
      ...(provenance ? { provenance } : {}),
    };
  }

  if (puzzle.puzzleId === "nonogram" && puzzle.kind === "grid" && puzzle.difficulty) {
    return {
      schemaVersion: puzzleReferenceSchemaVersion,
      puzzleId: "nonogram",
      generatorVersion: puzzleGeneratorRevisions.nonogram,
      seed: puzzle.seed,
      width: puzzle.width,
      height: puzzle.height,
      difficulty: puzzle.difficulty,
      requireUniqueSolution: puzzle.uniqueSolution === true,
      ...(provenance ? { provenance } : {}),
    };
  }

  if (isImageBackedPuzzleId(puzzle.puzzleId) && puzzle.kind === "tiles" && puzzle.asset.kind === "image") {
    return {
      schemaVersion: puzzleReferenceSchemaVersion,
      puzzleId: puzzle.puzzleId,
      generatorVersion: puzzleGeneratorRevisions[puzzle.puzzleId],
      seed: puzzle.seed,
      width: puzzle.width,
      height: puzzle.height,
      imageId: puzzle.asset.id,
      ...(provenance ? { provenance } : {}),
    };
  }

  return null;
};

export const serializePuzzleReference = (reference: PuzzleReferenceV1) =>
  `${puzzleReferencePrefix}${encodeBase64Url(JSON.stringify(reference))}`;

export const serializeGeneratedPuzzleReference = (puzzle: GeneratedPuzzle) => {
  const reference = getPuzzleReference(puzzle);
  return reference ? serializePuzzleReference(reference) : null;
};

export const decodePuzzleReference = (serialized: string): PuzzleReferenceDecodeResult => {
  if (!serialized.startsWith(puzzleReferencePrefix)) {
    return /^pf\d+\./.test(serialized)
      ? { ok: false, reason: "unsupported-version" }
      : { ok: false, reason: "malformed" };
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(decodeBase64Url(serialized.slice(puzzleReferencePrefix.length)));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (!isRecord(candidate)) return { ok: false, reason: "invalid-fields" };
  if (candidate.schemaVersion !== puzzleReferenceSchemaVersion) {
    return { ok: false, reason: "unsupported-version" };
  }
  if (typeof candidate.puzzleId !== "string" || !referencedPuzzleIds.has(candidate.puzzleId as ReferencedPuzzleId)) {
    return { ok: false, reason: "unsupported-puzzle" };
  }

  const puzzleId = candidate.puzzleId as ReferencedPuzzleId;
  if (candidate.generatorVersion !== puzzleGeneratorRevisions[puzzleId]) {
    return { ok: false, reason: "unsupported-generator" };
  }
  if (typeof candidate.seed !== "string" || candidate.seed.length === 0) {
    return { ok: false, reason: "invalid-fields" };
  }
  if (!isValidDimensions(puzzleId, candidate.width, candidate.height)) {
    return { ok: false, reason: "invalid-fields" };
  }

  const provenanceResult = readProvenance(candidate);
  if (!provenanceResult.valid) return { ok: false, reason: "invalid-fields" };
  const common = {
    schemaVersion: puzzleReferenceSchemaVersion,
    generatorVersion: puzzleGeneratorRevisions[puzzleId],
    seed: candidate.seed,
    width: Number(candidate.width),
    height: Number(candidate.height),
    ...(provenanceResult.provenance ? { provenance: provenanceResult.provenance } : {}),
  };

  if (puzzleId === "sudoku") {
    if (!isDifficulty(candidate.difficulty) || !isSudokuVariation(candidate.sudokuVariation)) {
      return { ok: false, reason: "invalid-fields" };
    }
    return {
      ok: true,
      reference: {
        ...common,
        puzzleId,
        difficulty: candidate.difficulty,
        sudokuVariation: candidate.sudokuVariation,
      },
    };
  }

  if (puzzleId === "nonogram") {
    if (!isDifficulty(candidate.difficulty) || typeof candidate.requireUniqueSolution !== "boolean") {
      return { ok: false, reason: "invalid-fields" };
    }
    return {
      ok: true,
      reference: {
        ...common,
        puzzleId,
        difficulty: candidate.difficulty,
        requireUniqueSolution: candidate.requireUniqueSolution,
      },
    };
  }

  if (typeof candidate.imageId !== "string" || candidate.imageId.length === 0) {
    return { ok: false, reason: "invalid-fields" };
  }
  const imageExists = getPuzzleImageAssetsFor(puzzleId).some((asset) => asset.id === candidate.imageId);
  if (!imageExists) return { ok: false, reason: "invalid-fields" };

  return {
    ok: true,
    reference: {
      ...common,
      puzzleId,
      imageId: candidate.imageId,
    },
  };
};

export const puzzleReferenceToGenerationOptions = (
  reference: PuzzleReferenceV1,
): PuzzleReferenceGenerationOptions => {
  const common: PuzzleReferenceGenerationOptions = {
    puzzleId: reference.puzzleId,
    seed: reference.seed,
    width: reference.width,
    height: reference.height,
    ...(reference.provenance ? { provenance: cloneProvenance(reference.provenance) } : {}),
  };

  if (reference.puzzleId === "sudoku") {
    return {
      ...common,
      difficulty: reference.difficulty,
      sudokuVariation: reference.sudokuVariation,
    };
  }

  if (reference.puzzleId === "nonogram") {
    return {
      ...common,
      difficulty: reference.difficulty,
      requireUniqueSolution: reference.requireUniqueSolution,
    };
  }

  return {
    ...common,
    imageId: reference.imageId,
  };
};
