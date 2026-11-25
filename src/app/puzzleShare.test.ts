import { describe, expect, it, vi } from "vitest";
import { getPuzzleAvailability } from "../catalog/puzzleAvailability";
import { getPuzzleDefinition } from "../catalog/puzzleCatalog";
import type { PuzzleId } from "../catalog/types";
import { getPuzzleImageAsset, isImageBackedPuzzleId } from "../games/imageAssets";
import { defaultJigsawBoundaryMode } from "../games/jigsaw/boundaryContours";
import { defaultJigsawCutStyle } from "../games/jigsaw/cutStyle";
import { defaultJigsawSpecialPiecesMode } from "../games/jigsaw/specialPieces";
import { generatePuzzle } from "../games/registry";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { defaultSudokuVariation } from "../games/sudoku/variation";
import { formatWordGuessShareText } from "../games/wordGuess/share";
import { prepareGridCells } from "../interactions/gridRules";
import type { GenerationIdentity } from "./generationIdentity";
import { withPuzzleProvenance } from "./puzzleProvenance";
import { decodeGenerationId, encodeGenerationId } from "./puzzleResourceIdentity";
import { parseAppRoute } from "./routes";
import { initialSolitaireStats } from "./session";
import {
  canUseNativePuzzleShare, copyPuzzleShare, formatPuzzleShareProgress,
  getPuzzleSharePreview, getPuzzleShareResource, makePuzzleSharePayload, sharePuzzleNatively, type PuzzleShareProgress,
} from "./puzzleShare";

const origin = "https://puzzle-forge.example";
const identityFor = (puzzleId: PuzzleId, overrides: Partial<GenerationIdentity> = {}): GenerationIdentity => {
  const def = getPuzzleDefinition(puzzleId);
  return {
    puzzleId,
    seed: "share-resource-seed",
    width: def.defaultWidth,
    height: def.defaultHeight,
    difficulty: "Medium",
    requireUniqueSolution: false,
    sudokuVariation: defaultSudokuVariation,
    solitaireVariation: defaultSolitaireVariation,
    jigsawCutStyle: defaultJigsawCutStyle,
    jigsawBoundaryMode: defaultJigsawBoundaryMode,
    jigsawSpecialPiecesMode: defaultJigsawSpecialPiecesMode,
    imageId: isImageBackedPuzzleId(puzzleId) ? getPuzzleImageAsset(undefined, puzzleId).id : undefined,
    ...overrides,
  };
};
const generate = (identity: GenerationIdentity) =>
  withPuzzleProvenance(generatePuzzle(identity, identity.puzzleId === "word-guess" ? ["CRANE", "LEVEL"] : undefined), identity.provenance);
const emptyProgress = (): PuzzleShareProgress => ({
  gridCells: null, cardStacks: null, solitaireStats: initialSolitaireStats,
  imageTileRuntime: null, jigsawRuntime: null,
});

