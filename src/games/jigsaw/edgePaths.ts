import type {
  JigsawEdgePathFamily,
  JigsawEdgeProfileId,
  JigsawEdgeSide,
  JigsawPiece,
  JigsawPieceEdge,
} from "../../catalog/types";

export type JigsawEdgePoint = {
  x: number;
  y: number;
};

export type JigsawPieceSeamPath = {
  edgeId: string;
  side: JigsawEdgeSide;
  boundary: boolean;
  profileId: JigsawEdgeProfileId | null;
  polarity: JigsawPieceEdge["polarity"];
  d: string;
};

type Range = readonly [minimum: number, maximum: number];

type EdgeFamilyGeometry = {
  width: Range;
  depth: Range;
  cornerBuffer: number;
  lean: number;
  smooth: boolean;
};

const edgeFamilyGeometry = {
  "classic-bulb": { width: [64, 82], depth: [18, 26], cornerBuffer: 7, lean: 0.05, smooth: true },
  mushroom: { width: [72, 88], depth: [20, 26], cornerBuffer: 6, lean: 0.06, smooth: true },
  keyhole: { width: [62, 78], depth: [20, 27], cornerBuffer: 7, lean: 0.05, smooth: true },
  dovetail: { width: [66, 84], depth: [22, 28], cornerBuffer: 7, lean: 0.05, smooth: false },
  "t-lock": { width: [64, 82], depth: [20, 27], cornerBuffer: 7, lean: 0.04, smooth: false },
  bottle: { width: [70, 88], depth: [20, 27], cornerBuffer: 6, lean: 0.12, smooth: true },
  hook: { width: [72, 90], depth: [20, 26], cornerBuffer: 5, lean: 0.14, smooth: true },
  teardrop: { width: [68, 86], depth: [19, 26], cornerBuffer: 6, lean: 0.12, smooth: true },
  "double-lobe": { width: [74, 90], depth: [20, 27], cornerBuffer: 5, lean: 0.05, smooth: true },
  crescent: { width: [74, 90], depth: [20, 27], cornerBuffer: 5, lean: 0.1, smooth: true },
  "s-lock": { width: [76, 90], depth: [24, 30], cornerBuffer: 5, lean: 0.1, smooth: true },
  lightning: { width: [68, 86], depth: [20, 27], cornerBuffer: 6, lean: 0.08, smooth: false },
  castle: { width: [70, 88], depth: [21, 27], cornerBuffer: 6, lean: 0, smooth: false },
  arrowhead: { width: [66, 84], depth: [20, 27], cornerBuffer: 7, lean: 0.05, smooth: false },
} as const satisfies Record<JigsawEdgePathFamily, EdgeFamilyGeometry>;

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

const normalizePoint = (point: JigsawEdgePoint): JigsawEdgePoint => ({
  x: roundCoordinate(point.x),
  y: roundCoordinate(point.y),
});

const normalizeSignedZeroPoint = (candidate: JigsawEdgePoint): JigsawEdgePoint => ({
  x: Object.is(candidate.x, -0) ? 0 : candidate.x,
  y: Object.is(candidate.y, -0) ? 0 : candidate.y,
});

const point = (x: number, y: number): JigsawEdgePoint => ({ x, y });

const mirrorAnchors = (points: readonly JigsawEdgePoint[]) =>
  [...points].reverse().map((candidate) => point(-candidate.x, candidate.y));

