import { describe, expect, it } from "vitest";
import {
  flattenCubicBezier,
  jigsawCurveFlatteningTolerance,
  type JigsawCubicBezier,
  type JigsawCurvePoint,
} from "./cubicBezier";

const evaluateCubic = (
  curve: JigsawCubicBezier,
  t: number,
): JigsawCurvePoint => {
  const inverse = 1 - t;
  const inverseSquared = inverse * inverse;
  const tSquared = t * t;

  return {
    x:
      inverseSquared * inverse * curve.start.x +
      3 * inverseSquared * t * curve.control1.x +
      3 * inverse * tSquared * curve.control2.x +
      tSquared * t * curve.end.x,
    y:
      inverseSquared * inverse * curve.start.y +
      3 * inverseSquared * t * curve.control1.y +
      3 * inverse * tSquared * curve.control2.y +
      tSquared * t * curve.end.y,
  };
};

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

const pointToPolylineDistance = (
  candidate: JigsawCurvePoint,
  points: readonly JigsawCurvePoint[],
) =>
  Math.min(
    ...points.slice(1).map((end, index) =>
      pointToSegmentDistance(candidate, points[index], end),
    ),
  );

describe("adaptive cubic Bézier flattening", () => {
  it("leaves a flat cubic as one chord", () => {
    const curve: JigsawCubicBezier = {
      start: { x: 0, y: 0 },
      control1: { x: 25, y: 0 },
      control2: { x: 75, y: 0 },
      end: { x: 100, y: 0 },
    };

    expect(flattenCubicBezier(curve)).toEqual([
      curve.start,
      curve.end,
    ]);
  });

  it("subdivides high-curvature cubics adaptively", () => {
    const curve: JigsawCubicBezier = {
      start: { x: 0, y: 0 },
      control1: { x: -30, y: 90 },
      control2: { x: 130, y: -90 },
      end: { x: 100, y: 0 },
    };

    const normal = flattenCubicBezier(curve);
    const tighter = flattenCubicBezier(
      curve,
      jigsawCurveFlatteningTolerance / 4,
    );

    expect(normal.length).toBeGreaterThan(7);
    expect(tighter.length).toBeGreaterThan(normal.length);
    expect(normal[0]).toEqual(curve.start);
    expect(normal.at(-1)).toEqual(curve.end);
  });

  it("keeps dense reference samples within the documented error bound", () => {
    const curves: JigsawCubicBezier[] = [
      {
        start: { x: 0, y: 0 },
        control1: { x: 0, y: 85 },
        control2: { x: 100, y: 85 },
        end: { x: 100, y: 0 },
      },
      {
        start: { x: 0, y: 0 },
        control1: { x: -25, y: 65 },
        control2: { x: 125, y: -50 },
        end: { x: 100, y: 0 },
      },
      {
        start: { x: 12, y: -8 },
        control1: { x: 72, y: 48 },
        control2: { x: 28, y: -58 },
        end: { x: 88, y: 6 },
      },
    ];

    for (const curve of curves) {
      const flattened = flattenCubicBezier(curve);
      for (let sample = 0; sample <= 2_048; sample += 1) {
        const candidate = evaluateCubic(curve, sample / 2_048);
        expect(
          pointToPolylineDistance(candidate, flattened),
        ).toBeLessThanOrEqual(jigsawCurveFlatteningTolerance + 1e-9);
      }
    }
  });

  it("never silently violates the requested error bound at the depth guard", () => {
    const pathological: JigsawCubicBezier = {
      start: { x: 0, y: 0 },
      control1: { x: 0, y: 1e20 },
      control2: { x: 100, y: -1e20 },
      end: { x: 100, y: 0 },
    };

    expect(() => flattenCubicBezier(pathological)).toThrow(
      "within the requested tolerance",
    );
  });

  it("rejects invalid tolerances", () => {
    const curve: JigsawCubicBezier = {
      start: { x: 0, y: 0 },
      control1: { x: 0, y: 1 },
      control2: { x: 1, y: 1 },
      end: { x: 1, y: 0 },
    };

    expect(() => flattenCubicBezier(curve, 0)).toThrow(
      "flattening tolerance must be positive and finite",
    );
    expect(() => flattenCubicBezier(curve, Number.NaN)).toThrow(
      "flattening tolerance must be positive and finite",
    );
  });
});
