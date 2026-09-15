import { describe, expect, it } from "vitest";
import { getPuzzleAvailability } from "../catalog/puzzleAvailability";
import { getPuzzleDefinition } from "../catalog/puzzleCatalog";
import { getPuzzleImageAsset, isImageBackedPuzzleId } from "../games/imageAssets";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { defaultSudokuVariation } from "../games/sudoku/variation";
import type { GenerationIdentity } from "./generationIdentity";
import { decodeGenerationId, encodeGenerationId } from "./puzzleResourceIdentity";
import { makeRandomSeed, maxPuzzleSeedLength } from "./runtime";

const makeIdentity = (overrides: Partial<GenerationIdentity> = {}): GenerationIdentity => ({
  puzzleId: "sudoku",
  seed: "resource-seed",
  width: 9,
  height: 9,
  difficulty: "Hard",
  requireUniqueSolution: true,
  sudokuVariation: defaultSudokuVariation,
  solitaireVariation: defaultSolitaireVariation,
  ...overrides,
});

const encodeLegacyBase64Url = (value: string) => btoa(value)
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/g, "");

describe("canonical puzzle generation identity", () => {
  it("uses a compact self-contained id for ordinary generated puzzles", () => {
    const seed = makeRandomSeed();
    expect(seed).toMatch(/^[A-Za-z0-9_-]{16}$/);

    const generationId = encodeGenerationId(makeIdentity({ seed, difficulty: "Medium" }));
    expect(generationId).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(generationId).toHaveLength(27);

    const decoded = decodeGenerationId("sudoku", generationId);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.identity.seed).toBe(seed);
    expect(decoded.identity.difficulty).toBe("Medium");
    expect(decoded.identity.sudokuVariation).toBe(defaultSudokuVariation);
  });

  it("round-trips the material identity of every currently generatable puzzle family", () => {
    const { generatablePuzzles } = getPuzzleAvailability();

    for (const definition of generatablePuzzles) {
      const identity = makeIdentity({
        puzzleId: definition.id,
        seed: "round-trip-seed",
        width: definition.defaultWidth,
        height: definition.defaultHeight,
        difficulty: "Hard",
        requireUniqueSolution: false,
        sudokuVariation: definition.id === "sudoku" ? "diagonal" : defaultSudokuVariation,
        imageId: isImageBackedPuzzleId(definition.id)
          ? getPuzzleImageAsset(undefined, definition.id).id
          : undefined,
      });
      const generationId = encodeGenerationId(identity);
      const decoded = decodeGenerationId(definition.id, generationId);

      expect(decoded.ok, definition.id).toBe(true);
      if (!decoded.ok) continue;
      expect(decoded.identity.puzzleId).toBe(definition.id);
      expect(decoded.identity.seed).toBe("round-trip-seed");
      expect(encodeGenerationId(decoded.identity)).toBe(generationId);
    }
  });

  it("round-trips compact daily provenance without imposing a human-facing locator syntax", () => {
    const provenance = { source: "daily" as const, dateStamp: "2026-09-11" };
    const generationId = encodeGenerationId(makeIdentity({ provenance }));
    const decoded = decodeGenerationId("sudoku", generationId);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.identity.provenance).toEqual(provenance);
    expect(decoded.identity.seed).toBe("resource-seed");
  });

  it("does not fork a Nonogram resource id for settings its generator ignores", () => {
    const definition = getPuzzleDefinition("nonogram");
    const identity = makeIdentity({
      puzzleId: "nonogram",
      width: definition.defaultWidth,
      height: definition.defaultHeight,
      difficulty: "Expert",
      requireUniqueSolution: false,
    });
    const generationId = encodeGenerationId(identity);
    const irrelevantChanges = encodeGenerationId({
      ...identity,
      sudokuVariation: "diagonal",
      solitaireVariation: { ...defaultSolitaireVariation, drawMode: "draw-3" },
      imageId: "irrelevant-image",
    });

    expect(irrelevantChanges).toBe(generationId);
    expect(encodeGenerationId({ ...identity, requireUniqueSolution: true })).not.toBe(generationId);
    expect(encodeGenerationId({ ...identity, difficulty: "Hard" })).not.toBe(generationId);
  });

  it("canonicalizes implicit and explicit default artwork to the same image resource id", () => {
    const definition = getPuzzleDefinition("tile-swap");
    const defaultImageId = getPuzzleImageAsset(undefined, "tile-swap").id;
    const identity = makeIdentity({
      puzzleId: "tile-swap",
      width: definition.defaultWidth,
      height: definition.defaultHeight,
      imageId: undefined,
    });

    expect(encodeGenerationId(identity)).toBe(encodeGenerationId({ ...identity, imageId: defaultImageId }));
  });

  it("allows one compact canonical id in distinct compatible puzzle namespaces", () => {
    const wordGuessDefinition = getPuzzleDefinition("word-guess");
    const logicGridDefinition = getPuzzleDefinition("logic-grid");
    const width = Math.max(wordGuessDefinition.minWidth, logicGridDefinition.minWidth);
    const height = Math.max(wordGuessDefinition.minHeight, logicGridDefinition.minHeight);
    const wordGuessIdentity = makeIdentity({ puzzleId: "word-guess", width, height });
    const logicGridIdentity = { ...wordGuessIdentity, puzzleId: "logic-grid" as const };
    const generationId = encodeGenerationId(wordGuessIdentity);

    expect(encodeGenerationId(logicGridIdentity)).toBe(generationId);
    expect(decodeGenerationId("word-guess", generationId).ok).toBe(true);
    expect(decodeGenerationId("logic-grid", generationId).ok).toBe(true);
  });

  it("enforces the textual seed upper bound without shrinking generated seed entropy", () => {
    expect(makeRandomSeed()).toHaveLength(16);
    expect(() => encodeGenerationId(makeIdentity({ seed: "x".repeat(maxPuzzleSeedLength + 1) })))
      .toThrow(`Puzzle seeds may contain at most ${maxPuzzleSeedLength} characters.`);
  });

  it("rejects malformed, noncanonical, and pre-compact generation ids", () => {
    expect(decodeGenerationId("sudoku", "%%%")).toEqual({ ok: false, reason: "malformed" });

    const canonical = encodeGenerationId(makeIdentity());
    expect(decodeGenerationId("sudoku", `${canonical}A`).ok).toBe(false);

    const legacyGenerationId = encodeLegacyBase64Url(JSON.stringify({
      s: "resource-seed",
      d: "Hard",
      x: "classic",
    }));
    expect(decodeGenerationId("sudoku", legacyGenerationId)).toEqual({
      ok: false,
      reason: "invalid-identity",
    });
  });
});
