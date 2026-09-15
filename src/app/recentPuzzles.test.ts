import { describe, expect, it } from "vitest";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { defaultSudokuVariation } from "../games/sudoku/variation";
import type { GenerationIdentity } from "./generationIdentity";
import { encodeGenerationId, makePuzzleResourceKey } from "./puzzleResourceIdentity";
import { getRecentPuzzleEntries } from "./recentPuzzles";
import type { PersistedPuzzleSession, PersistedPuzzleSessions } from "./sessionPersistence";

const makeIdentity = (
  seed: string,
  overrides: Partial<GenerationIdentity> = {},
): GenerationIdentity => ({
  puzzleId: "sudoku",
  seed,
  width: 9,
  height: 9,
  difficulty: "Medium",
  requireUniqueSolution: true,
  sudokuVariation: defaultSudokuVariation,
  solitaireVariation: defaultSolitaireVariation,
  ...overrides,
});

const makeSession = (
  identity: GenerationIdentity,
  updatedAt: string,
  completedAt?: string,
): PersistedPuzzleSession => ({
  puzzleId: identity.puzzleId,
  generationId: encodeGenerationId(identity),
  baselineChecksum: `checksum-${identity.seed}`,
  progress: { kind: "grid", cells: [], selectedCell: null },
  statusMessage: "In progress.",
  updatedAt,
  ...(completedAt ? { completedAt } : {}),
});

const makePersistedSessions = (
  sessions: PersistedPuzzleSession[],
  activeIndex = 0,
): PersistedPuzzleSessions => {
  const entries = sessions.map((session) => {
    const resourceKey = makePuzzleResourceKey(session.puzzleId, session.generationId);
    return [resourceKey, session] as const;
  });
  const active = entries[activeIndex];
  if (!active) throw new Error("An active persisted session is required.");
  return {
    activeResourceKey: active[0],
    sessions: Object.fromEntries(entries),
  };
};

describe("recent puzzle resources", () => {
  it("lists retained resources by deterministic recency while keeping same-type puzzles distinct", () => {
    const first = makeSession(makeIdentity("first"), "2026-09-12T18:00:00.000Z");
    const second = makeSession(makeIdentity("second"), "2026-09-14T18:00:00.000Z");
    const third = makeSession(makeIdentity("third"), "2026-09-13T18:00:00.000Z");

    const recent = getRecentPuzzleEntries(makePersistedSessions([first, second, third], 2));

    expect(recent).toHaveLength(3);
    expect(recent.map(({ generationId }) => generationId)).toEqual([
      second.generationId,
      third.generationId,
      first.generationId,
    ]);
    expect(new Set(recent.map(({ resourceKey }) => resourceKey)).size).toBe(3);
    expect(recent.find(({ generationId }) => generationId === third.generationId)?.isActive).toBe(true);
  });

  it("exposes useful identity metadata without using the opaque generation id as the label", () => {
    const daily = makeSession(
      makeIdentity("daily-seed", {
        difficulty: "Hard",
        sudokuVariation: "zero-killer",
        provenance: { source: "daily", dateStamp: "2026-09-14" },
      }),
      "2026-09-14T19:00:00.000Z",
    );

    const [entry] = getRecentPuzzleEntries(makePersistedSessions([daily]));

    expect(entry?.title).toBe("Sudoku");
    expect(entry?.summary).toContain("Daily");
    expect(entry?.summary).toContain("Zero Killer");
    expect(entry?.summary).toContain("Hard");
    expect(entry?.summary).not.toContain(daily.generationId);
  });

  it("preserves completion state for presentation", () => {
    const completedAt = "2026-09-14T20:00:00.000Z";
    const completed = makeSession(makeIdentity("completed"), completedAt, completedAt);

    const [entry] = getRecentPuzzleEntries(makePersistedSessions([completed]));

    expect(entry?.completedAt).toBe(completedAt);
    expect(entry?.isActive).toBe(true);
  });

  it("omits stale or mismatched entries instead of advertising a dead resource", () => {
    const valid = makeSession(makeIdentity("valid"), "2026-09-14T18:00:00.000Z");
    const resourceKey = makePuzzleResourceKey(valid.puzzleId, valid.generationId);
    const stale: PersistedPuzzleSession = { ...valid, generationId: "not-a-generation-id" };

    const recent = getRecentPuzzleEntries({
      activeResourceKey: resourceKey,
      sessions: { [resourceKey]: stale },
    });

    expect(recent).toEqual([]);
  });
});
