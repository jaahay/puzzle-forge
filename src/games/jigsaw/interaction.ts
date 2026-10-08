import type { JigsawPiece } from "../../catalog/types";
import {
  getJigsawAssemblyComponents,
  getJigsawComponentPieceIds,
  mergeJigsawAssemblyComponents,
  type JigsawAssemblyProgress,
} from "./assembly";
import { getJigsawPieceNeighborIds } from "./specialTopology";
import {
  createInitialJigsawPlacements,
  getJigsawPieceWorldSize,
  getJigsawSolvedPosition,
  type JigsawPlacement,
  type JigsawViewport,
  type JigsawWorldLayout,
} from "./placement";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const getPlacementById = (placements: readonly JigsawPlacement[]) =>
  new Map(placements.map((placement) => [placement.id, placement] as const));

const getPieceById = (pieces: readonly JigsawPiece[]) =>
  new Map(pieces.map((piece) => [piece.id, piece] as const));

export const moveJigsawComponent = (
  layout: JigsawWorldLayout,
  placements: readonly JigsawPlacement[],
  pieceIds: readonly string[],
  deltaX: number,
  deltaY: number,
  pieces: readonly JigsawPiece[] = [],
): JigsawPlacement[] => {
  const ids = new Set(pieceIds);
  const members = placements.filter((placement) => ids.has(placement.id));
  if (members.length === 0) return placements.map((placement) => ({ ...placement }));

  const piecesById = getPieceById(pieces);
  const left = Math.min(...members.map((placement) => placement.worldX));
  const top = Math.min(...members.map((placement) => placement.worldY));
  const right = Math.max(...members.map((placement) => {
    const piece = piecesById.get(placement.id);
    return placement.worldX + (piece
      ? getJigsawPieceWorldSize(layout, piece).width
      : layout.pieceWidth);
  }));
  const bottom = Math.max(...members.map((placement) => {
    const piece = piecesById.get(placement.id);
    return placement.worldY + (piece
      ? getJigsawPieceWorldSize(layout, piece).height
      : layout.pieceHeight);
  }));
  const clampedDeltaX = clamp(deltaX, -left, layout.worldWidth - right);
  const clampedDeltaY = clamp(deltaY, -top, layout.worldHeight - bottom);

  return placements.map((placement) => ids.has(placement.id)
    ? {
        ...placement,
        worldX: placement.worldX + clampedDeltaX,
        worldY: placement.worldY + clampedDeltaY,
      }
    : { ...placement });
};

const alignComponentToTranslation = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  placements: readonly JigsawPlacement[],
  pieceIds: readonly string[],
  translationX: number,
  translationY: number,
) => {
  const piecesById = getPieceById(pieces);
  const ids = new Set(pieceIds);
  return placements.map((placement) => {
    if (!ids.has(placement.id)) return { ...placement };
    const piece = piecesById.get(placement.id);
    if (!piece) return { ...placement };
    const solved = getJigsawSolvedPosition(layout, piece);
    return {
      ...placement,
      worldX: solved.left + translationX,
      worldY: solved.top + translationY,
    };
  });
};

const getComponentTranslation = (
  layout: JigsawWorldLayout,
  piecesById: ReadonlyMap<string, JigsawPiece>,
  placementsById: ReadonlyMap<string, JigsawPlacement>,
  pieceId: string,
) => {
  const piece = piecesById.get(pieceId);
  const placement = placementsById.get(pieceId);
  if (!piece || !placement) return null;
  const solved = getJigsawSolvedPosition(layout, piece);
  return {
    x: placement.worldX - solved.left,
    y: placement.worldY - solved.top,
  };
};

const getSnapThreshold = (layout: JigsawWorldLayout) =>
  Math.max(18, Math.min(layout.pieceWidth, layout.pieceHeight) * 0.42);

export type JigsawDropOptions = {
  eligiblePieceIds?: ReadonlySet<string>;
  snapToFrame?: boolean;
};

export type JigsawDropResult = {
  placements: JigsawPlacement[];
  assembly: JigsawAssemblyProgress;
  joined: boolean;
};

