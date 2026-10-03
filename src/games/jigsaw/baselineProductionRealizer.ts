import type { JigsawBaselineProduction } from "./baselineProduction";
import {
  compileJigsawBaselineProduction,
  type JigsawBaselineInstruction,
} from "./baselineProductionCompiler";

export type JigsawBaselineCandidatePoint = {
  x: number;
  y: number;
};

export type JigsawBaselineCandidateRejectionReason =
  | "unclosable-deflection-balance"
  | "identity-off-baseline"
  | "course-on-baseline"
  | "cross-on-baseline"
  | "deflect-crosses-baseline"
  | "unclosed-production"
  | "degenerate-production";

export type JigsawBaselineCandidateResult =
  | {
      accepted: true;
      points: readonly JigsawBaselineCandidatePoint[];
    }
  | {
      accepted: false;
      reason: JigsawBaselineCandidateRejectionReason;
    };

const epsilon = 1e-9;

const primitiveSalt = {
  identity: 0x11a1,
  deflect: 0x22b2,
  cross: 0x33c3,
  course: 0x44d4,
} as const;

const seededUnit = (seedOffset: number, salt: number) => {
  let mixed = (seedOffset ^ salt) >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d) >>> 0;
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b) >>> 0;
  mixed ^= mixed >>> 16;
  return (mixed >>> 0) / 0xffff_ffff;
};

const getSymmetricInstructionWeight = (
  instruction: JigsawBaselineInstruction,
  index: number,
  instructionCount: number,
  seedOffset: number,
) => {
  const symmetricIndex = Math.min(index, instructionCount - 1 - index);
  const positionSalt = Math.imul(symmetricIndex + 1, 0x9e3779b1) >>> 0;
  return 0.75 + seededUnit(
    seedOffset,
    primitiveSalt[instruction.primitive] ^ positionSalt,
  ) * 0.5;
};

const getDeflectFinalCoefficients = (
  instructions: readonly JigsawBaselineInstruction[],
) => {
  const coefficients = new Map<number, -1 | 1>();
  let crossParity: -1 | 1 = 1;

  for (let index = instructions.length - 1; index >= 0; index -= 1) {
    const instruction = instructions[index]!;
    if (instruction.primitive === "deflect") {
      coefficients.set(
        index,
        (instruction.normalDirection *
          instruction.traversalDirection *
          crossParity) as -1 | 1,
      );
    } else if (instruction.primitive === "cross") {
      crossParity = crossParity === 1 ? -1 : 1;
    }
  }

  return coefficients;
};

const deriveDeflectAmplitudes = (
  instructions: readonly JigsawBaselineInstruction[],
  seedOffset: number,
): Map<number, number> | null => {
  const coefficients = getDeflectFinalCoefficients(instructions);
  if (coefficients.size === 0) return new Map();

  const positive: number[] = [];
  const negative: number[] = [];
  for (const [index, coefficient] of coefficients) {
    (coefficient === 1 ? positive : negative).push(index);
  }
  if (positive.length === 0 || negative.length === 0) return null;

  const rawWeights = new Map<number, number>();
  for (const index of coefficients.keys()) {
    rawWeights.set(
      index,
      getSymmetricInstructionWeight(
        instructions[index]!,
        index,
        instructions.length,
        seedOffset,
      ),
    );
  }

  const normalizeGroup = (indices: readonly number[]) => {
    const total = indices.reduce(
      (sum, index) => sum + rawWeights.get(index)!,
      0,
    );
    return indices.map((index) => [index, rawWeights.get(index)! / total] as const);
  };

  return new Map([
    ...normalizeGroup(positive),
    ...normalizeGroup(negative),
  ]);
};

const reject = (
  reason: JigsawBaselineCandidateRejectionReason,
): JigsawBaselineCandidateResult => ({
  accepted: false,
  reason,
});

export const realizeJigsawBaselineInstructionTrace = (
  instructions: readonly JigsawBaselineInstruction[],
  seedOffset: number,
): JigsawBaselineCandidateResult => {
  if (instructions.length === 0) return reject("degenerate-production");

  if (
    instructions.length === 1 &&
    instructions[0]!.primitive === "identity"
  ) {
    return {
      accepted: true,
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
    };
  }

  const amplitudes = deriveDeflectAmplitudes(instructions, seedOffset);
  if (!amplitudes) return reject("unclosable-deflection-balance");

  const points: JigsawBaselineCandidatePoint[] = [{ x: 0, y: 0 }];
  let y = 0;

  for (let index = 0; index < instructions.length; index += 1) {
    const instruction = instructions[index]!;
    let nextY = y;

    switch (instruction.primitive) {
      case "identity":
        if (Math.abs(y) > epsilon) return reject("identity-off-baseline");
        break;
      case "course":
        if (Math.abs(y) <= epsilon) return reject("course-on-baseline");
        break;
      case "cross":
        if (Math.abs(y) <= epsilon) return reject("cross-on-baseline");
        nextY = -y;
        break;
      case "deflect": {
        const amplitude = amplitudes.get(index);
        if (amplitude === undefined) {
          return reject("unclosable-deflection-balance");
        }
        nextY =
          y +
          instruction.normalDirection *
            instruction.traversalDirection *
            amplitude;

        if (
          Math.abs(y) > epsilon &&
          Math.abs(nextY) > epsilon &&
          Math.sign(y) !== Math.sign(nextY)
        ) {
          return reject("deflect-crosses-baseline");
        }
        break;
      }
    }

    y = Math.abs(nextY) <= epsilon ? 0 : nextY;
    points.push({
      x: (index + 1) / instructions.length,
      y,
    });
  }

  if (Math.abs(y) > epsilon) return reject("unclosed-production");

  const maximumDepth = Math.max(...points.map((point) => Math.abs(point.y)));
  if (maximumDepth <= epsilon) return reject("degenerate-production");

  return {
    accepted: true,
    points: points.map((point, index) => ({
      x: index === points.length - 1 ? 1 : point.x,
      y: index === points.length - 1 ? 0 : point.y / maximumDepth,
    })),
  };
};

export const realizeJigsawBaselineProductionCandidate = (
  production: JigsawBaselineProduction,
  seedOffset: number,
): JigsawBaselineCandidateResult =>
  realizeJigsawBaselineInstructionTrace(
    compileJigsawBaselineProduction(production),
    seedOffset,
  );
