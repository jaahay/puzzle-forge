import type { JigsawBaselineGrammarId } from "../../catalog/types";
import { createRandom, normalizeSeed } from "../shared";
import {
  jigsawBaselineCanonicalProductions,
  jigsawBaselineGrammarIds,
} from "./baselineGrammar";
import {
  baselineMirror,
  baselineOppose,
  baselinePrimitive,
  baselineRepeat,
  baselineSequence,
  getJigsawBaselineProductionStructure,
  type JigsawBaselinePrimitive,
  type JigsawBaselineProduction,
} from "./baselineProduction";
import {
  compileJigsawBaselineProduction,
  type JigsawBaselineInstruction,
} from "./baselineProductionCompiler";
import {
  realizeJigsawBaselineProductionCandidate,
  type JigsawBaselineCandidateResult,
} from "./baselineProductionRealizer";

const explorerPrimitives = [
  "identity",
  "deflect",
  "cross",
  "course",
] as const satisfies readonly JigsawBaselinePrimitive[];

const defaultSampleCount = 32;
const defaultMaximumDepth = 3;
const defaultMaximumInstructions = 16;
const maximumSampleCount = 128;
const maximumExplorerDepth = 4;
const maximumExplorerInstructions = 32;

export type JigsawBaselineExplorerOptions = {
  seed: string;
  sampleCount?: number;
  maximumDepth?: number;
  maximumInstructions?: number;
};

export type JigsawBaselineExplorerRejectionReason =
  | "instruction-limit"
  | Extract<JigsawBaselineCandidateResult, { accepted: false }>["reason"];

export type JigsawBaselineExplorerRealization =
  | Extract<JigsawBaselineCandidateResult, { accepted: true }>
  | {
      accepted: false;
      reason: JigsawBaselineExplorerRejectionReason;
    };

export type JigsawBaselineExplorerCandidate = {
  index: number;
  production: JigsawBaselineProduction;
  structureSignature: string;
  semanticSignature: string;
  instructionCount: number;
  seedOffset: number;
  canonicalGrammarId: JigsawBaselineGrammarId | null;
  realization: JigsawBaselineExplorerRealization;
};

export type JigsawBaselineExplorerResult = {
  seed: string;
  sampleCount: number;
  maximumDepth: number;
  maximumInstructions: number;
  candidates: readonly JigsawBaselineExplorerCandidate[];
};

const requireBoundedInteger = (
  label: string,
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  const resolved = value ?? fallback;
  if (
    !Number.isInteger(resolved) ||
    resolved < minimum ||
    resolved > maximum
  ) {
    throw new Error(
      `${label} must be an integer from ${minimum} through ${maximum}.`,
    );
  }
  return resolved;
};

const pick = <T>(items: readonly T[], randomUnit: number): T =>
  items[
    Math.min(
      Math.floor(randomUnit * items.length),
      items.length - 1,
    )
  ]!;

const deriveProduction = (
  random: () => number,
  depth: number,
  maximumDepth: number,
): JigsawBaselineProduction => {
  const primitive = () =>
    baselinePrimitive(pick(explorerPrimitives, random()));

  if (depth >= maximumDepth) return primitive();

  const kind = random();
  if (kind < 0.28) return primitive();

  if (kind < 0.58) {
    const termCount = random() < 0.68 ? 2 : 3;
    return baselineSequence(
      ...Array.from({ length: termCount }, () =>
        deriveProduction(random, depth + 1, maximumDepth)),
    );
  }

  if (kind < 0.72) {
    return baselineRepeat(
      deriveProduction(random, depth + 1, maximumDepth),
      random() < 0.72 ? 2 : 3,
    );
  }

  if (kind < 0.86) {
    return baselineOppose(
      deriveProduction(random, depth + 1, maximumDepth),
    );
  }

  return baselineMirror(
    deriveProduction(random, depth + 1, maximumDepth),
  );
};

export const getJigsawBaselineInstructionSignature = (
  instructions: readonly JigsawBaselineInstruction[],
) =>
  instructions
    .map(
      (instruction) =>
        `${instruction.primitive}:${instruction.normalDirection}:${instruction.traversalDirection}`,
    )
    .join("|");

const canonicalGrammarBySemanticSignature = new Map(
  jigsawBaselineGrammarIds.map((grammarId) => [
    getJigsawBaselineInstructionSignature(
      compileJigsawBaselineProduction(
        jigsawBaselineCanonicalProductions[grammarId],
      ),
    ),
    grammarId,
  ]),
);

export const exploreJigsawBaselineProductions = ({
  seed,
  sampleCount: requestedSampleCount,
  maximumDepth: requestedMaximumDepth,
  maximumInstructions: requestedMaximumInstructions,
}: JigsawBaselineExplorerOptions): JigsawBaselineExplorerResult => {
  const normalizedSeed = normalizeSeed(seed);
  const sampleCount = requireBoundedInteger(
    "Baseline explorer sample count",
    requestedSampleCount,
    defaultSampleCount,
    1,
    maximumSampleCount,
  );
  const maximumDepth = requireBoundedInteger(
    "Baseline explorer maximum depth",
    requestedMaximumDepth,
    defaultMaximumDepth,
    0,
    maximumExplorerDepth,
  );
  const maximumInstructions = requireBoundedInteger(
    "Baseline explorer maximum instructions",
    requestedMaximumInstructions,
    defaultMaximumInstructions,
    1,
    maximumExplorerInstructions,
  );
  const random = createRandom(`jigsaw-baseline-explorer:${normalizedSeed}`);

  const candidates = Array.from({ length: sampleCount }, (_, index) => {
    const production = deriveProduction(random, 0, maximumDepth);
    const instructions = compileJigsawBaselineProduction(production);
    const semanticSignature =
      getJigsawBaselineInstructionSignature(instructions);
    const seedOffset = Math.floor(random() * 0xffff_ffff);
    const realization: JigsawBaselineExplorerRealization =
      instructions.length > maximumInstructions
        ? {
            accepted: false,
            reason: "instruction-limit",
          }
        : realizeJigsawBaselineProductionCandidate(
            production,
            seedOffset,
          );

    return {
      index,
      production,
      structureSignature:
        getJigsawBaselineProductionStructure(production),
      semanticSignature,
      instructionCount: instructions.length,
      seedOffset,
      canonicalGrammarId:
        canonicalGrammarBySemanticSignature.get(semanticSignature) ?? null,
      realization,
    };
  });

  return {
    seed: normalizedSeed,
    sampleCount,
    maximumDepth,
    maximumInstructions,
    candidates,
  };
};
