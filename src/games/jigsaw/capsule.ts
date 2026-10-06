import type {
  JigsawCapsuleOrientation,
  JigsawCapsuleSocketRole,
  JigsawEdgeSide,
  JigsawImageAsset,
  JigsawPiece,
  JigsawPieceEdge,
} from "../../catalog/types";
import {
  getJigsawPieceAspectRatio,
  jigsawGridAdaptationDistortionThreshold,
} from "./size";

const capsuleRadiusPercent = 42;
type RadialRange = readonly [number, number];

type SocketDescriptor = {
  pieceId: string;
  role: JigsawCapsuleSocketRole;
  radialRanges: Partial<Record<JigsawEdgeSide, RadialRange>>;
  removedSides?: readonly JigsawEdgeSide[];
};

export type JigsawCapsulePlacement = {
  orientation: JigsawCapsuleOrientation;
  anchorRow: number;
  anchorColumn: number;
};

export type JigsawCapsuleGeometry = {
  capsuleId: string;
  orientation: JigsawCapsuleOrientation;
  anchorRow: number;
  anchorColumn: number;
  radiusX: number;
  radiusY: number;
  sockets: readonly [
    SocketDescriptor,
    SocketDescriptor,
    SocketDescriptor,
    SocketDescriptor,
    SocketDescriptor,
    SocketDescriptor,
  ];
};

const roundGeometry = (value: number) => Math.round(value * 1_000) / 1_000;
const pieceIdAt = (row: number, column: number, width: number) =>
  `tile-${row * width + column}`;

const deriveCapsuleRadii = (
  width: number,
  height: number,
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">,
) => {
  if (width < 4 || height < 4) return null;
  const pieceAspectRatio = getJigsawPieceAspectRatio(asset, width, height);
  const distortion = Math.max(pieceAspectRatio, 1 / pieceAspectRatio);
  if (distortion >= jigsawGridAdaptationDistortionThreshold) return null;
  return {
    radiusX: roundGeometry(
      pieceAspectRatio >= 1
        ? capsuleRadiusPercent / pieceAspectRatio
        : capsuleRadiusPercent,
    ),
    radiusY: roundGeometry(
      pieceAspectRatio >= 1
        ? capsuleRadiusPercent
        : capsuleRadiusPercent * pieceAspectRatio,
    ),
  };
};

export const deriveJigsawCapsuleGeometry = (
  width: number,
  height: number,
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">,
  placement: JigsawCapsulePlacement,
): JigsawCapsuleGeometry | null => {
  const radii = deriveCapsuleRadii(width, height, asset);
  if (!radii) return null;
  const { orientation, anchorRow, anchorColumn } = placement;
  const horizontal = orientation === "horizontal";
  const valid = horizontal
    ? anchorRow > 0 && anchorRow < height && anchorColumn > 0 && anchorColumn < width - 1
    : anchorColumn > 0 && anchorColumn < width && anchorRow > 0 && anchorRow < height - 1;
  if (!valid) return null;

  const { radiusX, radiusY } = radii;
  const capsuleId = `capsule-${orientation}-${anchorRow}-${anchorColumn}`;
  const sockets: JigsawCapsuleGeometry["sockets"] = horizontal
    ? [
        {
          pieceId: pieceIdAt(anchorRow - 1, anchorColumn - 1, width),
          role: "north-west",
          radialRanges: { right: [0, 100 - radiusY], bottom: [radiusX, 100] },
        },
        {
          pieceId: pieceIdAt(anchorRow - 1, anchorColumn, width),
          role: "north",
          radialRanges: { right: [0, 100 - radiusY], left: [radiusY, 100] },
          removedSides: ["bottom"],
        },
        {
          pieceId: pieceIdAt(anchorRow - 1, anchorColumn + 1, width),
          role: "north-east",
          radialRanges: { bottom: [0, 100 - radiusX], left: [radiusY, 100] },
        },
        {
          pieceId: pieceIdAt(anchorRow, anchorColumn + 1, width),
          role: "south-east",
          radialRanges: { top: [radiusX, 100], left: [0, 100 - radiusY] },
        },
        {
          pieceId: pieceIdAt(anchorRow, anchorColumn, width),
          role: "south",
          radialRanges: { right: [radiusY, 100], left: [0, 100 - radiusY] },
          removedSides: ["top"],
        },
        {
          pieceId: pieceIdAt(anchorRow, anchorColumn - 1, width),
          role: "south-west",
          radialRanges: { top: [0, 100 - radiusX], right: [radiusY, 100] },
        },
      ]
    : [
        {
          pieceId: pieceIdAt(anchorRow - 1, anchorColumn - 1, width),
          role: "north-west",
          radialRanges: { right: [0, 100 - radiusY], bottom: [radiusX, 100] },
        },
        {
          pieceId: pieceIdAt(anchorRow - 1, anchorColumn, width),
          role: "north-east",
          radialRanges: { bottom: [0, 100 - radiusX], left: [radiusY, 100] },
        },
        {
          pieceId: pieceIdAt(anchorRow, anchorColumn, width),
          role: "east",
          radialRanges: { top: [radiusX, 100], bottom: [0, 100 - radiusX] },
          removedSides: ["left"],
        },
        {
          pieceId: pieceIdAt(anchorRow + 1, anchorColumn, width),
          role: "south-east",
          radialRanges: { top: [radiusX, 100], left: [0, 100 - radiusY] },
        },
        {
          pieceId: pieceIdAt(anchorRow + 1, anchorColumn - 1, width),
          role: "south-west",
          radialRanges: { top: [0, 100 - radiusX], right: [radiusY, 100] },
        },
        {
          pieceId: pieceIdAt(anchorRow, anchorColumn - 1, width),
          role: "west",
          radialRanges: { top: [0, 100 - radiusX], bottom: [radiusX, 100] },
          removedSides: ["right"],
        },
      ];

  return {
    capsuleId,
    orientation,
    anchorRow,
    anchorColumn,
    radiusX,
    radiusY,
    sockets,
  };
};

