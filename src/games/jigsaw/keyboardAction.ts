import type { JigsawPiece } from "../../catalog/types";
import { getJigsawComponentPieceIds } from "./assembly";
import { moveJigsawComponent, resolveJigsawComponentDrop } from "./interaction";
import type { JigsawWorkspaceSnapshot } from "./history";
import type { JigsawWorldLayout } from "./placement";

export type JigsawKeyboardDirection = "ArrowUp" | "ArrowRight" | "ArrowDown" | "ArrowLeft";

/** One completed key move uses the same placement, snap and history model as a pointer drop. */
export const advanceJigsawKeyboardPiece = (
  layout: JigsawWorldLayout, pieces: readonly JigsawPiece[],
  snapshot: JigsawWorkspaceSnapshot, pieceId: string,
  direction: JigsawKeyboardDirection, largeStep: boolean, snapToFrame: boolean,
): JigsawWorkspaceSnapshot | null => {
  const ids = getJigsawComponentPieceIds(snapshot.assembly, pieceId);
  if (ids.some((id) => snapshot.assembly.anchoredPieceIds?.includes(id))) return null;
  const distance = Math.min(layout.pieceWidth, layout.pieceHeight) * (largeStep ? 0.7 : 0.18);
  const dx = direction === "ArrowRight" ? distance : direction === "ArrowLeft" ? -distance : 0;
  const dy = direction === "ArrowDown" ? distance : direction === "ArrowUp" ? -distance : 0;
  const moved = moveJigsawComponent(layout, snapshot.placements, ids, dx, dy, pieces);
  const dropped = resolveJigsawComponentDrop(layout, pieces, moved, snapshot.assembly, pieceId, { snapToFrame });
  return { placements: dropped.placements, assembly: dropped.assembly };
};
