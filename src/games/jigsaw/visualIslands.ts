import type { JigsawPiece } from "../../catalog/types";
import { getJigsawAssemblyComponents, type JigsawAssemblyProgress } from "./assembly";
import { getJigsawPieceOutlinePath } from "./edgePaths";
import { getJigsawSolvedPosition, getJigsawPieceCellSpan, type JigsawPlacement, type JigsawWorldLayout } from "./placement";
import type { JigsawEdgeModel } from "../../catalog/types";

export type PreparedJigsawPiece = {
  piece: JigsawPiece;
  outline: string;
  span: { width: number; height: number };
};

export const prepareJigsawVisualGeometry = (
  pieces: readonly JigsawPiece[],
  edgeModel: JigsawEdgeModel,
): ReadonlyMap<string, PreparedJigsawPiece> => new Map(pieces.map((piece) => [piece.id, {
  piece,
  outline: getJigsawPieceOutlinePath(piece, edgeModel),
  span: getJigsawPieceCellSpan(piece),
}]));

export type JigsawVisualIsland = {
  key: string;
  members: PreparedJigsawPiece[];
  minColumn: number;
  minRow: number;
  widthCells: number;
  heightCells: number;
  worldX: number;
  worldY: number;
  anchored: boolean;
};

export const composeJigsawVisualIslands = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  placements: readonly JigsawPlacement[],
  progress: JigsawAssemblyProgress,
  geometry: ReadonlyMap<string, PreparedJigsawPiece>,
): JigsawVisualIsland[] => {
  const byId = new Map(placements.map((placement) => [placement.id, placement]));
  const anchored = new Set(progress.anchoredPieceIds ?? []);
  return getJigsawAssemblyComponents(progress, pieces).flatMap((ids) => {
    const members = ids.flatMap((id) => {
      const entry = geometry.get(id);
      return entry && byId.has(id) ? [entry] : [];
    });
    if (!members.length) return [];
    const minColumn = Math.min(...members.map(({piece}) => piece.column));
    const minRow = Math.min(...members.map(({piece}) => piece.row));
    const maxColumn = Math.max(...members.map(({piece,span}) => piece.column + span.width));
    const maxRow = Math.max(...members.map(({piece,span}) => piece.row + span.height));
    const representative = members[0]!.piece;
    const origin = byId.get(representative.id)!;
    const solved = getJigsawSolvedPosition(layout, representative);
    const translationX = origin.worldX - solved.left;
    const translationY = origin.worldY - solved.top;
    return [{
      key: [...ids].sort().join("|"),
      members,
      minColumn, minRow,
      widthCells: maxColumn - minColumn,
      heightCells: maxRow - minRow,
      worldX: layout.boardX + minColumn * layout.pieceWidth + translationX,
      worldY: layout.boardY + minRow * layout.pieceHeight + translationY,
      anchored: ids.some((id) => anchored.has(id)),
    }];
  });
};
