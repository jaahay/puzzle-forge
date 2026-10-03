import type { JigsawPiece } from "../../catalog/types";
import {
  getJigsawAssemblyComponents,
  getJigsawComponentPieceIds,
  mergeJigsawAssemblyComponents,
  type JigsawAssemblyProgress,
} from "./assembly";
import {
  createInitialJigsawPlacements,
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
): JigsawPlacement[] => {
  const ids = new Set(pieceIds);
  const members = placements.filter((placement) => ids.has(placement.id));
  if (members.length === 0) return placements.map((placement) => ({ ...placement }));

  const left = Math.min(...members.map((placement) => placement.worldX));
  const top = Math.min(...members.map((placement) => placement.worldY));
  const right = Math.max(...members.map((placement) => placement.worldX + layout.pieceWidth));
  const bottom = Math.max(...members.map((placement) => placement.worldY + layout.pieceHeight));
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
): JigsawDropResult => {
  const draggedIds = getJigsawComponentPieceIds(assembly, draggedPieceId);
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
    pieceIds: string[];
    distance: number;
    translationX: number;
    translationY: number;
  };
  const candidates = new Map<string, SnapCandidate>();
  for (const pieceId of draggedIds) {
    const piece = piecesById.get(pieceId);
    if (!piece) continue;

    for (const edge of piece.edges) {
      if (edge.boundary || !edge.neighborPieceId || draggedIdSet.has(edge.neighborPieceId)) continue;
      const targetPieceIds = getJigsawComponentPieceIds(assembly, edge.neighborPieceId);
      const componentKey = [...targetPieceIds].sort((left, right) => left.localeCompare(right)).join("\u0000");
      const targetTranslation = getComponentTranslation(
        layout,
        piecesById,
        placementsById,
        edge.neighborPieceId,
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
        (distance === existing.distance && edge.neighborPieceId.localeCompare(existing.pieceId) < 0)
      ) {
        candidates.set(componentKey, {
          componentKey,
          pieceId: edge.neighborPieceId,
          pieceIds: targetPieceIds,
          distance,
          translationX: targetTranslation.x,
          translationY: targetTranslation.y,
        });
      }
    }
  }

  const snapThreshold = getSnapThreshold(layout);
  const viableCandidates = [...candidates.values()]
    .filter(({ distance }) => distance <= snapThreshold)
    .sort((left, right) =>
      left.distance - right.distance ||
      left.componentKey.localeCompare(right.componentKey));

  const primaryCandidate = viableCandidates[0];
  if (!primaryCandidate) {
    return {
      placements: placements.map((placement) => ({ ...placement })),
      assembly,
      joined: false,
    };
  }

  const compatibleTranslationEpsilon = 0.001;
  const compatibleCandidates = viableCandidates.filter((candidate) =>
    Math.hypot(
      candidate.translationX - primaryCandidate.translationX,
      candidate.translationY - primaryCandidate.translationY,
    ) <= compatibleTranslationEpsilon);

  let mergedAssembly = assembly;
  const mergedIdSet = new Set(draggedIds);
  for (const candidate of compatibleCandidates) {
    mergedAssembly = mergeJigsawAssemblyComponents(
      mergedAssembly,
      draggedPieceId,
      candidate.pieceId,
    );
    for (const pieceId of candidate.pieceIds) mergedIdSet.add(pieceId);
  }
  const mergedIds = [...mergedIdSet];
  const aligned = alignComponentToTranslation(
    layout,
    pieces,
    placements,
    mergedIds,
    primaryCandidate.translationX,
    primaryCandidate.translationY,
  );

  const alignedById = getPlacementById(aligned);
  const mergedMembers = mergedIds.flatMap((pieceId) => {
    const placement = alignedById.get(pieceId);
    return placement ? [placement] : [];
  });
  const left = Math.min(...mergedMembers.map((placement) => placement.worldX));
  const top = Math.min(...mergedMembers.map((placement) => placement.worldY));
  const right = Math.max(...mergedMembers.map((placement) => placement.worldX + layout.pieceWidth));
  const bottom = Math.max(...mergedMembers.map((placement) => placement.worldY + layout.pieceHeight));
  const correctionX = clamp(0, -left, layout.worldWidth - right);
  const correctionY = clamp(0, -top, layout.worldHeight - bottom);

  return {
    placements: moveJigsawComponent(layout, aligned, mergedIds, correctionX, correctionY),
    assembly: mergedAssembly,
    joined: true,
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

    const normalized = moveJigsawComponent(layout, staged, component, 0, 0);
    staged.splice(0, staged.length, ...normalized);
  }

  const stagedById = getPlacementById(staged);
  return pieces.map((piece) => stagedById.get(piece.id) ?? {
    id: piece.id,
    worldX: 0,
    worldY: 0,
  });
};
