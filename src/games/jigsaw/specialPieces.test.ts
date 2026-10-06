import { describe, expect, it } from "vitest";
import { defaultJigsawImageAsset } from "./imageAssets";
import {
  defaultJigsawSpecialPiecesMode,
  jigsawRareSpecialPieceRate,
  jigsawSpecialPieceFamilies,
  normalizeJigsawSpecialPiecesMode,
  selectJigsawSpecialPiecePlan,
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
    expect(selectJigsawSpecialPiecePlan({ ...input, mode: "off" })).toBeNull();

    const first = selectJigsawSpecialPiecePlan({ ...input, mode: "always" });
    const second = selectJigsawSpecialPiecePlan({ ...input, mode: "always" });
    expect(first).toEqual(second);
    expect(first).not.toBeNull();
  });

  it("lets both shipped families participate in Always", () => {
    const observed = new Set<string>();
    for (let index = 0; index < 128; index += 1) {
      const plan = selectJigsawSpecialPiecePlan({
        mode: "always",
        identitySeed: `family-policy-${index}`,
        width: 6,
        height: 6,
        asset: defaultJigsawImageAsset,
      });
      if (plan) observed.add(plan.family);
    }
    expect(observed).toEqual(new Set(jigsawSpecialPieceFamilies));
  });

  it("makes Rare sparse while sharing the exact Always plan when it triggers", () => {
    const input = {
      width: 6,
      height: 6,
      asset: defaultJigsawImageAsset,
    };
    const samples = Array.from({ length: 128 }, (_, index) => {
      const identitySeed = `rare-policy-${index}`;
      return {
        identitySeed,
        rare: selectJigsawSpecialPiecePlan({
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
      expect(rare).toEqual(selectJigsawSpecialPiecePlan({
        ...input,
        identitySeed,
        mode: "always",
      }));
    }
  });
});
