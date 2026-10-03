import type { JigsawPiece } from "../../catalog/types";
import {
  cloneJigsawAssemblyProgress,
  makeEmptyJigsawAssemblyProgress,
  type JigsawAssemblyProgress,
} from "./assembly";
import { stageJigsawAssemblyPlacements } from "./interaction";
import {
  isUsableJigsawViewport,
  type JigsawPlacement,
  type JigsawViewport,
  type JigsawWorldLayout,
} from "./placement";

export type JigsawWorkspaceState = {
  placements: JigsawPlacement[];
  assembly: JigsawAssemblyProgress;
};

const stageJigsawWorkspaceState = (
  assembly: JigsawAssemblyProgress,
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  viewport: JigsawViewport | null,
): JigsawWorkspaceState | null => {
  if (!isUsableJigsawViewport(viewport)) return null;

  return {
    placements: stageJigsawAssemblyPlacements(layout, pieces, assembly, viewport),
    assembly: cloneJigsawAssemblyProgress(assembly),
  };
};

export const resolveInitialJigsawWorkspaceState = (
  assembly: JigsawAssemblyProgress,
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  viewport: JigsawViewport | null,
) => stageJigsawWorkspaceState(assembly, layout, pieces, viewport);

export const resetJigsawWorkspaceState = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  viewport: JigsawViewport | null,
) => stageJigsawWorkspaceState(
  makeEmptyJigsawAssemblyProgress(),
  layout,
  pieces,
  viewport,
);

export const restageJigsawWorkspaceState = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  assembly: JigsawAssemblyProgress,
  viewport: JigsawViewport | null,
) => stageJigsawWorkspaceState(assembly, layout, pieces, viewport);

export const restageJigsawWorkspaceSubset = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  assembly: JigsawAssemblyProgress,
  placements: readonly JigsawPlacement[],
  pieceIds: readonly string[],
  viewport: JigsawViewport | null,
): JigsawWorkspaceState | null => {
  if (!isUsableJigsawViewport(viewport)) return null;

  const focusedIds = new Set(pieceIds);
  const focusedPieces = pieces.filter((piece) => focusedIds.has(piece.id));
  if (focusedPieces.length === 0) return null;

  const restaged = stageJigsawAssemblyPlacements(
    layout,
    focusedPieces,
    assembly,
    viewport,
  );
  const restagedById = new Map(
    restaged.map((placement) => [placement.id, placement] as const),
  );

  return {
    placements: placements.map((placement) => {
      const next = restagedById.get(placement.id);
      return next ? { ...next } : { ...placement };
    }),
    assembly: cloneJigsawAssemblyProgress(assembly),
  };
};
