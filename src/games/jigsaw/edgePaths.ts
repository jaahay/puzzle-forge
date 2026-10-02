import type {
  JigsawEdgeProfileId,
  JigsawEdgeSide,
  JigsawPiece,
  JigsawPieceEdge,
} from "../../catalog/types";
import {
  getJigsawBaselineGrammarDefinition,
  realizeJigsawBaselineProgram,
  type JigsawBaselinePoint,
} from "./baselineGrammar";
import {
  getJigsawConnectorGrammarDefinition,
  realizeJigsawConnectorProgram,
  type JigsawConnectorPoint,
} from "./connectorGrammar";
import { deriveJigsawSeamProgram } from "./seamProgram";

export type JigsawEdgePoint = JigsawConnectorPoint;

export type JigsawPieceSeamPath = {
  edgeId: string;
  side: JigsawEdgeSide;
  boundary: boolean;
  profileId: JigsawEdgeProfileId | null;
  polarity: JigsawPieceEdge["polarity"];
  d: string;
};

type Range = readonly [minimum: number, maximum: number];

export const jigsawEdgeMaximumDepth = 32;
const pieceEdgeOrder: readonly JigsawEdgeSide[] = ["top", "right", "bottom", "left"];

const seededUnit = (seedOffset: number, salt: number) => {
  const mixed = Math.imul((seedOffset ^ salt) >>> 0, 2_654_435_761) >>> 0;
  return mixed / 0xffff_ffff;
};

const seededRange = (seedOffset: number, salt: number, range: Range) =>
  range[0] + seededUnit(seedOffset, salt) * (range[1] - range[0]);

const roundCoordinate = (value: number) => {
  const rounded = Math.round(value * 1_000) / 1_000;
  return Object.is(rounded, -0) ? 0 : rounded;
};

const normalizePoint = (candidate: JigsawEdgePoint): JigsawEdgePoint => ({
  x: roundCoordinate(candidate.x),
  y: roundCoordinate(candidate.y),
});

const normalizeSignedZeroPoint = (candidate: JigsawEdgePoint): JigsawEdgePoint => ({
  x: Object.is(candidate.x, -0) ? 0 : candidate.x,
  y: Object.is(candidate.y, -0) ? 0 : candidate.y,
});

const point = (x: number, y: number): JigsawEdgePoint => ({ x, y });

const mirrorAnchors = (points: readonly JigsawEdgePoint[]) =>
  [...points].reverse().map((candidate) => point(-candidate.x, candidate.y));

type CanonicalSeamParts = {
  program: ReturnType<typeof deriveJigsawSeamProgram>;
  approach: JigsawEdgePoint[];
  connector: JigsawEdgePoint[];
  departure: JigsawEdgePoint[];
};

const baselineCornerQuietSpan = 8;

const placeBaselinePoints = (
  points: readonly JigsawBaselinePoint[],
  startX: number,
  endX: number,
  quietAtStart: number,
  quietAtEnd: number,
): JigsawEdgePoint[] => {
  const activeStart = Math.min(endX, startX + quietAtStart);
  const activeEnd = Math.max(activeStart, endX - quietAtEnd);
  const activeSpan = activeEnd - activeStart;

  if (activeSpan <= 0) {
    return [point(startX, 0), point(endX, 0)];
  }

  const depthScale = Math.min(1, activeSpan / 18);
  const activePoints = points.map((candidate) =>
    point(
      activeStart + candidate.x * activeSpan,
      candidate.y * depthScale,
    ),
  );

  return [
    ...(activeStart > startX ? [point(startX, 0)] : []),
    ...activePoints,
    ...(activeEnd < endX ? [point(endX, 0)] : []),
  ];
};

