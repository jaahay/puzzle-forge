import type { JigsawPiece } from "../../catalog/types";
import { isJigsawAssemblySolved } from "./assembly";
import {
  commitJigsawPlacementAction,
  cloneJigsawSnapshot,
  type JigsawHistoryState,
  type JigsawWorkspaceSnapshot,
} from "./history";
import { moveJigsawComponent, resolveJigsawComponentDrop } from "./interaction";
import {
  screenToJigsawWorld,
  type JigsawCamera,
  type JigsawPlacement,
  type JigsawViewport,
  type JigsawWorldLayout,
} from "./placement";

export type JigsawStagePoint = {
  x: number;
  y: number;
};

export type JigsawDragAction = {
  puzzleId: string;
  tileId: string;
  pieceIds: string[];
  pointerId: number;
  offsetWorldX: number;
  offsetWorldY: number;
  originWorldX: number;
  originWorldY: number;
  startSnapshot: JigsawWorkspaceSnapshot;
  clientX: number;
  clientY: number;
};

type BeginJigsawDragActionInput = {
  puzzleId: string;
  tileId: string;
  pieceIds: string[];
  pointerId: number;
  camera: JigsawCamera;
  viewport: JigsawViewport;
  stagePoint: JigsawStagePoint;
  origin: { left: number; top: number };
  snapshot: JigsawWorkspaceSnapshot;
  clientX: number;
  clientY: number;
};

export const beginJigsawDragAction = ({
  puzzleId,
  tileId,
  pieceIds,
  pointerId,
  camera,
  viewport,
  stagePoint,
  origin,
  snapshot,
  clientX,
  clientY,
}: BeginJigsawDragActionInput): JigsawDragAction => {
  const worldPoint = screenToJigsawWorld(
    camera,
    viewport,
    stagePoint.x,
    stagePoint.y,
  );

  return {
    puzzleId,
    tileId,
    pieceIds: [...pieceIds],
    pointerId,
    offsetWorldX: worldPoint.x - origin.left,
    offsetWorldY: worldPoint.y - origin.top,
    originWorldX: origin.left,
    originWorldY: origin.top,
    startSnapshot: cloneJigsawSnapshot(snapshot),
    clientX,
    clientY,
  };
};

export type JigsawDragProjection = {
  placements: JigsawPlacement[];
  dragX: number;
  dragY: number;
};

export const projectJigsawDragAction = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  camera: JigsawCamera,
  viewport: JigsawViewport,
  stagePoint: JigsawStagePoint,
  drag: JigsawDragAction,
): JigsawDragProjection | null => {
  const pointerWorld = screenToJigsawWorld(
    camera,
    viewport,
    stagePoint.x,
    stagePoint.y,
  );
  const startPlacement = drag.startSnapshot.placements
    .find((placement) => placement.id === drag.tileId);
  if (!startPlacement) return null;

  const movedPlacements = moveJigsawComponent(
    layout,
    drag.startSnapshot.placements,
    drag.pieceIds,
    pointerWorld.x - drag.offsetWorldX - startPlacement.worldX,
    pointerWorld.y - drag.offsetWorldY - startPlacement.worldY,
    pieces,
  );
  const movedPlacement = movedPlacements
    .find((placement) => placement.id === drag.tileId);
  if (!movedPlacement) return null;

  return {
    placements: movedPlacements,
    dragX: movedPlacement.worldX - drag.originWorldX,
    dragY: movedPlacement.worldY - drag.originWorldY,
  };
};

export type JigsawCompletedDragAction = {
  snapshot: JigsawWorkspaceSnapshot;
  history: JigsawHistoryState;
  solved: boolean;
};

export const completeJigsawDragAction = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  history: JigsawHistoryState,
  movedPlacements: readonly JigsawPlacement[],
  drag: JigsawDragAction,
  eligiblePieceIds?: ReadonlySet<string>,
): JigsawCompletedDragAction => {
  const dropped = resolveJigsawComponentDrop(
    layout,
    pieces,
    movedPlacements,
    drag.startSnapshot.assembly,
    drag.tileId,
    eligiblePieceIds,
  );
  const snapshot: JigsawWorkspaceSnapshot = {
    placements: dropped.placements,
    assembly: dropped.assembly,
  };

  return {
    snapshot,
    history: commitJigsawPlacementAction(
      history,
      drag.startSnapshot,
      snapshot,
    ),
    solved: isJigsawAssemblySolved(snapshot.assembly, pieces.length),
  };
};

export const cancelJigsawDragAction = (
  drag: JigsawDragAction,
): JigsawWorkspaceSnapshot => cloneJigsawSnapshot(drag.startSnapshot);