export const resolveJigsawComponentDrop = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  placements: readonly JigsawPlacement[],
  assembly: JigsawAssemblyProgress,
  draggedPieceId: string,
  options: JigsawDropOptions = {},
): JigsawDropResult => {
  const { eligiblePieceIds, snapToFrame = false } = options;
  const draggedIds = getJigsawComponentPieceIds(assembly, draggedPieceId);
  if (eligiblePieceIds && draggedIds.some((pieceId) => !eligiblePieceIds.has(pieceId))) {
    return {
      placements: placements.map((placement) => ({ ...placement })),
      assembly,
      joined: false,
    };
  }
  const draggedIdSet = new Set(draggedIds);
  const piecesById = getPieceById(pieces);
  const placementsById = getPlacementById(placements);
  const draggedTranslation = getComponentTranslation(
    layout,
    piecesById,
    placementsById,
    draggedPieceId,
  );
  if (!draggedTranslation) {
    return {
      placements: placements.map((placement) => ({ ...placement })),
      assembly,
      joined: false,
    };
  }

  type SnapCandidate = {
    componentKey: string;
    pieceId: string;
    distance: number;
    translationX: number;
    translationY: number;
  };
  const candidates = new Map<string, SnapCandidate>();
  for (const pieceId of draggedIds) {
    const piece = piecesById.get(pieceId);
    if (!piece) continue;

    for (const neighborPieceId of getJigsawPieceNeighborIds(piece)) {
      if (draggedIdSet.has(neighborPieceId)) continue;
      const targetPieceIds = getJigsawComponentPieceIds(assembly, neighborPieceId);
      if (
        eligiblePieceIds &&
        targetPieceIds.some((pieceId) => !eligiblePieceIds.has(pieceId))
      ) continue;
      const componentKey = [...targetPieceIds].sort((left, right) => left.localeCompare(right)).join("\u0000");
      const targetTranslation = getComponentTranslation(
        layout,
        piecesById,
        placementsById,
        neighborPieceId,
      );
      if (!targetTranslation) continue;
      const distance = Math.hypot(
        draggedTranslation.x - targetTranslation.x,
        draggedTranslation.y - targetTranslation.y,
      );
      const existing = candidates.get(componentKey);
      if (
        !existing ||
        distance < existing.distance ||
        (distance === existing.distance && neighborPieceId.localeCompare(existing.pieceId) < 0)
      ) {
        candidates.set(componentKey, {
          componentKey,
          pieceId: neighborPieceId,
          distance,
          translationX: targetTranslation.x,
          translationY: targetTranslation.y,
        });
      }
    }
  }

  const snapThreshold = getSnapThreshold(layout);
  const remainingCandidates = [...candidates.values()];
  let mergedAssembly = assembly;
  let mergedPlacements = placements.map((placement) => ({ ...placement }));
  let currentTranslation = draggedTranslation;
  let joined = false;
  let frameAnchored = false;

  if (
    snapToFrame &&
    Math.hypot(currentTranslation.x, currentTranslation.y) <= snapThreshold
  ) {
    mergedPlacements = alignComponentToTranslation(
      layout,
      pieces,
      mergedPlacements,
      draggedIds,
      0,
      0,
    );
    currentTranslation = { x: 0, y: 0 };
    frameAnchored = true;
  }

  while (remainingCandidates.length > 0) {
    const nextCandidate = remainingCandidates
      .map((candidate) => ({
        candidate,
        distance: Math.hypot(
          candidate.translationX - currentTranslation.x,
          candidate.translationY - currentTranslation.y,
        ),
      }))
      .filter(({ distance }) => distance <= snapThreshold)
      .sort((left, right) =>
        left.distance - right.distance ||
        left.candidate.componentKey.localeCompare(right.candidate.componentKey))[0];
    if (!nextCandidate) break;

    const { candidate } = nextCandidate;
    const candidateIndex = remainingCandidates.findIndex(
      ({ componentKey }) => componentKey === candidate.componentKey,
    );
    if (candidateIndex >= 0) remainingCandidates.splice(candidateIndex, 1);

    mergedAssembly = mergeJigsawAssemblyComponents(
      mergedAssembly,
      draggedPieceId,
      candidate.pieceId,
    );
    const mergedIds = getJigsawComponentPieceIds(
      mergedAssembly,
      draggedPieceId,
    );
    const alignmentTranslation = frameAnchored
      ? currentTranslation
      : { x: candidate.translationX, y: candidate.translationY };
    const aligned = alignComponentToTranslation(
      layout,
      pieces,
      mergedPlacements,
      mergedIds,
      alignmentTranslation.x,
      alignmentTranslation.y,
    );

    mergedPlacements = moveJigsawComponent(
      layout,
      aligned,
      mergedIds,
      0,
      0,
      pieces,
    );
    currentTranslation = getComponentTranslation(
      layout,
      piecesById,
      getPlacementById(mergedPlacements),
      draggedPieceId,
    ) ?? alignmentTranslation;
    joined = true;
  }

  return {
    placements: mergedPlacements,
    assembly: mergedAssembly,
    joined,
  };
};

export const stageJigsawAssemblyPlacements = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  assembly: JigsawAssemblyProgress,
  viewport: JigsawViewport | null = null,
): JigsawPlacement[] => {
  const piecesById = getPieceById(pieces);
  const components = getJigsawAssemblyComponents(assembly, pieces);
  const representatives = components.flatMap((component) => {
    const candidates = component
      .flatMap((pieceId) => {
        const piece = piecesById.get(pieceId);
        return piece ? [piece] : [];
      })
      .sort((left, right) => left.currentIndex - right.currentIndex);
    return candidates[0] ? [candidates[0]] : [];
  });
  const representativePlacements = getPlacementById(
    createInitialJigsawPlacements(layout, representatives, viewport),
  );

  const staged: JigsawPlacement[] = [];
  for (const component of components) {
    const representative = component
      .flatMap((pieceId) => {
        const piece = piecesById.get(pieceId);
        return piece ? [piece] : [];
      })
      .sort((left, right) => left.currentIndex - right.currentIndex)[0];
    if (!representative) continue;

    const stagedRepresentative = representativePlacements.get(representative.id);
    if (!stagedRepresentative) continue;
    const solvedRepresentative = getJigsawSolvedPosition(layout, representative);
    const translationX = stagedRepresentative.worldX - solvedRepresentative.left;
    const translationY = stagedRepresentative.worldY - solvedRepresentative.top;

    for (const pieceId of component) {
      const piece = piecesById.get(pieceId);
      if (!piece) continue;
      const solved = getJigsawSolvedPosition(layout, piece);
      staged.push({
        id: piece.id,
        worldX: solved.left + translationX,
        worldY: solved.top + translationY,
      });
    }

    const normalized = moveJigsawComponent(
      layout,
      staged,
      component,
      0,
      0,
      pieces,
    );
    staged.splice(0, staged.length, ...normalized);
  }

  const stagedById = getPlacementById(staged);
  return pieces.map((piece) => stagedById.get(piece.id) ?? {
    id: piece.id,
    worldX: 0,
    worldY: 0,
  });
};
