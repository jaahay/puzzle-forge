import { describe, expect, it } from "vitest";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset, jigsawImageAssets } from "./imageAssets";

const makeJigsaw = (jigsawImageId = defaultJigsawImageAsset.id) =>
  generateJigsaw({
    puzzleId: "jigsaw",
    seed: "phase-one-seed",
    width: 4,
    height: 3,
    jigsawImageId,
  });

describe("generateJigsaw", () => {
  it("is deterministic for seed, dimensions, and image id", () => {
    const first = makeJigsaw("aurora-lake");
    const second = makeJigsaw("aurora-lake");

    expect(first.id).toBe(second.id);
    expect(first.checksum).toBe(second.checksum);
    expect(first.tiles).toEqual(second.tiles);
  });

  it("records the selected bundled image asset identity", () => {
    const puzzle = makeJigsaw("desert-sunrise");

    expect(puzzle.asset).toEqual(jigsawImageAssets[1]);
    expect(puzzle.asset.kind).toBe("image");
    expect(puzzle.id).toContain("desert-sunrise");
  });

  it("includes image identity in the seeded shuffle", () => {
    const aurora = makeJigsaw("aurora-lake");
    const desert = makeJigsaw("desert-sunrise");

    expect(aurora.tiles.map((tile) => tile.solvedIndex)).not.toEqual(desert.tiles.map((tile) => tile.solvedIndex));
  });

  it("creates one correctly indexed piece for every grid position", () => {
    const puzzle = makeJigsaw();

    expect(puzzle.tiles).toHaveLength(12);
    expect([...puzzle.tiles].sort((left, right) => left.solvedIndex - right.solvedIndex)).toEqual(
      Array.from({ length: 12 }, (_, solvedIndex) => ({
        id: `tile-${solvedIndex}`,
        currentIndex: puzzle.tiles.find((tile) => tile.solvedIndex === solvedIndex)?.currentIndex,
        solvedIndex,
        row: Math.floor(solvedIndex / 4),
        column: solvedIndex % 4,
      })),
    );
  });

  it("falls back to the default bundled image for an unknown id", () => {
    expect(makeJigsaw("missing-image").asset).toEqual(defaultJigsawImageAsset);
  });
});
