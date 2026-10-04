import type { JigsawBaselineReversalCourseId } from "../../catalog/types";

export type JigsawBaselineReversalPoint = {
  x: number;
  y: number;
};

export const jigsawBaselineReversalCourseIds = [
  "same-side-hairpin",
  "opposed-hairpin",
  "counter-hook",
] as const satisfies readonly JigsawBaselineReversalCourseId[];

const epsilon = 1e-9;
const minimumBacktrack = 0.09;
const maximumBacktrack = 0.2;
const minimumNonAdjacentClearance = 0.025;
const minimumRunway = 0.12;
const maximumDepth = 0.62;

const point = (x: number, y: number): JigsawBaselineReversalPoint => ({ x, y });

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

const realizePoints = (
  courseId: JigsawBaselineReversalCourseId,
  seedOffset: number,
): JigsawBaselineReversalPoint[] => {
  const side = direction(seedOffset, 0xf101);
  const runwayStart = range(seedOffset, 0xf102, 0.13, 0.18);
  const entryX = range(seedOffset, 0xf103, 0.24, 0.3);
  const turnX = range(seedOffset, 0xf104, 0.64, 0.7);
  const backtrack = range(seedOffset, 0xf105, 0.105, 0.175);
  const returnX = turnX - backtrack;
  const resumeX = range(seedOffset, 0xf106, 0.74, 0.8);
  const runwayEnd = range(seedOffset, 0xf107, 0.84, 0.88);
  const entryDepth = range(seedOffset, 0xf108, 0.18, 0.26);
  const turnDepth = range(seedOffset, 0xf109, 0.46, 0.56);
  const returnDepth = range(seedOffset, 0xf10a, 0.24, 0.34);
  const resumeDepth = range(seedOffset, 0xf10b, 0.14, 0.21);

  switch (courseId) {
    case "same-side-hairpin":
      return [
        point(0, 0),
        point(runwayStart, 0),
        point(entryX, side * entryDepth),
        point(turnX, side * turnDepth),
        point(returnX, side * returnDepth * 0.42),
        point(resumeX, side * resumeDepth * 0.52),
        point(runwayEnd, 0),
        point(1, 0),
      ];
    case "opposed-hairpin":
      return [
        point(0, 0),
        point(runwayStart, 0),
        point(entryX, side * entryDepth),
        point(turnX, side * turnDepth),
        point(returnX, side * -returnDepth * 0.72),
        point(resumeX, side * -resumeDepth * 0.82),
        point(runwayEnd, 0),
        point(1, 0),
      ];
    case "counter-hook":
      return [
        point(0, 0),
        point(runwayStart, 0),
        point(entryX, side * entryDepth * 0.84),
        point(turnX, side * turnDepth),
        point(returnX, side * returnDepth * 0.62),
        point(resumeX, side * -resumeDepth * 0.54),
        point(runwayEnd, 0),
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

const sign = (value: number) => value > epsilon ? 1 : value < -epsilon ? -1 : 0;

const pointOnSegment = (
  candidate: JigsawBaselineReversalPoint,
  start: JigsawBaselineReversalPoint,
  end: JigsawBaselineReversalPoint,
) =>
  Math.abs(cross(start, end, candidate)) <= epsilon &&
  candidate.x >= Math.min(start.x, end.x) - epsilon &&
  candidate.x <= Math.max(start.x, end.x) + epsilon &&
  candidate.y >= Math.min(start.y, end.y) - epsilon &&
  candidate.y <= Math.max(start.y, end.y) + epsilon;

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

  if (sign(firstA) * sign(firstB) < 0 && sign(secondA) * sign(secondB) < 0) {
    return true;
  }

  return (
    pointOnSegment(secondStart, firstStart, firstEnd) ||
    pointOnSegment(secondEnd, firstStart, firstEnd) ||
    pointOnSegment(firstStart, secondStart, secondEnd) ||
    pointOnSegment(firstEnd, secondStart, secondEnd)
  );
};

const pointToSegmentDistance = (
  candidate: JigsawBaselineReversalPoint,
  start: JigsawBaselineReversalPoint,
  end: JigsawBaselineReversalPoint,
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= epsilon) {
    return Math.hypot(candidate.x - start.x, candidate.y - start.y);
  }

  const projection =
    ((candidate.x - start.x) * dx + (candidate.y - start.y) * dy) /
    lengthSquared;
  const t = Math.max(0, Math.min(1, projection));
  return Math.hypot(
    candidate.x - (start.x + dx * t),
    candidate.y - (start.y + dy * t),
  );
};

const segmentDistance = (
  firstStart: JigsawBaselineReversalPoint,
  firstEnd: JigsawBaselineReversalPoint,
  secondStart: JigsawBaselineReversalPoint,
  secondEnd: JigsawBaselineReversalPoint,
) => {
  if (segmentsIntersectOrTouch(firstStart, firstEnd, secondStart, secondEnd)) {
    return 0;
  }

  return Math.min(
    pointToSegmentDistance(firstStart, secondStart, secondEnd),
    pointToSegmentDistance(firstEnd, secondStart, secondEnd),
    pointToSegmentDistance(secondStart, firstStart, firstEnd),
    pointToSegmentDistance(secondEnd, firstStart, firstEnd),
  );
};

const validatePoints = (points: readonly JigsawBaselineReversalPoint[]) => {
  const first = points[0];
  const last = points.at(-1);
  const firstRunway = points[1];
  const lastRunway = points.at(-2);

  if (
    !first ||
    !last ||
    !firstRunway ||
    !lastRunway ||
    Math.abs(first.x) > epsilon ||
    Math.abs(first.y) > epsilon ||
    Math.abs(last.x - 1) > epsilon ||
    Math.abs(last.y) > epsilon
  ) return false;

  if (
    Math.abs(firstRunway.y) > epsilon ||
    firstRunway.x < minimumRunway - epsilon ||
    Math.abs(lastRunway.y) > epsilon ||
    1 - lastRunway.x < minimumRunway - epsilon
  ) return false;

  const directions: number[] = [];
  let backtrack = 0;

  for (let index = 0; index < points.length; index += 1) {
    const candidate = points[index]!;
    if (
      !Number.isFinite(candidate.x) ||
      !Number.isFinite(candidate.y) ||
      candidate.x < -epsilon ||
      candidate.x > 1 + epsilon ||
      Math.abs(candidate.y) > maximumDepth + epsilon
    ) return false;

    if (index < points.length - 1) {
      const delta = points[index + 1]!.x - candidate.x;
      const current = sign(delta);
      if (current !== 0 && directions.at(-1) !== current) directions.push(current);
      if (delta < -epsilon) backtrack += -delta;
    }
  }

  if (directions.join(",") !== "1,-1,1") return false;
  if (backtrack < minimumBacktrack - epsilon || backtrack > maximumBacktrack + epsilon) {
    return false;
  }

  let minimumClearance = Number.POSITIVE_INFINITY;
  for (let firstIndex = 0; firstIndex < points.length - 1; firstIndex += 1) {
    for (let secondIndex = firstIndex + 2; secondIndex < points.length - 1; secondIndex += 1) {
      const distance = segmentDistance(
        points[firstIndex]!,
        points[firstIndex + 1]!,
        points[secondIndex]!,
        points[secondIndex + 1]!,
      );
      if (distance <= epsilon) return false;
      minimumClearance = Math.min(minimumClearance, distance);
    }
  }

  return minimumClearance >= minimumNonAdjacentClearance - epsilon;
};

export const realizeJigsawBaselineReversalCourse = (
  courseId: JigsawBaselineReversalCourseId,
  seedOffset: number,
): JigsawBaselineReversalPoint[] => {
  const points = realizePoints(courseId, seedOffset);
  if (!validatePoints(points)) {
    throw new Error(`Unsafe Jigsaw baseline reversal course: ${courseId}.`);
  }
  return points;
};
