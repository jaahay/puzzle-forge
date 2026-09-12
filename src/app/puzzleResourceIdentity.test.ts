import { describe, expect, it } from "vitest";
import { getPuzzleImageAsset } from "../games/imageAssets";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { defaultSudokuVariation } from "../games/sudoku/variation";
import type { GenerationIdentity } from "./generationIdentity";
import { decodeGenerationId, encodeGenerationId } from "./puzzleResourceIdentity";

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

const decodeBase64Url = (value: string) => atob(
  value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4),
);

const encodeBase64Url = (value: string) => btoa(value)
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/g, "");

describe("canonical puzzle generation identity", () => {
  it("round-trips the generator inputs relevant to the typed puzzle resource", () => {
    const provenance = { source: "daily" as const, dateStamp: "2026-09-11" };
    const generationId = encodeGenerationId(makeIdentity({
      imageId: "irrelevant-to-sudoku",
      provenance,
    }));

    const decodedJson = decodeBase64Url(generationId);
    expect(decodedJson).not.toContain("sudoku");
    expect(decodedJson).not.toContain("irrelevant-to-sudoku");

    const decoded = decodeGenerationId("sudoku", generationId);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.identity).toMatchObject({
      puzzleId: "sudoku",
      seed: "resource-seed",
      width: 9,
      height: 9,
      difficulty: "Hard",
      requireUniqueSolution: true,
      sudokuVariation: defaultSudokuVariation,
      provenance,
    });
    expect(decoded.identity.imageId).toBeUndefined();
    expect(decoded.identity.solitaireVariation).toEqual(defaultSolitaireVariation);
  });

  it("does not fork a Nonogram resource id for settings its generator ignores", () => {
    const identity = makeIdentity({
      puzzleId: "nonogram",
      width: 10,
      height: 11,
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
    expect(encodeGenerationId({ ...identity, width: 9 })).not.toBe(generationId);
  });

  it("canonicalizes implicit and explicit default artwork to the same image resource id", () => {
    const defaultImageId = getPuzzleImageAsset(undefined, "tile-swap").id;
    const identity = makeIdentity({
      puzzleId: "tile-swap",
      width: 4,
      height: 4,
      imageId: undefined,
    });

    expect(encodeGenerationId(identity)).toBe(encodeGenerationId({ ...identity, imageId: defaultImageId }));
  });

  it("allows one canonical generation id in distinct compatible puzzle namespaces", () => {
    const wordGuessIdentity = makeIdentity({
      puzzleId: "word-guess",
      width: 6,
      height: 6,
    });
    const logicGridIdentity = { ...wordGuessIdentity, puzzleId: "logic-grid" as const };
    const generationId = encodeGenerationId(wordGuessIdentity);

    expect(encodeGenerationId(logicGridIdentity)).toBe(generationId);
    const wordGuess = decodeGenerationId("word-guess", generationId);
    const logicGrid = decodeGenerationId("logic-grid", generationId);
    expect(wordGuess.ok).toBe(true);
    expect(logicGrid.ok).toBe(true);
    if (!wordGuess.ok || !logicGrid.ok) return;
    expect(wordGuess.identity.puzzleId).toBe("word-guess");
    expect(logicGrid.identity.puzzleId).toBe("logic-grid");
  });

  it("does not require or emit a generation schema version", () => {
    const generationId = encodeGenerationId(makeIdentity());
    const decodedJson = decodeBase64Url(generationId);

    expect(decodedJson).not.toContain('"v"');
    expect(decodedJson).not.toContain("version");
  });

  it("rejects malformed, out-of-range, and noncanonical generation identities", () => {
    expect(decodeGenerationId("sudoku", "not-base64-json")).toEqual({ ok: false, reason: "malformed" });

    const tooWide = encodeGenerationId(makeIdentity({ puzzleId: "nonogram", width: 99 }));
    expect(decodeGenerationId("nonogram", tooWide)).toEqual({ ok: false, reason: "invalid-identity" });

    const noncanonicalSudoku = encodeBase64Url(JSON.stringify({
      s: "resource-seed",
      d: "Hard",
      x: defaultSudokuVariation,
      w: 9,
    }));
    expect(decodeGenerationId("sudoku", noncanonicalSudoku)).toEqual({ ok: false, reason: "invalid-identity" });
  });
});
