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
  centerShift: number;
  lean: number;
  smooth: boolean;
};

const edgeFamilyGeometry = {
  "classic-bulb": { width: [40, 52], depth: [11, 17], centerShift: 4, lean: 0.04, smooth: true },
  mushroom: { width: [44, 56], depth: [15, 21], centerShift: 5, lean: 0.05, smooth: true },
  keyhole: { width: [38, 48], depth: [15, 21], centerShift: 5, lean: 0.04, smooth: true },
  dovetail: { width: [40, 52], depth: [12, 18], centerShift: 5, lean: 0.04, smooth: false },
  "t-lock": { width: [40, 50], depth: [14, 20], centerShift: 5, lean: 0.03, smooth: false },
  bottle: { width: [44, 56], depth: [15, 21], centerShift: 6, lean: 0.1, smooth: true },
  hook: { width: [48, 60], depth: [15, 21], centerShift: 6, lean: 0.12, smooth: true },
  teardrop: { width: [42, 54], depth: [14, 20], centerShift: 6, lean: 0.1, smooth: true },
  "double-lobe": { width: [52, 64], depth: [12, 18], centerShift: 5, lean: 0.04, smooth: true },
  crescent: { width: [50, 62], depth: [12, 18], centerShift: 6, lean: 0.08, smooth: true },
  "s-lock": { width: [52, 64], depth: [11, 17], centerShift: 6, lean: 0.08, smooth: true },
  lightning: { width: [44, 56], depth: [12, 18], centerShift: 5, lean: 0.06, smooth: false },
  castle: { width: [46, 58], depth: [12, 18], centerShift: 4, lean: 0, smooth: false },
  arrowhead: { width: [42, 54], depth: [14, 20], centerShift: 5, lean: 0.04, smooth: false },
} as const satisfies Record<JigsawEdgePathFamily, EdgeFamilyGeometry>;

export const jigsawEdgeMaximumDepth = 22;
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

const point = (x: number, y: number): JigsawEdgePoint => ({ x, y });

const mirrorAnchors = (points: readonly JigsawEdgePoint[]) =>
  [...points].reverse().map((candidate) => point(-candidate.x, candidate.y));

const smoothOpenPolyline = (points: readonly JigsawEdgePoint[]) => {
  if (points.length < 3) return [...points];
  const smoothed: JigsawEdgePoint[] = [points[0]];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    smoothed.push(
      point(start.x * 0.75 + end.x * 0.25, start.y * 0.75 + end.y * 0.25),
      point(start.x * 0.25 + end.x * 0.75, start.y * 0.25 + end.y * 0.75),
    );
  }

  smoothed.push(points[points.length - 1]);
  return smoothed;
};

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
  const center =
    50 +
    (seededUnit(seedOffset, 0x9e37) - 0.5) * geometry.centerShift * 2;
  const width = seededRange(seedOffset, 0x51ed, geometry.width);
  const depth = seededRange(seedOffset, 0x7f4a, geometry.depth);
  const character = seededUnit(seedOffset, 0xa511);
  const lean =
    (seededUnit(seedOffset, 0x2c1b) - 0.5) * geometry.lean * 2;
  const shouldMirror =
    familyCanMirror(profileId) && seededUnit(seedOffset, 0x65d3) < 0.5;

  let anchors = getFamilyAnchors(profileId, character);
  if (shouldMirror) anchors = mirrorAnchors(anchors);
  if (geometry.smooth) anchors = smoothOpenPolyline(anchors);

  const connector = anchors.map((anchor) =>
    point(
      center + (anchor.x + lean * anchor.y) * (width / 2),
      anchor.y * depth,
    ),
  );

  return [
    point(0, 0),
    ...connector,
    point(100, 0),
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

const orientCanonicalPoints = (
  points: readonly JigsawEdgePoint[],
  side: JigsawEdgeSide,
) => {
  if (side === "top" || side === "right") return [...points];
  return [...points]
    .reverse()
    .map((candidate) => point(100 - candidate.x, candidate.y));
};

export const getJigsawEdgePoints = (edge: JigsawPieceEdge): JigsawEdgePoint[] => {
  if (edge.boundary) {
    return [
      normalizePoint(transformPoint(edge.side, 0, 0)),
      normalizePoint(transformPoint(edge.side, 100, 0)),
    ];
  }

  const canonical = orientCanonicalPoints(
    getCanonicalConnectorPoints(edge.profileId, edge.seedOffset),
    edge.side,
  );
  const polarity = edge.polarity === "tab" ? 1 : -1;

  return canonical.map((candidate) =>
    normalizePoint(
      transformPoint(
        edge.side,
        candidate.x,
        candidate.y * polarity,
      ),
    ),
  );
};

export const getJigsawEdgePath = (edge: JigsawPieceEdge) =>
  getJigsawEdgePoints(edge)
    .map((candidate, index) => `${index === 0 ? "M" : "L"} ${candidate.x} ${candidate.y}`)
    .join(" ");

export const getJigsawPieceOutlinePoints = (piece: JigsawPiece): JigsawEdgePoint[] =>
  pieceEdgeOrder.flatMap((side, edgeIndex) => {
    const edge = piece.edges.find((candidate) => candidate.side === side);
    if (!edge) throw new Error(`Jigsaw piece ${piece.id} is missing its ${side} edge.`);
    const points = getJigsawEdgePoints(edge);
    return edgeIndex === 0 ? points : points.slice(1);
  });

export const getJigsawPieceOutlinePath = (piece: JigsawPiece) =>
  `${getJigsawPieceOutlinePoints(piece)
    .map((candidate, index) => `${index === 0 ? "M" : "L"} ${candidate.x} ${candidate.y}`)
    .join(" ")} Z`;

export const getJigsawPieceSeamPaths = (piece: JigsawPiece): JigsawPieceSeamPath[] =>
  piece.edges.map((edge) => ({
    edgeId: edge.edgeId,
    side: edge.side,
    boundary: edge.boundary,
    profileId: edge.profileId,
    polarity: edge.polarity,
    d: getJigsawEdgePath(edge),
  }));
