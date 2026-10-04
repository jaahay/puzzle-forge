import { jigsawBaselineGrammarIds } from "./baselineGrammar";

export type JigsawBaselineReversalPoint = {
  x: number;
  y: number;
};

export const jigsawBaselineReversalCandidateIds = [
  "same-side-hairpin",
  "opposed-hairpin",
  "counter-hook",
] as const;

export type JigsawBaselineReversalCandidateId =
  (typeof jigsawBaselineReversalCandidateIds)[number];

export type JigsawBaselineReversalCandidate = {
  id: JigsawBaselineReversalCandidateId;
  label: string;
  description: string;
};

export const jigsawBaselineReversalCandidates = [
  {
    id: "same-side-hairpin",
    label: "Same-side hairpin",
    description:
      "Advance on one side, make one bounded longitudinal backtrack, then resume forward without crossing the nominal baseline.",
  },
  {
    id: "opposed-hairpin",
    label: "Opposed hairpin",
    description:
      "Advance on one side, backtrack across the nominal baseline, then resume forward on the opposite side before closing.",
  },
  {
    id: "counter-hook",
    label: "Counter hook",
    description:
      "Advance into a deeper shoulder, backtrack on the same side, then resolve through a shallow opposite-side counter-sweep.",
  },
] as const satisfies readonly JigsawBaselineReversalCandidate[];

export type JigsawBaselineReversalValidationReason =
  | "anchor-mismatch"
  | "non-finite-coordinate"
  | "bounds"
  | "corner-envelope"
  | "reversal-pattern"
  | "backtrack-out-of-bounds"
  | "self-contact"
  | "insufficient-clearance";

export type JigsawBaselineReversalValidation =
  | {
      valid: true;
      backtrack: number;
      minimumClearance: number;
    }
  | {
      valid: false;
      reason: JigsawBaselineReversalValidationReason;
    };

export type JigsawBaselineReversalRealization = {
  candidateId: JigsawBaselineReversalCandidateId;
  seedOffset: number;
  points: readonly JigsawBaselineReversalPoint[];
  validation: JigsawBaselineReversalValidation;
};

const epsilon = 1e-9;
const minimumBacktrack = 0.1;
const maximumBacktrack = 0.26;
const minimumNonAdjacentClearance = 0.025;
const cornerDepthSlope = 2.4;
const maximumDepth = 0.68;

const point = (x: number, y: number): JigsawBaselineReversalPoint => ({
  x,
  y,
});

const seededUnit = (seedOffset: number, salt: number) => {
  let mixed = (seedOffset ^ salt) >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d) >>> 0;
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b) >>> 0;
  mixed ^= mixed >>> 16;
  return (mixed >>> 0) / 0xffff_ffff;
};

const range = (
  seedOffset: number,
  salt: number,
  minimum: number,
  maximum: number,
) => minimum + seededUnit(seedOffset, salt) * (maximum - minimum);

const direction = (seedOffset: number, salt: number): -1 | 1 =>
  seededUnit(seedOffset, salt) < 0.5 ? -1 : 1;

const deriveSharedGeometry = (seedOffset: number) => {
  const signedDirection = direction(seedOffset, 0xf101);
  const shoulderX = range(seedOffset, 0xf102, 0.1, 0.14);
  const entryX = range(seedOffset, 0xf103, 0.22, 0.28);
  const turnX = range(seedOffset, 0xf104, 0.66, 0.73);
  const backtrack = range(
    seedOffset,
    0xf105,
    minimumBacktrack + 0.025,
    maximumBacktrack - 0.025,
  );
  const backtrackX = turnX - backtrack;
  const resumeX = range(seedOffset, 0xf106, 0.79, 0.84);
  const exitX = range(seedOffset, 0xf107, 0.88, 0.92);
  const entryDepth = range(seedOffset, 0xf108, 0.18, 0.27);
  const turnDepth = range(seedOffset, 0xf109, 0.46, 0.58);
  const returnDepth = range(seedOffset, 0xf10a, 0.27, 0.37);
  const resumeDepth = range(seedOffset, 0xf10b, 0.16, 0.24);

  return {
    signedDirection,
    shoulderX,
    entryX,
    turnX,
    backtrackX,
    resumeX,
    exitX,
    entryDepth,
    turnDepth,
    returnDepth,
    resumeDepth,
  };
};

