import type {
  JigsawBaselineGrammarId,
  JigsawConnectorGrammarId,
} from "../../catalog/types";
import {
  deriveJigsawBaselineProgram,
  realizeJigsawBaselineProgram,
  type JigsawBaselinePoint,
} from "./baselineGrammar";
import {
  deriveJigsawConnectorProgram,
  realizeJigsawConnectorProgram,
  type JigsawConnectorPoint,
} from "./connectorGrammar";
import { jigsawEdgeAdvanceProbeIds } from "./edgeProbeGallery";

export type JigsawEdgeRealizedProbeId =
  (typeof jigsawEdgeAdvanceProbeIds)[number];

export type JigsawEdgeProbePoint = {
  x: number;
  y: number;
};

export type JigsawEdgeProbeSeam = {
  probeId: JigsawEdgeRealizedProbeId;
  connectorCount: 0 | 1;
  lockEventCount: number;
  points: readonly JigsawEdgeProbePoint[];
};

export type JigsawEdgeProbeValidation =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "anchor-mismatch"
        | "non-finite-coordinate"
        | "bounds"
        | "self-intersection";
    };

const epsilon = 1e-9;
const connectorStart = 22;
const connectorEnd = 78;
const connectorDepth = 22;
const baselineCornerSlope = 0.4;

const point = (x: number, y: number): JigsawEdgeProbePoint => ({ x, y });

const deriveRoleSeed = (seedOffset: number, salt: number) =>
  Math.imul((seedOffset ^ salt) >>> 0, 1_597_334_677) >>> 0;

const realizeConnector = (
  grammarId: JigsawConnectorGrammarId,
  seedOffset: number,
): readonly JigsawConnectorPoint[] =>
  realizeJigsawConnectorProgram(
    deriveJigsawConnectorProgram(grammarId, seedOffset),
  );

const placeConnector = (
  points: readonly JigsawConnectorPoint[],
  start: number,
  end: number,
  depthScale: number,
  normalDirection: -1 | 1 = 1,
): JigsawEdgeProbePoint[] =>
  points.map((candidate) =>
    point(
      start + ((candidate.x + 1) / 2) * (end - start),
      candidate.y * depthScale * normalDirection,
    ),
  );

const joinPaths = (
  ...parts: readonly (readonly JigsawEdgeProbePoint[])[]
): JigsawEdgeProbePoint[] =>
  parts.flatMap((part, index) =>
    index === 0 ? [...part] : part.slice(1),
  );

const realizeCompoundConnector = (
  seedOffset: number,
): JigsawEdgeProbePoint[] => {
  const bulb = placeConnector(
    realizeConnector(
      "classic-bulb",
      deriveRoleSeed(seedOffset, 0xe101),
    ),
    0,
    0.4,
    0.72,
  );
  const head = placeConnector(
    realizeConnector(
      "necked-head",
      deriveRoleSeed(seedOffset, 0xe102),
    ),
    0.4,
    1,
    0.88,
  );

  return joinPaths(bulb, head);
};

const realizeOpposedDualConnector = (
  seedOffset: number,
): JigsawEdgeProbePoint[] => {
  const first = placeConnector(
    realizeConnector(
      "necked-head",
      deriveRoleSeed(seedOffset, 0xe201),
    ),
    0,
    0.5,
    0.82,
  );
  const second = placeConnector(
    realizeConnector(
      "necked-head",
      deriveRoleSeed(seedOffset, 0xe202),
    ),
    0.5,
    1,
    0.82,
    -1,
  );

  return joinPaths(first, second);
};

const realizeNotchedHeadConnector = (
  seedOffset: number,
): JigsawEdgeProbePoint[] => {
  const points = placeConnector(
    realizeConnector(
      "necked-head",
      deriveRoleSeed(seedOffset, 0xe301),
    ),
    0,
    1,
    1,
  );
  const crownIndex = points.reduce(
    (bestIndex, candidate, index) =>
      candidate.y > points[bestIndex]!.y ? index : bestIndex,
    0,
  );
  const crown = points[crownIndex]!;

  return points.map((candidate, index) =>
    index === crownIndex
      ? point(candidate.x, crown.y * 0.62)
      : candidate,
  );
};

