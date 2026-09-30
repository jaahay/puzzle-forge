import { describe, expect, it } from "vitest";
import { defaultJigsawImageAsset } from "../games/jigsaw/imageAssets";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { encodeGenerationId, makePuzzleResourceKey } from "./puzzleResourceIdentity";
import type { AppRoute } from "./routes";
import type {
  PersistedPuzzleProgress,
  PersistedPuzzleSession,
  PersistedPuzzleSessions,
} from "./session";
import { resolveStartupRoute } from "./startupNavigation";

type TestPuzzleId = "sudoku" | "jigsaw";

const makeGenerationId = (puzzleId: TestPuzzleId, seed: string) =>
  encodeGenerationId({
    puzzleId,
    seed,
    width: puzzleId === "jigsaw" ? 4 : 9,
    height: puzzleId === "jigsaw" ? 3 : 9,
    difficulty: "Medium",
    requireUniqueSolution: true,
    sudokuVariation: "classic",
    solitaireVariation: defaultSolitaireVariation,
    ...(puzzleId === "jigsaw" ? { imageId: defaultJigsawImageAsset.id } : {}),
  });

const makeSession = (
  puzzleId: TestPuzzleId,
  seed: string,
  updatedAt: string,
): PersistedPuzzleSession => {
  const progress: PersistedPuzzleProgress = puzzleId === "jigsaw"
    ? { kind: "tiles", tileOrder: [], selectedTileId: null, jigsawSnappedPieceIds: [] }
    : { kind: "grid", cells: [], selectedCell: null };

  return {
    puzzleId,
    generationId: makeGenerationId(puzzleId, seed),
    baselineChecksum: "checksum",
    progress,
    statusMessage: "",
    updatedAt,
  };
};

const makePersisted = (
  sessions: readonly PersistedPuzzleSession[],
  activeIndex = sessions.length - 1,
): PersistedPuzzleSessions => {
  const activeSession = sessions[activeIndex];
  if (!activeSession) throw new Error("Expected an active persisted session.");

  const entries = sessions.map((session) => [
    makePuzzleResourceKey(session.puzzleId, session.generationId),
    session,
  ] as const);
  const activeResourceKey = makePuzzleResourceKey(activeSession.puzzleId, activeSession.generationId);

  return {
    activeResourceKey,
    sessions: Object.fromEntries(entries),
  };
};

describe("startup navigation", () => {
  it("reopens the active persisted resource for a matching bare puzzle route", () => {
    const session = makeSession("sudoku", "active-sudoku", "2026-09-29T20:00:00.000Z");

    expect(resolveStartupRoute(
      { kind: "puzzle", puzzleId: "sudoku" },
      makePersisted([session]),
    )).toEqual({
      kind: "resource",
      puzzleId: "sudoku",
      generationId: session.generationId,
    });
  });

  it("reopens the most recent saved instance of the requested puzzle type", () => {
    const olderJigsaw = makeSession("jigsaw", "older-jigsaw", "2026-09-29T18:00:00.000Z");
    const newerJigsaw = makeSession("jigsaw", "newer-jigsaw", "2026-09-29T19:00:00.000Z");
    const activeSudoku = makeSession("sudoku", "active-sudoku", "2026-09-29T20:00:00.000Z");

    expect(resolveStartupRoute(
      { kind: "puzzle", puzzleId: "jigsaw" },
      makePersisted([olderJigsaw, newerJigsaw, activeSudoku]),
    )).toEqual({
      kind: "resource",
      puzzleId: "jigsaw",
      generationId: newerJigsaw.generationId,
    });
  });

  it("leaves an explicit resource route authoritative", () => {
    const explicitGenerationId = makeGenerationId("jigsaw", "explicit-jigsaw");
    const route: AppRoute = {
      kind: "resource",
      puzzleId: "jigsaw",
      generationId: explicitGenerationId,
    };

    expect(resolveStartupRoute(
      route,
      makePersisted([makeSession("jigsaw", "saved-jigsaw", "2026-09-29T20:00:00.000Z")]),
    )).toEqual(route);
  });

  it("falls back to the requested route when persistence is unavailable or has no matching puzzle", () => {
    const route: AppRoute = { kind: "puzzle", puzzleId: "jigsaw" };

    expect(resolveStartupRoute(route, null)).toEqual(route);
    expect(resolveStartupRoute(
      route,
      makePersisted([makeSession("sudoku", "saved-sudoku", "2026-09-29T20:00:00.000Z")]),
    )).toEqual(route);
  });

  it("does not alter non-puzzle site routes", () => {
    const route: AppRoute = { kind: "home" };

    expect(resolveStartupRoute(
      route,
      makePersisted([makeSession("sudoku", "saved-sudoku", "2026-09-29T20:00:00.000Z")]),
    )).toEqual(route);
  });
});
