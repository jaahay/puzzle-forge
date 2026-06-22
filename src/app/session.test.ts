import { describe, expect, it } from "vitest";
import type { CardStack, GeneratedPuzzle, PlayingCard } from "../catalog/types";
import {
  buildPersistedPuzzleSession,
  completePersistedPuzzleSession,
  initialSolitaireStats,
  loadPersistedPuzzleSessions,
  restorePuzzleSessionFromPersisted,
  savePersistedPuzzleSessions,
  solitaireHistoryLimit,
  type PersistedPuzzleSession,
  type PuzzleSession,
  type SolitaireHistoryEntry,
  type SolitaireStats,
} from "./session";

const metadataStorageKey = "puzzle-forge.sessions.v1";
const solitaireStorageKey = "puzzle-forge.session.v1.klondike-solitaire";

const makeCard = (code: string, faceUp = true): PlayingCard => ({
  suit: "spades",
  rank: "ace",
  code,
  color: "black",
  label: code,
  faceUp,
});

const makeCardStacks = (): CardStack[] => [
  { id: "stock", title: "Stock", role: "stock", cards: [makeCard("AS", false)], faceDownCount: 1 },
  { id: "waste", title: "Waste", role: "waste", cards: [makeCard("2S")] },
  { id: "foundation-spades", title: "Spades", role: "foundation", cards: [] },
  { id: "tableau-1", title: "Tableau 1", role: "tableau", cards: [makeCard("3S")] },
];

const makeStats = (moveCount = 0): SolitaireStats => ({
  ...initialSolitaireStats,
  moveCount,
});

const makeHistoryEntry = (moveCount: number): SolitaireHistoryEntry => ({
  cardStacks: makeCardStacks(),
  selectedCard: { stackId: "waste", cardIndex: 0 },
  solitaireStats: makeStats(moveCount),
  statusMessage: `Move ${moveCount}`,
});

const makeCardPuzzle = (seed = "seed-1"): GeneratedPuzzle => ({
  id: `klondike-${seed}`,
  puzzleId: "klondike-solitaire",
  title: "Klondike Solitaire",
  seed,
  width: 7,
  height: 4,
  checksum: "checksum",
  createdAt: "2026-06-22T00:00:00.000Z",
  difficulty: "Easy",
  notes: [],
  kind: "cards",
  stacks: makeCardStacks(),
});

const makeSession = (overrides: Partial<PuzzleSession> = {}): PuzzleSession => ({
  seed: "seed-1",
  width: 7,
  height: 4,
  difficulty: "Easy",
  requireUniqueSolution: false,
  puzzle: makeCardPuzzle(),
  cardStacks: makeCardStacks(),
  selectedCard: { stackId: "waste", cardIndex: 0 },
  solitaireStats: makeStats(3),
  solitaireUndoStack: [],
  solitaireRedoStack: [],
  gridCells: null,
  selectedGridCell: null,
  statusMessage: "In progress.",
  ...overrides,
});

const withMockWindowStorage = (run: (storage: Map<string, string>) => void) => {
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

describe("app session persistence", () => {
  it("stores compact card refs and generated identity without durable generated puzzle internals", () => {
    const session = makeSession({
      solitaireUndoStack: Array.from({ length: solitaireHistoryLimit + 5 }, (_, index) => makeHistoryEntry(index)),
    });

    const persisted = buildPersistedPuzzleSession("klondike-solitaire", session);

    expect(persisted).not.toBeNull();
    expect(persisted).not.toHaveProperty("puzzle");
    expect(persisted?.progress.kind).toBe("cards");
    if (persisted?.progress.kind !== "cards") return;
    expect(persisted.progress.stacks[0].cards).toEqual([{ code: "AS", faceDown: true }]);
    expect(persisted.progress.stacks[1].cards).toEqual(["2S"]);
    expect(persisted.progress.undoStack).toHaveLength(solitaireHistoryLimit);
    expect(persisted.progress.undoStack[0].solitaireStats.moveCount).toBe(5);
  });

  it("clears transient Solitaire history and selection when completing persisted card progress", () => {
    const persisted = buildPersistedPuzzleSession(
      "klondike-solitaire",
      makeSession({
        solitaireUndoStack: [makeHistoryEntry(1)],
        solitaireRedoStack: [makeHistoryEntry(2)],
      }),
    );

    expect(persisted).not.toBeNull();
    const completed = completePersistedPuzzleSession(persisted as PersistedPuzzleSession, "2026-06-22T00:00:00.000Z");

    expect(completed.completedAt).toBe("2026-06-22T00:00:00.000Z");
    expect(completed.progress.kind).toBe("cards");
    if (completed.progress.kind !== "cards") return;
    expect(completed.progress.stacks).toHaveLength(makeCardStacks().length);
    expect(completed.progress.selectedCard).toBeNull();
    expect(completed.progress.undoStack).toEqual([]);
    expect(completed.progress.redoStack).toEqual([]);
  });

  it("restores compact card progress only when regenerated puzzle identity matches", () => {
    const persisted = buildPersistedPuzzleSession(
      "klondike-solitaire",
      makeSession({
        statusMessage: "Restored progress.",
        solitaireUndoStack: [makeHistoryEntry(1)],
      }),
    );

    expect(persisted).not.toBeNull();
    const restored = restorePuzzleSessionFromPersisted(persisted as PersistedPuzzleSession, makeCardPuzzle("seed-1"));
    const mismatched = restorePuzzleSessionFromPersisted(persisted as PersistedPuzzleSession, makeCardPuzzle("different-seed"));

    expect(restored?.statusMessage).toBe("Restored progress.");
    expect(restored?.cardStacks).toEqual(makeCardStacks());
    expect(restored?.solitaireUndoStack).toHaveLength(1);
    expect(mismatched).toBeNull();
  });

  it("rejects compact card progress with duplicate card codes", () => {
    const persisted = buildPersistedPuzzleSession("klondike-solitaire", makeSession());
    expect(persisted?.progress.kind).toBe("cards");
    if (!persisted || persisted.progress.kind !== "cards") return;

    const duplicateCardSession: PersistedPuzzleSession = {
      ...persisted,
      progress: {
        ...persisted.progress,
        stacks: persisted.progress.stacks.map((stack) =>
          stack.id === "waste" ? { ...stack, cards: ["AS"] } : stack,
        ),
      },
    };

    expect(restorePuzzleSessionFromPersisted(duplicateCardSession, makeCardPuzzle())).toBeNull();
  });

  it("round-trips valid per-puzzle storage and ignores invalid records that contain generated puzzle payloads", () => {
    withMockWindowStorage((storage) => {
      const session = makeSession();
      savePersistedPuzzleSessions({ activePuzzleId: "klondike-solitaire", sessions: { "klondike-solitaire": session } });

      const metadata = JSON.parse(storage.get(metadataStorageKey) ?? "{}");
      const persistedSession = JSON.parse(storage.get(solitaireStorageKey) ?? "{}");

      expect(metadata.activePuzzleId).toBe("klondike-solitaire");
      expect(metadata.savedPuzzleIds).toEqual(["klondike-solitaire"]);
      expect(persistedSession.progress.kind).toBe("cards");
      expect(loadPersistedPuzzleSessions()?.activePuzzleId).toBe("klondike-solitaire");

      storage.set(solitaireStorageKey, JSON.stringify({ ...persistedSession, puzzle: makeCardPuzzle() }));

      expect(loadPersistedPuzzleSessions()).toBeNull();
    });
  });
});