const getCanonicalSeamParts = (
  profileId: JigsawEdgeProfileId,
  seedOffset: number,
): CanonicalSeamParts => {
  const grammar = getJigsawConnectorGrammarDefinition(profileId);
  const program = deriveJigsawSeamProgram(profileId, seedOffset);
  const width = seededRange(seedOffset, 0x51ed, grammar.width);
  const depth = seededRange(seedOffset, 0x7f4a, grammar.depth);
  const lean =
    (seededUnit(seedOffset, 0x2c1b) - 0.5) * grammar.lean * 2;
  const shouldMirror =
    grammar.mirrorable && seededUnit(seedOffset, 0x65d3) < 0.5;

  let anchors = realizeJigsawConnectorProgram(program.connector);
  if (shouldMirror) anchors = mirrorAnchors(anchors);

  const horizontalOffsets = anchors.map(
    (anchor) => (anchor.x + lean * anchor.y) * (width / 2),
  );
  const minimumCenter =
    grammar.cornerBuffer - Math.min(...horizontalOffsets);
  const maximumCenter =
    100 - grammar.cornerBuffer - Math.max(...horizontalOffsets);
  const centerUnit = seededUnit(seedOffset, 0x9e37) * 2 - 1;
  const centerBias =
    Math.sign(centerUnit) * Math.pow(Math.abs(centerUnit), 0.7);
  const center =
    minimumCenter +
    ((centerBias + 1) / 2) * (maximumCenter - minimumCenter);

  const connector = anchors.map((anchor, index) =>
    point(
      center + horizontalOffsets[index],
      anchor.y * depth,
    ),
  );
  const connectorStart = connector[0].x;
  const connectorEnd = connector[connector.length - 1].x;

  return {
    program,
    approach: placeBaselinePoints(
      realizeJigsawBaselineProgram(program.approach),
      0,
      connectorStart,
      baselineCornerQuietSpan,
      0,
    ),
    connector,
    departure: placeBaselinePoints(
      realizeJigsawBaselineProgram(program.departure),
      connectorEnd,
      100,
      0,
      baselineCornerQuietSpan,
    ),
  };
};

type JigsawEdgeLineSegment = {
  kind: "line";
  start: JigsawEdgePoint;
  end: JigsawEdgePoint;
};

type JigsawEdgeCubicSegment = {
  kind: "cubic";
  start: JigsawEdgePoint;
  control1: JigsawEdgePoint;
  control2: JigsawEdgePoint;
  end: JigsawEdgePoint;
};

type JigsawEdgeSegment = JigsawEdgeLineSegment | JigsawEdgeCubicSegment;

const curveSampleCount = 6;

const lineSegmentsFromPoints = (points: readonly JigsawEdgePoint[]): JigsawEdgeSegment[] =>
  points.slice(1).map((end, index) => ({
    kind: "line",
    start: points[index],
    end,
  }));

const curvedSegmentsFromPoints = (
  points: readonly JigsawEdgePoint[],
  curveTension: number,
  horizontalEndpoints = false,
): JigsawEdgeSegment[] => {
  if (points.length < 2) return [];

  return points.slice(0, -1).map((start, index) => {
    const previous = points[Math.max(0, index - 1)];
    const end = points[index + 1];
    const following = points[Math.min(points.length - 1, index + 2)];

    const firstSegment = index === 0;
    const lastSegment = index === points.length - 2;

    return {
      kind: "cubic",
      start,
      control1: horizontalEndpoints && firstSegment
        ? point(
            start.x + (end.x - start.x) * curveTension,
            start.y,
          )
        : point(
            start.x + (end.x - previous.x) * curveTension,
            start.y + (end.y - previous.y) * curveTension,
          ),
      control2: horizontalEndpoints && lastSegment
        ? point(
            end.x - (end.x - start.x) * curveTension,
            end.y,
          )
        : point(
            end.x - (following.x - start.x) * curveTension,
            end.y - (following.y - start.y) * curveTension,
          ),
      end,
    };
  });
};

