import type { JigsawEdgeModel, JigsawPiece } from "../../catalog/types";
import { getJigsawAssemblyComponents, type JigsawAssemblyProgress } from "./assembly";
import { getJigsawPieceOutlinePath, getJigsawPieceSeamPaths, type JigsawPieceSeamPath } from "./edgePaths";
import { getJigsawPieceCellSpan, getJigsawSolvedPosition, type JigsawPlacement, type JigsawWorldLayout } from "./placement";

export type PreparedJigsawPiece = {
  piece: JigsawPiece;
  outline: string;
  seams: readonly JigsawPieceSeamPath[];
  span: { width: number; height: number };
};

/** Canonical geometry is prepared once per puzzle, never during a drag or join. */
export const prepareJigsawVisualGeometry = (
  pieces: readonly JigsawPiece[],
  edgeModel: JigsawEdgeModel,
): ReadonlyMap<string, PreparedJigsawPiece> => new Map(pieces.map((piece) => [piece.id, {
  piece,
  outline: getJigsawPieceOutlinePath(piece, edgeModel),
  seams: getJigsawPieceSeamPaths(piece, edgeModel),
  span: getJigsawPieceCellSpan(piece),
}]));

export type JigsawIslandCut = {
  /** A physical cut is stroked only once even if two joined pieces share it. */
  key: string;
  kind: "interior" | "exterior";
  d: string;
  offsetX: number;
  offsetY: number;
};

export type JigsawVisualIslandGeometry = {
  /** Stable across absorption; a retired island is eligible for DOM/GC cleanup. */
  key: string;
  /** Fresh clip definition whenever this island's membership changes, even if its DOM key survives. */
  clipRevision: number;
  members: readonly PreparedJigsawPiece[];
  cuts: readonly JigsawIslandCut[];
  minColumn: number;
  minRow: number;
  widthCells: number;
  heightCells: number;
};

export type JigsawVisualScene = {
  islands: readonly JigsawVisualIslandGeometry[];
  byPieceId: ReadonlyMap<string, JigsawVisualIslandGeometry>;
  nextId: number;
};

export type JigsawPositionedVisualIsland = JigsawVisualIslandGeometry & {
  worldX: number;
  worldY: number;
};

/** Excludes anchoring and world placements: only membership invalidates geometry. */
export const getJigsawVisualMembershipKey = (progress: JigsawAssemblyProgress): string =>
  progress.joinedComponents
    .map((component) => [...component].sort().join(","))
    .sort().join("|");

/**
 * Reconcile components against previous membership. The component with the
 * largest surviving overlap retains its original island DOM identity on merge.
 * On split/Undo the largest descendant retains it; other descendants are new.
 * Tie-breaking is deterministic, and no island identity enters saved progress.
 */
/**
 * Build one stroke per physical cut from cached canonical edge paths. Closed
 * per-piece outlines remain available for clipping and hit testing, but must
 * not be individually stroked in a joined island: overlapping strokes create
 * bright seams and malformed T junctions.
 */
export const composeJigsawIslandCuts = (
  members: readonly PreparedJigsawPiece[],
  minColumn: number,
  minRow: number,
): JigsawIslandCut[] => {
  const memberIds = new Set(members.map(({ piece }) => piece.id));
  const seen = new Set<string>();
  const cuts: JigsawIslandCut[] = [];

  for (const { piece, outline, seams } of members) {
    const offsetX = (piece.column - minColumn) * 100;
    const offsetY = (piece.row - minRow) * 100;
    const shape = piece.specialShape?.kind;
    // The special hub has no conventional edges; a lone socket also needs its
    // curved outline rather than the incomplete subset of its radial edges.
    if (shape === "medallion" || shape === "capsule" ||
        (members.length === 1 && (shape === "medallion-socket" ||
          shape === "capsule-socket"))) {
      cuts.push({
        key: `special:${piece.id}`,
        kind: members.length === 1 ? "exterior" : "interior",
        d: outline, offsetX, offsetY,
      });
      continue;
    }

    for (const seam of seams) {
      if (!seam.d) continue;
      const edge = piece.edges.find((candidate) => candidate.edgeId === seam.edgeId);
      if (!edge) continue;
      const shared = !edge.boundary && memberIds.has(edge.neighborPieceId);
      const key = shared
        ? [edge.edgeId, edge.neighborEdgeId].sort().join("|")
        : edge.edgeId;
      if (seen.has(key)) continue;
      seen.add(key);
      cuts.push({
        key, kind: shared ? "interior" : "exterior",
        d: seam.d, offsetX, offsetY,
      });
    }
  }
  return cuts;
};

