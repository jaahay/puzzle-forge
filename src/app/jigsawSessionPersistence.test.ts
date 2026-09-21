import { describe, expect, it } from "vitest";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { generateJigsaw } from "../games/jigsaw/generate";
import { defaultJigsawImageAsset } from "../games/jigsaw/imageAssets";
import { encodeGenerationId, makePuzzleResourceKey } from "./puzzleResourceIdentity";
import {
  buildPersistedPuzzleSession,
  loadPersistedPuzzleSessions,
  restorePuzzleSessionFromPersisted,
  savePersistedPuzzleSessions,
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
  const jigsawSnappedPieceIds = puzzle.tiles.slice(0, snappedCount).map((tile) => tile.id);

  return {
    kind: "tiles",
    puzzle,
    progress: { kind: "tiles", jigsawSnappedPieceIds },
    statusMessage: "Jigsaw in progress.",
  };
};

const makeJigsawResource = (session: Extract<PuzzleSession, { kind: "tiles" }>) => {
  const puzzle = session.puzzle;
  if (puzzle.puzzleId !== "jigsaw") throw new Error("Expected Jigsaw session");
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
  return {
    puzzleId: "jigsaw" as const,
    generationId,
    resourceKey: makePuzzleResourceKey("jigsaw", generationId),
  };
};

const withMemoryStorage = (run: (storage: Map<string, string>) => void) => {
  const storage = new Map<string, string>();
  const originalWindow = globalThis.window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    },
  });

  try {
    run(storage);
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
};

describe("Jigsaw session image identity", () => {
  it("round-trips snapped progress through browser session storage", () => {
    withMemoryStorage(() => {
      const session = makeJigsawSession();
      const puzzle = session.puzzle;
      if (puzzle.puzzleId !== "jigsaw") return;
      const resource = makeJigsawResource(session);

      savePersistedPuzzleSessions({
        activeResourceKey: resource.resourceKey,
        sessions: { [resource.resourceKey]: session },
      });

      const loaded = loadPersistedPuzzleSessions();
      expect(loaded?.activeResourceKey).toBe(resource.resourceKey);
      const persisted = loaded?.sessions[resource.resourceKey];
      expect(persisted?.progress.kind).toBe("tiles");
      if (!persisted || persisted.progress.kind !== "tiles") return;
      expect(persisted.progress.jigsawSnappedPieceIds).toEqual(session.progress.jigsawSnappedPieceIds);

      const restored = restorePuzzleSessionFromPersisted(persisted, puzzle);
      expect(restored?.progress.kind).toBe("tiles");
      if (!restored || restored.progress.kind !== "tiles") return;
      expect(restored.progress.jigsawSnappedPieceIds).toEqual(session.progress.jigsawSnappedPieceIds);
    });
  });

  it("rejects Jigsaw session records from before the snapped-progress contract", () => {
    withMemoryStorage((storage) => {
      const session = makeJigsawSession();
      const puzzle = session.puzzle;
      if (puzzle.puzzleId !== "jigsaw") return;
      const resource = makeJigsawResource(session);
      const persisted = buildPersistedPuzzleSession(resource, session);
      expect(persisted?.progress.kind).toBe("tiles");
      if (!persisted || persisted.progress.kind !== "tiles") return;

      const invalidRuntimeSession: Extract<PuzzleSession, { kind: "tiles" }> = {
        ...session,
        progress: { kind: "tiles" },
      };
      expect(buildPersistedPuzzleSession(resource, invalidRuntimeSession)).toBeNull();

      const { jigsawSnappedPieceIds: _discarded, ...oldProgress } = persisted.progress;
      const oldPersistedSession = { ...persisted, progress: oldProgress };
      storage.set(`puzzle-forge.session.${resource.resourceKey}`, JSON.stringify(oldPersistedSession));
      storage.set("puzzle-forge.sessions", JSON.stringify({
        activeResourceKey: resource.resourceKey,
        savedResourceKeys: [resource.resourceKey],
        updatedAt: "2026-09-21T00:00:00.000Z",
      }));

      expect(loadPersistedPuzzleSessions()).toBeNull();
      expect(restorePuzzleSessionFromPersisted(oldPersistedSession, puzzle)).toBeNull();
    });
  });


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
    expect(persisted.progress.jigsawSnappedPieceIds).toEqual(session.progress.jigsawSnappedPieceIds);
    expect(persisted.progress).not.toHaveProperty("jigsawPlacements");

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
    expect(restored.progress.jigsawSnappedPieceIds).toEqual(session.progress.jigsawSnappedPieceIds);

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
    expect(restored.progress.jigsawSnappedPieceIds).toHaveLength(puzzle.tiles.length);
    expect(new Set(restored.progress.jigsawSnappedPieceIds)).toEqual(new Set(puzzle.tiles.map((tile) => tile.id)));
  });

  it("rejects foreign or duplicate snapped Jigsaw piece ids", () => {
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
    if (!persisted || persisted.progress.kind !== "tiles" || !persisted.progress.jigsawSnappedPieceIds) return;

    expect(restorePuzzleSessionFromPersisted({
      ...persisted,
      progress: {
        ...persisted.progress,
        jigsawSnappedPieceIds: ["foreign-piece", ...persisted.progress.jigsawSnappedPieceIds.slice(1)],
      },
    }, puzzle)).toBeNull();

    const firstPieceId = persisted.progress.jigsawSnappedPieceIds[0];
    if (!firstPieceId) return;
    expect(restorePuzzleSessionFromPersisted({
      ...persisted,
      progress: {
        ...persisted.progress,
        jigsawSnappedPieceIds: [firstPieceId, firstPieceId],
      },
    }, puzzle)).toBeNull();
  });
});
