import { describe, expect, it } from "vitest";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { generateJigsaw } from "../games/jigsaw/generate";
import { defaultJigsawImageAsset } from "../games/jigsaw/imageAssets";
import { encodeGenerationId } from "./puzzleResourceIdentity";
import {
  buildPersistedPuzzleSession,
  restorePuzzleSessionFromPersisted,
  type PuzzleSession,
} from "./session";

const makeJigsawSession = (snappedCount = 2): Extract<PuzzleSession, { kind: "tiles" }> => {
  const puzzle = generateJigsaw({
    puzzleId: "jigsaw",
    seed: "persist-image-selection",
    width: 4,
    height: 3,
    imageId: defaultJigsawImageAsset.id,
  });
  const jigsawPlacements = puzzle.tiles.map((tile, index) => ({
    id: tile.id,
    worldX: 120 + index * 17,
    worldY: 80 + index * 11,
    snapped: index < snappedCount,
  }));

  return {
    kind: "tiles",
    puzzle,
    progress: { kind: "tiles", jigsawPlacements },
    statusMessage: "Jigsaw in progress.",
  };
};

describe("Jigsaw session image identity", () => {
  it("restores progress only over the matching regenerated Jigsaw baseline", () => {
    const session = makeJigsawSession();
    const puzzle = session.puzzle;
    expect(puzzle.kind).toBe("tiles");
    if (puzzle.kind !== "tiles" || puzzle.puzzleId !== "jigsaw") return;

    const generationId = encodeGenerationId({
      puzzleId: "jigsaw",
      seed: puzzle.seed,
      width: puzzle.width,
      height: puzzle.height,
      difficulty: puzzle.difficulty ?? "Medium",
      requireUniqueSolution: true,
      sudokuVariation: "classic",
      solitaireVariation: defaultSolitaireVariation,
      imageId: puzzle.asset.id,
    });
    const persisted = buildPersistedPuzzleSession({ puzzleId: "jigsaw", generationId }, session);
    expect(persisted).not.toBeNull();
    if (!persisted) return;
    expect(persisted.generationId).toBe(generationId);
    expect(persisted.baselineChecksum).toBe(puzzle.checksum);
    expect(persisted).not.toHaveProperty("puzzle");
    expect(persisted.progress.kind).toBe("tiles");
    if (persisted.progress.kind !== "tiles") return;
    expect(persisted.progress.jigsawPlacements).toEqual(session.progress.jigsawPlacements);

    const regenerated = generateJigsaw({
      puzzleId: "jigsaw",
      seed: "persist-image-selection",
      width: 4,
      height: 3,
      imageId: defaultJigsawImageAsset.id,
    });
    const restored = restorePuzzleSessionFromPersisted(persisted, regenerated);
    expect(restored).not.toBeNull();
    expect(restored?.puzzle.kind).toBe("tiles");
    if (!restored || restored.puzzle.kind !== "tiles" || restored.puzzle.puzzleId !== "jigsaw") return;
    expect(restored.puzzle.asset.id).toBe(defaultJigsawImageAsset.id);
    expect(restored.puzzle.id).toBe(puzzle.id);
    expect(restored.puzzle.tiles).toEqual(puzzle.tiles);
    expect(restored.progress.kind).toBe("tiles");
    if (restored.progress.kind !== "tiles") return;
    expect(restored.progress.jigsawPlacements).toEqual(session.progress.jigsawPlacements);

    expect(restorePuzzleSessionFromPersisted(persisted, { ...regenerated, checksum: "different-baseline" })).toBeNull();
  });

  it("restores a fully solved placement set as solved progress", () => {
    const session = makeJigsawSession(12);
    const puzzle = session.puzzle;
    if (puzzle.kind !== "tiles" || puzzle.puzzleId !== "jigsaw") return;
    const generationId = encodeGenerationId({
      puzzleId: "jigsaw",
      seed: puzzle.seed,
      width: puzzle.width,
      height: puzzle.height,
      difficulty: puzzle.difficulty ?? "Medium",
      requireUniqueSolution: true,
      sudokuVariation: "classic",
      solitaireVariation: defaultSolitaireVariation,
      imageId: puzzle.asset.id,
    });
    const persisted = buildPersistedPuzzleSession({ puzzleId: "jigsaw", generationId }, session);
    expect(persisted).not.toBeNull();
    if (!persisted) return;

    const restored = restorePuzzleSessionFromPersisted(persisted, puzzle);
    expect(restored?.progress.kind).toBe("tiles");
    if (!restored || restored.progress.kind !== "tiles") return;
    expect(restored.progress.jigsawPlacements).toHaveLength(puzzle.tiles.length);
    expect(restored.progress.jigsawPlacements?.every((placement) => placement.snapped)).toBe(true);
  });

  it("rejects Jigsaw placements that do not belong to the regenerated resource", () => {
    const session = makeJigsawSession();
    const puzzle = session.puzzle;
    if (puzzle.kind !== "tiles" || puzzle.puzzleId !== "jigsaw") return;
    const generationId = encodeGenerationId({
      puzzleId: "jigsaw",
      seed: puzzle.seed,
      width: puzzle.width,
      height: puzzle.height,
      difficulty: puzzle.difficulty ?? "Medium",
      requireUniqueSolution: true,
      sudokuVariation: "classic",
      solitaireVariation: defaultSolitaireVariation,
      imageId: puzzle.asset.id,
    });
    const persisted = buildPersistedPuzzleSession({ puzzleId: "jigsaw", generationId }, session);
    expect(persisted?.progress.kind).toBe("tiles");
    if (!persisted || persisted.progress.kind !== "tiles" || !persisted.progress.jigsawPlacements) return;

    const [first, ...rest] = persisted.progress.jigsawPlacements;
    if (!first) return;
    const foreignPlacements = [{ ...first, id: "foreign-piece" }, ...rest];
    expect(restorePuzzleSessionFromPersisted({
      ...persisted,
      progress: { ...persisted.progress, jigsawPlacements: foreignPlacements },
    }, puzzle)).toBeNull();
  });
});
