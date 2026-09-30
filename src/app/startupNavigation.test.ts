import { describe, expect, it } from "vitest";
import type { AppRoute } from "./routes";
import { resolveStartupRoute, type StartupPersistedSessions } from "./startupNavigation";

const makePersisted = (
  puzzleId: "sudoku" | "jigsaw",
  generationId = "generation-a",
): StartupPersistedSessions => {
  const activeResourceKey = `${puzzleId}/${generationId}`;
  return {
    activeResourceKey,
    sessions: {
      [activeResourceKey]: { puzzleId, generationId },
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
      activeResourceKey: "sudoku/missing",
      sessions: {},
    })).toEqual(route);
  });

  it("does not alter non-puzzle site routes", () => {
    const route: AppRoute = { kind: "home" };

    expect(resolveStartupRoute(route, makePersisted("sudoku"))).toEqual(route);
  });
});
