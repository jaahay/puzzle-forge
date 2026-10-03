import { describe, expect, it } from "vitest";
import type { JigsawCutStyle, JigsawEdgeModel } from "../../catalog/types";
import { deriveJigsawConnectorProgram } from "./connectorGrammar";
import { deriveJigsawBaselinePalette, jigsawCutStyles } from "./cutStyle";
import { jigsawConnectorGrammarIds } from "./connectorGrammar";
import { deriveJigsawSeamProgram } from "./seamProgram";

const makeEdgeModel = (
  cutStyle: JigsawCutStyle,
  seed = `seam-policy:${cutStyle}`,
): JigsawEdgeModel => ({
  cutStyle,
  baselineGrammarIds: deriveJigsawBaselinePalette(cutStyle, seed),
});

describe("Jigsaw seam program", () => {
  it("is deterministic for connector grammar, shared seam seed, and cut policy", () => {
    for (const cutStyle of jigsawCutStyles) {
      const edgeModel = makeEdgeModel(cutStyle);
      for (const profileId of jigsawConnectorGrammarIds) {
        const first = deriveJigsawSeamProgram(profileId, 123_456, edgeModel);
        expect(deriveJigsawSeamProgram(profileId, 123_456, edgeModel)).toEqual(first);
      }
    }
  });

  it("preserves ConnectorGrammar derivation as the seam's connector component", () => {
    for (const cutStyle of jigsawCutStyles) {
      const edgeModel = makeEdgeModel(cutStyle);
      for (const profileId of jigsawConnectorGrammarIds) {
        for (const seedOffset of [1, 17, 991, 123_456, 999_999]) {
          expect(
            deriveJigsawSeamProgram(profileId, seedOffset, edgeModel).connector,
          ).toEqual(deriveJigsawConnectorProgram(profileId, seedOffset));
        }
      }
    }
  });

  it("uses the puzzle baseline sub-palette for both seam roles while selecting them independently", () => {
    for (const cutStyle of jigsawCutStyles) {
      const edgeModel = makeEdgeModel(cutStyle);
      const rolePairs = Array.from({ length: 4_096 }, (_, seedOffset) => {
        const seam = deriveJigsawSeamProgram(
          "classic-bulb",
          seedOffset,
          edgeModel,
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
      expect(approachIds).toEqual(new Set(edgeModel.baselineGrammarIds));
      expect(departureIds).toEqual(new Set(edgeModel.baselineGrammarIds));
    }
  });

  it("realizes approach and departure independently even when they select the same grammar", () => {
    for (const cutStyle of jigsawCutStyles) {
      const edgeModel = makeEdgeModel(cutStyle);
      const matchingSeed = Array.from(
        { length: 4_096 },
        (_, seedOffset) => seedOffset,
      ).find((seedOffset) => {
        const seam = deriveJigsawSeamProgram(
          "classic-bulb",
          seedOffset,
          edgeModel,
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
