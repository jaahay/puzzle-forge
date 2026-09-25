import { describe, expect, it } from "vitest";
import { getPuzzleAvailability } from "../catalog/puzzleAvailability";
import { getPuzzleDefinition } from "../catalog/puzzleCatalog";
import {
  getPuzzleImageAsset,
  getPuzzleImageAssetsFor,
  isImageBackedPuzzleId,
} from "../games/imageAssets";
import { jigsawEdgeProfileCatalogRevision } from "../games/jigsaw/edgeProfiles";
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

const alternateDimension = (value: number, minimum: number, maximum: number) => {
  if (value < maximum) return value + 1;
  if (value > minimum) return value - 1;
  return value;
};

const mutateGenerationIdBytes = (
  generationId: string,
  mutate: (bytes: number[]) => void,
) => {
  const base64 = generationId.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const bytes = Array.from(atob(`${base64}${padding}`), (character) => character.charCodeAt(0));
  mutate(bytes);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

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

  it("round-trips non-default material fields for every currently generatable puzzle family", () => {
    const { generatablePuzzles } = getPuzzleAvailability();

    for (const definition of generatablePuzzles) {
      const width = alternateDimension(definition.defaultWidth, definition.minWidth, definition.maxWidth);
      const height = alternateDimension(definition.defaultHeight, definition.minHeight, definition.maxHeight);
      const imageId = isImageBackedPuzzleId(definition.id)
        ? (getPuzzleImageAssetsFor(definition.id)[1] ?? getPuzzleImageAsset(undefined, definition.id)).id
        : undefined;
      const solitaireVariation = definition.id === "klondike-solitaire"
        ? { drawMode: "draw-3" as const, redeals: 1 as const, wasteMode: "relaxed" as const, knownSolvable: true }
        : defaultSolitaireVariation;
      const identity = makeIdentity({
        puzzleId: definition.id,
        seed: "round-trip-seed",
        width,
        height,
        difficulty: "Expert",
        requireUniqueSolution: false,
        sudokuVariation: definition.id === "sudoku" ? "zero-killer" : defaultSudokuVariation,
        solitaireVariation,
        imageId,
      });
      const generationId = encodeGenerationId(identity);
      const decoded = decodeGenerationId(definition.id, generationId);

      expect(decoded.ok, definition.id).toBe(true);
      if (!decoded.ok) continue;
      expect(decoded.identity.puzzleId).toBe(definition.id);
      expect(decoded.identity.seed).toBe("round-trip-seed");
      expect(encodeGenerationId(decoded.identity)).toBe(generationId);

      switch (definition.id) {
        case "sudoku":
          expect(decoded.identity).toMatchObject({ difficulty: "Expert", sudokuVariation: "zero-killer" });
          break;
        case "nonogram":
          expect(decoded.identity).toMatchObject({ width, height, difficulty: "Expert", requireUniqueSolution: false });
          break;
        case "word-guess":
        case "logic-grid":
          expect(decoded.identity).toMatchObject({ width, height });
          break;
        case "jigsaw":
        case "tile-swap":
        case "sliding-puzzle":
          expect(decoded.identity).toMatchObject({ width, height, imageId });
          break;
        case "klondike-solitaire":
          expect(decoded.identity.solitaireVariation).toEqual(solitaireVariation);
          break;
        case "futoshiki":
          expect(decoded.identity.difficulty).toBe("Expert");
          break;
        case "peg-solitaire":
          break;
        case "kenken":
        case "minesweeper":
        case "slitherlink":
          expect(decoded.identity).toMatchObject({ width, height, difficulty: "Expert", requireUniqueSolution: false });
          break;
      }
    }
  });

  it("round-trips compact Daily provenance", () => {
    const provenance = { source: "daily" as const, dateStamp: "2026-09-11" };
    const generationId = encodeGenerationId(makeIdentity({ provenance }));
    const decoded = decodeGenerationId("sudoku", generationId);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.identity.provenance).toEqual(provenance);
    expect(decoded.identity.seed).toBe("resource-seed");
  });

  it("rejects invalid Daily provenance dates at the canonical identity boundary", () => {
    expect(() => encodeGenerationId(makeIdentity({
      provenance: { source: "daily", dateStamp: "2026-02-29" },
    }))).toThrow();
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

  it("rejects out-of-range material dimensions before emitting a canonical id", () => {
    const definition = getPuzzleDefinition("nonogram");
    expect(() => encodeGenerationId(makeIdentity({
      puzzleId: "nonogram",
      width: definition.maxWidth + 1,
      height: definition.defaultHeight,
    }))).toThrow("Puzzle dimensions are outside the supported range for nonogram.");
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

  it("rejects Jigsaw resource ids whose edge-model revision is missing or unsupported", () => {
    const definition = getPuzzleDefinition("jigsaw");
    const identity = makeIdentity({
      puzzleId: "jigsaw",
      width: definition.defaultWidth,
      height: definition.defaultHeight,
      imageId: getPuzzleImageAsset(undefined, "jigsaw").id,
    });
    const generationId = encodeGenerationId(identity);
    const missingRevision = mutateGenerationIdBytes(generationId, (bytes) => {
      bytes.pop();
    });
    const unsupportedRevision = mutateGenerationIdBytes(generationId, (bytes) => {
      bytes[bytes.length - 1] = jigsawEdgeProfileCatalogRevision + 1;
    });

    expect(decodeGenerationId("jigsaw", missingRevision)).toEqual({
      ok: false,
      reason: "invalid-identity",
    });
    expect(decodeGenerationId("jigsaw", unsupportedRevision)).toEqual({
      ok: false,
      reason: "invalid-identity",
    });
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

  it("rejects malformed and noncanonical generation ids", () => {
    expect(decodeGenerationId("sudoku", "%%%")).toEqual({ ok: false, reason: "malformed" });

    const canonical = encodeGenerationId(makeIdentity());
    expect(decodeGenerationId("sudoku", `${canonical}A`).ok).toBe(false);
  });
});
