import { describe, expect, it } from "vitest";
import type { JigsawGeneratedPuzzle } from "../catalog/types";
import { isJigsawAssemblySolved, type JigsawAssemblyProgress } from "../games/jigsaw/assembly";
import { generateJigsaw } from "../games/jigsaw/generate";
import { applyJigsawHistoryAction, commitJigsawPlacementAction, makeEmptyJigsawHistoryState, type JigsawWorkspaceSnapshot } from "../games/jigsaw/history";
import { defaultJigsawImageAsset } from "../games/jigsaw/imageAssets";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { encodeGenerationId, makePuzzleResourceKey } from "./puzzleResourceIdentity";
import {
  buildPersistedPuzzleSession, loadPersistedPuzzleSessions, restorePuzzleSessionFromPersisted,
  savePersistedPuzzleSessions, type PersistedPuzzleSession, type PuzzleSession,
} from "./session";

const generate = (seed: string, special = false) => generateJigsaw({
  puzzleId: "jigsaw", seed, width: special ? 6 : 4, height: special ? 6 : 3,
  imageId: defaultJigsawImageAsset.id,
  ...(special ? { jigsawSpecialPiecesMode: "always" as const } : {}),
});

const makeSnapshot = (puzzle: JigsawGeneratedPuzzle, assembly: JigsawAssemblyProgress = { joinedComponents: [] }): JigsawWorkspaceSnapshot => ({
  placements: puzzle.tiles.map((piece, index) => ({
    id: piece.id, worldX: index * 110, worldY: index * 70,
  })),
  assembly,
});

const makeSession = (puzzle: JigsawGeneratedPuzzle, snapshot = makeSnapshot(puzzle)): Extract<PuzzleSession, { kind: "tiles" }> => ({
  kind: "tiles", puzzle, progress: {
    kind: "tiles",
    jigsawAssembly: snapshot.assembly,
    jigsawRuntime: { snapshot, history: makeEmptyJigsawHistoryState() },
  },
});

const resourceFor = (puzzle: JigsawGeneratedPuzzle) => {
  const generationId = encodeGenerationId({
    puzzleId: "jigsaw", seed: puzzle.seed, width: puzzle.width, height: puzzle.height,
    difficulty: puzzle.difficulty ?? "Medium", requireUniqueSolution: true,
    sudokuVariation: "classic", solitaireVariation: defaultSolitaireVariation,
    imageId: puzzle.asset.id,
  });
  return { puzzleId: "jigsaw" as const, generationId, resourceKey: makePuzzleResourceKey("jigsaw", generationId) };
};

const withMemoryStorage = (run: (storage: Map<string, string>) => void) => {
  const storage = new Map<string, string>();
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true, value: { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    } },
  });
  try { run(storage); } finally {
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }
};

const persistedFor = (session: Extract<PuzzleSession, { kind: "tiles" }>) => {
  if (session.puzzle.puzzleId !== "jigsaw") throw new Error("Expected Jigsaw");
  const resource = resourceFor(session.puzzle);
  const persisted = buildPersistedPuzzleSession(resource, session);
  if (!persisted || persisted.progress.kind !== "tiles") throw new Error("Missing valid session");
  return { resource, persisted };
};

