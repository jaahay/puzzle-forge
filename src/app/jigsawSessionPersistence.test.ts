import { describe, expect, it } from "vitest";
import { generateJigsaw } from "../games/jigsaw/generate";
import { defaultJigsawImageAsset } from "../games/jigsaw/imageAssets";
import { deserializePuzzle, serializePuzzle } from "./puzzleSerialization";
import {
  buildPersistedPuzzleSession,
  restorePuzzleSessionFromPersisted,
  type PuzzleSession,
} from "./session";

const makeJigsawSession = (): PuzzleSession => {
  const puzzle = generateJigsaw({
    puzzleId: "jigsaw",
    seed: "persist-image-selection",
    width: 4,
    height: 3,
    imageId: defaultJigsawImageAsset.id,
  });

  return {
    kind: "tiles",
    puzzle,
    progress: { kind: "tiles" },
    statusMessage: "Jigsaw in progress.",
  };
};

describe("Jigsaw session image identity", () => {
  it("persists the exact materialized puzzle for restore", () => {
    const session = makeJigsawSession();
    const puzzle = session.puzzle;
    expect(puzzle.kind).toBe("tiles");
    if (puzzle.kind !== "tiles") return;

    const persisted = buildPersistedPuzzleSession("jigsaw", session);
    expect(persisted).not.toBeNull();
    if (!persisted) return;
    expect(persisted.puzzle).toBe(serializePuzzle(puzzle));

    const decoded = deserializePuzzle(persisted.puzzle);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok || decoded.puzzle.kind !== "tiles" || decoded.puzzle.puzzleId !== "jigsaw") return;
    expect(decoded.puzzle.asset.id).toBe(defaultJigsawImageAsset.id);
    expect(decoded.puzzle.id).toBe(puzzle.id);
    expect(decoded.puzzle.tiles).toEqual(puzzle.tiles);

    expect(restorePuzzleSessionFromPersisted(persisted)).not.toBeNull();
    expect(restorePuzzleSessionFromPersisted(persisted, puzzle)).not.toBeNull();

    const otherImagePuzzle = {
      ...puzzle,
      asset: { ...puzzle.asset, id: "other-image" },
    };
    expect(restorePuzzleSessionFromPersisted(persisted, otherImagePuzzle)).toBeNull();
  });
});