const getFamilyAnchors = (
  family: JigsawEdgePathFamily,
  character: number,
): JigsawEdgePoint[] => {
  switch (family) {
    case "classic-bulb": {
      const crown = 0.96 + character * 0.08;
      return [
        point(-1, 0),
        point(-0.56, 0.04),
        point(-0.42, 0.34),
        point(-0.28, 0.72),
        point(0, crown),
        point(0.28, 0.72),
        point(0.42, 0.34),
        point(0.56, 0.04),
        point(1, 0),
      ];
    }
    case "mushroom": {
      const neck = 0.22 + character * 0.06;
      const cap = 0.58 + character * 0.08;
      return [
        point(-1, 0),
        point(-0.36, 0.02),
        point(-neck, 0.34),
        point(-cap, 0.54),
        point(-cap - 0.03, 0.76),
        point(-0.34, 0.96),
        point(0, 1.04),
        point(0.34, 0.96),
        point(cap + 0.03, 0.76),
        point(cap, 0.54),
        point(neck, 0.34),
        point(0.36, 0.02),
        point(1, 0),
      ];
    }
    case "keyhole": {
      const stem = 0.16 + character * 0.05;
      const head = 0.5 + character * 0.07;
      return [
        point(-1, 0),
        point(-0.28, 0),
        point(-stem, 0.46),
        point(-head * 0.72, 0.5),
        point(-head, 0.68),
        point(-head * 0.88, 0.88),
        point(-0.28, 1.04),
        point(0, 1.1),
        point(0.28, 1.04),
        point(head * 0.88, 0.88),
        point(head, 0.68),
        point(head * 0.72, 0.5),
        point(stem, 0.46),
        point(0.28, 0),
        point(1, 0),
      ];
    }
    case "dovetail": {
      const crown = 0.54 + character * 0.08;
      return [
        point(-1, 0),
        point(-0.26, 0),
        point(-crown, 0.82),
        point(crown, 0.82),
        point(0.26, 0),
        point(1, 0),
      ];
    }
    case "t-lock": {
      const bar = 0.58 + character * 0.08;
      const stem = 0.18 + character * 0.05;
      return [
        point(-1, 0),
        point(-stem, 0),
        point(-stem, 0.54),
        point(-bar, 0.54),
        point(-bar, 0.86),
        point(bar, 0.86),
        point(bar, 0.54),
        point(stem, 0.54),
        point(stem, 0),
        point(1, 0),
      ];
    }
    case "bottle": {
      const body = 0.48 + character * 0.08;
      return [
        point(-1, 0),
        point(-0.3, 0),
        point(-0.23, 0.48),
        point(-0.42, 0.6),
        point(-body, 0.8),
        point(-0.4, 1.0),
        point(-0.04, 1.1),
        point(body * 0.82, 0.98),
        point(body, 0.72),
        point(0.4, 0.5),
        point(0.22, 0.42),
        point(0.28, 0),
        point(1, 0),
      ];
    }
    case "hook": {
      const curl = 0.5 + character * 0.1;
      return [
        point(-1, 0),
        point(-0.34, 0),
        point(-0.28, 0.42),
        point(-0.14, 0.76),
        point(0.12, 1.02),
        point(curl, 1.0),
        point(curl + 0.08, 0.8),
        point(curl - 0.06, 0.62),
        point(0.16, 0.64),
        point(0.3, 0.8),
        point(0.08, 0.84),
        point(-0.1, 0.7),
        point(-0.16, 0.48),
        point(0.3, 0.34),
        point(0.38, 0),
        point(1, 0),
      ];
    }
    case "teardrop": {
      const pointOffset = 0.2 + character * 0.12;
      return [
        point(-1, 0),
        point(-0.36, 0.02),
        point(-0.48, 0.34),
        point(-0.42, 0.6),
        point(-0.16, 0.82),
        point(pointOffset, 1.12),
        point(0.12, 0.74),
        point(0.42, 0.5),
        point(0.48, 0.24),
        point(0.32, 0.02),
        point(1, 0),
      ];
    }
    case "double-lobe": {
      const split = 0.12 + character * 0.08;
      return [
        point(-1, 0),
        point(-0.48, 0.04),
        point(-0.54, 0.34),
        point(-0.42, 0.68),
        point(-0.18, 0.94),
        point(-split, 0.78),
        point(0, 0.7),
        point(split, 0.8),
        point(0.2, 0.96),
        point(0.44, 0.7),
        point(0.54, 0.36),
        point(0.46, 0.04),
        point(1, 0),
      ];
    }
    case "crescent": {
      const scoop = 0.08 + character * 0.1;
      return [
        point(-1, 0),
        point(-0.5, 0.04),
        point(-0.56, 0.38),
        point(-0.36, 0.78),
        point(0, 1.02),
        point(0.42, 0.84),
        point(0.52, 0.56),
        point(0.16, 0.54),
        point(-scoop, 0.44),
        point(0.22, 0.3),
        point(0.48, 0.16),
        point(0.44, 0.03),
        point(1, 0),
      ];
    }
    case "s-lock": {
      const reverseDepth = 0.32 + character * 0.12;
      return [
        point(-1, 0),
        point(-0.58, 0),
        point(-0.46, 0.34),
        point(-0.2, 0.56),
        point(0.06, 0.48),
        point(0.18, 0.18),
        point(-0.02, -reverseDepth),
        point(0.18, -reverseDepth - 0.1),
        point(0.46, -0.3),
        point(0.58, -0.05),
        point(1, 0),
      ];
    }
    case "lightning": {
      const offset = (character - 0.5) * 0.08;
      return [
        point(-1, 0),
        point(-0.46, 0),
        point(-0.2 + offset, 0.34),
        point(-0.38 + offset, 0.34),
        point(0.06 + offset, 1.02),
        point(-0.04 + offset, 0.58),
        point(0.4 + offset, 0.58),
        point(0.14 + offset, 0.24),
        point(0.48, 0.24),
        point(0.36, 0),
        point(1, 0),
      ];
    }
    case "castle": {
      const crown = 0.82 + character * 0.08;
      return [
        point(-1, 0),
        point(-0.58, 0),
        point(-0.58, 0.34),
        point(-0.32, 0.34),
        point(-0.32, crown),
        point(-0.08, crown),
        point(-0.08, 0.5),
        point(0.12, 0.5),
        point(0.12, crown + 0.06),
        point(0.38, crown + 0.06),
        point(0.38, 0.34),
        point(0.58, 0.34),
        point(0.58, 0),
        point(1, 0),
      ];
    }
    case "arrowhead": {
      const head = 0.56 + character * 0.08;
      return [
        point(-1, 0),
        point(-0.28, 0),
        point(-0.28, 0.46),
        point(-head, 0.46),
        point(0, 1.1),
        point(head, 0.46),
        point(0.28, 0.46),
        point(0.28, 0),
        point(1, 0),
      ];
    }
  }
};

