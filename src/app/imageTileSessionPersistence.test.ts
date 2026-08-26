import { describe, expect, it } from "vitest";
import type { GeneratedPuzzle, PuzzleId } from "../catalog/types";
import { generateSlidingPuzzle } from "../games/slidingPuzzle/generate";
import { generateTileSwap } from "../games/tileSwap/generate";
import {
  buildPersistedPuzzleSession,
  initialSolitaireStats,
  restorePuzzleSessionFromPersisted,
  type PuzzleSession,
} from "./session";

const makeTileSession = (puzzle: GeneratedPuzzle): PuzzleSession => ({
  seed: puzzle.seed,
  width: puzzle.width,
  height: puzzle.height,
  difficulty: "Easy",
  requireUniqueSolution: false,
  puzzle,
  cardStacks: null,
  selectedCard: null,
  solitaireStats: { ...initialSolitaireStats },
  solitaireUndoStack: [],
  solitaireRedoStack: [],
  gridCells: null,
  selectedGridCell: null,
  statusMessage: `${puzzle.title} in progress.`,
});

const cases: Array<{
  puzzleId: PuzzleId;
  make: (imageId: string) => GeneratedPuzzle;
}> = [
  {
    puzzleId: "tile-swap",
    make: (imageId) => generateTileSwap({ puzzleId: "tile-swap", seed: "persist-image", width: 4, height: 4, imageId }),
  },
  {
    puzzleId: "sliding-puzzle",
    make: (imageId) => generateSlidingPuzzle({ puzzleId: "sliding-puzzle", seed: "persist-image", width: 4, height: 4, imageId }),
  },
];

describe("image tile session identity", () => {
  it.each(cases)("persists concrete artwork for $puzzleId", ({ puzzleId, make }) => {
    const puzzle = make("great-wave");
    const persisted = buildPersistedPuzzleSession(puzzleId, makeTileSession(puzzle));

    expect(persisted?.imageId).toBe("great-wave");
    expect(persisted).not.toBeNull();
    if (!persisted) return;

    expect(restorePuzzleSessionFromPersisted(persisted, puzzle)).not.toBeNull();
    expect(restorePuzzleSessionFromPersisted(persisted, make("roses"))).toBeNull();
  });
});
