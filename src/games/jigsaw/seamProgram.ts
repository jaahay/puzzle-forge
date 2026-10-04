import type {
  JigsawConnectorGrammarId,
  JigsawEdgeModel,
  JigsawEdgeProfileId,
} from "../../catalog/types";
import {
  deriveJigsawBaselineCourseProgram,
  type JigsawBaselineCourseProgram,
} from "./baselineCourse";
import {
  deriveJigsawConnectorProgram,
  type JigsawConnectorProgram,
} from "./connectorGrammar";
import { sampleJigsawBaselineCourseForCutStyle } from "./cutStyle";

export type JigsawConnectedSeamProgram = {
  kind: "connected";
  approach: JigsawBaselineCourseProgram;
  connector: JigsawConnectorProgram;
  departure: JigsawBaselineCourseProgram;
};

export type JigsawConnectorlessSeamProgram = {
  kind: "connectorless";
  course: JigsawBaselineCourseProgram;
};

export type JigsawSeamProgram =
  | JigsawConnectedSeamProgram
  | JigsawConnectorlessSeamProgram;

const seededUnit = (seedOffset: number, salt: number) => {
  let mixed = (seedOffset ^ salt) >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d) >>> 0;
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b) >>> 0;
  mixed ^= mixed >>> 16;
  return (mixed >>> 0) / 0xffff_ffff;
};

const deriveRoleSeed = (seedOffset: number, salt: number) =>
  Math.imul((seedOffset ^ salt) >>> 0, 1_597_334_677) >>> 0;

export function deriveJigsawSeamProgram(
  profileId: "connectorless-wave",
  seedOffset: number,
  edgeModel: JigsawEdgeModel,
): JigsawConnectorlessSeamProgram;
export function deriveJigsawSeamProgram(
  profileId: JigsawConnectorGrammarId,
  seedOffset: number,
  edgeModel: JigsawEdgeModel,
): JigsawConnectedSeamProgram;
export function deriveJigsawSeamProgram(
  profileId: JigsawEdgeProfileId,
  seedOffset: number,
  edgeModel: JigsawEdgeModel,
): JigsawSeamProgram {
  if (profileId === "connectorless-wave") {
    return {
      kind: "connectorless",
      course: deriveJigsawBaselineCourseProgram(
        "wave",
        deriveRoleSeed(seedOffset, 0xc210),
      ),
    };
  }

  const approachCourseId = sampleJigsawBaselineCourseForCutStyle(
    edgeModel.cutStyle,
    edgeModel.baselineCourseIds,
    seededUnit(seedOffset, 0xc201),
  );
  const departureCourseId = sampleJigsawBaselineCourseForCutStyle(
    edgeModel.cutStyle,
    edgeModel.baselineCourseIds,
    seededUnit(seedOffset, 0xc202),
  );

  return {
    kind: "connected",
    approach: deriveJigsawBaselineCourseProgram(
      approachCourseId,
      deriveRoleSeed(seedOffset, 0xc211),
    ),
    connector: deriveJigsawConnectorProgram(profileId, seedOffset),
    departure: deriveJigsawBaselineCourseProgram(
      departureCourseId,
      deriveRoleSeed(seedOffset, 0xc212),
    ),
  };
}
