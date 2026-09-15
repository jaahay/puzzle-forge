import { describe, expect, it } from "vitest";
import { generateSudoku } from "../games/sudoku/generate";
import {
  makePuzzleResourceKey,
  resolvePuzzleResourceSegment,
} from "./puzzleResourceIdentity";
import { puzzleResourceAliases } from "./puzzleResourceAliases";

const getAlias = (puzzleId: "sudoku" | "nonogram", alias: string) => {
  const entry = puzzleResourceAliases.find(
    (candidate) => candidate.puzzleId === puzzleId && candidate.alias === alias,
  );
  if (!entry) throw new Error(`Missing test alias ${puzzleId}/${alias}`);
  return entry;
};

describe("puzzle resource aliases", () => {
  it("resolves a registered alias to the same canonical Sudoku baseline", () => {
    const alias = getAlias("sudoku", "Happy2026!");
    const aliased = resolvePuzzleResourceSegment("sudoku", alias.alias);
    const canonical = resolvePuzzleResourceSegment("sudoku", alias.generationId);

    expect(aliased.ok).toBe(true);
    expect(canonical.ok).toBe(true);
    if (!aliased.ok || !canonical.ok) return;

    expect(aliased.identity).toEqual(canonical.identity);
    expect(aliased.canonicalResource).toEqual(canonical.canonicalResource);

    const fromAlias = generateSudoku(aliased.identity);
    const fromCanonical = generateSudoku(canonical.identity);
    expect(fromAlias.checksum).toBe(fromCanonical.checksum);
  });

  it("keeps alias and canonical URLs on the same persistence resource key", () => {
    const alias = getAlias("sudoku", "Happy2026!");
    const resolved = resolvePuzzleResourceSegment("sudoku", alias.alias);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    expect(makePuzzleResourceKey(
      resolved.canonicalResource.puzzleId,
      resolved.canonicalResource.generationId,
    )).toBe(makePuzzleResourceKey("sudoku", alias.generationId));
  });

  it("scopes the same alias text independently by puzzle type", () => {
    const sudoku = resolvePuzzleResourceSegment("sudoku", "Happy2026!");
    const nonogram = resolvePuzzleResourceSegment("nonogram", "Happy2026!");

    expect(sudoku.ok).toBe(true);
    expect(nonogram.ok).toBe(true);
    if (!sudoku.ok || !nonogram.ok) return;

    expect(sudoku.canonicalResource.puzzleId).toBe("sudoku");
    expect(nonogram.canonicalResource.puzzleId).toBe("nonogram");
    expect(sudoku.canonicalResource.generationId).not.toBe(nonogram.canonicalResource.generationId);
  });

  it("recognizes aliases by registry membership rather than punctuation", () => {
    const resolved = resolvePuzzleResourceSegment("sudoku", "Welcome");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.alias?.alias).toBe("Welcome");
  });

  it("falls through to ordinary canonical generation ids unchanged", () => {
    const alias = getAlias("sudoku", "Happy2026!");
    const resolved = resolvePuzzleResourceSegment("sudoku", alias.generationId);

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.alias).toBeUndefined();
    expect(resolved.requestedSegment).toBe(alias.generationId);
    expect(resolved.canonicalResource.generationId).toBe(alias.generationId);
  });

  it("keeps unknown or malformed resource segments unavailable", () => {
    expect(resolvePuzzleResourceSegment("sudoku", "NotRegistered").ok).toBe(false);
    expect(resolvePuzzleResourceSegment("sudoku", "%%%").ok).toBe(false);
  });
});
