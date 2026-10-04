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
const minimumBacktrack = 0.1;
const maximumBacktrack = 0.26;
const minimumNonAdjacentClearance = 0.025;
const cornerDepthSlope = 2.4;
const maximumDepth = 0.68;

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

const range = (seedOffset: number, salt: number, minimum: number, maximum: number) =>
  minimum + seededUnit(seedOffset, salt) * (maximum - minimum);

const direction = (seedOffset: number, salt: number): -1 | 1 =>
  seededUnit(seedOffset, salt) < 0.5 ? -1 : 1;

const deriveSharedGeometry = (seedOffset: number) => {
  const signedDirection = direction(seedOffset, 0xf101);
  const shoulderX = range(seedOffset, 0xf102, 0.1, 0.14);
  const entryX = range(seedOffset, 0xf103, 0.22, 0.28);
  const turnX = range(seedOffset, 0xf104, 0.66, 0.73);
  const backtrack = range(seedOffset, 0xf105, 0.125, 0.235);
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

const realizePoints = (
  courseId: JigsawBaselineReversalCourseId,
  seedOffset: number,
): JigsawBaselineReversalPoint[] => {
  const geometry = deriveSharedGeometry(seedOffset);
  const side = geometry.signedDirection;

  switch (courseId) {
    case "same-side-hairpin":
      return [
        point(0, 0),
        point(geometry.shoulderX, 0),
        point(geometry.entryX, side * geometry.entryDepth),
        point(geometry.turnX, side * geometry.turnDepth),
        point(geometry.backtrackX, side * geometry.returnDepth * 0.45),
        point(geometry.resumeX, side * geometry.resumeDepth * 0.55),
        point(geometry.exitX, 0),
        point(1, 0),
      ];
    case "opposed-hairpin":
      return [
        point(0, 0),
        point(geometry.shoulderX, 0),
        point(geometry.entryX, side * geometry.entryDepth),
        point(geometry.turnX, side * geometry.turnDepth),
        point(geometry.backtrackX, side * -geometry.returnDepth * 0.82),
        point(geometry.resumeX, side * -geometry.resumeDepth * 0.9),
        point(geometry.exitX, 0),
        point(1, 0),
      ];
    case "counter-hook":
      return [
        point(0, 0),
        point(geometry.shoulderX, 0),
        point(geometry.entryX, side * geometry.entryDepth * 0.82),
        point(geometry.turnX, side * geometry.turnDepth),
        point(geometry.backtrackX, side * geometry.returnDepth * 0.72),
        point(geometry.resumeX, side * -geometry.resumeDepth * 0.62),
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
  if (lengthSquared <= epsilon) return Math.hypot(candidate.x - start.x, candidate.y - start.y);
  const projection = ((candidate.x - start.x) * dx + (candidate.y - start.y) * dy) / lengthSquared;
  const t = Math.max(0, Math.min(1, projection));
  return Math.hypot(candidate.x - (start.x + dx * t), candidate.y - (start.y + dy * t));
};

const segmentDistance = (
  firstStart: JigsawBaselineReversalPoint,
  firstEnd: JigsawBaselineReversalPoint,
  secondStart: JigsawBaselineReversalPoint,
  secondEnd: JigsawBaselineReversalPoint,
) => {
  if (segmentsIntersectOrTouch(firstStart, firstEnd, secondStart, secondEnd)) return 0;
  return Math.min(
    pointToSegmentDistance(firstStart, secondStart, secondEnd),
    pointToSegmentDistance(firstEnd, secondStart, secondEnd),
    pointToSegmentDistance(secondStart, firstStart, firstEnd),
    pointToSegmentDistance(secondEnd, firstStart, firstEnd),
  );
};

const validatePoints = (points: readonly JigsawBaselineReversalPoint[]) => {
  if (
    points[0]?.x !== 0 ||
    points[0]?.y !== 0 ||
    points.at(-1)?.x !== 1 ||
    points.at(-1)?.y !== 0
  ) return false;

  let backtrack = 0;
  const directions: number[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const candidate = points[index]!;
    if (!Number.isFinite(candidate.x) || !Number.isFinite(candidate.y)) return false;
    if (candidate.x < 0 || candidate.x > 1 || Math.abs(candidate.y) > maximumDepth) return false;
    const cornerDistance = Math.min(candidate.x, 1 - candidate.x);
    if (Math.abs(candidate.y) > cornerDistance * cornerDepthSlope + epsilon) return false;

    if (index < points.length - 1) {
      const delta = points[index + 1]!.x - candidate.x;
      const current = sign(delta);
      if (current !== 0 && directions.at(-1) !== current) directions.push(current);
      if (delta < -epsilon) backtrack += -delta;
    }
  }
  if (directions.join(",") !== "1,-1,1") return false;
  if (backtrack < minimumBacktrack || backtrack > maximumBacktrack) return false;

  let minimumClearance = Number.POSITIVE_INFINITY;
  for (let first = 0; first < points.length - 1; first += 1) {
    for (let second = first + 2; second < points.length - 1; second += 1) {
      const distance = segmentDistance(
        points[first]!,
        points[first + 1]!,
        points[second]!,
        points[second + 1]!,
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
