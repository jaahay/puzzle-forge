import type { JigsawPiece } from "../../catalog/types";

export const getJigsawPieceNeighborIds = (piece: JigsawPiece): string[] => {
  const edgeNeighbors = piece.edges.flatMap((edge) =>
    edge.boundary ||
    edge.neighborPieceId === null ||
    edge.specialGeometry?.kind === "removed"
      ? []
      : [edge.neighborPieceId]);

  const shape = piece.specialShape;
  const specialNeighbors =
    shape?.kind === "medallion"
      ? [...shape.socketPieceIds]
      : shape?.kind === "medallion-socket"
        ? [shape.medallionPieceId]
        : shape?.kind === "capsule"
          ? [...shape.socketPieceIds]
          : shape?.kind === "capsule-socket"
            ? [shape.capsulePieceId]
            : [];

  return [...new Set([...edgeNeighbors, ...specialNeighbors])];
};
