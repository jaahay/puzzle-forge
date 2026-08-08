import type {
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

type EdgeProfileGeometry = {
  depth: number;
  width: number;
  shape: "round" | "soft" | "angular" | "wave" | "lock";
};

const edgeProfileGeometry = {
  "classic-round": { depth: 16, width: 42, shape: "round" },
  "soft-round": { depth: 10, width: 52, shape: "soft" },
  angular: { depth: 14, width: 38, shape: "angular" },
  wave: { depth: 13, width: 50, shape: "wave" },
  "simple-lock": { depth: 9, width: 32, shape: "lock" },
} as const satisfies Record<JigsawEdgeProfileId, EdgeProfileGeometry>;

const edgeSampleCount = 32;
const pieceEdgeOrder: readonly JigsawEdgeSide[] = ["top", "right", "bottom", "left"];

const seededUnit = (seedOffset: number, salt: number) => {
  const mixed = Math.imul((seedOffset ^ salt) >>> 0, 2_654_435_761) >>> 0;
  return mixed / 0xffff_ffff;
};

const roundCoordinate = (value: number) => {
  const rounded = Math.round(value * 1_000) / 1_000;
  return Object.is(rounded, -0) ? 0 : rounded;
};

const normalizePoint = (point: JigsawEdgePoint): JigsawEdgePoint => ({
  x: roundCoordinate(point.x),
  y: roundCoordinate(point.y),
});

const shapeAt = (
  shape: EdgeProfileGeometry["shape"],
  distance: number,
  asymmetry: number,
) => {
  const absoluteDistance = Math.abs(distance);
  if (absoluteDistance >= 1) return 0;

  if (shape === "angular") return 1 - absoluteDistance;
  if (shape === "lock") {
    if (absoluteDistance <= 0.42) return 1;
    return (1 - absoluteDistance) / 0.58;
  }

  const roundedBase = Math.cos((distance * Math.PI) / 2) ** 2;
  if (shape === "soft") return roundedBase ** 0.72;
  if (shape === "wave") {
    return roundedBase * (0.82 + 0.18 * Math.sin((distance + asymmetry) * Math.PI));
  }
  return roundedBase;
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
  const center = 50 + (seededUnit(edge.seedOffset, 0x9e37) - 0.5) * 10;
  const width = geometry.width * (0.92 + seededUnit(edge.seedOffset, 0x51ed) * 0.16);
  const depth = geometry.depth * (0.9 + seededUnit(edge.seedOffset, 0x7f4a) * 0.2);
  const asymmetry = (seededUnit(edge.seedOffset, 0x2c1b) - 0.5) * 0.5;
  const direction = edge.polarity === "tab" ? 1 : -1;
  const reversesCanonicalDirection = edge.side === "left" || edge.side === "bottom";

  return Array.from({ length: edgeSampleCount + 1 }, (_, index) => {
    const u = (index / edgeSampleCount) * 100;
    const profileU = reversesCanonicalDirection ? 100 - u : u;
    const distance = (profileU - center) / (width / 2);
    const v = direction * depth * shapeAt(geometry.shape, distance, asymmetry);
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