const realizeProbeConnector = (
  probeId: Exclude<JigsawEdgeRealizedProbeId, "connectorless-wave">,
  seedOffset: number,
): readonly JigsawEdgeProbePoint[] => {
  switch (probeId) {
    case "compound-lock":
      return realizeCompoundConnector(seedOffset);
    case "opposed-dual-lock":
      return realizeOpposedDualConnector(seedOffset);
    case "notched-head":
      return realizeNotchedHeadConnector(seedOffset);
  }
};

const placeBaseline = (
  points: readonly JigsawBaselinePoint[],
  start: number,
  end: number,
  corner: "start" | "end" | "both",
): JigsawEdgeProbePoint[] => {
  const span = Math.max(0, end - start);
  const depthScale = Math.min(1, span / 18);

  return points.map((candidate) => {
    const x = start + candidate.x * span;
    const rawY = candidate.y * depthScale;
    const cornerDistance =
      corner === "start"
        ? x
        : corner === "end"
          ? 100 - x
          : Math.min(x, 100 - x);
    const maximumDepth = Math.max(
      0,
      cornerDistance * baselineCornerSlope,
    );
    const y =
      Math.sign(rawY) * Math.min(Math.abs(rawY), maximumDepth);

    return point(x, y);
  });
};

const realizeBaseline = (
  grammarId: JigsawBaselineGrammarId,
  seedOffset: number,
) =>
  realizeJigsawBaselineProgram(
    deriveJigsawBaselineProgram(grammarId, seedOffset),
  );

export const realizeJigsawEdgeProbeSeam = ({
  probeId,
  seedOffset,
  approachGrammarId = "bow",
  departureGrammarId = "angled-course",
}: {
  probeId: JigsawEdgeRealizedProbeId;
  seedOffset: number;
  approachGrammarId?: JigsawBaselineGrammarId;
  departureGrammarId?: JigsawBaselineGrammarId;
}): JigsawEdgeProbeSeam => {
  if (probeId === "connectorless-wave") {
    return {
      probeId,
      connectorCount: 0,
      lockEventCount: 0,
      points: placeBaseline(
        realizeBaseline(
          "wave",
          deriveRoleSeed(seedOffset, 0xe401),
        ),
        0,
        100,
        "both",
      ),
    };
  }

  const approach = placeBaseline(
    realizeBaseline(
      approachGrammarId,
      deriveRoleSeed(seedOffset, 0xe411),
    ),
    0,
    connectorStart,
    "start",
  );
  const localConnector = realizeProbeConnector(
    probeId,
    deriveRoleSeed(seedOffset, 0xe412),
  );
  const connector = localConnector.map((candidate) =>
    point(
      connectorStart +
        candidate.x * (connectorEnd - connectorStart),
      candidate.y * connectorDepth,
    ),
  );
  const departure = placeBaseline(
    realizeBaseline(
      departureGrammarId,
      deriveRoleSeed(seedOffset, 0xe413),
    ),
    connectorEnd,
    100,
    "end",
  );

  return {
    probeId,
    connectorCount: 1,
    lockEventCount: probeId === "notched-head" ? 1 : 2,
    points: joinPaths(approach, connector, departure),
  };
};

export const getJigsawEdgeProbeReciprocalPoints = (
  points: readonly JigsawEdgeProbePoint[],
): JigsawEdgeProbePoint[] =>
  [...points]
    .reverse()
    .map((candidate) =>
      point(100 - candidate.x, -candidate.y),
    );

const cross = (
  start: JigsawEdgeProbePoint,
  end: JigsawEdgeProbePoint,
  candidate: JigsawEdgeProbePoint,
) =>
  (end.x - start.x) * (candidate.y - start.y) -
  (end.y - start.y) * (candidate.x - start.x);