describe("canonical puzzle sharing", () => {
  it("links every generatable family to its concrete generation identity", () => {
    const { generatablePuzzles } = getPuzzleAvailability();
    for (const definition of generatablePuzzles) {
      const identity = identityFor(definition.id);
      const puzzle = generate(identity);
      const generationId = encodeGenerationId(identity);
      const route = { kind: "resource" as const, puzzleId: definition.id, generationId };
      const resource = getPuzzleShareResource(route, puzzle, origin);
      expect(resource, definition.id).not.toBeNull();
      const url = new URL(resource!.url);
      expect(url.origin).toBe(origin);
      expect(url.search).toBe("");
      expect(url.hash).toBe("");
      expect(parseAppRoute(url.pathname, "")).toEqual(route);
    }
  });

  it("discovers the destination at runtime and keeps the opaque resource path out of the primary preview", () => {
    const identity = identityFor("word-guess");
    const puzzle = generate(identity);
    const generationId = encodeGenerationId(identity);
    const route = { kind: "resource" as const, puzzleId: "word-guess" as const, generationId };
    for (const runtimeOrigin of ["https://preview.example", "https://puzzles.example.org", "http://localhost:5173"]) {
      const resource = { ...getPuzzleShareResource(route, puzzle, runtimeOrigin)!, description: "5 letters · 6 guesses" };
      expect(resource.url).toBe(`${runtimeOrigin}/word-guess/${generationId}`);
      const report = "Word Guess 5×6\nSolved · 3/6";
      const preview = getPuzzleSharePreview(resource, "puzzle", report);
      expect(preview).toEqual({
        title: resource.title, description: resource.description, report: null,
        destination: new URL(runtimeOrigin).host,
      });
      expect(JSON.stringify(preview)).not.toContain(generationId);
      expect(getPuzzleSharePreview(resource, "progress", report).report).toBe(report);
      expect(makePuzzleSharePayload(resource, "puzzle", report).copyText).toBe(resource.url);
      expect(makePuzzleSharePayload(resource, "progress", report).native.url).toBe(resource.url);
    }
  });

  it("preserves a dated Daily identity and non-default settings without sharing a Today selector", () => {
    const identity = identityFor("word-guess", {
      height: 8,
      provenance: { source: "daily", dateStamp: "2026-11-23" },
    });
    const puzzle = generate(identity);
    const generationId = encodeGenerationId(identity);
    const resource = getPuzzleShareResource({ kind: "resource", puzzleId: "word-guess", generationId }, puzzle, origin);
    expect(resource?.url).toBe(`${origin}/word-guess/${generationId}`);
    const decoded = decodeGenerationId("word-guess", generationId);
    expect(decoded).toMatchObject({ ok: true, identity: { height: 8, provenance: identity.provenance } });
  });

  it("does not share an uncommitted or mismatched resource", () => {
    const identity = identityFor("word-guess");
    const puzzle = generate(identity);
    expect(getPuzzleShareResource({ kind: "puzzle", puzzleId: "word-guess" }, puzzle, origin)).toBeNull();
    expect(getPuzzleShareResource({ kind: "resource", puzzleId: "word-guess", generationId: "invalid" }, puzzle, origin)).toBeNull();
    expect(getPuzzleShareResource({
      kind: "resource", puzzleId: "word-guess",
      generationId: encodeGenerationId({ ...identity, seed: "different" }),
    }, puzzle, origin)).toBeNull();
  });

  it("includes only the URL for a puzzle invitation and the same URL alongside a progress report", () => {
    const resource = { puzzleInstanceId: "local", title: "Word Guess", url: `${origin}/word-guess/example` };
    const report = formatWordGuessShareText({ title: "Word Guess", answer: "CRANE",
      guesses: ["SLATE"], maxGuesses: 6, status: "playing" });
    const invitation = makePuzzleSharePayload(resource, "puzzle", report);
    expect(invitation.copyText).toBe(resource.url);
    expect(invitation.native).toEqual({ title: "Puzzle Forge · Word Guess", url: resource.url });
    const progress = makePuzzleSharePayload(resource, "progress", report);
    expect(progress.native.url).toBe(resource.url);
    expect(progress.copyText).toContain(resource.url);
    expect(progress.copyText).toContain("🟩");
    expect(progress.copyText).not.toMatch(/CRANE|SLATE|local/);
    expect(makePuzzleSharePayload(resource, "progress", null)).toEqual(invitation);
  });
});