const realizeCandidatePoints = (
  candidateId: JigsawBaselineReversalCandidateId,
  seedOffset: number,
): JigsawBaselineReversalPoint[] => {
  const geometry = deriveSharedGeometry(seedOffset);
  const side = geometry.signedDirection;

  switch (candidateId) {
    case "same-side-hairpin":
      return [
        point(0, 0),
        point(geometry.shoulderX, 0),
        point(geometry.entryX, side * geometry.entryDepth),
        point(geometry.turnX, side * geometry.turnDepth),
        point(geometry.backtrackX, side * geometry.returnDepth),
        point(geometry.resumeX, side * geometry.resumeDepth),
        point(geometry.exitX, 0),
        point(1, 0),
      ];
    case "opposed-hairpin":
      return [
        point(0, 0),
        point(geometry.shoulderX, 0),
        point(geometry.entryX, side * geometry.entryDepth),
        point(geometry.turnX, side * geometry.turnDepth),
        point(
          geometry.backtrackX,
          side * -geometry.returnDepth * 0.82,
        ),
        point(
          geometry.resumeX,
          side * -geometry.resumeDepth * 0.9,
        ),
        point(geometry.exitX, 0),
        point(1, 0),
      ];
    case "counter-hook":
      return [
        point(0, 0),
        point(geometry.shoulderX, 0),
        point(geometry.entryX, side * geometry.entryDepth * 0.82),
        point(geometry.turnX, side * geometry.turnDepth),
        point(
          geometry.backtrackX,
          side * geometry.returnDepth * 0.72,
        ),
        point(
          geometry.resumeX,
          side * -geometry.resumeDepth * 0.62,
        ),
        point(geometry.exitX, 0),
        point(1, 0),
      ];
  }
};

const cross = (
  start: JigsawBaselineReversalPoint,
  end: JigsawBaselineReversalPoint,
  candidate: JigsawBaselineReversalPoint,
) =>
  (end.x - start.x) * (candidate.y - start.y) -
  (end.y - start.y) * (candidate.x - start.x);

const approximatelyZero = (value: number) => Math.abs(value) <= epsilon;

const pointOnSegment = (
  candidate: JigsawBaselineReversalPoint,
  start: JigsawBaselineReversalPoint,
  end: JigsawBaselineReversalPoint,
) => {
  if (!approximatelyZero(cross(start, end, candidate))) return false;

  return (
    candidate.x >= Math.min(start.x, end.x) - epsilon &&
    candidate.x <= Math.max(start.x, end.x) + epsilon &&
    candidate.y >= Math.min(start.y, end.y) - epsilon &&
    candidate.y <= Math.max(start.y, end.y) + epsilon
  );
};

const sign = (value: number) =>
  value > epsilon ? 1 : value < -epsilon ? -1 : 0;

const segmentsIntersectOrTouch = (
  firstStart: JigsawBaselineReversalPoint,
  firstEnd: JigsawBaselineReversalPoint,
  secondStart: JigsawBaselineReversalPoint,
  secondEnd: JigsawBaselineReversalPoint,
) => {
  const firstA = cross(firstStart, firstEnd, secondStart);
  const firstB = cross(firstStart, firstEnd, secondEnd);
  const secondA = cross(secondStart, secondEnd, firstStart);
  const secondB = cross(secondStart, secondEnd, firstEnd);

  if (
    sign(firstA) * sign(firstB) < 0 &&
    sign(secondA) * sign(secondB) < 0
  ) {
    return true;
  }

  return (
    pointOnSegment(secondStart, firstStart, firstEnd) ||
    pointOnSegment(secondEnd, firstStart, firstEnd) ||
    pointOnSegment(firstStart, secondStart, secondEnd) ||
    pointOnSegment(firstEnd, secondStart, secondEnd)
  );
};

const squaredDistance = (
  left: JigsawBaselineReversalPoint,
  right: JigsawBaselineReversalPoint,
) => {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
};

const pointToSegmentDistance = (
  candidate: JigsawBaselineReversalPoint,
  start: JigsawBaselineReversalPoint,
  end: JigsawBaselineReversalPoint,
) => {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (lengthSquared <= epsilon) {
    return Math.sqrt(squaredDistance(candidate, start));
  }

  const projection =
    ((candidate.x - start.x) * segmentX +
      (candidate.y - start.y) * segmentY) /
    lengthSquared;
  const clamped = Math.max(0, Math.min(1, projection));
  const closest = point(
    start.x + segmentX * clamped,
    start.y + segmentY * clamped,
  );

  return Math.sqrt(squaredDistance(candidate, closest));
};

const segmentDistance = (
  firstStart: JigsawBaselineReversalPoint,
  firstEnd: JigsawBaselineReversalPoint,
  secondStart: JigsawBaselineReversalPoint,
  secondEnd: JigsawBaselineReversalPoint,
) => {
  if (
    segmentsIntersectOrTouch(
      firstStart,
      firstEnd,
      secondStart,
      secondEnd,
    )
  ) {
    return 0;
  }

  return Math.min(
    pointToSegmentDistance(firstStart, secondStart, secondEnd),
    pointToSegmentDistance(firstEnd, secondStart, secondEnd),
    pointToSegmentDistance(secondStart, firstStart, firstEnd),
    pointToSegmentDistance(secondEnd, firstStart, firstEnd),
  );
};

const compressDirections = (
  points: readonly JigsawBaselineReversalPoint[],
) => {
  const directions: Array<-1 | 1> = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const delta = points[index + 1]!.x - points[index]!.x;
    const current = sign(delta);
    if (current === 0) continue;

    if (directions.at(-1) !== current) {
      directions.push(current);
    }
  }

  return directions;
};

