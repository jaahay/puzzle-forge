import { describe, expect, it } from "vitest";
import { decodeGenerationId, encodeGenerationId } from "./puzzleResourceIdentity";
import {
  canonicalizeDailyResourceQuery,
  makeDailyResourceLocatorPath,
  resolveDailyResource,
} from "./dailyResource";

describe("Daily resource semantics", () => {
  it("resolves a default Daily profile to one canonical resource", () => {
    const resolved = resolveDailyResource("sudoku", "2026-09-15");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    expect(resolved.query).toBe("");
    expect(resolved.identity).toMatchObject({
      puzzleId: "sudoku",
      width: 9,
      height: 9,
      difficulty: "Medium",
      requireUniqueSolution: true,
      sudokuVariation: "classic",
      provenance: { source: "daily", dateStamp: "2026-09-15" },
    });
    expect(makeDailyResourceLocatorPath(resolved.identity)).toBe("/sudoku/daily/2026-09-15");

    const canonical = decodeGenerationId("sudoku", resolved.canonicalResource.generationId);
    expect(canonical.ok).toBe(true);
    if (!canonical.ok) return;
    expect(canonical.identity).toEqual(resolved.identity);
  });

  it("does not present explicit-seed Daily provenance as a semantic Daily locator", () => {
    const resolved = resolveDailyResource("sudoku", "2026-09-15");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const explicitSeedIdentity = { ...resolved.identity, seed: "explicit-daily-seed" };
    expect(encodeGenerationId(explicitSeedIdentity)).not.toBe(resolved.canonicalResource.generationId);
    expect(makeDailyResourceLocatorPath(explicitSeedIdentity)).toBeNull();
  });

  it("canonicalizes qualified Nonogram Daily profiles without losing identity", () => {
    const resolved = resolveDailyResource(
      "nonogram",
      "2026-09-15",
      "?unique=false&difficulty=hard&size=10x10",
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    expect(resolved.query).toBe("size=10x10&difficulty=hard&unique=false");
    expect(resolved.identity).toMatchObject({
      puzzleId: "nonogram",
      width: 10,
      height: 10,
      difficulty: "Hard",
      requireUniqueSolution: false,
      provenance: { source: "daily", dateStamp: "2026-09-15" },
    });
    expect(makeDailyResourceLocatorPath(resolved.identity))
      .toBe("/nonogram/daily/2026-09-15?size=10x10&difficulty=hard&unique=false");
  });

  it("omits explicit defaults from the canonical Daily query", () => {
    const parsed = canonicalizeDailyResourceQuery(
      "nonogram",
      "size=8x8&difficulty=medium&unique=true",
    );
    expect(parsed).toMatchObject({ ok: true, query: "" });
  });

  it("round-trips material qualifiers for other Daily puzzle families", () => {
    const solitaire = resolveDailyResource(
      "klondike-solitaire",
      "2026-09-15",
      "draw=3&redeals=1&waste=relaxed&solvable=true",
    );
    expect(solitaire.ok).toBe(true);
    if (solitaire.ok) {
      expect(solitaire.query).toBe("draw=3&redeals=1&waste=relaxed&solvable=true");
      expect(solitaire.identity.solitaireVariation).toEqual({
        drawMode: "draw-3",
        redeals: 1,
        wasteMode: "relaxed",
        knownSolvable: true,
      });
    }

    const wordGuess = resolveDailyResource("word-guess", "2026-09-15", "size=7x8");
    expect(wordGuess.ok).toBe(true);
    if (wordGuess.ok) expect(wordGuess.identity).toMatchObject({ width: 7, height: 8 });
  });

  it("rejects invalid dates, unknown qualifiers, duplicates, and out-of-range settings", () => {
    expect(resolveDailyResource("sudoku", "2026-02-29").ok).toBe(false);
    expect(resolveDailyResource("sudoku", "2026-09-15", "size=9x9").ok).toBe(false);
    expect(resolveDailyResource("sudoku", "2026-09-15", "difficulty=hard&difficulty=easy").ok).toBe(false);
    expect(resolveDailyResource("nonogram", "2026-09-15", "size=99x99").ok).toBe(false);
    expect(resolveDailyResource("kenken", "2026-09-15").ok).toBe(false);
  });

  it("rejects empty and non-enumerated qualifier values", () => {
    expect(resolveDailyResource("klondike-solitaire", "2026-09-15", "redeals=").ok).toBe(false);
    expect(resolveDailyResource("klondike-solitaire", "2026-09-15", "redeals=01").ok).toBe(false);
    expect(resolveDailyResource("jigsaw", "2026-09-15", "image=").ok).toBe(false);
  });
});