describe("spoiler-safe progress reports", () => {
  it("counts only entered editable cells without revealing their values", () => {
    const puzzle = generate(identityFor("sudoku"));
    if (puzzle.kind !== "grid") throw new Error("Expected a grid");
    const cells = prepareGridCells(puzzle);
    expect(formatPuzzleShareProgress(puzzle, { ...emptyProgress(), gridCells: cells })).toBeNull();
    const index = puzzle.cells.findIndex((cell) => !cell.locked);
    const editable = puzzle.cells.filter((cell) => !cell.locked).length;
    cells[index] = { ...cells[index]!, value: "PRIVATE" };
    expect(formatPuzzleShareProgress(puzzle, { ...emptyProgress(), gridCells: cells }))
      .toBe(`${puzzle.title} · 9×9\nIn progress · 1/${editable} editable cells filled`);
  });

  it("counts Nonogram marks, not purported correct cells", () => {
    const puzzle = generate(identityFor("nonogram"));
    if (puzzle.kind !== "grid") throw new Error("Expected a grid");
    const cells = prepareGridCells(puzzle);
    cells[0] = { ...cells[0]!, value: "×" };
    expect(formatPuzzleShareProgress(puzzle, { ...emptyProgress(), gridCells: cells }))
      .toContain("1/64 cells marked");
  });

  it("keeps Word Guess's live report separate from generic grid entries", () => {
    const puzzle = generate(identityFor("word-guess"));
    if (puzzle.kind !== "grid") throw new Error("Expected a grid");
    expect(formatPuzzleShareProgress(puzzle, { ...emptyProgress(), gridCells: prepareGridCells(puzzle) })).toBeNull();
  });

  it("reports card moves and foundation count, never the deal", () => {
    const puzzle = generate(identityFor("klondike-solitaire"));
    if (puzzle.kind !== "cards") throw new Error("Expected cards");
    const progress = { ...emptyProgress(), cardStacks: puzzle.stacks };
    expect(formatPuzzleShareProgress(puzzle, progress)).toBeNull();
    expect(formatPuzzleShareProgress(puzzle, { ...progress, solitaireStats: {
      ...initialSolitaireStats, moveCount: 3,
    } })).toBe(`${puzzle.title}\nIn progress · 0/52 cards in foundations · 3 moves`);
  });

  it("reports Jigsaw assembly membership without revealing positions", () => {
    const puzzle = generate(identityFor("jigsaw"));
    if (puzzle.kind !== "tiles" || puzzle.puzzleId !== "jigsaw") throw new Error("Expected Jigsaw");
    const first = puzzle.tiles[0]!.id;
    const second = puzzle.tiles[1]!.id;
    const report = formatPuzzleShareProgress(puzzle, {
      ...emptyProgress(),
      jigsawRuntime: {
        snapshot: { placements: [], assembly: { joinedComponents: [[first, second]], anchoredPieceIds: [first] } },
        history: { undoStack: [], redoStack: [] },
      },
    });
    expect(report).toContain("2/16 pieces joined or anchored");
    expect(report).not.toContain("Solved");
  });

  it.each(["tile-swap", "sliding-puzzle"] as const)("reports %s move count without tile order", (puzzleId) => {
    const puzzle = generate(identityFor(puzzleId));
    if (puzzle.kind !== "tiles" || puzzle.puzzleId === "jigsaw") throw new Error("Expected image tiles");
    const report = formatPuzzleShareProgress(puzzle, {
      ...emptyProgress(),
      imageTileRuntime: {
        state: { tiles: puzzle.tiles, emptyIndex: puzzle.puzzleId === "sliding-puzzle" ? puzzle.emptyIndex : undefined, moveCount: 7 },
        history: { undoStack: [], redoStack: [] },
      },
    });
    expect(report).toContain("7 moves");
  });
});

describe("platform share transport", () => {
  const data = { title: "Puzzle", url: `${origin}/sudoku/resource` };
  it("hands off a link and optional text through the native API", async () => {
    const share = vi.fn(async () => undefined);
    const transport = { share, canShare: vi.fn(() => true) };
    expect(await sharePuzzleNatively(transport, data)).toBe("handed-off");
    expect(share).toHaveBeenCalledWith(data);
  });

  it("treats cancellation separately and never silently copies", async () => {
    const writeText = vi.fn(async () => undefined);
    const share = vi.fn(async () => { throw { name: "AbortError" }; });
    const transport = { share, clipboard: { writeText } };
    expect(await sharePuzzleNatively(transport, data)).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("handles missing, blocked and rejected native transports", async () => {
    expect(canUseNativePuzzleShare({}, data)).toBe(false);
    expect(await sharePuzzleNatively({}, data)).toBe("unavailable");
    expect(canUseNativePuzzleShare({ share: async () => undefined, canShare: () => false }, data)).toBe(false);
    expect(await sharePuzzleNatively({ share: async () => { throw new Error("denied"); } }, data)).toBe("unavailable");
  });

  it("only acknowledges a successful explicit clipboard write", async () => {
    const writeText = vi.fn(async () => undefined);
    expect(await copyPuzzleShare({ clipboard: { writeText } }, data.url)).toBe(true);
    expect(writeText).toHaveBeenCalledWith(data.url);
    expect(await copyPuzzleShare({}, data.url)).toBe(false);
    expect(await copyPuzzleShare({ clipboard: { writeText: async () => { throw new Error("denied"); } } }, data.url)).toBe(false);
  });
});
