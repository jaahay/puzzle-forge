import { describe, expect, it } from "vitest";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset, jigsawImageAssets } from "./imageAssets";

const makeJigsaw = (jigsawImageId: string = defaultJigsawImageAsset.id) =>
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

    expect(aurora.tiles.map((tile) => tile.solvedIndex)).not.toEqual(desert.tiles.map