import { describe, expect, it } from "vitest";
import { puzzleResourceAliases } from "./puzzleResourceAliases";
import {
  appRoutePath,
  parseAppRoute,
  replaceAppRoute,
  shouldPreserveResourceLocatorPath,
} from "./routes";

const getAlias = (puzzleId: "sudoku" | "nonogram", alias: string) => {
  const entry = puzzleResourceAliases.find(
    (candidate) => candidate.puzzleId === puzzleId && candidate.alias === alias,
  );
  if (!entry) throw new Error(`Missing test alias ${puzzleId}/${alias}`);
  return entry;
};

const withMockBrowserUrl = (
  pathname: string,
  search: string,
  run: (history: { replacements: string[] }) => void,
) => {
  const originalWindow = globalThis.window;
  const replacements: string[] = [];

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { pathname, search, hash: "" },
      history: {
        replaceState: (_state: unknown, _title: string, url?: string | URL | null) => {
          if (url !== undefined && url !== null) replacements.push(String(url));
        },
      },
    },
  });

  try {
    run({ replacements });
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
};

describe("pathname routing", () => {
  it("parses home and site pages", () => {
    expect(parseAppRoute("/", "")).toEqual({ kind: "home" });
    expect(parseAppRoute("/updates/", "")).toEqual({ kind: "updates" });
    expect(parseAppRoute("/about", "")).toEqual({ kind: "about" });
  });

  it("parses clean puzzle entry paths", () => {
    expect(parseAppRoute("/jigsaw", "")).toEqual({ kind: "puzzle", puzzleId: "jigsaw" });
    expect(parseAppRoute("/tile-swap", "")).toEqual({ kind: "puzzle", puzzleId: "tile-swap" });
    expect(parseAppRoute("/sliding-puzzle", "")).toEqual({ kind: "puzzle", puzzleId: "sliding-puzzle" });
    expect(parseAppRoute("/word-guess", "")).toEqual({ kind: "puzzle", puzzleId: "word-guess" });
  });

  it("parses only puzzle-type-scoped concrete resources", () => {
    expect(parseAppRoute("/sudoku/example-generation-id", "")).toEqual({
      kind: "resource",
      puzzleId: "sudoku",
      generationId: "example-generation-id",
    });
    expect(parseAppRoute("/jigsaw/example-generation-id/", "")).toEqual({
      kind: "resource",
      puzzleId: "jigsaw",
      generationId: "example-generation-id",
    });
    expect(parseAppRoute("/sudoku/Happy2026!", "")).toEqual({
      kind: "resource",
      puzzleId: "sudoku",
      generationId: "Happy2026!",
    });
    expect(parseAppRoute("/p/example-generation-id", "")).toEqual({
      kind: "not-found",
      pathname: "/p/example-generation-id",
    });
  });

  it("resolves a dated Daily locator directly to its canonical resource", () => {
    const daily = parseAppRoute(
      "/nonogram/daily/2026-09-15",
      "?unique=false&difficulty=hard&size=10x10",
    );
    const canonicalQueryOrder = parseAppRoute(
      "/nonogram/daily/2026-09-15",
      "?size=10x10&difficulty=hard&unique=false",
    );

    expect(daily.kind).toBe("resource");
    expect(daily).toEqual(canonicalQueryOrder);
  });

  it("resolves Today to the same canonical resource as the local dated Daily locator", () => {
    const today = parseAppRoute(
      "/sudoku/today",
      "?variation=diagonal&difficulty=hard",
      "2026-09-15",
    );
    const dated = parseAppRoute(
      "/sudoku/daily/2026-09-15",
      "?difficulty=hard&variation=diagonal",
      "2026-09-15",
    );

    expect(today.kind).toBe("resource");
    expect(today).toEqual(dated);
  });

  it("rejects malformed Daily locators and unsupported Daily query grammar", () => {
    expect(parseAppRoute("/sudoku/daily", "")).toEqual({ kind: "not-found", pathname: "/sudoku/daily" });
    expect(parseAppRoute("/sudoku/daily/2026-02-29", "")).toEqual({
      kind: "not-found",
      pathname: "/sudoku/daily/2026-02-29",
    });
    expect(parseAppRoute("/sudoku/daily/2026-09-15", "?size=9x9")).toEqual({
      kind: "not-found",
      pathname: "/sudoku/daily/2026-09-15",
    });
  });

  it("preserves a visible alias only while canonicalizing that same resource", () => {
    const sudokuAlias = getAlias("sudoku", "Happy2026!");
    const nonogramAlias = getAlias("nonogram", "Happy2026!");

    expect(shouldPreserveResourceLocatorPath(
      "/sudoku/Happy2026!",
      "",
      { kind: "resource", puzzleId: "sudoku", generationId: sudokuAlias.generationId },
    )).toBe(true);

    expect(shouldPreserveResourceLocatorPath(
      `/sudoku/${sudokuAlias.generationId}`,
      "",
      { kind: "resource", puzzleId: "sudoku", generationId: sudokuAlias.generationId },
    )).toBe(false);

    expect(shouldPreserveResourceLocatorPath(
      "/sudoku/Happy2026!",
      "",
      { kind: "resource", puzzleId: "sudoku", generationId: nonogramAlias.generationId },
    )).toBe(false);

    expect(shouldPreserveResourceLocatorPath(
      "/nonogram/Happy2026!",
      "",
      { kind: "resource", puzzleId: "sudoku", generationId: sudokuAlias.generationId },
    )).toBe(false);
  });

  it("preserves only the canonical dated Daily spelling for the same resource", () => {
    const route = parseAppRoute(
      "/nonogram/daily/2026-09-15",
      "?size=10x10&difficulty=hard&unique=false",
    );
    expect(route.kind).toBe("resource");
    if (route.kind !== "resource") return;

    expect(shouldPreserveResourceLocatorPath(
      "/nonogram/daily/2026-09-15",
      "?size=10x10&difficulty=hard&unique=false",
      route,
    )).toBe(true);

    expect(shouldPreserveResourceLocatorPath(
      "/nonogram/daily/2026-09-15",
      "?unique=false&difficulty=hard&size=10x10",
      route,
    )).toBe(false);

    expect(shouldPreserveResourceLocatorPath(
      "/nonogram/today",
      "?size=10x10&difficulty=hard&unique=false",
      route,
    )).toBe(false);
  });

  it("canonicalizes Today to the dated Daily browser URL", () => {
    const route = parseAppRoute("/sudoku/today", "", "2026-09-15");
    expect(route.kind).toBe("resource");
    if (route.kind !== "resource") return;

    withMockBrowserUrl("/sudoku/today", "", ({ replacements }) => {
      replaceAppRoute(route);
      expect(replacements).toEqual(["/sudoku/daily/2026-09-15"]);
    });
  });

  it("normalizes a noncanonical Daily query but preserves an explicit compact canonical URL", () => {
    const route = parseAppRoute(
      "/nonogram/daily/2026-09-15",
      "?unique=false&difficulty=hard&size=10x10",
    );
    expect(route.kind).toBe("resource");
    if (route.kind !== "resource") return;

    withMockBrowserUrl(
      "/nonogram/daily/2026-09-15",
      "?unique=false&difficulty=hard&size=10x10",
      ({ replacements }) => {
        replaceAppRoute(route);
        expect(replacements).toEqual([
          "/nonogram/daily/2026-09-15?size=10x10&difficulty=hard&unique=false",
        ]);
      },
    );

    const canonicalPath = appRoutePath(route);
    withMockBrowserUrl(canonicalPath, "", ({ replacements }) => {
      replaceAppRoute(route);
      expect(replacements).toEqual([]);
    });
  });

  it("preserves unknown paths and over-nested paths as not-found routes", () => {
    expect(parseAppRoute("/missing", "")).toEqual({ kind: "not-found", pathname: "/missing" });
    expect(parseAppRoute("/p/example/extra", "")).toEqual({ kind: "not-found", pathname: "/p/example/extra" });
    expect(parseAppRoute("/jigsaw/example/extra", "")).toEqual({ kind: "not-found", pathname: "/jigsaw/example/extra" });
  });

  it("serializes every canonical app route", () => {
    expect(appRoutePath({ kind: "home" })).toBe("/");
    expect(appRoutePath({ kind: "puzzle", puzzleId: "sudoku" })).toBe("/sudoku");
    expect(appRoutePath({ kind: "resource", puzzleId: "sudoku", generationId: "seed/value" }))
      .toBe("/sudoku/seed%2Fvalue");
    expect(appRoutePath({ kind: "resource", puzzleId: "sudoku", generationId: "Happy2026!" }))
      .toBe("/sudoku/Happy2026!");
    expect(appRoutePath({ kind: "puzzle", puzzleId: "tile-swap" })).toBe("/tile-swap");
    expect(appRoutePath({ kind: "puzzle", puzzleId: "sliding-puzzle" })).toBe("/sliding-puzzle");
    expect(appRoutePath({ kind: "updates" })).toBe("/updates");
    expect(appRoutePath({ kind: "about" })).toBe("/about");
    expect(appRoutePath({ kind: "not-found", pathname: "/missing" })).toBe("/missing");
  });
});
