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
