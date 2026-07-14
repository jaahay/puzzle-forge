import { describe, expect, it } from "vitest";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";

const makeJigsaw = (
  jigsawImageId: string = defaultJigsawImageAsset.id,
  jigsawAssetRevision: number = defaultJigsawImageAsset.assetRevision,
) =>
  generateJigsaw({
    puzzleId: "jigsaw",
    seed: "phase-one-seed",
    width: 4,
    height: 3,
    jigsawImageId,
    jigsawAssetRevision,
  });

describe("generateJigsaw", () => {
  it("is deterministic for seed, dimensions, image id, and asset revision", () => {
    const first = makeJigsaw();
    const second = makeJigsaw();

    expect(first.id).toBe(second.id);
    expect(first.checksum).toBe(second.checksum);
    expect(first.tiles).toEqual(second.tiles);
  });

  it("records the selected bundled image asset identity", () => {
    const puzzle = makeJigsaw();

    expect(puzzle.asset).toEqual(defaultJigsawImageAsset);
    expect(puzzle.asset.kind).toBe("image");
    expect(puzzle.id).toContain(`${defaultJigsawImageAsset.id}@${defaultJigsawImageAsset.assetRevision}`);
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

  it("rejects an unknown bundled image id", () => {
    expect(() => makeJigsaw("missing-image")).toThrow("Unknown bundled Jigsaw image");
  });

  it("rejects an unsupported asset revision", () => {
    expect(() => makeJigsaw(defaultJigsawImageAsset.id, defaultJigsawImageAsset.assetRevision + 1)).toThrow(
      "Unsupported revision",
    );
  });
});
