import { describe, expect, it } from "vitest";
import type { JigsawCutStyle } from "../../catalog/types";
import { deriveJigsawConnectorProgram } from "./connectorGrammar";
import { deriveJigsawBaselinePalette, jigsawCutStyles } from "./cutStyle";
import { jigsawEdgeProfileIds } from "./edgeProfiles";
import { deriveJigsawSeamProgram, type JigsawSeamCutPolicy } from "./seamProgram";

const makePolicy = (
  cutStyle: JigsawCutStyle,
  seed = `seam-policy:${cutStyle}`,
): JigsawSeamCutPolicy => ({
  cutStyle,
  baselineGrammarIds: deriveJigsawBaselinePalette(cutStyle, seed),
});

describe("Jigsaw seam program", () => {
  it("is deterministic for connector grammar, shared seam seed, and cut policy", () => {
    for (const cutStyle of jigsawCutStyles) {
      const policy = makePolicy(cutStyle);
      for (const profileId of jigsawEdgeProfileIds) {
        const first = deriveJigsawSeamProgram(profileId, 123_456, policy);
        expect(deriveJigsawSeamProgram(profileId, 123_456, policy)).toEqual(first);
      }
    }
  });

  it("preserves ConnectorGrammar derivation as the seam's connector component", () => {
    for (const cutStyle of jigsawCutStyles) {
      const policy = makePolicy(cutStyle);
      for (const profileId of jigsawEdgeProfileIds) {
        for (const seedOffset of [1, 17, 991, 123_456, 999_999]) {
          expect(
            deriveJigsawSeamProgram(profileId, seedOffset, policy).connector,
          ).toEqual(deriveJigsawConnectorProgram(profileId, seedOffset));
        }
      }
    }
  });

  it("uses the puzzle baseline sub-palette for both seam roles while selecting them independently", () => {
    for (const cutStyle of jigsawCutStyles) {
      const policy = makePolicy(cutStyle);
      const rolePairs = Array.from({ length: 4_096 }, (_, seedOffset) => {
        const seam = deriveJigsawSeamProgram(
          "classic-bulb",
          seedOffset,
          policy,
        );
        return [
          seam.approach.baselineGrammarId,
          seam.departure.baselineGrammarId,
        ] as const;
      });

      expect(
        rolePairs.some(([approach, departure]) => approach !== departure),
      ).toBe(true);
      expect(
        rolePairs.some(([approach, departure]) => approach === departure),
      ).toBe(true);

      const approachIds = new Set(rolePairs.map(([approach]) => approach));
      const departureIds = new Set(rolePairs.map(([, departure]) => departure));
      expect(approachIds).toEqual(new Set(policy.baselineGrammarIds));
      expect(departureIds).toEqual(new Set(policy.baselineGrammarIds));
    }
  });

  it("realizes approach and departure independently even when they select the same grammar", () => {
    for (const cutStyle of jigsawCutStyles) {
      const policy = makePolicy(cutStyle);
      const matchingSeed = Array.from(
        { length: 4_096 },
        (_, seedOffset) => seedOffset,
      ).find((seedOffset) => {
        const seam = deriveJigsawSeamProgram(
          "classic-bulb",
          seedOffset,
          policy,
        );
        return (
          seam.approach.baselineGrammarId ===
            seam.departure.baselineGrammarId &&
          JSON.stringify(seam.approach) !== JSON.stringify(seam.departure)
        );
      });

      expect(matchingSeed).toBeDefined();
    }
  });
});
