import { describe, expect, it } from "vitest";
import { appRoutePath, parseAppRoute } from "./routes";

describe("pathname routing", () => {
  it("parses home and site pages", () => {
    expect(parseAppRoute("/")).toEqual({ kind: "home" });
    expect(parseAppRoute("/updates/")).toEqual({ kind: "updates" });
    expect(parseAppRoute("/about")).toEqual({ kind: "about" });
  });

  it("parses puzzle paths", () => {
    expect(parseAppRoute("/jigsaw")).toEqual({ kind: "puzzle", puzzleId: "jigsaw" });
    expect(parseAppRoute("/word-guess")).toEqual({ kind: "puzzle", puzzleId: "word-guess" });
  });

  it("preserves unknown or nested paths as not-found routes", () => {
    expect(parseAppRoute("/missing")).toEqual({ kind: "not-found", pathname: "/missing" });
    expect(parseAppRoute("/jigsaw/example/")).toEqual({ kind: "not-found", pathname: "/jigsaw/example" });
  });

  it("serializes every route", () => {
    expect(appRoutePath({ kind: "home" })).toBe("/");
    expect(appRoutePath({ kind: "puzzle", puzzleId: "sudoku" })).toBe("/sudoku");
    expect(appRoutePath({ kind: "updates" })).toBe("/updates");
    expect(appRoutePath({ kind: "about" })).toBe("/about");
    expect(appRoutePath({ kind: "not-found", pathname: "/missing" })).toBe("/missing");
  });
});