export const getJigsawCapsuleCandidatePlacements = (
  width: number,
  height: number,
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">,
): JigsawCapsulePlacement[] => {
  if (!deriveCapsuleRadii(width, height, asset)) return [];
  const candidates: JigsawCapsulePlacement[] = [];
  for (let anchorRow = 1; anchorRow < height; anchorRow += 1) {
    for (let anchorColumn = 1; anchorColumn < width - 1; anchorColumn += 1) {
      candidates.push({ orientation: "horizontal", anchorRow, anchorColumn });
    }
  }
  for (let anchorRow = 1; anchorRow < height - 1; anchorRow += 1) {
    for (let anchorColumn = 1; anchorColumn < width; anchorColumn += 1) {
      candidates.push({ orientation: "vertical", anchorRow, anchorColumn });
    }
  }
  return candidates;
};

const withCapsuleGeometry = (
  edge: JigsawPieceEdge,
  range: RadialRange | undefined,
  removed: boolean,
): JigsawPieceEdge => {
  if (edge.boundary) return edge;
  if (removed) {
    return { ...edge, specialGeometry: { kind: "removed" } };
  }
  if (!range) return edge;
  return {
    ...edge,
    specialGeometry: {
      kind: "capsule-radial",
      start: roundGeometry(range[0]),
      end: roundGeometry(range[1]),
    },
  };
};

export const applyJigsawCapsuleTopology = ({
  pieces,
  width,
  height,
  asset,
  placement,
}: {
  pieces: readonly JigsawPiece[];
  width: number;
  height: number;
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">;
  placement: JigsawCapsulePlacement;
}): JigsawPiece[] => {
  const geometry = deriveJigsawCapsuleGeometry(width, height, asset, placement);
  if (!geometry) return pieces.map((piece) => ({ ...piece, edges: [...piece.edges] }));

  const socketByPieceId = new Map(
    geometry.sockets.map((socket) => [socket.pieceId, socket] as const),
  );
  const socketPieceIds = geometry.sockets.map((socket) => socket.pieceId) as [
    string, string, string, string, string, string,
  ];

  const shapedPieces = pieces.map((piece) => {
    const socket = socketByPieceId.get(piece.id);
    if (!socket) return { ...piece, edges: [...piece.edges] };
    const removedSides = new Set(socket.removedSides ?? []);
    return {
      ...piece,
      edges: piece.edges.map((edge) =>
        withCapsuleGeometry(
          edge,
          socket.radialRanges[edge.side],
          removedSides.has(edge.side),
        )),
      specialShape: {
        kind: "capsule-socket" as const,
        capsulePieceId: geometry.capsuleId,
        orientation: geometry.orientation,
        role: socket.role,
        radiusX: geometry.radiusX,
        radiusY: geometry.radiusY,
      },
    };
  });

  const capsule: JigsawPiece = {
    id: geometry.capsuleId,
    currentIndex: pieces.length,
    solvedIndex: pieces.length,
    row: geometry.anchorRow - 0.5,
    column: geometry.anchorColumn - 0.5,
    edges: [],
    specialShape: {
      kind: "capsule",
      orientation: geometry.orientation,
      anchorRow: geometry.anchorRow,
      anchorColumn: geometry.anchorColumn,
      radiusX: geometry.radiusX,
      radiusY: geometry.radiusY,
      socketPieceIds,
    },
  };

  return [...shapedPieces, capsule];
};
