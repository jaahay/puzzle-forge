import { describe, expect, it } from "vitest";
import { makePuzzleResourceKey } from "./puzzleResourceIdentity";
import type { AppRoute } from "./routes";
import type { PersistedPuzzleSessions, PersistedPuzzleProgress } from "./session";
import { resolveStartupRoute } from "./startupNavigation";

const makePersisted = (
  puzzleId: "sudoku" | "jigsaw",
  generationId = "generation-a",
): PersistedPuzzleSessions => {
  const activeResourceKey = makePuzzleResourceKey(puzzleId, generationId);
  const progress: PersistedPuzzleProgress = puzzleId === "jigsaw"
    ? { kind: "tiles", tileOrder: [], selectedTileId: null, jigsawSnappedPieceIds: [] }
    : { kind: "grid", cells: [], selectedCell: null };

  return {
    activeResourceKey,
    sessions: {
      [activeResourceKey]: {
        puzzleId,
        generationId,
        baselineChecksum: "checksum",
        progress,
        statusMessage: "",
        updatedAt: "2026-09-29T00:00:00.000Z",
      },
    },
  };
};

describe("startup navigation", () => {
  it("reopens the active persisted resource for a matching bare puzzle route", () => {
    expect(resolveStartupRoute(
      { kind: "puzzle", puzzleId: "sudoku" },
      makePersisted("sudoku", "saved-generation"),
    )).toEqual({
      kind: "resource",
      puzzleId: "sudoku",
      generationId: "saved-generation",
    });
  });

  it("does not reopen a persisted resource belonging to a different puzzle type", () => {
    const route: AppRoute = { kind: "puzzle", puzzleId: "jigsaw" };

    expect(resolveStartupRoute(route, makePersisted("sudoku"))).toEqual(route);
  });

  it("leaves an explicit resource route authoritative", () => {
    const route: AppRoute = {
      kind: "resource",
      puzzleId: "jigsaw",
      generationId: "explicit-generation",
    };

    expect(resolveStartupRoute(route, makePersisted("jigsaw", "saved-generation"))).toEqual(route);
  });

  it("falls back to the requested route when persistence is unavailable or incomplete", () => {
    const route: AppRoute = { kind: "puzzle", puzzleId: "sudoku" };

    expect(resolveStartupRoute(route, null)).toEqual(route);
    expect(resolveStartupRoute(route, {
      activeResourceKey: makePuzzleResourceKey("sudoku", "missing"),
      sessions: {},
    })).toEqual(route);
  });

  it("does not alter non-puzzle site routes", () => {
    const route: AppRoute = { kind: "home" };

    expect(resolveStartupRoute(route, makePersisted("sudoku"))).toEqual(route);
  });
});
