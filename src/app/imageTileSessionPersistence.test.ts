import { describe, expect, it } from "vitest";
import type { ImageTileGeneratedPuzzle, ImageTilePuzzleId } from "../catalog/types";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { generateSlidingPuzzle } from "../games/slidingPuzzle/generate";
import { generateTileSwap } from "../games/tileSwap/generate";
import { encodeGenerationId } from "./puzzleResourceIdentity";
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

const makeResource = (puzzle: ImageTileGeneratedPuzzle) => ({
  puzzleId: puzzle.puzzleId,
  generationId: encodeGenerationId({
    puzzleId: puzzle.puzzleId,
    seed: puzzle.seed,
    width: puzzle.width,
    height: puzzle.height,
    difficulty: puzzle.difficulty ?? "Medium",
    requireUniqueSolution: true,
    sudokuVariation: "classic",
    solitaireVariation: defaultSolitaireVariation,
    imageId: puzzle.asset.id,
  }),
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
  it.each(cases)("persists progress against the regenerated $puzzleId resource", ({ make }) => {
    const puzzle = make("great-wave");
    const resource = makeResource(puzzle);
    const persisted = buildPersistedPuzzleSession(resource, makeTileSession(puzzle));

    expect(persisted).not.toBeNull();
    if (!persisted) return;
    expect(persisted.generationId).toBe(resource.generationId);
    expect(persisted.baselineChecksum).toBe(puzzle.checksum);
    expect(persisted).not.toHaveProperty("puzzle");

    const restored = restorePuzzleSessionFromPersisted(persisted, puzzle);
    expect(restored).not.toBeNull();
    expect(restored?.puzzle.kind).toBe("tiles");
    if (!restored || restored.puzzle.kind !== "tiles") return;
    expect(restored.puzzle.asset.id).toBe("great-wave");
    expect(restored.puzzle.id).toBe(puzzle.id);
    expect(restorePuzzleSessionFromPersisted(persisted, make("roses"))).toBeNull();
  });

  it("rejects duplicate and out-of-range persisted tile positions", () => {
    const puzzle = generateTileSwap({ puzzleId: "tile-swap", seed: "persist-image", width: 4, height: 4, imageId: "great-wave" });
    const persisted = buildPersistedPuzzleSession(makeResource(puzzle), makeTileSession(puzzle));
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
