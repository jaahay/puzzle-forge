import { describe, expect, it } from "vitest";
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

describe("canonical puzzle generation identity", () => {
  it("round-trips the complete generation request without embedding puzzle type", () => {
    const identity = makeIdentity({
      imageId: "met-123",
      provenance: { source: "daily", dateStamp: "2026-09-11" },
    });
    const generationId = encodeGenerationId(identity);

    expect(atob(generationId.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - generationId.length % 4) % 4)))
      .not.toContain("sudoku");
    expect(decodeGenerationId("sudoku", generationId)).toEqual({ ok: true, identity });
  });

  it("allows the same generation id to exist in another puzzle namespace", () => {
    const generationId = encodeGenerationId(makeIdentity());
    const decoded = decodeGenerationId("nonogram", generationId);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.identity.puzzleId).toBe("nonogram");
    expect(decoded.identity.seed).toBe("resource-seed");
  });

  it("does not require or emit a generation schema version", () => {
    const generationId = encodeGenerationId(makeIdentity());
    const decodedJson = atob(
      generationId.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - generationId.length % 4) % 4),
    );

    expect(decodedJson).not.toContain('"v"');
    expect(decodedJson).not.toContain("version");
  });

  it("rejects malformed and out-of-range generation identities", () => {
    expect(decodeGenerationId("sudoku", "not-base64-json")).toEqual({ ok: false, reason: "malformed" });

    const tooWide = encodeGenerationId(makeIdentity({ width: 99 }));
    expect(decodeGenerationId("sudoku", tooWide)).toEqual({ ok: false, reason: "invalid-identity" });
  });
});
