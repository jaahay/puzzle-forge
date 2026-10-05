import { describe, expect, it } from "vitest";
import { isJigsawAssemblySolved } from "../games/jigsaw/assembly";
import { generateJigsaw } from "../games/jigsaw/generate";
import { defaultJigsawImageAsset } from "../games/jigsaw/imageAssets";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { encodeGenerationId, makePuzzleResourceKey } from "./puzzleResourceIdentity";
import {
  buildPersistedPuzzleSession,
  loadPersistedPuzzleSessions,
  restorePuzzleSessionFromPersisted,
  savePersistedPuzzleSessions,
  type PersistedPuzzleSession,
  type PuzzleSession,
} from "./session";

const makeJigsawSession = (
  joinedComponents: string[][] = [["tile-2", "tile-1", "tile-0"]],
): Extract<PuzzleSession, { kind: "tiles" }> => {
  const puzzle = generateJigsaw({
    puzzleId: "jigsaw",
    seed: "persist-image-selection",
    width: 4,
    height: 3,
    imageId: defaultJigsawImageAsset.id,
  });

  return {
    kind: "tiles",
    puzzle,
    progress: {
      kind: "tiles",
      jigsawAssembly: { joinedComponents: joinedComponents.map((component) => [...component]) },
    },
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

const buildPersisted = (session: Extract<PuzzleSession, { kind: "tiles" }>) => {
  const resource = makeJigsawResource(session);
  const persisted = buildPersistedPuzzleSession(resource, session);
  expect(persisted).not.toBeNull();
  if (!persisted) throw new Error("Expected persisted Jigsaw session");
  expect(persisted.progress.kind).toBe("tiles");
  if (persisted.progress.kind !== "tiles") throw new Error("Expected tile progress");
  return { resource, persisted };
};

const withAssembly = (
  persisted: PersistedPuzzleSession,
  joinedComponents: string[][],
): PersistedPuzzleSession => {
  if (persisted.progress.kind !== "tiles") throw new Error("Expected tile progress");
  return {
    ...persisted,
    progress: {
      ...persisted.progress,
      jigsawAssembly: { joinedComponents },
    },
  };
};

describe("Jigsaw session assembly persistence", () => {
  it("round-trips canonical component progress through browser session storage", () => {
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
      expect(persisted.progress.jigsawAssembly).toEqual({
        joinedComponents: [["tile-0", "tile-1", "tile-2"]],
      });

      const restored = restorePuzzleSessionFromPersisted(persisted, puzzle);
      expect(restored?.progress.kind).toBe("tiles");
      if (!restored || restored.progress.kind !== "tiles") return;
      expect(restored.progress.jigsawAssembly).toEqual({
        joinedComponents: [["tile-0", "tile-1", "tile-2"]],
      });
    });
  });

  it("round-trips medallion/socket joins through the existing assembly persistence contract", () => {
    const puzzle = generateJigsaw({
      puzzleId: "jigsaw",
      seed: "persist-medallion",
      width: 4,
      height: 4,
      imageId: defaultJigsawImageAsset.id,
    });
    const medallion = puzzle.tiles.find(
      (tile) => tile.specialShape?.kind === "medallion",
    );
    if (!medallion || medallion.specialShape?.kind !== "medallion") {
      throw new Error("Expected generated medallion.");
    }
    const socketId = medallion.specialShape.socketPieceIds[0];
    const session: Extract<PuzzleSession, { kind: "tiles" }> = {
      kind: "tiles",
      puzzle,
      progress: {
        kind: "tiles",
        jigsawAssembly: {
          joinedComponents: [[medallion.id, socketId]],
        },
      },
      statusMessage: "Medallion in progress.",
    };
    const { persisted } = buildPersisted(session);
    const restored = restorePuzzleSessionFromPersisted(persisted, puzzle);

    expect(restored?.progress.kind).toBe("tiles");
    if (!restored || restored.progress.kind !== "tiles") return;
    expect(restored.progress.jigsawAssembly).toEqual({
      joinedComponents: [[medallion.id, socketId].sort((left, right) => left.localeCompare(right))],
    });
  });

  it("persists explicit empty assembly progress rather than treating it as missing", () => {
    const session = makeJigsawSession([]);
    const puzzle = session.puzzle;
    if (puzzle.puzzleId !== "jigsaw") return;
    const { persisted } = buildPersisted(session);

    expect(persisted.progress.kind).toBe("tiles");
    if (persisted.progress.kind !== "tiles") return;
    expect(persisted.progress.jigsawAssembly).toEqual({ joinedComponents: [] });

    const restored = restorePuzzleSessionFromPersisted(persisted, puzzle);
    expect(restored?.progress.kind).toBe("tiles");
    if (!restored || restored.progress.kind !== "tiles") return;
    expect(restored.progress.jigsawAssembly).toEqual({ joinedComponents: [] });
  });

  it("rejects Jigsaw session records from before the assembly-progress contract", () => {
    withMemoryStorage((storage) => {
      const session = makeJigsawSession();
      const puzzle = session.puzzle;
      if (puzzle.puzzleId !== "jigsaw") return;
      const { resource, persisted } = buildPersisted(session);

      const invalidRuntimeSession: Extract<PuzzleSession, { kind: "tiles" }> = {
        ...session,
        progress: { kind: "tiles" },
      };
      expect(buildPersistedPuzzleSession(resource, invalidRuntimeSession)).toBeNull();

      if (persisted.progress.kind !== "tiles") return;
      const { jigsawAssembly: _discarded, ...oldProgress } = persisted.progress;
      const oldPersistedSession = { ...persisted, progress: oldProgress };
      storage.set(`puzzle-forge.session.${resource.resourceKey}`, JSON.stringify(oldPersistedSession));
      storage.set("puzzle-forge.sessions", JSON.stringify({
        activeResourceKey: resource.resourceKey,
        savedResourceKeys: [resource.resourceKey],
        updatedAt: "2026-10-02T00:00:00.000Z",
      }));

      expect(loadPersistedPuzzleSessions()).toBeNull();
      expect(restorePuzzleSessionFromPersisted(oldPersistedSession, puzzle)).toBeNull();
    });
  });

  it("restores assembly only over the matching regenerated Jigsaw baseline without coordinates", () => {
    const session = makeJigsawSession();
    const puzzle = session.puzzle;
    if (puzzle.kind !== "tiles" || puzzle.puzzleId !== "jigsaw") return;
    const { persisted } = buildPersisted(session);

    expect(persisted.baselineChecksum).toBe(puzzle.checksum);
    expect(persisted).not.toHaveProperty("puzzle");
    expect(persisted.progress).not.toHaveProperty("jigsawPlacements");
    expect(persisted.progress).not.toHaveProperty("componentTranslations");
    expect(persisted.progress).not.toHaveProperty("worldX");
    expect(persisted.progress).not.toHaveProperty("worldY");

    const regenerated = generateJigsaw({
      puzzleId: "jigsaw",
      seed: "persist-image-selection",
      width: 4,
      height: 3,
      imageId: defaultJigsawImageAsset.id,
    });
    const restored = restorePuzzleSessionFromPersisted(persisted, regenerated);
    expect(restored).not.toBeNull();
    if (
      !restored ||
      restored.puzzle.kind !== "tiles" ||
      restored.puzzle.puzzleId !== "jigsaw" ||
      restored.progress.kind !== "tiles"
    ) return;
    expect(restored.puzzle.asset.id).toBe(defaultJigsawImageAsset.id);
    expect(restored.puzzle.id).toBe(puzzle.id);
    expect(restored.puzzle.tiles).toEqual(puzzle.tiles);
    expect(restored.progress.jigsawAssembly).toEqual({
      joinedComponents: [["tile-0", "tile-1", "tile-2"]],
    });

    expect(restorePuzzleSessionFromPersisted(
      persisted,
      { ...regenerated, checksum: "different-baseline" },
    )).toBeNull();
  });

  it("restores a fully assembled floating puzzle as solved progress", () => {
    const base = makeJigsawSession([]);
    const puzzle = base.puzzle;
    if (puzzle.kind !== "tiles" || puzzle.puzzleId !== "jigsaw") return;
    const session: Extract<PuzzleSession, { kind: "tiles" }> = {
      ...base,
      progress: {
        kind: "tiles",
        jigsawAssembly: { joinedComponents: [puzzle.tiles.map((tile) => tile.id).reverse()] },
      },
    };
    const { persisted } = buildPersisted(session);
    const restored = restorePuzzleSessionFromPersisted(persisted, puzzle);
    expect(restored?.progress.kind).toBe("tiles");
    if (!restored || restored.progress.kind !== "tiles" || !restored.progress.jigsawAssembly) return;

    expect(isJigsawAssemblySolved(restored.progress.jigsawAssembly, puzzle.tiles.length)).toBe(true);
    expect(restored.progress.jigsawAssembly.joinedComponents).toEqual([
      puzzle.tiles.map((tile) => tile.id).sort((left, right) => left.localeCompare(right)),
    ]);
  });

  it("rejects foreign, duplicate, overlapping, and disconnected component membership", () => {
    const session = makeJigsawSession();
    const puzzle = session.puzzle;
    if (puzzle.kind !== "tiles" || puzzle.puzzleId !== "jigsaw") return;
    const { resource, persisted } = buildPersisted(session);

    expect(restorePuzzleSessionFromPersisted(
      withAssembly(persisted, [["tile-0", "foreign-piece"]]),
      puzzle,
    )).toBeNull();
    expect(restorePuzzleSessionFromPersisted(
      withAssembly(persisted, [["tile-0", "tile-0"]]),
      puzzle,
    )).toBeNull();
    expect(restorePuzzleSessionFromPersisted(
      withAssembly(persisted, [["tile-0", "tile-1"], ["tile-1", "tile-2"]]),
      puzzle,
    )).toBeNull();
    expect(restorePuzzleSessionFromPersisted(
      withAssembly(persisted, [["tile-0", "tile-5"]]),
      puzzle,
    )).toBeNull();

    const invalidRuntime: Extract<PuzzleSession, { kind: "tiles" }> = {
      ...session,
      progress: {
        kind: "tiles",
        jigsawAssembly: { joinedComponents: [["tile-0", "tile-5"]] },
      },
    };
    expect(buildPersistedPuzzleSession(resource, invalidRuntime)).toBeNull();
  });
});
