import { describe, expect, it } from "vitest";
import { defaultJigsawImageAsset } from "./imageAssets";
import {
  defaultJigsawSpecialPiecesMode,
  jigsawRareSpecialPieceRate,
  normalizeJigsawSpecialPiecesMode,
  selectJigsawMedallionPlacement,
} from "./specialPieces";

describe("Jigsaw special pieces policy", () => {
  it("defaults to Rare and rejects unknown modes", () => {
    expect(defaultJigsawSpecialPiecesMode).toBe("rare");
    expect(normalizeJigsawSpecialPiecesMode(undefined)).toBe("rare");
    expect(normalizeJigsawSpecialPiecesMode("unexpected")).toBe("rare");
    expect(jigsawRareSpecialPieceRate).toBe(0.25);
  });

  it("keeps Off empty and Always deterministic", () => {
    const input = {
      identitySeed: "special-policy",
      width: 6,
      height: 6,
      asset: defaultJigsawImageAsset,
    };
    expect(selectJigsawMedallionPlacement({ ...input, mode: "off" })).toBeNull();

    const first = selectJigsawMedallionPlacement({ ...input, mode: "always" });
    const second = selectJigsawMedallionPlacement({ ...input, mode: "always" });
    expect(first).toEqual(second);
    expect(first).not.toBeNull();
  });

  it("makes Rare sparse while sharing Always placement when it triggers", () => {
    const input = {
      width: 6,
      height: 6,
      asset: defaultJigsawImageAsset,
    };
    const samples = Array.from({ length: 128 }, (_, index) => {
      const identitySeed = `rare-policy-${index}`;
      return {
        identitySeed,
        rare: selectJigsawMedallionPlacement({
          ...input,
          identitySeed,
          mode: "rare",
        }),
      };
    });
    const triggered = samples.filter(({ rare }) => rare !== null);
    expect(triggered.length).toBeGreaterThan(0);
    expect(triggered.length).toBeLessThan(samples.length / 2);

    for (const { identitySeed, rare } of triggered) {
      expect(rare).toEqual(selectJigsawMedallionPlacement({
        ...input,
        identitySeed,
        mode: "always",
      }));
    }
  });
});
