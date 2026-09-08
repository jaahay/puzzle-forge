import { describe, expect, it } from "vitest";
import type { GeneratedPuzzle, PuzzleImageAsset } from "../catalog/types";
import { getPuzzleImageAssetsFor } from "../games/imageAssets";
import { withPuzzleProvenance } from "./puzzleProvenance";
import {
  decodePuzzleReference,
  getPuzzleReference,
  puzzleReferencePrefix,
  puzzleReferenceToGenerationOptions,
  serializeGeneratedPuzzleReference,
  serializePersistedPuzzleReference,
  serializePuzzleReference,
} from "./puzzleReference";

const baseGridPuzzle = (puzzleId: "sudoku" | "nonogram"): GeneratedPuzzle => ({
  id: `${puzzleId}-1`,
  puzzleId,
  title: puzzleId === "sudoku" ? "Sudoku" : "Nonogram",
  seed: "seed-α-42",
  width: puzzleId === "sudoku" ? 9 : 10,
  height: puzzleId === "sudoku" ? 9 : 6,
  checksum: "checksum",
  createdAt: "2026-09-08T00:00:00.000Z",
  difficulty: "Hard",
  uniqueSolution: puzzleId === "nonogram" ? false : undefined,
  sudokuVariation: puzzleId === "sudoku" ? "diagonal" : undefined,
  notes: [],
  kind: "grid",
  cells: [],
});

const imagePuzzle = (asset: PuzzleImageAsset): GeneratedPuzzle => ({
  id: "tile-swap-1",
  puzzleId: "tile-swap",
  title: "Tile Swap",
  seed: "image-seed",
  width: 4,
  height: 5,
  checksum: "checksum",
  createdAt: "2026-09-08T00:00:00.000Z",
  notes: [],
  kind: "tiles",
  tiles: [],
  asset,
});

describe("durable puzzle references", () => {
  it("round-trips Sudoku identity, explicit daily provenance, and unicode seeds", () => {
    const puzzle = withPuzzleProvenance(baseGridPuzzle("sudoku"), {
      source: "daily",
      dateStamp: "2026-09-08",
    });
    const serialized = serializeGeneratedPuzzleReference(puzzle);

    expect(serialized?.startsWith(puzzleReferencePrefix)).toBe(true);
    const decoded = decodePuzzleReference(serialized ?? "");
    expect(decoded).toEqual({
      ok: true,
      reference: {
        schemaVersion: 1,
        puzzleId: "sudoku",
        generatorVersion: 1,
        seed: "seed-α-42",
        width: 9,
        height: 9,
        difficulty: "Hard",
        sudokuVariation: "diagonal",
        provenance: { source: "daily", dateStamp: "2026-09-08" },
      },
    });
    if (!decoded.ok) throw new Error("Expected valid Sudoku reference");
    expect(puzzleReferenceToGenerationOptions(decoded.reference)).toEqual({
      puzzleId: "sudoku",
      seed: "seed-α-42",
      width: 9,
      height: 9,
      difficulty: "Hard",
      sudokuVariation: "diagonal",
      provenance: { source: "daily", dateStamp: "2026-09-08" },
    });
  });

  it("round-trips Nonogram dimensions, difficulty, and uniqueness policy", () => {
    const puzzle = baseGridPuzzle("nonogram");
    const reference = getPuzzleReference(puzzle);
    expect(reference).not.toBeNull();
    if (!reference) throw new Error("Expected Nonogram reference");

    const decoded = decodePuzzleReference(serializePuzzleReference(reference));
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error("Expected valid Nonogram reference");
    expect(decoded.reference).toMatchObject({
      puzzleId: "nonogram",
      seed: "seed-α-42",
      width: 10,
      height: 6,
      difficulty: "Hard",
      requireUniqueSolution: false,
    });
    expect(puzzleReferenceToGenerationOptions(decoded.reference)).toEqual({
      puzzleId: "nonogram",
      seed: "seed-α-42",
      width: 10,
      height: 6,
      difficulty: "Hard",
      requireUniqueSolution: false,
    });
  });

  it("pins concrete artwork identity for an image-backed puzzle", () => {
    const asset = getPuzzleImageAssetsFor("tile-swap")[0];
    expect(asset).toBeDefined();
    if (!asset) throw new Error("Expected bundled Tile Swap artwork");

    const reference = getPuzzleReference(imagePuzzle(asset));
    expect(reference).not.toBeNull();
    if (!reference) throw new Error("Expected Tile Swap reference");

    const decoded = decodePuzzleReference(serializePuzzleReference(reference));
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error("Expected valid Tile Swap reference");
    expect(decoded.reference).toMatchObject({
      puzzleId: "tile-swap",
      width: 4,
      height: 5,
      imageId: asset.id,
    });
    expect(puzzleReferenceToGenerationOptions(decoded.reference)).toEqual({
      puzzleId: "tile-swap",
      seed: "image-seed",
      width: 4,
      height: 5,
      imageId: asset.id,
    });
  });

  it("serializes persisted identity to the same reference so reload can resume matching progress", () => {
    const puzzle = withPuzzleProvenance(baseGridPuzzle("sudoku"), {
      source: "daily",
      dateStamp: "2026-09-08",
    });
    const generatedReference = serializeGeneratedPuzzleReference(puzzle);
    const persistedReference = serializePersistedPuzzleReference({
      puzzleId: "sudoku",
      seed: "seed-α-42",
      width: 9,
      height: 9,
      difficulty: "Hard",
      sudokuVariation: "diagonal",
      provenance: { source: "daily", dateStamp: "2026-09-08" },
      generatorVersion: 1,
    });

    expect(persistedReference).toBe(generatedReference);
    expect(serializePersistedPuzzleReference({
      puzzleId: "sudoku",
      seed: "seed-α-42",
      width: 9,
      height: 9,
      difficulty: "Easy",
      sudokuVariation: "diagonal",
      provenance: { source: "daily", dateStamp: "2026-09-08" },
      generatorVersion: 1,
    })).not.toBe(generatedReference);
  });

  it("does not infer daily provenance from seed syntax", () => {
    const puzzle = {
      ...baseGridPuzzle("sudoku"),
      seed: "daily-sudoku-2026-09-08-hard-diagonal",
    };
    const reference = getPuzzleReference(puzzle);
    expect(reference).not.toBeNull();
    expect(reference && "provenance" in reference ? reference.provenance : undefined).toBeUndefined();
  });

  it("rejects unknown reference envelope versions explicitly", () => {
    expect(decodePuzzleReference("pf2.anything")).toEqual({
      ok: false,
      reason: "unsupported-version",
    });
  });

  it("rejects malformed references instead of falling back to generation defaults", () => {
    expect(decodePuzzleReference("not-a-reference")).toEqual({ ok: false, reason: "malformed" });
    expect(decodePuzzleReference(`${puzzleReferencePrefix}%%%`)).toEqual({ ok: false, reason: "malformed" });
  });
});
