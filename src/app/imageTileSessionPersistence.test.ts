import { describe, expect, it } from "vitest";
import type { ImageTileGeneratedPuzzle, ImageTilePuzzleId } from "../catalog/types";
import { generateSlidingPuzzle } from "../games/slidingPuzzle/generate";
import { generateTileSwap } from "../games/tileSwap/generate";
import {
  buildPersistedPuzzleSession,
  restorePuzzleSessionFromPersisted,
  type PuzzleSession,
} from "./session";

const makeTileSession = (puzzle: ImageTileGeneratedPuzzle): PuzzleSession => ({
  kind: "tiles",
  puzzle,
  progress: { kind: "tiles" },
  statusMessage: `${puzzle.title} in progress.`,
});

const cases: Array<{
  puzzleId: ImageTilePuzzleId;
  make: (imageId: string) => ImageTileGeneratedPuzzle;
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
  it.each(cases)("persists concrete artwork and generated identity for $puzzleId", ({ puzzleId, make }) => {
    const puzzle = make("great-wave");
    const persisted = buildPersistedPuzzleSession(puzzleId, makeTileSession(puzzle));

    expect(persisted?.imageId).toBe("great-wave");
    expect(persisted?.puzzleInstanceId).toBe(puzzle.id);
    expect(persisted).not.toBeNull();
    if (!persisted) return;

    expect(restorePuzzleSessionFromPersisted(persisted, puzzle)).not.toBeNull();
    expect(restorePuzzleSessionFromPersisted(persisted, make("roses"))).toBeNull();
    expect(restorePuzzleSessionFromPersisted({ ...persisted, puzzleInstanceId: `${puzzle.id}-other` }, puzzle)).toBeNull();
  });
});
