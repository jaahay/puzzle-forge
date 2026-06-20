import type { PuzzleId } from "../catalog/types";
import type { PuzzleSession, PuzzleSessionCache } from "./session";

export const MAX_CACHED_PUZZLE_SESSIONS = 5;

export type PuzzleSessionCacheState = {
  entries: PuzzleSessionCache;
  order: PuzzleId[];
};

export const createPuzzleSessionCache = (): PuzzleSessionCacheState => ({
  entries: {},
  order: [],
});

export const getPuzzleSession = (cache: PuzzleSessionCacheState, puzzleId: PuzzleId) => cache.entries[puzzleId] ?? null;

export const putPuzzleSession = (
  cache: PuzzleSessionCacheState,
  puzzleId: PuzzleId,
  session: PuzzleSession,
  limit = MAX_CACHED_PUZZLE_SESSIONS,
) => {
  cache.entries[puzzleId] = session;
  cache.order = cache.order.filter((cachedPuzzleId) => cachedPuzzleId !== puzzleId);
  cache.order.push(puzzleId);

  while (cache.order.length > limit) {
    const oldestPuzzleId = cache.order.shift();

    if (oldestPuzzleId) {
      delete cache.entries[oldestPuzzleId];
    }
  }
};