describe("Jigsaw current-format resource sessions", () => {
  it("round-trips a spatial workspace and its undone history cursor through Local Storage", () => {
    withMemoryStorage(() => {
      const puzzle = generate("durable-history");
      const before = makeSnapshot(puzzle);
      const after: JigsawWorkspaceSnapshot = {
        ...before,
        placements: before.placements.map((piece, index) =>
          index === 0 ? { ...piece, worldX: 75.125, worldY: 36.5 } : piece),
      };
      const history = commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), before, after);
      const undone = applyJigsawHistoryAction(history, after, "undo")!;
      const session = makeSession(puzzle, undone.snapshot);
      session.progress.jigsawRuntime!.history = undone.history;
      const { resource } = persistedFor(session);
      savePersistedPuzzleSessions({
        activeResourceKey: resource.resourceKey,
        sessions: { [resource.resourceKey]: session },
      });
      const stored = loadPersistedPuzzleSessions()?.sessions[resource.resourceKey];
      expect(stored?.progress.kind).toBe("tiles");
      if (!stored || stored.progress.kind !== "tiles") return;
      expect(stored.progress).not.toHaveProperty("jigsawAssembly");
      expect(stored.progress.jigsawRuntime?.redo).toHaveLength(1);
      const restored = restorePuzzleSessionFromPersisted(stored, puzzle);
      expect(restored?.progress.kind).toBe("tiles");
      if (!restored || restored.progress.kind !== "tiles") return;
      const runtime = restored.progress.jigsawRuntime!;
      expect(runtime.snapshot.placements[0]?.worldX).toBe(before.placements[0]?.worldX);
      expect(runtime.history.undoStack).toEqual([]);
      expect(runtime.history.redoStack).toHaveLength(1);
      const redone = applyJigsawHistoryAction(runtime.history, runtime.snapshot, "redo")!;
      expect(redone.snapshot.placements[0]?.worldX).toBe(75.125);
      expect(redone.snapshot.placements[0]?.worldY).toBe(36.5);
    });
  });

  it("keeps two Jigsaw resource sessions independent", () => {
    withMemoryStorage(() => {
      const first = makeSession(generate("jigsaw-one"));
      const second = makeSession(generate("jigsaw-two"));
      first.progress.jigsawRuntime!.snapshot.placements[0]!.worldX = 123;
      second.progress.jigsawRuntime!.snapshot.placements[0]!.worldX = 456;
      const a = resourceFor(first.puzzle as JigsawGeneratedPuzzle);
      const b = resourceFor(second.puzzle as JigsawGeneratedPuzzle);
      savePersistedPuzzleSessions({ activeResourceKey: a.resourceKey, sessions: {
        [a.resourceKey]: first,
      } });
      savePersistedPuzzleSessions({ activeResourceKey: b.resourceKey, sessions: {
        [a.resourceKey]: first, [b.resourceKey]: second,
      } });
      const loaded = loadPersistedPuzzleSessions()!;
      expect(restorePuzzleSessionFromPersisted(loaded.sessions[a.resourceKey]!, first.puzzle)?.progress.kind).toBe("tiles");
      const restoredA = restorePuzzleSessionFromPersisted(loaded.sessions[a.resourceKey]!, first.puzzle);
      const restoredB = restorePuzzleSessionFromPersisted(loaded.sessions[b.resourceKey]!, second.puzzle);
      expect(restoredA?.progress.kind).toBe("tiles");
      expect(restoredB?.progress.kind).toBe("tiles");
      if (!restoredA || !restoredB || restoredA.progress.kind !== "tiles" || restoredB.progress.kind !== "tiles") return;
      expect(restoredA.progress.jigsawRuntime?.snapshot.placements[0]?.worldX).toBe(123);
      expect(restoredB.progress.jigsawRuntime?.snapshot.placements[0]?.worldX).toBe(456);
    });
  });

  it("round-trips anchored topology and special piece/socket joins", () => {
    let puzzle: JigsawGeneratedPuzzle | null = null;
    for (let index = 0; index < 128; index += 1) {
      const candidate = generate("special-persist-" + index, true);
      if (candidate.tiles.some((piece) => piece.specialShape?.kind === "medallion")) {
        puzzle = candidate;
        break;
      }
    }
    if (!puzzle) throw new Error("Expected a medallion");
    const medallion = puzzle.tiles.find((piece) => piece.specialShape?.kind === "medallion")!;
    if (medallion.specialShape?.kind !== "medallion") throw new Error("Expected medallion shape");
    const neighbor = medallion.specialShape.socketPieceIds[0];
    if (!neighbor) throw new Error("Missing socket");
    const joined = [medallion.id, neighbor];
    const assembly = { joinedComponents: [joined], anchoredPieceIds: joined };
    const session = makeSession(puzzle, makeSnapshot(puzzle, assembly));
    const { persisted } = persistedFor(session);
    const restored = restorePuzzleSessionFromPersisted(persisted, puzzle);
    expect(restored?.progress.kind).toBe("tiles");
    if (!restored || restored.progress.kind !== "tiles") return;
    expect(restored.progress.jigsawAssembly?.anchoredPieceIds).toEqual([...joined].sort());
  });

  it("restores solved assemblies and rejects topology/baseline mismatches", () => {
    const puzzle = generate("solved-state");
    const assembly = { joinedComponents: [puzzle.tiles.map((tile) => tile.id)] };
    const session = makeSession(puzzle, makeSnapshot(puzzle, assembly));
    const { persisted } = persistedFor(session);
    const restored = restorePuzzleSessionFromPersisted(persisted, puzzle);
    expect(restored?.progress.kind).toBe("tiles");
    if (!restored || restored.progress.kind !== "tiles") return;
    expect(isJigsawAssemblySolved(restored.progress.jigsawAssembly!, puzzle.tiles.length)).toBe(true);
    expect(restorePuzzleSessionFromPersisted(persisted, { ...puzzle, checksum: "different" })).toBeNull();
    if (persisted.progress.kind !== "tiles" || !persisted.progress.jigsawRuntime) return;
    const tampered: PersistedPuzzleSession = JSON.parse(JSON.stringify(persisted));
    if (tampered.progress.kind !== "tiles" || !tampered.progress.jigsawRuntime) return;
    tampered.progress.jigsawRuntime.current.assembly.joinedComponents = [[9999, 0]];
    expect(restorePuzzleSessionFromPersisted(tampered, puzzle)).toBeNull();
  });

  it("retains current board when an Undo patch is invalid, without inventing a history", () => {
    const puzzle = generate("corrupt-undo");
    const before = makeSnapshot(puzzle);
    const after = makeSnapshot(puzzle);
    after.placements[0]!.worldX += 10;
    const session = makeSession(puzzle, after);
    session.progress.jigsawRuntime!.history =
      commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), before, after);
    const { persisted } = persistedFor(session);
    if (persisted.progress.kind !== "tiles" || !persisted.progress.jigsawRuntime) return;
    persisted.progress.jigsawRuntime.undo[0]!.positions = [[9999, 2, 3]];
    const restored = restorePuzzleSessionFromPersisted(persisted, puzzle);
    expect(restored?.progress.kind).toBe("tiles");
    if (!restored || restored.progress.kind !== "tiles") return;
    expect(restored.progress.jigsawRuntime?.history.undoStack).toEqual([]);
    expect(restored.progress.jigsawRuntime?.snapshot.placements[0]?.worldX).toBe(after.placements[0]?.worldX);
  });

  it("does not accept old assembly-only Jigsaw sessions", () => {
    withMemoryStorage((storage) => {
      const puzzle = generate("no-legacy");
      const session = makeSession(puzzle);
      const { resource, persisted } = persistedFor(session);
      if (persisted.progress.kind !== "tiles") return;
      const legacy = { ...persisted, progress: {
        kind: "tiles", tileOrder: persisted.progress.tileOrder, selectedTileId: null,
        jigsawAssembly: { joinedComponents: [] },
      } };
      storage.set("puzzle-forge.session." + resource.resourceKey, JSON.stringify(legacy));
      storage.set("puzzle-forge.sessions", JSON.stringify({
        activeResourceKey: resource.resourceKey, savedResourceKeys: [resource.resourceKey],
        updatedAt: "2026-11-15T00:00:00Z",
      }));
      expect(loadPersistedPuzzleSessions()).toBeNull();
      expect(restorePuzzleSessionFromPersisted(legacy as PersistedPuzzleSession, puzzle)).toBeNull();
    });
  });
});