const segmentsFromPoints = (
  points: readonly JigsawEdgePoint[],
  renderMode: "smooth" | "angular",
  curveTension: number,
  horizontalEndpoints = false,
): JigsawEdgeSegment[] =>
  renderMode === "angular"
    ? lineSegmentsFromPoints(points)
    : curvedSegmentsFromPoints(points, curveTension, horizontalEndpoints);

export const getJigsawCanonicalConnectorPoints = (
  profileId: JigsawEdgeProfileId,
  seedOffset: number,
): JigsawEdgePoint[] =>
  getCanonicalSeamParts(profileId, seedOffset).connector.map(normalizePoint);

const getCanonicalEdgeSegments = (
  profileId: JigsawEdgeProfileId,
  seedOffset: number,
): JigsawEdgeSegment[] => {
  const seam = getCanonicalSeamParts(profileId, seedOffset);
  const connectorGrammar = getJigsawConnectorGrammarDefinition(profileId);
  const approachGrammar = getJigsawBaselineGrammarDefinition(
    seam.program.approach.baselineGrammarId,
  );
  const departureGrammar = getJigsawBaselineGrammarDefinition(
    seam.program.departure.baselineGrammarId,
  );

  return [
    ...segmentsFromPoints(
      seam.approach,
      approachGrammar.renderMode,
      approachGrammar.curveTension,
      true,
    ),
    ...segmentsFromPoints(
      seam.connector,
      connectorGrammar.renderMode,
      connectorGrammar.curveTension,
    ),
    ...segmentsFromPoints(
      seam.departure,
      departureGrammar.renderMode,
      departureGrammar.curveTension,
      true,
    ),
  ];
};

const transformPoint = (
  side: JigsawEdgeSide,
  u: number,
  v: number,
): JigsawEdgePoint => {
  if (side === "top") return { x: u, y: -v };
  if (side === "right") return { x: 100 + v, y: u };
  if (side === "bottom") return { x: 100 - u, y: 100 + v };
  return { x: -v, y: 100 - u };
};

const mirrorAcrossEdgeAxis = (candidate: JigsawEdgePoint) =>
  point(100 - candidate.x, candidate.y);

const reverseSegment = (segment: JigsawEdgeSegment): JigsawEdgeSegment => {
  if (segment.kind === "line") {
    return {
      kind: "line",
      start: segment.end,
      end: segment.start,
    };
  }

  return {
    kind: "cubic",
    start: segment.end,
    control1: segment.control2,
    control2: segment.control1,
    end: segment.start,
  };
};

const mapSegmentPoints = (
  segment: JigsawEdgeSegment,
  mapPoint: (candidate: JigsawEdgePoint) => JigsawEdgePoint,
): JigsawEdgeSegment => {
  if (segment.kind === "line") {
    return {
      kind: "line",
      start: mapPoint(segment.start),
      end: mapPoint(segment.end),
    };
  }

  return {
    kind: "cubic",
    start: mapPoint(segment.start),
    control1: mapPoint(segment.control1),
    control2: mapPoint(segment.control2),
    end: mapPoint(segment.end),
  };
};

const orientCanonicalSegments = (
  segments: readonly JigsawEdgeSegment[],
  side: JigsawEdgeSide,
): JigsawEdgeSegment[] => {
  if (side === "top" || side === "right") return [...segments];

  return [...segments]
    .reverse()
    .map(reverseSegment)
    .map((segment) => mapSegmentPoints(segment, mirrorAcrossEdgeAxis));
};

const getJigsawEdgeSegments = (edge: JigsawPieceEdge): JigsawEdgeSegment[] => {
  const canonical = edge.boundary
    ? lineSegmentsFromPoints([point(0, 0), point(100, 0)])
    : getCanonicalEdgeSegments(edge.profileId, edge.seedOffset);
  const oriented = orientCanonicalSegments(canonical, edge.side);
  const polarity = !edge.boundary && edge.polarity === "blank" ? -1 : 1;

  return oriented.map((segment) =>
    mapSegmentPoints(segment, (candidate) => {
      const local = normalizePoint(
        point(
          candidate.x,
          candidate.y * polarity,
        ),
      );
      return transformPoint(edge.side, local.x, local.y);
    }),
  );
};

