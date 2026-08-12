import { describe, expect, it } from "vitest";
import { generateJigsaw } from "../games/jigsaw/generate";
import { defaultJigsawImageAsset } from "../games/jigsaw/imageAssets";
import { initialSolitaireStats, type PuzzleSession } from "./session";
import { clonePuzzleSession } from "./usePuzzleSessions";

const makeJigsawSession = (): PuzzleSession => {
  const puzzle = generateJigsaw({
    puzzleId: "jigsaw",
    seed: "clone-edge-model",
    width: 4,
    height: 3,
    imageId: defaultJigsawImageAsset.id,
  });

  return {
    seed: puzzle.seed,
    width: puzzle.width,
    height: puzzle.height,
    difficulty: "Easy",
    requireUniqueSolution: false,
    puzzle,
    cardStacks: null,
    selectedCard: null,
    solitaireStats: { ...initialSolitaireStats },
    solitaireUndoStack: [],
    solitaireRedoStack: [],
    gridCells: null,
    selectedGridCell: null,
    statusMessage: "Jigsaw in progress.",
  };
};

describe("clonePuzzleSession", () => {
  it("deep-clones Jigsaw edge, image, and edge-model metadata", () => {
    const session = makeJigsawSession();
    const cloned = clonePuzzleSession(session);

    expect(session.puzzle?.kind).toBe("tiles");
    expect(cloned.puzzle?.kind).toBe("tiles");
    if (session.puzzle?.kind !== "tiles" || cloned.puzzle?.kind !== "tiles") return;

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