const segmentsProperlyIntersect = (
  firstStart: JigsawEdgeProbePoint,
  firstEnd: JigsawEdgeProbePoint,
  secondStart: JigsawEdgeProbePoint,
  secondEnd: JigsawEdgeProbePoint,
) => {
  const firstA = cross(firstStart, firstEnd, secondStart);
  const firstB = cross(firstStart, firstEnd, secondEnd);
  const secondA = cross(secondStart, secondEnd, firstStart);
  const secondB = cross(secondStart, secondEnd, firstEnd);

  return (
    ((firstA > epsilon && firstB < -epsilon) ||
      (firstA < -epsilon && firstB > epsilon)) &&
    ((secondA > epsilon && secondB < -epsilon) ||
      (secondA < -epsilon && secondB > epsilon))
  );
};

const hasProperSelfIntersection = (
  points: readonly JigsawEdgeProbePoint[],
  closed: boolean,
) => {
  const segmentCount = points.length - 1;

  for (let firstIndex = 0; firstIndex < segmentCount; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 2;
      secondIndex < segmentCount;
      secondIndex += 1
    ) {
      if (
        closed &&
        firstIndex === 0 &&
        secondIndex === segmentCount - 1
      ) {
        continue;
      }

      if (
        segmentsProperlyIntersect(
          points[firstIndex]!,
          points[firstIndex + 1]!,
          points[secondIndex]!,
          points[secondIndex + 1]!,
        )
      ) {
        return true;
      }
    }
  }

  return false;
};

export const validateJigsawEdgeProbeSeam = (
  points: readonly JigsawEdgeProbePoint[],
): JigsawEdgeProbeValidation => {
  const first = points[0];
  const last = points.at(-1);
  if (
    !first ||
    !last ||
    Math.abs(first.x) > epsilon ||
    Math.abs(first.y) > epsilon ||
    Math.abs(last.x - 100) > epsilon ||
    Math.abs(last.y) > epsilon
  ) {
    return { valid: false, reason: "anchor-mismatch" };
  }

  if (
    points.some(
      (candidate) =>
        !Number.isFinite(candidate.x) ||
        !Number.isFinite(candidate.y),
    )
  ) {
    return { valid: false, reason: "non-finite-coordinate" };
  }

  if (
    points.some(
      (candidate) =>
        candidate.x < -epsilon ||
        candidate.x > 100 + epsilon ||
        Math.abs(candidate.y) > 32 + epsilon,
    )
  ) {
    return { valid: false, reason: "bounds" };
  }

  if (hasProperSelfIntersection(points, false)) {
    return { valid: false, reason: "self-intersection" };
  }

  return { valid: true };
};

export const getJigsawEdgeProbePieceOutline = (
  seam: readonly JigsawEdgeProbePoint[],
): JigsawEdgeProbePoint[] => [
  ...seam.map((candidate) =>
    point(candidate.x, -candidate.y),
  ),
  point(100, 100),
  point(0, 100),
  point(0, 0),
];

export const validateJigsawEdgeProbePieceOutline = (
  seam: readonly JigsawEdgeProbePoint[],
): JigsawEdgeProbeValidation => {
  const outline = getJigsawEdgeProbePieceOutline(seam);

  if (
    outline.some(
      (candidate) =>
        !Number.isFinite(candidate.x) ||
        !Number.isFinite(candidate.y),
    )
  ) {
    return { valid: false, reason: "non-finite-coordinate" };
  }

  if (
    outline.some(
      (candidate) =>
        candidate.x < -epsilon ||
        candidate.x > 100 + epsilon ||
        candidate.y < -32 - epsilon ||
        candidate.y > 100 + epsilon,
    )
  ) {
    return { valid: false, reason: "bounds" };
  }

  if (hasProperSelfIntersection(outline, true)) {
    return { valid: false, reason: "self-intersection" };
  }

  return { valid: true };
};
