import type {
  JigsawBaselineGrammarId,
  JigsawCutStyle,
  JigsawEdgeProfileId,
} from "../../catalog/types";
import {
  deriveJigsawBaselineProgram,
  type JigsawBaselineProgram,
} from "./baselineGrammar";
import {
  deriveJigsawConnectorProgram,
  type JigsawConnectorProgram,
} from "./connectorGrammar";
import { sampleJigsawBaselineGrammarForCutStyle } from "./cutStyle";

export type JigsawSeamProgram = {
  approach: JigsawBaselineProgram;
  connector: JigsawConnectorProgram;
  departure: JigsawBaselineProgram;
};

export type JigsawSeamCutPolicy = {
  cutStyle: JigsawCutStyle;
  baselineGrammarIds: readonly JigsawBaselineGrammarId[];
};

const seededUnit = (seedOffset: number, salt: number) => {
  let mixed = (seedOffset ^ salt) >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d) >>> 0;
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b) >>> 0;
  mixed ^= mixed >>> 16;
  return (mixed >>> 0) / 0xffff_ffff;
};

const sampleBaselineGrammarId = (
  seedOffset: number,
  salt: number,
  policy: JigsawSeamCutPolicy,
): JigsawBaselineGrammarId =>
  sampleJigsawBaselineGrammarForCutStyle(
    policy.cutStyle,
    policy.baselineGrammarIds,
    seededUnit(seedOffset, salt),
  );

const deriveRoleSeed = (seedOffset: number, salt: number) =>
  Math.imul((seedOffset ^ salt) >>> 0, 1_597_334_677) >>> 0;

export const deriveJigsawSeamProgram = (
  connectorGrammarId: JigsawEdgeProfileId,
  seedOffset: number,
  policy: JigsawSeamCutPolicy,
): JigsawSeamProgram => {
  const approachGrammarId = sampleBaselineGrammarId(seedOffset, 0xc201, policy);
  const departureGrammarId = sampleBaselineGrammarId(seedOffset, 0xc202, policy);

  return {
    approach: deriveJigsawBaselineProgram(
      approachGrammarId,
      deriveRoleSeed(seedOffset, 0xc211),
    ),
    connector: deriveJigsawConnectorProgram(connectorGrammarId, seedOffset),
    departure: deriveJigsawBaselineProgram(
      departureGrammarId,
      deriveRoleSeed(seedOffset, 0xc212),
    ),
  };
};
