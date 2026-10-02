import { describe, expect, it } from "vitest";
import { deriveJigsawConnectorProgram } from "./connectorGrammar";
import { jigsawEdgeProfileIds } from "./edgeProfiles";
import { deriveJigsawSeamProgram } from "./seamProgram";

describe("Jigsaw seam program", () => {
  it("is deterministic for a connector grammar and shared seam seed", () => {
    for (const profileId of jigsawEdgeProfileIds) {
      const first = deriveJigsawSeamProgram(profileId, 123_456);
      expect(deriveJigsawSeamProgram(profileId, 123_456)).toEqual(first);
    }
  });

  it("preserves ConnectorGrammar derivation as the seam's connector component", () => {
    for (const profileId of jigsawEdgeProfileIds) {
      for (const seedOffset of [1, 17, 991, 123_456, 999_999]) {
        expect(deriveJigsawSeamProgram(profileId, seedOffset).connector).toEqual(
          deriveJigsawConnectorProgram(profileId, seedOffset),
        );
      }
    }
  });

  it("uses one baseline grammar vocabulary for both seam roles while selecting them independently", () => {
    const rolePairs = Array.from({ length: 512 }, (_, seedOffset) => {
      const seam = deriveJigsawSeamProgram("classic-bulb", seedOffset);
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
    expect(approachIds.size).toBeGreaterThan(1);
    expect(departureIds.size).toBeGreaterThan(1);
  });

  it("realizes approach and departure independently even when they select the same grammar", () => {
    const matchingSeed = Array.from({ length: 2_048 }, (_, seedOffset) => seedOffset).find(
      (seedOffset) => {
        const seam = deriveJigsawSeamProgram("classic-bulb", seedOffset);
        return (
          seam.approach.baselineGrammarId === seam.departure.baselineGrammarId &&
          JSON.stringify(seam.approach) !== JSON.stringify(seam.departure)
        );
      },
    );

    expect(matchingSeed).toBeDefined();
  });
});
