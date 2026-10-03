import type { JigsawBaselineInstruction } from "./baselineProductionCompiler";

export type JigsawBaselineCandidateValidationPoint = {
  x: number;
  y: number;
};

export type JigsawBaselineCandidateValidationReason =
  | "point-count-mismatch"
  | "non-finite-coordinate"
  | "start-anchor-mismatch"
  | "end-anchor-mismatch"
  | "longitudinal-out-of-bounds"
  | "non-monotonic-traversal"
  | "depth-out-of-bounds"
  | "identity-deforms-baseline"
  | "course-on-baseline"
  | "course-changes-offset"
  | "cross-misses-baseline"
  | "deflect-does-not-deflect"
  | "deflect-crosses-baseline";

export type JigsawBaselineCandidateValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason: JigsawBaselineCandidateValidationReason;
      instructionIndex?: number;
    };

const epsilon = 1e-9;

const approximatelyEqual = (left: number, right: number) =>
  Math.abs(left - right) <= epsilon;

const invalid = (
  reason: JigsawBaselineCandidateValidationReason,
  instructionIndex?: number,
): JigsawBaselineCandidateValidationResult => ({
  valid: false,
  reason,
  ...(instructionIndex === undefined ? {} : { instructionIndex }),
});

export const validateJigsawBaselineCandidate = (
  instructions: readonly JigsawBaselineInstruction[],
  points: readonly JigsawBaselineCandidateValidationPoint[],
): JigsawBaselineCandidateValidationResult => {
  if (points.length !== instructions.length + 1) {
    return invalid("point-count-mismatch");
  }

  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return invalid("non-finite-coordinate");
    }
    if (point.x < -epsilon || point.x > 1 + epsilon) {
      return invalid("longitudinal-out-of-bounds");
    }
    if (Math.abs(point.y) > 1 + epsilon) {
      return invalid("depth-out-of-bounds");
    }
  }

  const first = points[0]!;
  if (!approximatelyEqual(first.x, 0) || !approximatelyEqual(first.y, 0)) {
    return invalid("start-anchor-mismatch");
  }

  const last = points.at(-1)!;
  if (!approximatelyEqual(last.x, 1) || !approximatelyEqual(last.y, 0)) {
    return invalid("end-anchor-mismatch");
  }

  for (let index = 0; index < instructions.length; index += 1) {
    const instruction = instructions[index]!;
    const start = points[index]!;
    const end = points[index + 1]!;

    if (end.x <= start.x + epsilon) {
      return invalid("non-monotonic-traversal", index);
    }

    switch (instruction.primitive) {
      case "identity":
        if (
          Math.abs(start.y) > epsilon ||
          Math.abs(end.y) > epsilon
        ) {
          return invalid("identity-deforms-baseline", index);
        }
        break;
      case "course":
        if (Math.abs(start.y) <= epsilon) {
          return invalid("course-on-baseline", index);
        }
        if (!approximatelyEqual(start.y, end.y)) {
          return invalid("course-changes-offset", index);
        }
        break;
      case "cross":
        if (start.y * end.y >= -epsilon) {
          return invalid("cross-misses-baseline", index);
        }
        break;
      case "deflect":
        if (approximatelyEqual(start.y, end.y)) {
          return invalid("deflect-does-not-deflect", index);
        }
        if (
          Math.abs(start.y) > epsilon &&
          Math.abs(end.y) > epsilon &&
          Math.sign(start.y) !== Math.sign(end.y)
        ) {
          return invalid("deflect-crosses-baseline", index);
        }
        break;
    }
  }

  return { valid: true };
};
