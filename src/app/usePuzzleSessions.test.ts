import { describe, expect, it } from "vitest";
import type { GeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { generateJigsaw } from "../games/jigsaw/generate";
import { defaultJigsawImageAsset } from "../games/jigsaw/imageAssets";
import { initialSolitaireStats, type PuzzleSession } from "./session";
import { buildRuntimeSession, clonePuzzleSession } from "./usePuzzleSessions";

const makeJigsawSession = (): PuzzleSession => {
  const puzzle = generateJigsaw({
    puzzleId: "jigsaw",
    seed: "clone-edge-model",
    width: 4,
    height: 3,
    imageId: defaultJigsawImageAsset.id,
  });

  return {
    puzzle,
    progress: { kind: "tiles" },
    statusMessage: "Jigsaw in progress.",
  };
};

const makeSudokuPuzzle = (): GeneratedPuzzle => ({
  id: "sudoku-transient",
  puzzleId: "sudoku",
  title: "Sudoku",
  seed: "transient-feedback",
  width: 9,
  height: 9,
  checksum: "checksum",
  createdAt: "2026-08-29T00:00:00.000Z",
  difficulty: "Easy",
  uniqueSolution: true,
  sudokuVariation: "classic",
  notes: [],
  kind: "grid",
  cells: [],
});

describe("clonePuzzleSession", () => {
  it("deep-clones Jigsaw edge, image, and edge-model metadata", () => {
    const session = makeJigsawSession();
    const cloned = clonePuzzleSession(session);

    expect(session.puzzle.kind).toBe("tiles");
    expect(session.puzzle.puzzleId).toBe("jigsaw");
    expect(cloned.puzzle.kind).toBe("tiles");
    expect(cloned.puzzle.puzzleId).toBe("jigsaw");
    if (
      session.puzzle.kind !== "tiles" ||
      session.puzzle.puzzleId !== "jigsaw" ||
      cloned.puzzle.kind !== "tiles" ||
      cloned.puzzle.puzzleId !== "jigsaw"
    ) return;

    expect(cloned.puzzle).toEqual(session.puzzle);
    expect(cloned.puzzle).not.toBe(session.puzzle);
    expect(cloned.puzzle.tiles).not.toBe(session.puzzle.tiles);
    expect(cloned.puzzle.tiles[0]).not.toBe(session.puzzle.tiles[0]);
    expect(cloned.puzzle.tiles[0].edges).not.toBe(session.puzzle.tiles[0].edges);
    expect(cloned.puzzle.tiles[0].edges[0]).not.toBe(session.puzzle.tiles[0].edges[0]);
    expect(cloned.puzzle.asset).not.toBe(session.puzzle.asset);
    expect(cloned.puzzle.asset.files).not.toBe(session.puzzle.asset.files);
    expect(cloned.puzzle.asset.credit).not.toBe(session.puzzle.asset.credit);
    expect(cloned.puzzle.edgeModel).not.toBe(session.puzzle.edgeModel);
    expect(cloned.puzzle.edgeModel.profileIds).not.toBe(session.puzzle.edgeModel.profileIds);
  });
});

describe("buildRuntimeSession", () => {
  it("does not retain transient Sudoku validation tones in saved session state", () => {
    const gridCells: PuzzleCell[] = [
      { row: 0, column: 0, value: "1", locked: false, tone: "answer" },
      { row: 0, column: 1, value: "9", locked: false, tone: "hint" },
      { row: 0, column: 2, value: "3", locked: true, tone: "given" },
    ];

    const session = buildRuntimeSession({
      puzzle: makeSudokuPuzzle(),
      cardStacks: null,
      selectedCard: null,
      solitaireStats: { ...initialSolitaireStats },
      solitaireUndoStack: [],
      solitaireRedoStack: [],
      gridCells,
      selectedGridCell: null,
      statusMessage: "1 entry needs attention.",
    });

    expect(session.progress.kind).toBe("grid");
    if (session.progress.kind !== "grid") return;
    expect(session.progress.cells.map((cell) => cell.tone)).toEqual(["empty", "empty", "given"]);
    expect(gridCells.map((cell) => cell.tone)).toEqual(["answer", "hint", "given"]);
  });
});
