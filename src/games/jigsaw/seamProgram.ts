import type { JigsawEdgeProfileId } from "../../catalog/types";
import {
  deriveJigsawBaselineProgram,
  jigsawBaselineGrammarIds,
  type JigsawBaselineGrammarId,
  type JigsawBaselineProgram,
} from "./baselineGrammar";
import {
  deriveJigsawConnectorProgram,
  type JigsawConnectorProgram,
} from "./connectorGrammar";

export type JigsawSeamProgram = {
  approach: JigsawBaselineProgram;
  connector: JigsawConnectorProgram;
  departure: JigsawBaselineProgram;
};

const seededUnit = (seedOffset: number, salt: number) => {
  const mixed = Math.imul((seedOffset ^ salt) >>> 0, 2_654_435_761) >>> 0;
  return mixed / 0xffff_ffff;
};

export const selectJigsawBaselineGrammar = (
  randomUnit: number,
): JigsawBaselineGrammarId => {
  const normalized = Math.min(1 - Number.EPSILON, Math.max(0, randomUnit));
  const index = Math.floor(normalized * jigsawBaselineGrammarIds.length);
  return jigsawBaselineGrammarIds[index];
};

const selectBaselineGrammarId = (
  seedOffset: number,
  salt: number,
): JigsawBaselineGrammarId =>
  selectJigsawBaselineGrammar(seededUnit(seedOffset, salt));

const deriveRoleSeed = (seedOffset: number, salt: number) =>
  Math.imul((seedOffset ^ salt) >>> 0, 1_597_334_677) >>> 0;

export const deriveJigsawSeamProgram = (
  connectorGrammarId: JigsawEdgeProfileId,
  seedOffset: number,
): JigsawSeamProgram => {
  const approachGrammarId = selectBaselineGrammarId(seedOffset, 0xc201);
  const departureGrammarId = selectBaselineGrammarId(seedOffset, 0xc202);

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
