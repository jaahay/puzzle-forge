import { describe, expect, it } from "vitest";
import { appRoutePath, parseAppRoute } from "./routes";

describe("pathname routing", () => {
  it("parses home and site pages", () => {
    expect(parseAppRoute("/")).toEqual({ kind: "home" });
    expect(parseAppRoute("/updates/")).toEqual({ kind: "updates" });
    expect(parseAppRoute("/about")).toEqual({ kind: "about" });
  });

  it("parses clean puzzle paths", () => {
    expect(parseAppRoute("/jigsaw")).toEqual({ kind: "puzzle", puzzleId: "jigsaw" });
    expect(parseAppRoute("/tile-swap")).toEqual({ kind: "puzzle", puzzleId: "tile-swap" });
    expect(parseAppRoute("/sliding-puzzle")).toEqual({ kind: "puzzle", puzzleId: "sliding-puzzle" });
    expect(parseAppRoute("/word-guess")).toEqual({ kind: "puzzle", puzzleId: "word-guess" });
  });

  it("parses only puzzle-type-scoped materialized permalinks", () => {
    expect(parseAppRoute("/sudoku/example-token")).toEqual({
      kind: "permalink",
      puzzleId: "sudoku",
      serializedPuzzle: "example-token",
    });
    expect(parseAppRoute("/jigsaw/example-token/")).toEqual({
      kind: "permalink",
      puzzleId: "jigsaw",
      serializedPuzzle: "example-token",
    });
    expect(parseAppRoute("/p/example-token")).toEqual({
      kind: "not-found",
      pathname: "/p/example-token",
    });
  });

  it("preserves unknown paths and over-nested paths as not-found routes", () => {
    expect(parseAppRoute("/missing")).toEqual({ kind: "not-found", pathname: "/missing" });
    expect(parseAppRoute("/p/example/extra")).toEqual({ kind: "not-found", pathname: "/p/example/extra" });
    expect(parseAppRoute("/jigsaw/example/extra")).toEqual({ kind: "not-found", pathname: "/jigsaw/example/extra" });
  });

  it("serializes every route", () => {
    expect(appRoutePath({ kind: "home" })).toBe("/");
    expect(appRoutePath({ kind: "puzzle", puzzleId: "sudoku" })).toBe("/sudoku");
    expect(appRoutePath({ kind: "permalink", puzzleId: "sudoku", serializedPuzzle: "seed/value" }))
      .toBe("/sudoku/seed%2Fvalue");
    expect(appRoutePath({ kind: "puzzle", puzzleId: "tile-swap" })).toBe("/tile-swap");
    expect(appRoutePath({ kind: "puzzle", puzzleId: "sliding-puzzle" })).toBe("/sliding-puzzle");
    expect(appRoutePath({ kind: "updates" })).toBe("/updates");
    expect(appRoutePath({ kind: "about" })).toBe("/about");
    expect(appRoutePath({ kind: "not-found", pathname: "/missing" })).toBe("/missing");
  });
});
