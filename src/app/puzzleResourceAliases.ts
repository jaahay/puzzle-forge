import type { PuzzleId } from "../catalog/types";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { defaultSudokuVariation } from "../games/sudoku/variation";
import type { GenerationIdentity } from "./generationIdentity";
import {
  decodeGenerationId,
  encodeGenerationId,
  type PuzzleResourceIdentity,
} from "./puzzleResourceIdentity";

export type PuzzleResourceAlias = {
  puzzleId: PuzzleId;
  alias: string;
  generationId: string;
};

export type PuzzleResourceSegmentResolution =
  | {
      ok: true;
      identity: GenerationIdentity;
      canonicalResource: PuzzleResourceIdentity;
      requestedSegment: string;
      alias?: PuzzleResourceAlias;
    }
  | { ok: false };

const makeIdentity = (
  puzzleId: PuzzleId,
  seed: string,
  overrides: Partial<GenerationIdentity> = {},
): GenerationIdentity => ({
  puzzleId,
  seed,
  width: 9,
  height: 9,
  difficulty: "Medium",
  requireUniqueSolution: true,
  sudokuVariation: defaultSudokuVariation,
  solitaireVariation: defaultSolitaireVariation,
  ...overrides,
});

export const puzzleResourceAliases: readonly PuzzleResourceAlias[] = [
  {
    puzzleId: "sudoku",
    alias: "Happy2026!",
    generationId: encodeGenerationId(makeIdentity("sudoku", "happy-2026-sudoku")),
  },
  {
    puzzleId: "nonogram",
    alias: "Happy2026!",
    generationId: encodeGenerationId(makeIdentity("nonogram", "happy-2026-nonogram", { width: 10, height: 10 })),
  },
  {
    puzzleId: "sudoku",
    alias: "Welcome",
    generationId: encodeGenerationId(makeIdentity("sudoku", "welcome-sudoku", { difficulty: "Easy" })),
  },
];

export const resolvePuzzleResourceSegment = (
  puzzleId: PuzzleId,
  requestedSegment: string,
): PuzzleResourceSegmentResolution => {
  const alias = puzzleResourceAliases.find(
    (candidate) => candidate.puzzleId === puzzleId && candidate.alias === requestedSegment,
  );
  const generationId = alias?.generationId ?? requestedSegment;
  const decoded = decodeGenerationId(puzzleId, generationId);
  if (!decoded.ok) return { ok: false };

  return {
    ok: true,
    identity: decoded.identity,
    canonicalResource: { puzzleId, generationId },
    requestedSegment,
    ...(alias ? { alias } : {}),
  };
};
