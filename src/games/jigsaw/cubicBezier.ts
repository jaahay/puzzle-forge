export type JigsawCurvePoint = {
  x: number;
  y: number;
};

export type JigsawCubicBezier = {
  start: JigsawCurvePoint;
  control1: JigsawCurvePoint;
  control2: JigsawCurvePoint;
  end: JigsawCurvePoint;
};

/**
 * Jigsaw piece coordinates use a 100-unit edge. A 0.05-unit tolerance therefore
 * bounds flattening error to 0.05% of one piece edge while remaining materially
 * finer than any player-visible connector feature.
 */
export const jigsawCurveFlatteningTolerance = 0.05;

const maximumSubdivisionDepth = 12;

const midpoint = (
  first: JigsawCurvePoint,
  second: JigsawCurvePoint,
): JigsawCurvePoint => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

const pointToSegmentDistance = (
  candidate: JigsawCurvePoint,
  start: JigsawCurvePoint,
  end: JigsawCurvePoint,
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
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

const isFlatEnough = (
  curve: JigsawCubicBezier,
  tolerance: number,
) =>
  Math.max(
    pointToSegmentDistance(curve.control1, curve.start, curve.end),
    pointToSegmentDistance(curve.control2, curve.start, curve.end),
  ) <= tolerance;

const splitCubicBezier = (
  curve: JigsawCubicBezier,
): readonly [JigsawCubicBezier, JigsawCubicBezier] => {
  const startToControl1 = midpoint(curve.start, curve.control1);
  const control1ToControl2 = midpoint(curve.control1, curve.control2);
  const control2ToEnd = midpoint(curve.control2, curve.end);
  const leftControl2 = midpoint(startToControl1, control1ToControl2);
  const rightControl1 = midpoint(control1ToControl2, control2ToEnd);
  const split = midpoint(leftControl2, rightControl1);

  return [
    {
      start: curve.start,
      control1: startToControl1,
      control2: leftControl2,
      end: split,
    },
    {
      start: split,
      control1: rightControl1,
      control2: control2ToEnd,
      end: curve.end,
    },
  ];
};

/**
 * Adaptively flatten a cubic Bézier with de Casteljau subdivision.
 *
 * Distance to a line segment is convex, and a Bézier lies inside the convex
 * hull of its control points. Once both control points are within tolerance of
 * the endpoint chord segment, the entire cubic is within that tolerance of the
 * emitted chord.
 */
export const flattenCubicBezier = (
  curve: JigsawCubicBezier,
  tolerance = jigsawCurveFlatteningTolerance,
): JigsawCurvePoint[] => {
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new Error("Cubic Bézier flattening tolerance must be positive and finite.");
  }

  const points: JigsawCurvePoint[] = [curve.start];

  const flatten = (candidate: JigsawCubicBezier, depth: number) => {
    if (
      depth >= maximumSubdivisionDepth ||
      isFlatEnough(candidate, tolerance)
    ) {
      points.push(candidate.end);
      return;
    }

    const [left, right] = splitCubicBezier(candidate);
    flatten(left, depth + 1);
    flatten(right, depth + 1);
  };

  flatten(curve, 0);
  return points;
};
