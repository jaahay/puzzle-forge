import { describe, expect, it } from "vitest";
import { jigsawBaselineGrammarIds } from "./baselineGrammar";
import { deriveJigsawConnectorProgram } from "./connectorGrammar";
import { jigsawEdgeProfileIds } from "./edgeProfiles";
import {
  deriveJigsawSeamProgram,
  jigsawDefaultBaselineSelectionWeights,
  selectJigsawBaselineGrammar,
} from "./seamProgram";

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

  it("anchors the default distribution in familiar forms without hiding extended forms", () => {
    expect(jigsawDefaultBaselineSelectionWeights.straight).toBeGreaterThan(
      jigsawDefaultBaselineSelectionWeights.bow,
    );
    expect(jigsawDefaultBaselineSelectionWeights.bow).toBeGreaterThan(
      jigsawDefaultBaselineSelectionWeights.inflection,
    );
    expect(jigsawDefaultBaselineSelectionWeights.dogleg).toBeGreaterThan(
      jigsawDefaultBaselineSelectionWeights.wave,
    );
    expect(jigsawDefaultBaselineSelectionWeights.wave).toBeGreaterThan(
      jigsawDefaultBaselineSelectionWeights["stepped-course"],
    );

    const selections = Array.from({ length: 10_000 }, (_, index) =>
      selectJigsawBaselineGrammar((index + 0.5) / 10_000),
    );
    expect(new Set(selections)).toEqual(new Set(jigsawBaselineGrammarIds));

    const counts = Object.fromEntries(
      jigsawBaselineGrammarIds.map((grammarId) => [
        grammarId,
        selections.filter((selected) => selected === grammarId).length,
      ]),
    ) as Record<(typeof jigsawBaselineGrammarIds)[number], number>;

    expect(counts.straight).toBeGreaterThan(counts.bow);
    expect(counts.bow).toBeGreaterThan(counts.inflection);
    expect(counts.inflection).toBeGreaterThan(counts["angled-course"]);
    expect(counts["angled-course"]).toBeGreaterThan(counts.dogleg);
    expect(counts.dogleg).toBeGreaterThan(counts.wave);
    expect(counts.wave).toBeGreaterThan(counts["stepped-course"]);
  });

  it("uses one baseline grammar vocabulary for both seam roles while selecting them independently", () => {
    const rolePairs = Array.from({ length: 4_096 }, (_, seedOffset) => {
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
    expect(approachIds).toEqual(new Set(jigsawBaselineGrammarIds));
    expect(departureIds).toEqual(new Set(jigsawBaselineGrammarIds));
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
