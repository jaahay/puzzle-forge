import { describe, expect, it } from "vitest";
import { generateJigsaw } from "../games/jigsaw/generate";
import { defaultJigsawImageAsset } from "../games/jigsaw/imageAssets";
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
  it("persists exact image and generated identity for restore", () => {
    const session = makeJigsawSession();
    const puzzle = session.puzzle;
    expect(puzzle.kind).toBe("tiles");
    if (puzzle.kind !== "tiles") return;

    const persisted = buildPersistedPuzzleSession("jigsaw", session);
    expect(persisted?.imageId).toBe(defaultJigsawImageAsset.id);
    expect(persisted?.puzzleInstanceId).toBe(puzzle.id);
    expect(persisted).not.toBeNull();
    if (!persisted) return;

    expect(restorePuzzleSessionFromPersisted(persisted, puzzle)).not.toBeNull();

    const otherImagePuzzle = {
      ...puzzle,
      asset: { ...puzzle.asset, id: "other-image" },
    };
    expect(restorePuzzleSessionFromPersisted(persisted, otherImagePuzzle)).toBeNull();
    expect(restorePuzzleSessionFromPersisted({ ...persisted, puzzleInstanceId: `${puzzle.id}-other` }, puzzle)).toBeNull();
  });
});
