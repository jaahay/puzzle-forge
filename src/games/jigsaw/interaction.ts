import type { JigsawPiece } from "../../catalog/types";
import {
  anchorJigsawAssemblyComponent,
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
  const anchoredIds = new Set(assembly.anchoredPieceIds ?? []);
  if (draggedIds.some((pieceId) => anchoredIds.has(pieceId)) ||
      (eligiblePieceIds && draggedIds.some((pieceId) => !eligiblePieceIds.has(pieceId)))) {
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
    if (anchoredIds.has(candidate.pieceId)) frameAnchored = true;
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
      ? { x: 0, y: 0 }
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

  if (frameAnchored) {
    mergedAssembly = anchorJigsawAssemblyComponent(mergedAssembly, draggedPieceId);
    mergedPlacements = alignComponentToTranslation(
      layout, pieces, mergedPlacements,
      getJigsawComponentPieceIds(mergedAssembly, draggedPieceId), 0, 0,
    );
  }

  return {
    placements: mergedPlacements,
    assembly: mergedAssembly,
    joined,
  };
};

/**
 * Resolve already-eligible joins and frame anchors once when assistance is enabled.
 * The existing drop resolver owns tolerances, neighbor topology and island geometry.
 * Recheck each changed island so new alignments can expose further eligible joins.
 */
export const resolveJigsawAssistanceActivation = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  placements: readonly JigsawPlacement[],
  assembly: JigsawAssemblyProgress,
): JigsawDropResult => {
  let currentPlacements = placements.map((placement) => ({ ...placement }));
  let currentAssembly = assembly;
  let changed = false;
  const queue = getJigsawAssemblyComponents(assembly, pieces).map((group) => group[0]!);
  const pending = new Set(queue);
  const byId = getPieceById(pieces);
  while (queue.length > 0) {
    const pieceId = queue.shift()!;
    pending.delete(pieceId);
    if ((currentAssembly.anchoredPieceIds ?? []).includes(pieceId)) continue;
    const group = getJigsawComponentPieceIds(currentAssembly, pieceId);
    const result = resolveJigsawComponentDrop(layout, pieces, currentPlacements, currentAssembly, pieceId, {
      snapToFrame: true,
    });
    const changedAssembly = JSON.stringify(result.assembly) !== JSON.stringify(currentAssembly);
    const changedPlacements = result.placements.some((placement, index) => {
      const previous = currentPlacements[index];
      return previous && (placement.worldX !== previous.worldX || placement.worldY !== previous.worldY);
    });
    if (!changedAssembly && !changedPlacements) continue;
    changed = true;
    currentPlacements = result.placements;
    currentAssembly = result.assembly;
    const mergedGroup = getJigsawComponentPieceIds(currentAssembly, pieceId);
    const candidateIds = new Set([...group, ...mergedGroup]);
    for (const memberId of mergedGroup) {
      const member = byId.get(memberId);
      if (!member) continue;
      for (const neighborId of getJigsawPieceNeighborIds(member)) candidateIds.add(neighborId);
    }
    for (const candidateId of candidateIds) {
      if (!byId.has(candidateId) || pending.has(candidateId)) continue;
      if ((currentAssembly.anchoredPieceIds ?? []).includes(candidateId)) continue;
      pending.add(candidateId);
      queue.push(candidateId);
    }
  }
  return { placements: changed ? currentPlacements : placements.map((placement) => ({ ...placement })),
    assembly: currentAssembly, joined: changed };
};

export const stageJigsawAssemblyPlacements = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  assembly: JigsawAssemblyProgress,
  viewport: JigsawViewport | null = null,
): JigsawPlacement[] => {
  const piecesById = getPieceById(pieces);
  const anchored = new Set(assembly.anchoredPieceIds ?? []);
  // Every loose piece or joined island has one rectangular collision footprint.
  // The same continuous placer stages both, instead of placing a single
  // representative and letting the rest of an island overlap its neighbors.
  const groups = getJigsawAssemblyComponents(assembly, pieces).flatMap((component) => {
    const members = component.flatMap((id) => {
      const piece = piecesById.get(id);
      return piece ? [piece] : [];
    }).sort((a, b) => a.currentIndex - b.currentIndex);
    const representative = members[0];
    if (!representative) return [];
    const rectangles = members.map((piece) => {
      const solved = getJigsawSolvedPosition(layout, piece);
      return { ...solved, ...getJigsawPieceWorldSize(layout, piece) };
    });
    const left = Math.min(...rectangles.map((rect) => rect.left));
    const top = Math.min(...rectangles.map((rect) => rect.top));
    const right = Math.max(...rectangles.map((rect) => rect.left + rect.width));
    const bottom = Math.max(...rectangles.map((rect) => rect.top + rect.height));
    const representativeSolved = getJigsawSolvedPosition(layout, representative);
    return [{
      component,
      representative,
      anchored: component.some((id) => anchored.has(id)),
      footprint: {
        offsetX: left - representativeSolved.left,
        offsetY: top - representativeSolved.top,
        width: right - left,
        height: bottom - top,
        allowBoardOverlap: component.length > 1,
      },
      fixedBounds: { x: left, y: top, width: right - left, height: bottom - top },
    }];
  });
  const movable = groups.filter((group) => !group.anchored);
  const representativePlacements = getPlacementById(createInitialJigsawPlacements(
    layout,
    movable.map((group) => group.representative),
    viewport,
    {
      footprints: new Map(movable.map((group) => [group.representative.id, group.footprint] as const)),
      reserved: groups.filter((group) => group.anchored).map((group) => group.fixedBounds),
    },
  ));

  const staged: JigsawPlacement[] = [];
  for (const group of groups) {
    const { component, representative } = group;
    const stagedRepresentative = representativePlacements.get(representative.id);
    if (!group.anchored && !stagedRepresentative) {
      throw new Error("Missing Jigsaw assembly placement");
    }
    const solvedRepresentative = getJigsawSolvedPosition(layout, representative);
    const translationX = group.anchored ? 0 : stagedRepresentative!.worldX - solvedRepresentative.left;
    const translationY = group.anchored ? 0 : stagedRepresentative!.worldY - solvedRepresentative.top;
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
  }

  const stagedById = getPlacementById(staged);
  return pieces.map((piece) => stagedById.get(piece.id) ?? {
    id: piece.id,
    worldX: 0,
    worldY: 0,
  });
};