export const reconcileJigsawVisualScene = (
  pieces: readonly JigsawPiece[],
  progress: JigsawAssemblyProgress,
  geometry: ReadonlyMap<string, PreparedJigsawPiece>,
  previous: JigsawVisualScene | null = null,
): JigsawVisualScene => {
  const groups = getJigsawAssemblyComponents(progress, pieces);
  const overlaps = groups.map((ids) => {
    const counts = new Map<JigsawVisualIslandGeometry, number>();
    for (const id of ids) {
      const old = previous?.byPieceId.get(id);
      if (old) counts.set(old, (counts.get(old) ?? 0) + 1);
    }
    return counts;
  });
  const preferredGroup = new Map<JigsawVisualIslandGeometry, number>();
  for (let index = 0; index < overlaps.length; index += 1) {
    for (const [old, count] of overlaps[index]!) {
      const current = preferredGroup.get(old);
      if (current === undefined || count > (overlaps[current]?.get(old) ?? 0)) {
        preferredGroup.set(old, index);
      }
    }
  }

  let nextId = previous?.nextId ?? 0;
  const islands = groups.flatMap((ids, index) => {
    const members = ids.flatMap((id) => {
      const entry = geometry.get(id);
      return entry ? [entry] : [];
    });
    if (!members.length) return [];
    const survivor = [...overlaps[index]!].filter(([old]) => preferredGroup.get(old) === index)
      .sort(([left, leftCount], [right, rightCount]) =>
        rightCount - leftCount || right.members.length - left.members.length ||
        left.key.localeCompare(right.key))[0]?.[0];
    if (survivor && survivor.members.length === members.length &&
        survivor.members.every((entry, i) => entry === members[i])) {
      return [survivor];
    }
    const clipRevision = nextId++;
    const key = survivor?.key ?? `island-${clipRevision}`;
    const minColumn = Math.min(...members.map(({ piece }) => piece.column));
    const minRow = Math.min(...members.map(({ piece }) => piece.row));
    const maxColumn = Math.max(...members.map(({ piece, span }) => piece.column + span.width));
    const maxRow = Math.max(...members.map(({ piece, span }) => piece.row + span.height));
    return [{
      key, clipRevision, members, cuts: composeJigsawIslandCuts(members, minColumn, minRow), minColumn, minRow,
      widthCells: maxColumn - minColumn,
      heightCells: maxRow - minRow,
    }];
  });
  const byPieceId = new Map<string, JigsawVisualIslandGeometry>();
  for (const island of islands) {
    for (const { piece } of island.members) byPieceId.set(piece.id, island);
  }
  return { islands, byPieceId, nextId };
};

/**
 * World positions change independently of membership. Unmoved islands retain
 * their positioned object identity, so the view can skip their SVG rendering.
 */
export const positionJigsawVisualIslands = (
  scene: JigsawVisualScene,
  layout: JigsawWorldLayout,
  placements: readonly JigsawPlacement[],
  previous: readonly JigsawPositionedVisualIsland[] = [],
): JigsawPositionedVisualIsland[] => {
  const byId = new Map(placements.map((placement) => [placement.id, placement]));
  const oldByKey = new Map(previous.map((island) => [island.key, island]));
  return scene.islands.flatMap((geometry) => {
    const representative = geometry.members[0]?.piece;
    if (!representative) return [];
    const placement = byId.get(representative.id);
    if (!placement) return [];
    const solved = getJigsawSolvedPosition(layout, representative);
    const worldX = layout.boardX + geometry.minColumn * layout.pieceWidth + placement.worldX - solved.left;
    const worldY = layout.boardY + geometry.minRow * layout.pieceHeight + placement.worldY - solved.top;
    const old = oldByKey.get(geometry.key);
    if (old?.members === geometry.members && old.worldX === worldX && old.worldY === worldY) {
      return [old];
    }
    return [{ ...geometry, worldX, worldY }];
  });
};
