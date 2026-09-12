import { describe, expect, it } from "vitest";
import type { GeneratedPuzzle } from "../catalog/types";
import { generateJigsaw } from "../games/jigsaw/generate";
import { defaultJigsawImageAsset } from "../games/jigsaw/imageAssets";
import { generateNonogram } from "../games/nonogram/generate";
import { generateSolitaire } from "../games/solitaire/generate";
import { generateSudoku } from "../games/sudoku/generate";
import { generateTileSwap } from "../games/tileSwap/generate";
import { getPuzzleProvenance, withPuzzleProvenance } from "./puzzleProvenance";
import { deserializePuzzle, materializedPuzzlesEqual, serializePuzzle } from "./puzzleSerialization";

const expectRoundTrip = (puzzle: GeneratedPuzzle) => {
  const serialized = serializePuzzle(puzzle);
  expect(serialized).toMatch(/^[A-Za-z0-9_-]+$/);

  const decoded = deserializePuzzle(serialized);
  expect(decoded.ok).toBe(true);
  if (!decoded.ok) throw new Error("Expected materialized puzzle token to decode.");

  expect(decoded.puzzle.puzzleId).toBe(puzzle.puzzleId);
  expect(decoded.puzzle.id).toBe(puzzle.id);
  expect(decoded.puzzle.seed).toBe(puzzle.seed);
  expect(decoded.puzzle.width).toBe(puzzle.width);
  expect(decoded.puzzle.height).toBe(puzzle.height);
  expect(decoded.puzzle.checksum).toBe(puzzle.checksum);
  expect(serializePuzzle(decoded.puzzle)).toBe(serialized);
  expect(materializedPuzzlesEqual(decoded.puzzle, puzzle)).toBe(true);

  return decoded.puzzle;
};

describe("materialized puzzle serialization", () => {
  it("round-trips the exact Sudoku givens, solution, variation, and cages", () => {
    const puzzle = generateSudoku({
      puzzleId: "sudoku",
      seed: "serialize-sudoku-α",
      width: 9,
      height: 9,
      difficulty: "Medium",
      sudokuVariation: "zero-killer",
    });
    expect(puzzle.kind).toBe("grid");
    if (puzzle.kind !== "grid") return;

    const decoded = expectRoundTrip(puzzle);
    expect(decoded.kind).toBe("grid");
    if (decoded.kind !== "grid") return;
    expect(decoded.cells.map(({ value, locked }) => ({ value, locked })))
      .toEqual(puzzle.cells.map(({ value, locked }) => ({ value, locked })));
    expect(decoded.answerKey).toEqual(puzzle.answerKey);
    expect(decoded.cages).toEqual(puzzle.cages);
    expect(decoded.sudokuVariation).toBe("zero-killer");
  });

  it("round-trips Nonogram clues and solution without regenerating them", () => {
    const puzzle = generateNonogram({
      puzzleId: "nonogram",
      seed: "serialize-nonogram",
      width: 8,
      height: 6,
      difficulty: "Hard",
      requireUniqueSolution: true,
    });
    expect(puzzle.kind).toBe("grid");
    if (puzzle.kind !== "grid") return;

    const decoded = expectRoundTrip(puzzle);
    expect(decoded.kind).toBe("grid");
    if (decoded.kind !== "grid") return;
    expect(decoded.clues).toEqual(puzzle.clues);
    expect(decoded.answerKey).toEqual(puzzle.answerKey);
  });

  it("round-trips a concrete Solitaire deal and rules", () => {
    const puzzle = generateSolitaire({
      puzzleId: "klondike-solitaire",
      seed: "serialize-solitaire",
      width: 7,
      height: 7,
    });

    const decoded = expectRoundTrip(puzzle);
    expect(decoded.kind).toBe("cards");
    if (decoded.kind !== "cards") return;
    expect(decoded.stacks).toEqual(puzzle.stacks);
    expect(decoded.solitaireVariation).toEqual(puzzle.solitaireVariation);
  });

  it("round-trips concrete image artwork and tile placement", () => {
    const puzzle = generateTileSwap({
      puzzleId: "tile-swap",
      seed: "serialize-tiles",
      width: 4,
      height: 4,
      imageId: "great-wave",
    });

    const decoded = expectRoundTrip(puzzle);
    expect(decoded.kind).toBe("tiles");
    if (decoded.kind !== "tiles") return;
    expect(decoded.asset.id).toBe("great-wave");
    expect(decoded.tiles).toEqual(puzzle.tiles);
  });

  it("round-trips exact Jigsaw pieces and edges", () => {
    const puzzle = generateJigsaw({
      puzzleId: "jigsaw",
      seed: "serialize-jigsaw",
      width: 4,
      height: 3,
      imageId: defaultJigsawImageAsset.id,
    });

    const decoded = expectRoundTrip(puzzle);
    expect(decoded.kind).toBe("tiles");
    expect(decoded.puzzleId).toBe("jigsaw");
    if (decoded.kind !== "tiles" || decoded.puzzleId !== "jigsaw") return;
    expect(decoded.asset.id).toBe(defaultJigsawImageAsset.id);
    expect(decoded.tiles).toEqual(puzzle.tiles);
  });

  it("keeps provenance with the puzzle instead of inferring it from the seed", () => {
    const puzzle = withPuzzleProvenance(generateSudoku({
      puzzleId: "sudoku",
      seed: "ordinary-seed",
      width: 9,
      height: 9,
      difficulty: "Easy",
      sudokuVariation: "classic",
    }), {
      source: "daily",
      dateStamp: "2026-09-11",
    });

    const decoded = expectRoundTrip(puzzle);
    expect(getPuzzleProvenance(decoded)).toEqual({ source: "daily", dateStamp: "2026-09-11" });
  });

  it("rejects malformed and structurally invalid tokens", () => {
    expect(deserializePuzzle("not+a+base64url+token")).toEqual({ ok: false, reason: "malformed" });

    const invalid = btoa(JSON.stringify({ p: "sudoku", k: "g" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    expect(deserializePuzzle(invalid)).toEqual({ ok: false, reason: "invalid-puzzle" });
  });
});