const familyCanMirror = (family: JigsawEdgePathFamily) =>
  family === "bottle" ||
  family === "hook" ||
  family === "teardrop" ||
  family === "crescent" ||
  family === "s-lock" ||
  family === "lightning";

const getCanonicalConnectorPoints = (
  profileId: JigsawEdgeProfileId,
  seedOffset: number,
): JigsawEdgePoint[] => {
  const geometry = edgeFamilyGeometry[profileId];
  const width = seededRange(seedOffset, 0x51ed, geometry.width);
  const depth = seededRange(seedOffset, 0x7f4a, geometry.depth);
  const character = seededUnit(seedOffset, 0xa511);
  const lean =
    (seededUnit(seedOffset, 0x2c1b) - 0.5) * geometry.lean * 2;
  const shouldMirror =
    familyCanMirror(profileId) && seededUnit(seedOffset, 0x65d3) < 0.5;

  let anchors = getFamilyAnchors(profileId, character);
  if (shouldMirror) anchors = mirrorAnchors(anchors);

  const horizontalOffsets = anchors.map(
    (anchor) => (anchor.x + lean * anchor.y) * (width / 2),
  );
  const minimumCenter =
    geometry.cornerBuffer - Math.min(...horizontalOffsets);
  const maximumCenter =
    100 - geometry.cornerBuffer - Math.max(...horizontalOffsets);
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

  return [
    point(0, 0),
    ...connector,
    point(100, 0),
  ];
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

const curveTension = 0.12;
const curveSampleCount = 6;

const lineSegmentsFromPoints = (points: readonly JigsawEdgePoint[]): JigsawEdgeSegment[] =>
  points.slice(1).map((end, index) => ({
    kind: "line",
    start: points[index],
    end,
  }));

const getCanonicalEdgeSegments = (
  profileId: JigsawEdgeProfileId,
  seedOffset: number,
): JigsawEdgeSegment[] => {
  const points = getCanonicalConnectorPoints(profileId, seedOffset);
  if (!edgeFamilyGeometry[profileId].smooth) return lineSegmentsFromPoints(points);

  const connector = points.slice(1, -1);
  const segments: JigsawEdgeSegment[] = [
    {
      kind: "line",
      start: points[0],
      end: connector[0],
    },
  ];

  for (let index = 0; index < connector.length - 1; index += 1) {
    const previous = connector[Math.max(0, index - 1)];
    const start = connector[index];
    const end = connector[index + 1];
    const following = connector[Math.min(connector.length - 1, index + 2)];

    segments.push({
      kind: "cubic",
      start,
      control1: point(
        start.x + (end.x - previous.x) * curveTension,
        start.y + (end.y - previous.y) * curveTension,
      ),
      control2: point(
        end.x - (following.x - start.x) * curveTension,
        end.y - (following.y - start.y) * curveTension,
      ),
      end,
    });
  }

  segments.push({
    kind: "line",
    start: connector[connector.length - 1],
    end: points[points.length - 1],
  });

  return segments;
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
