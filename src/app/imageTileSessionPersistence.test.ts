import { describe, expect, it } from "vitest";
import type { ImageTileGeneratedPuzzle, ImageTilePuzzleId } from "../catalog/types";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { canSlideTileTowardGap } from "../games/imageTiles/state";
import {
  applyImageTileHistoryAction,
  makeEmptyImageTileHistoryState,
  slideImageTileAction,
  swapImageTileAction,
  type ImageTileActionRuntime,
} from "../games/imageTiles/history";
import { generateSlidingPuzzle } from "../games/slidingPuzzle/generate";
import { generateTileSwap } from "../games/tileSwap/generate";
import { encodeGenerationId, makePuzzleResourceKey } from "./puzzleResourceIdentity";
import {
  buildPersistedPuzzleSession,
  restorePuzzleSessionFromPersisted,
  loadPersistedPuzzleSessions,
  savePersistedPuzzleSessions,
  type PersistedPuzzleSession,
  type PuzzleSession,
} from "./session";

const makeTileSession = (puzzle: ImageTileGeneratedPuzzle): PuzzleSession => ({
  kind: "tiles",
  puzzle,
  progress: { kind: "tiles" },
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

const makeProgressedSession = (puzzle: ImageTileGeneratedPuzzle): PuzzleSession => {
  const initial: ImageTileActionRuntime = {
    state: {
      tiles: puzzle.tiles.map((tile) => ({ ...tile })),
      ...(puzzle.puzzleId === "sliding-puzzle" ? { emptyIndex: puzzle.emptyIndex } : {}),
      moveCount: 0,
    },
    history: makeEmptyImageTileHistoryState(),
  };
  const next = puzzle.puzzleId === "sliding-puzzle"
    ? slideImageTileAction(
        initial,
        puzzle.tiles.find((tile) => canSlideTileTowardGap(tile, puzzle.emptyIndex, puzzle.width, puzzle.height))?.id ?? "",
        puzzle.width, puzzle.height,
      )
    : swapImageTileAction(initial, puzzle.tiles[0].id, puzzle.tiles[1].id);
  if (!next) throw new Error("Expected a legal image-tile move");
  const undone = applyImageTileHistoryAction(next, "undo");
  if (!undone) throw new Error("Expected an undoable move");
  return {
    kind: "tiles",
    puzzle,
    progress: { kind: "tiles", imageTileRuntime: undone },
  };
};

const withMockStorage = (run: (values: Map<string, string>) => void) => {
  const previous = globalThis.window;
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    },
  });
  try { run(values); } finally {
    Object.defineProperty(globalThis, "window", { configurable: true, value: previous });
  }
};

