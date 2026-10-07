import { describe, expect, it } from "vitest";
import type { JigsawCutStyle, JigsawEdgeModel } from "../../catalog/types";
import { deriveJigsawConnectorProgram, jigsawConnectorGrammarIds } from "./connectorGrammar";
import {
  applyJigsawConnectorProgramForCutStyle,
  deriveJigsawBaselineCoursePalette,
  jigsawCutStyles,
  jigsawEdgeProfileIds,
} from "./cutStyle";
import { deriveJigsawSeamProgram } from "./seamProgram";

const makeEdgeModel = (
  cutStyle: JigsawCutStyle,
  seed = `seam-policy:${cutStyle}`,
): JigsawEdgeModel => ({
  cutStyle,
  baselineCourseIds: deriveJigsawBaselineCoursePalette(cutStyle, seed),
});

describe("Jigsaw seam program", () => {
  it("is deterministic for every production edge profile", () => {
    for (const cutStyle of jigsawCutStyles) {
      const edgeModel = makeEdgeModel(cutStyle);
      for (const profileId of jigsawEdgeProfileIds) {
        const first = deriveJigsawSeamProgram(profileId as never, 123_456, edgeModel);
        expect(deriveJigsawSeamProgram(profileId as never, 123_456, edgeModel)).toEqual(first);
      }
    }
  });

  it("applies cut-style realization policy to primitive ConnectorGrammar programs", () => {
    for (const cutStyle of jigsawCutStyles) {
      const edgeModel = makeEdgeModel(cutStyle);
      for (const profileId of jigsawConnectorGrammarIds) {
        for (const seedOffset of [1, 17, 991, 123_456, 999_999]) {
          const seam = deriveJigsawSeamProgram(profileId, seedOffset, edgeModel);
          expect(seam.kind).toBe("connected");
          expect(seam.connector).toEqual(
            applyJigsawConnectorProgramForCutStyle(
              cutStyle,
              deriveJigsawConnectorProgram(profileId, seedOffset),
            ),
          );
        }
      }
    }
  });

  it("represents connectorless wave as a real seam profile with no connector", () => {
    const seam = deriveJigsawSeamProgram(
      "connectorless-wave",
      123_456,
      makeEdgeModel("eclectic"),
    );

    expect(seam.kind).toBe("connectorless");
    expect(seam.course.baselineCourseId).toBe("wave");
  });

  it("uses the puzzle baseline course sub-palette independently for both connected roles", () => {
    for (const cutStyle of jigsawCutStyles) {
      const edgeModel = makeEdgeModel(cutStyle);
      const rolePairs = Array.from({ length: 8_192 }, (_, seedOffset) => {
        const seam = deriveJigsawSeamProgram("classic-bulb", seedOffset, edgeModel);
        return [
          seam.approach.baselineCourseId,
          seam.departure.baselineCourseId,
        ] as const;
      });

      expect(rolePairs.some(([approach, departure]) => approach !== departure)).toBe(true);
      expect(rolePairs.some(([approach, departure]) => approach === departure)).toBe(true);

      const approachIds = new Set(rolePairs.map(([approach]) => approach));
      const departureIds = new Set(rolePairs.map(([, departure]) => departure));
      expect(approachIds).toEqual(new Set(edgeModel.baselineCourseIds));
      expect(departureIds).toEqual(new Set(edgeModel.baselineCourseIds));
    }
  });
});
