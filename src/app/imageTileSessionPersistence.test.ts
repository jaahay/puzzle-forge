import { describe, expect, it } from "vitest";
import type { ImageTileGeneratedPuzzle, ImageTilePuzzleId } from "../catalog/types";
import { generateSlidingPuzzle } from "../games/slidingPuzzle/generate";
import { generateTileSwap } from "../games/tileSwap/generate";
import {
  buildPersistedPuzzleSession,
  restorePuzzleSessionFromPersisted,
  type PersistedPuzzleSession,
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

  it("rejects duplicate and out-of-range persisted tile positions", () => {
    const puzzle = generateTileSwap({ puzzleId: "tile-swap", seed: "persist-image", width: 4, height: 4, imageId: "great-wave" });
    const persisted = buildPersistedPuzzleSession("tile-swap", makeTileSession(puzzle));
    expect(persisted?.progress.kind).toBe("tiles");
    if (!persisted || persisted.progress.kind !== "tiles") return;

    const tileOrder = persisted.progress.tileOrder;
    const firstCurrentIndex = tileOrder[0]?.currentIndex;
    if (firstCurrentIndex === undefined) throw new Error("Expected persisted tile progress to contain tiles.");

    const duplicatePosition: PersistedPuzzleSession = {
      ...persisted,
      progress: {
        ...persisted.progress,
        tileOrder: tileOrder.map((entry, index) =>
          index === 1 ? { ...entry, currentIndex: firstCurrentIndex } : entry,
        ),
      },
    };
    const outOfRangePosition: PersistedPuzzleSession = {
      ...persisted,
      progress: {
        ...persisted.progress,
        tileOrder: tileOrder.map((entry, index) =>
          index === 0 ? { ...entry, currentIndex: puzzle.width * puzzle.height } : entry,
        ),
      },
    };

    expect(restorePuzzleSessionFromPersisted(duplicatePosition, puzzle)).toBeNull();
    expect(restorePuzzleSessionFromPersisted(outOfRangePosition, puzzle)).toBeNull();
  });
});
