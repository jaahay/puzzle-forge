import { describe, expect, it } from "vitest";
import {
  getPuzzleImageAsset,
  getPuzzleImageAssetsFor,
  getSurprisePuzzleImageAsset,
  imageBackedPuzzleIds,
} from "./imageAssets";

describe("shared puzzle artwork catalog", () => {
  it.each(imageBackedPuzzleIds)("resolves eligible concrete artwork for %s", (puzzleId) => {
    const eligibleAssets = getPuzzleImageAssetsFor(puzzleId);
    expect(eligibleAssets.length).toBeGreaterThan(0);

    const first = eligibleAssets[0];
    const last = eligibleAssets[eligibleAssets.length - 1];
    expect(getPuzzleImageAsset(undefined, puzzleId).id).toBe(first.id);
    expect(getPuzzleImageAsset(last.id, puzzleId).id).toBe(last.id);
  });

  it.each(imageBackedPuzzleIds)("resolves Surprise Me to a concrete eligible artwork for %s", (puzzleId) => {
    const eligibleAssets = getPuzzleImageAssetsFor(puzzleId);
    const current = eligibleAssets[0];
    const surprise = getSurprisePuzzleImageAsset(puzzleId, current.id, 0);

    expect(eligibleAssets.some((asset) => asset.id === surprise.id)).toBe(true);
    if (eligibleAssets.length > 1) {
      expect(surprise.id).not.toBe(current.id);
    }
  });

  it("keeps Surprise Me inside the eligible catalog at the upper random boundary", () => {
    const eligibleAssets = getPuzzleImageAssetsFor("tile-swap");
    const surprise = getSurprisePuzzleImageAsset("tile-swap", eligibleAssets[0].id, 1);

    expect(eligibleAssets.some((asset) => asset.id === surprise.id)).toBe(true);
    expect(surprise.id).not.toBe(eligibleAssets[0].id);
  });

  it("rejects artwork that cannot be resolved for the requested puzzle type", () => {
    expect(() => getPuzzleImageAsset("not-in-the-catalog", "tile-swap")).toThrow(
      "Unknown or unavailable bundled artwork",
    );
  });
});