describe("canonical resource-owned image-tile history", () => {
  it.each(cases)("round-trips an independent $puzzleId resource including redo-only history", ({ make }) => {
    const puzzle = make("great-wave");
    const session = makeProgressedSession(puzzle);
    const resource = makeResource(puzzle);
    const persisted = buildPersistedPuzzleSession(resource, session);
    expect(persisted?.progress.kind).toBe("tiles");
    if (!persisted || persisted.progress.kind !== "tiles" || session.progress.kind !== "tiles") return;

    expect(persisted.progress.imageTileMoveCount).toBe(0);
    expect(persisted.progress.imageTileHistory?.undo).toHaveLength(0);
    expect(persisted.progress.imageTileHistory?.redo).toHaveLength(1);

    const restored = restorePuzzleSessionFromPersisted(persisted, puzzle);
    expect(restored?.kind).toBe("tiles");
    if (!restored || restored.kind !== "tiles") return;
    expect(restored.puzzle.tiles).toEqual(puzzle.tiles);
    expect(restored.progress.imageTileRuntime?.history.redoStack).toHaveLength(1);
    const runtime = restored.progress.imageTileRuntime;
    const redone = runtime && applyImageTileHistoryAction(runtime, "redo");
    expect(redone?.state.moveCount).toBe(1);
    expect(redone?.state.tiles.map((tile) => tile.currentIndex))
      .not.toEqual(puzzle.tiles.map((tile) => tile.currentIndex));
  });

  it("keeps two unfinished Tile Swap resources independent through the eight-session store", () => {
    withMockStorage((values) => {
      const first = generateTileSwap({ puzzleId: "tile-swap", seed: "retained-first", width: 4, height: 4, imageId: "great-wave" });
      const second = generateTileSwap({ puzzleId: "tile-swap", seed: "retained-second", width: 4, height: 4, imageId: "great-wave" });
      const keyA = makePuzzleResourceKey("tile-swap", makeResource(first).generationId);
      const keyB = makePuzzleResourceKey("tile-swap", makeResource(second).generationId);
      const sessionA = makeProgressedSession(first);
      const sessionB = makeProgressedSession(second);
      savePersistedPuzzleSessions({ activeResourceKey: keyA, sessions: { [keyA]: sessionA } });
      savePersistedPuzzleSessions({ activeResourceKey: keyB, sessions: { [keyA]: sessionA, [keyB]: sessionB } });

      const saved = loadPersistedPuzzleSessions();
      expect(Object.keys(saved?.sessions ?? {})).toEqual(expect.arrayContaining([keyA, keyB]));
      for (const [key, puzzle] of [[keyA, first], [keyB, second]] as const) {
        const session = saved?.sessions[key];
        expect(session).toBeDefined();
        if (!session) continue;
        const restored = restorePuzzleSessionFromPersisted(session, puzzle);
        expect(restored?.kind).toBe("tiles");
        if (restored?.kind !== "tiles") continue;
        expect(restored.progress.imageTileRuntime?.history.redoStack).toHaveLength(1);
      }
      expect([...values.keys()].filter((key) => key.startsWith("puzzle-forge.image-tile-progress"))).toHaveLength(0);
      expect([...values.keys()].filter((key) => key.startsWith("puzzle-forge.session."))).toHaveLength(2);
    });
  });

  it("drops malformed history but preserves the saved board position and move count", () => {
    const puzzle = generateTileSwap({ puzzleId: "tile-swap", seed: "corrupt-history", width: 4, height: 4 });
    const first: ImageTileActionRuntime = {
      state: { tiles: puzzle.tiles, moveCount: 0 },
      history: makeEmptyImageTileHistoryState(),
    };
    const swapped = swapImageTileAction(first, puzzle.tiles[0].id, puzzle.tiles[1].id);
    if (!swapped) throw new Error("Expected a legal swap");
    const built = buildPersistedPuzzleSession(makeResource(puzzle), {
      kind: "tiles", puzzle, progress: { kind: "tiles", imageTileRuntime: swapped },
    });
    if (!built || built.progress.kind !== "tiles") throw new Error("Expected a persisted tile session");
    const malformed = {
      ...built,
      progress: {
        ...built.progress,
        imageTileHistory: { undo: [{ positions: Array(16).fill(0), moveCount: 0 }], redo: [] },
      },
    };
    const restored = restorePuzzleSessionFromPersisted(malformed, puzzle);
    if (!restored || restored.kind !== "tiles") throw new Error("Valid board must survive bad history");
    expect(restored.progress.imageTileRuntime?.state.moveCount).toBe(1);
    expect(restored.progress.imageTileRuntime?.state.tiles.map((tile) => tile.currentIndex))
      .toEqual(swapped.state.tiles.map((tile) => tile.currentIndex));
    expect(restored.progress.imageTileRuntime?.history.undoStack).toHaveLength(0);
  });
});

describe("one-time image tile legacy slot retirement", () => {
  it("removes only the matching old slot after canonical progress is durably saved", () => {
    withMockStorage((values) => {
      const puzzle = generateTileSwap({ puzzleId: "tile-swap", seed: "import-old-swap", width: 4, height: 4 });
      const session = makeProgressedSession(puzzle);
      const key = makePuzzleResourceKey(puzzle.puzzleId, makeResource(puzzle).generationId);
      const legacyKey = "puzzle-forge.image-tile-progress.v1.tile-swap";
      values.set(legacyKey, JSON.stringify({ puzzleInstanceId: puzzle.id }));
      savePersistedPuzzleSessions({ activeResourceKey: key, sessions: { [key]: session } });
      expect(values.has(legacyKey)).toBe(false);
      expect(loadPersistedPuzzleSessions()?.sessions[key]?.progress).toMatchObject({
        kind: "tiles",
        imageTileMoveCount: 0,
      });
    });
  });

  it("does not remove an old record for another puzzle instance", () => {
    withMockStorage((values) => {
      const puzzle = generateTileSwap({ puzzleId: "tile-swap", seed: "leave-other-swap", width: 4, height: 4 });
      const session = makeProgressedSession(puzzle);
      const key = makePuzzleResourceKey(puzzle.puzzleId, makeResource(puzzle).generationId);
      const legacyKey = "puzzle-forge.image-tile-progress.v1.tile-swap";
      values.set(legacyKey, JSON.stringify({ puzzleInstanceId: "other-instance" }));
      savePersistedPuzzleSessions({ activeResourceKey: key, sessions: { [key]: session } });
      expect(values.has(legacyKey)).toBe(true);
    });
  });

  it("retains the import if browser storage rejects the canonical write", () => {
    withMockStorage((values) => {
      const puzzle = generateTileSwap({ puzzleId: "tile-swap", seed: "failed-import", width: 4, height: 4 });
      const session = makeProgressedSession(puzzle);
      const key = makePuzzleResourceKey(puzzle.puzzleId, makeResource(puzzle).generationId);
      const legacyKey = "puzzle-forge.image-tile-progress.v1.tile-swap";
      values.set(legacyKey, JSON.stringify({ puzzleInstanceId: puzzle.id }));
      Object.defineProperty(window.localStorage, "setItem", {
        configurable: true,
        value: () => { throw new Error("QuotaExceededError"); },
      });
      expect(() => savePersistedPuzzleSessions({ activeResourceKey: key, sessions: { [key]: session } })).not.toThrow();
      expect(values.has(legacyKey)).toBe(true);
    });
  });
});
