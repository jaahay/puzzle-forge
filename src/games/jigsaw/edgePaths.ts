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

type EdgeProfileGeometry = {
  depth: Range;
  width: Range;
  centerShift: number;
  asymmetry: number;
  shape: JigsawEdgePathFamily;
};

const edgeProfileGeometry = {
  "classic-bulb": {
    depth: [12, 18],
    width: [38, 50],
    centerShift: 5,
    asymmetry: 0.12,
    shape: "classic-bulb",
  },
  "narrow-neck": {
    depth: [15, 20],
    width: [34, 46],
    centerShift: 6,
    asymmetry: 0.16,
    shape: "narrow-neck",
  },
  "broad-shallow": {
    depth: [7, 12],
    width: [54, 64],
    centerShift: 5,
    asymmetry: 0.1,
    shape: "broad-shallow",
  },
  "offset-bulb": {
    depth: [11, 18],
    width: [38, 50],
    centerShift: 13,
    asymmetry: 0.18,
    shape: "offset-bulb",
  },
  keyhole: {
    depth: [13, 19],
    width: [32, 42],
    centerShift: 6,
    asymmetry: 0.12,
    shape: "keyhole",
  },
  "asymmetric-scoop": {
    depth: [10, 17],
    width: [44, 58],
    centerShift: 8,
    asymmetry: 0.48,
    shape: "asymmetric-scoop",
  },
  wave: {
    depth: [10, 16],
    width: [46, 60],
    centerShift: 8,
    asymmetry: 0.36,
    shape: "wave",
  },
  angular: {
    depth: [11, 17],
    width: [34, 46],
    centerShift: 7,
    asymmetry: 0.18,
    shape: "angular",
  },
  "multi-lobe": {
    depth: [9, 15],
    width: [48, 62],
    centerShift: 7,
    asymmetry: 0.3,
    shape: "multi-lobe",
  },
} as const satisfies Record<JigsawEdgeProfileId, EdgeProfileGeometry>;

const edgeSampleCount = 32;
export const jigsawEdgeMaximumDepth = 20;
const pieceEdgeOrder: readonly JigsawEdgeSide[] = ["top", "right", "bottom", "left"];

const seededUnit = (seedOffset: number, salt: number) => {
  const mixed = Math.imul((seedOffset ^ salt) >>> 0, 2_654_435_761) >>> 0;
  return mixed / 0xffff_ffff;
};

const seededRange = (seedOffset: number, salt: number, range: Range) =>
  range[0] + seededUnit(seedOffset, salt) * (range[1] - range[0]);

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

const smoothStep = (value: number) => {
  const unit = clampUnit(value);
  return unit * unit * (3 - 2 * unit);
};

const roundCoordinate = (value: number) => {
  const rounded = Math.round(value * 1_000) / 1_000;
  return Object.is(rounded, -0) ? 0 : rounded;
};

const normalizePoint = (point: JigsawEdgePoint): JigsawEdgePoint => ({
  x: roundCoordinate(point.x),
  y: roundCoordinate(point.y),
});

const roundedBulb = (distance: number) => Math.cos((distance * Math.PI) / 2) ** 2;

const shapeAt = (
  shape: EdgeProfileGeometry["shape"],
  distance: number,
  asymmetry: number,
  character: number,
) => {
  const absoluteDistance = Math.abs(distance);
  if (absoluteDistance >= 1) return 0;

  const roundedBase = roundedBulb(distance);
  let value: number;

  switch (shape) {
    case "classic-bulb":
      value = roundedBase ** (0.9 + character * 0.22);
      break;
    case "narrow-neck": {
      const crown = roundedBase ** (0.62 + character * 0.14);
      const neck = 0.56 + 0.44 * Math.exp(-((distance / (0.26 + character * 0.04)) ** 2));
      value = crown * neck;
      break;
    }
    case "broad-shallow":
      value = roundedBase ** (0.48 + character * 0.12);
      break;
    case "offset-bulb":
      value = roundedBase ** (0.78 + character * 0.18);
      break;
    case "keyhole": {
      if (absoluteDistance <= 0.24) {
        value = 1 - 0.06 * (absoluteDistance / 0.24) ** 2;
      } else if (absoluteDistance <= 0.5) {
        value = 0.94 - smoothStep((absoluteDistance - 0.24) / 0.26) * 0.56;
      } else {
        value = 0.38 * (1 - smoothStep((absoluteDistance - 0.5) / 0.5));
      }
      break;
    }
    case "asymmetric-scoop":
      value = roundedBase ** (0.72 + character * 0.2);
      value *= 1 + asymmetry * distance * (0.7 + character * 0.2);
      break;
    case "wave":
      value = roundedBase * (
        0.8 +
        (0.12 + character * 0.08) *
          Math.sin((distance * (1.05 + character * 0.25) + asymmetry) * Math.PI)
      );
      break;
    case "angular": {
      const shoulder = 1 - absoluteDistance;
      const crown = 1 - Math.max(0, absoluteDistance - (0.12 + character * 0.12)) * 0.22;
      value = shoulder * crown;
      break;
    }
    case "multi-lobe":
      value = roundedBase * (
        0.74 +
        (0.16 + character * 0.1) * Math.cos((distance * 2 + asymmetry) * Math.PI)
      );
      break;
  }

  return clampUnit(value);
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

export const getJigsawEdgePoints = (edge: JigsawPieceEdge): JigsawEdgePoint[] => {
  if (edge.boundary) {
    return [normalizePoint(transformPoint(edge.side, 0, 0)), normalizePoint(transformPoint(edge.side, 100, 0))];
  }

  const geometry = edgeProfileGeometry[edge.profileId];
  const center =
    50 +
    (seededUnit(edge.seedOffset, 0x9e37) - 0.5) * geometry.centerShift * 2;
  const width = seededRange(edge.seedOffset, 0x51ed, geometry.width);
  const depth = seededRange(edge.seedOffset, 0x7f4a, geometry.depth);
  const asymmetry =
    (seededUnit(edge.seedOffset, 0x2c1b) - 0.5) * geometry.asymmetry * 2;
  const character = seededUnit(edge.seedOffset, 0xa511);
  const direction = edge.polarity === "tab" ? 1 : -1;
  const reversesCanonicalDirection = edge.side === "left" || edge.side === "bottom";

  return Array.from({ length: edgeSampleCount + 1 }, (_, index) => {
    const u = (index / edgeSampleCount) * 100;
    const profileU = reversesCanonicalDirection ? 100 - u : u;
    const distance = (profileU - center) / (width / 2);
    const v = direction * depth * shapeAt(geometry.shape, distance, asymmetry, character);
    return normalizePoint(transformPoint(edge.side, u, v));
  });
};

export const getJigsawEdgePath = (edge: JigsawPieceEdge) =>
  getJigsawEdgePoints(edge)
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
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
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
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