const cubicPointAt = (
  segment: JigsawEdgeCubicSegment,
  t: number,
): JigsawEdgePoint => {
  const inverse = 1 - t;
  const inverseSquared = inverse * inverse;
  const tSquared = t * t;

  return point(
    inverseSquared * inverse * segment.start.x +
      3 * inverseSquared * t * segment.control1.x +
      3 * inverse * tSquared * segment.control2.x +
      tSquared * t * segment.end.x,
    inverseSquared * inverse * segment.start.y +
      3 * inverseSquared * t * segment.control1.y +
      3 * inverse * tSquared * segment.control2.y +
      tSquared * t * segment.end.y,
  );
};

const sampleSegments = (segments: readonly JigsawEdgeSegment[]): JigsawEdgePoint[] => {
  if (segments.length === 0) return [];
  const points = [segments[0].start];

  for (const segment of segments) {
    if (segment.kind === "line") {
      points.push(segment.end);
      continue;
    }

    for (let sample = 1; sample <= curveSampleCount; sample += 1) {
      points.push(cubicPointAt(segment, sample / curveSampleCount));
    }
  }

  return points.map(normalizeSignedZeroPoint);
};

const segmentCommand = (segment: JigsawEdgeSegment) =>
  segment.kind === "line"
    ? `L ${segment.end.x} ${segment.end.y}`
    : `C ${segment.control1.x} ${segment.control1.y} ${segment.control2.x} ${segment.control2.y} ${segment.end.x} ${segment.end.y}`;

const segmentsToPath = (
  segments: readonly JigsawEdgeSegment[],
  includeMove = true,
) => {
  if (segments.length === 0) return "";
  const commands = segments.map(segmentCommand);
  if (includeMove) {
    commands.unshift(`M ${segments[0].start.x} ${segments[0].start.y}`);
  }
  return commands.join(" ");
};

export const getJigsawEdgePoints = (edge: JigsawPieceEdge): JigsawEdgePoint[] =>
  sampleSegments(getJigsawEdgeSegments(edge));

export const getJigsawEdgePath = (edge: JigsawPieceEdge) =>
  segmentsToPath(getJigsawEdgeSegments(edge));

export const getJigsawPieceOutlinePoints = (piece: JigsawPiece): JigsawEdgePoint[] =>
  pieceEdgeOrder.flatMap((side, edgeIndex) => {
    const edge = piece.edges.find((candidate) => candidate.side === side);
    if (!edge) throw new Error(`Jigsaw piece ${piece.id} is missing its ${side} edge.`);
    const points = getJigsawEdgePoints(edge);
    return edgeIndex === 0 ? points : points.slice(1);
  });

export const getJigsawPieceOutlinePath = (piece: JigsawPiece) => {
  const edgeSegments = pieceEdgeOrder.map((side) => {
    const edge = piece.edges.find((candidate) => candidate.side === side);
    if (!edge) throw new Error(`Jigsaw piece ${piece.id} is missing its ${side} edge.`);
    return getJigsawEdgeSegments(edge);
  });

  const commands = edgeSegments.flatMap((segments, edgeIndex) => {
    const path = segmentsToPath(segments, edgeIndex === 0);
    return path ? [path] : [];
  });

  return `${commands.join(" ")} Z`;
};

export const getJigsawPieceSeamPaths = (piece: JigsawPiece): JigsawPieceSeamPath[] =>
  piece.edges.map((edge) => ({
    edgeId: edge.edgeId,
    side: edge.side,
    boundary: edge.boundary,
    profileId: edge.profileId,
    polarity: edge.polarity,
    d: getJigsawEdgePath(edge),
  }));
