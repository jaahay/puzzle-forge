import type {
  JigsawEdgeSide,
  JigsawImageAsset,
  JigsawMedallionSocketCorner,
  JigsawPiece,
  JigsawPieceEdge,
} from "../../catalog/types";
import {
  getJigsawPieceAspectRatio,
  jigsawGridAdaptationDistortionThreshold,
} from "./size";

const medallionRadiusPercent = 42;

type RadialRange = readonly [number, number];

type SocketDescriptor = {
  pieceId: string;
  corner: JigsawMedallionSocketCorner;
  radialRanges: Partial<Record<JigsawEdgeSide, RadialRange>>;
};

export type JigsawMedallionGeometry = {
  medallionId: string;
  centerRow: number;
  centerColumn: number;
  radiusX: number;
  radiusY: number;
  sockets: readonly [
    SocketDescriptor,
    SocketDescriptor,
    SocketDescriptor,
    SocketDescriptor,
  ];
};

const roundGeometry = (value: number) =>
  Math.round(value * 1_000) / 1_000;

const pieceIdAt = (row: number, column: number, width: number) =>
  `tile-${row * width + column}`;

export const deriveJigsawMedallionGeometry = (
  width: number,
  height: number,
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">,
): JigsawMedallionGeometry | null => {
  if (width < 4 || height < 4) return null;

  const pieceAspectRatio = getJigsawPieceAspectRatio(asset, width, height);
  const distortion = Math.max(pieceAspectRatio, 1 / pieceAspectRatio);
  if (distortion >= jigsawGridAdaptationDistortionThreshold) return null;

  const centerRow = Math.floor(height / 2);
  const centerColumn = Math.floor(width / 2);
  if (
    centerRow <= 0 ||
    centerRow >= height ||
    centerColumn <= 0 ||
    centerColumn >= width
  ) return null;

  const radiusX = roundGeometry(
    pieceAspectRatio >= 1
      ? medallionRadiusPercent / pieceAspectRatio
      : medallionRadiusPercent,
  );
  const radiusY = roundGeometry(
    pieceAspectRatio >= 1
      ? medallionRadiusPercent
      : medallionRadiusPercent * pieceAspectRatio,
  );
  const medallionId = `medallion-${centerRow}-${centerColumn}`;

  const northwest: SocketDescriptor = {
    pieceId: pieceIdAt(centerRow - 1, centerColumn - 1, width),
    corner: "bottom-right",
    radialRanges: {
      right: [0, 100 - radiusY],
      bottom: [radiusX, 100],
    },
  };
  const northeast: SocketDescriptor = {
    pieceId: pieceIdAt(centerRow - 1, centerColumn, width),
    corner: "bottom-left",
    radialRanges: {
      bottom: [0, 100 - radiusX],
      left: [radiusY, 100],
    },
  };
  const southeast: SocketDescriptor = {
    pieceId: pieceIdAt(centerRow, centerColumn, width),
    corner: "top-left",
    radialRanges: {
      top: [radiusX, 100],
      left: [0, 100 - radiusY],
    },
  };
  const southwest: SocketDescriptor = {
    pieceId: pieceIdAt(centerRow, centerColumn - 1, width),
    corner: "top-right",
    radialRanges: {
      top: [0, 100 - radiusX],
      right: [radiusY, 100],
    },
  };

  return {
    medallionId,
    centerRow,
    centerColumn,
    radiusX,
    radiusY,
    sockets: [northwest, northeast, southeast, southwest],
  };
};

const withRadialGeometry = (
  edge: JigsawPieceEdge,
  range: RadialRange | undefined,
): JigsawPieceEdge => {
  if (!range || edge.boundary) return edge;
  return {
    ...edge,
    specialGeometry: {
      kind: "medallion-radial",
      start: roundGeometry(range[0]),
      end: roundGeometry(range[1]),
    },
  };
};

export const applyJigsawMedallionTopology = ({
  pieces,
  width,
  height,
  asset,
}: {
  pieces: readonly JigsawPiece[];
  width: number;
  height: number;
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">;
}): JigsawPiece[] => {
  const geometry = deriveJigsawMedallionGeometry(width, height, asset);
  if (!geometry) return pieces.map((piece) => ({ ...piece, edges: [...piece.edges] }));

  const socketByPieceId = new Map(
    geometry.sockets.map((socket) => [socket.pieceId, socket] as const),
  );
  const socketPieceIds = geometry.sockets.map((socket) => socket.pieceId) as [
    string,
    string,
    string,
    string,
  ];

  const shapedPieces = pieces.map((piece) => {
    const socket = socketByPieceId.get(piece.id);
    if (!socket) return { ...piece, edges: [...piece.edges] };

    return {
      ...piece,
      edges: piece.edges.map((edge) =>
        withRadialGeometry(edge, socket.radialRanges[edge.side])),
      specialShape: {
        kind: "medallion-socket" as const,
        medallionPieceId: geometry.medallionId,
        corner: socket.corner,
        radiusX: geometry.radiusX,
        radiusY: geometry.radiusY,
      },
    };
  });

  const medallion: JigsawPiece = {
    id: geometry.medallionId,
    currentIndex: pieces.length,
    solvedIndex: pieces.length,
    row: geometry.centerRow - 0.5,
    column: geometry.centerColumn - 0.5,
    edges: [],
    specialShape: {
      kind: "medallion",
      centerRow: geometry.centerRow,
      centerColumn: geometry.centerColumn,
      radiusX: geometry.radiusX,
      radiusY: geometry.radiusY,
      socketPieceIds,
    },
  };

  return [...shapedPieces, medallion];
};

export const getJigsawPieceNeighborIds = (
  piece: JigsawPiece,
): string[] => {
  const edgeNeighbors = piece.edges.flatMap((edge) =>
    edge.boundary || edge.neighborPieceId === null ? [] : [edge.neighborPieceId]);

  const specialNeighbors = piece.specialShape?.kind === "medallion"
    ? [...piece.specialShape.socketPieceIds]
    : piece.specialShape?.kind === "medallion-socket"
      ? [piece.specialShape.medallionPieceId]
      : [];

  return [...new Set([...edgeNeighbors, ...specialNeighbors])];
};