const getBacktrack = (
  points: readonly JigsawBaselineReversalPoint[],
) => {
  let backtrack = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const delta = points[index + 1]!.x - points[index]!.x;
    if (delta < -epsilon) backtrack += -delta;
  }

  return backtrack;
};

export const validateJigsawBaselineReversalPoints = (
  points: readonly JigsawBaselineReversalPoint[],
): JigsawBaselineReversalValidation => {
  const first = points[0];
  const last = points.at(-1);

  if (
    !first ||
    !last ||
    Math.abs(first.x) > epsilon ||
    Math.abs(first.y) > epsilon ||
    Math.abs(last.x - 1) > epsilon ||
    Math.abs(last.y) > epsilon
  ) {
    return { valid: false, reason: "anchor-mismatch" };
  }

  for (const candidate of points) {
    if (
      !Number.isFinite(candidate.x) ||
      !Number.isFinite(candidate.y)
    ) {
      return { valid: false, reason: "non-finite-coordinate" };
    }

    if (
      candidate.x < -epsilon ||
      candidate.x > 1 + epsilon ||
      Math.abs(candidate.y) > maximumDepth + epsilon
    ) {
      return { valid: false, reason: "bounds" };
    }

    const cornerDistance = Math.min(candidate.x, 1 - candidate.x);
    if (
      Math.abs(candidate.y) >
      cornerDistance * cornerDepthSlope + epsilon
    ) {
      return { valid: false, reason: "corner-envelope" };
    }
  }

  const directions = compressDirections(points);
  if (
    directions.length !== 3 ||
    directions[0] !== 1 ||
    directions[1] !== -1 ||
    directions[2] !== 1
  ) {
    return { valid: false, reason: "reversal-pattern" };
  }

  const backtrack = getBacktrack(points);
  if (
    backtrack < minimumBacktrack - epsilon ||
    backtrack > maximumBacktrack + epsilon
  ) {
    return { valid: false, reason: "backtrack-out-of-bounds" };
  }

  let observedMinimumClearance = Number.POSITIVE_INFINITY;
  const segmentCount = points.length - 1;

  for (let firstIndex = 0; firstIndex < segmentCount; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 2;
      secondIndex < segmentCount;
      secondIndex += 1
    ) {
      const firstStart = points[firstIndex]!;
      const firstEnd = points[firstIndex + 1]!;
      const secondStart = points[secondIndex]!;
      const secondEnd = points[secondIndex + 1]!;

      if (
        segmentsIntersectOrTouch(
          firstStart,
          firstEnd,
          secondStart,
          secondEnd,
        )
      ) {
        return { valid: false, reason: "self-contact" };
      }

      observedMinimumClearance = Math.min(
        observedMinimumClearance,
        segmentDistance(
          firstStart,
          firstEnd,
          secondStart,
          secondEnd,
        ),
      );
    }
  }

  if (
    observedMinimumClearance <
    minimumNonAdjacentClearance - epsilon
  ) {
    return { valid: false, reason: "insufficient-clearance" };
  }

  return {
    valid: true,
    backtrack,
    minimumClearance: observedMinimumClearance,
  };
};

export const realizeJigsawBaselineReversalCandidate = (
  candidateId: JigsawBaselineReversalCandidateId,
  seedOffset: number,
): JigsawBaselineReversalRealization => {
  const points = realizeCandidatePoints(candidateId, seedOffset);

  return {
    candidateId,
    seedOffset,
    points,
    validation: validateJigsawBaselineReversalPoints(points),
  };
};

export const getJigsawBaselineReversalReciprocalPoints = (
  points: readonly JigsawBaselineReversalPoint[],
): JigsawBaselineReversalPoint[] =>
  [...points]
    .reverse()
    .map((candidate) =>
      point(1 - candidate.x, -candidate.y),
    );

const validateClosedOutline = (
  points: readonly JigsawBaselineReversalPoint[],
) => {
  const segmentCount = points.length - 1;

  for (let firstIndex = 0; firstIndex < segmentCount; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < segmentCount;
      secondIndex += 1
    ) {
      const adjacent =
        secondIndex === firstIndex + 1 ||
        (firstIndex === 0 && secondIndex === segmentCount - 1);
      if (adjacent) continue;

      if (
        segmentsIntersectOrTouch(
          points[firstIndex]!,
          points[firstIndex + 1]!,
          points[secondIndex]!,
          points[secondIndex + 1]!,
        )
      ) {
        return false;
      }
    }
  }

  return true;
};

export const validateJigsawBaselineReversalPieceOutline = (
  seam: readonly JigsawBaselineReversalPoint[],
) => {
  const outline = [
    ...seam.map((candidate) =>
      point(candidate.x, -candidate.y),
    ),
    point(1, 1),
    point(0, 1),
    point(0, 0),
  ];

  return validateClosedOutline(outline);
};

export const baselineReversalExperimentLeavesProductionCatalogUntouched =
  () =>
    jigsawBaselineReversalCandidateIds.every(
      (candidateId) =>
        !jigsawBaselineGrammarIds.includes(
          candidateId as (typeof jigsawBaselineGrammarIds)[number],
        ),
    );
