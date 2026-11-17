import type { JigsawPiece } from "../../catalog/types";
import { parseJigsawAssemblyProgress, type JigsawAssemblyProgress } from "./assembly";
import {
  jigsawHistoryLimit,
  type JigsawActionRuntime,
  type JigsawWorkspaceSnapshot,
} from "./history";

/** Current workspace + sparse reverse patches; piece IDs are implicit in regenerated order. */
export type PersistedJigsawAssembly = {
  joinedComponents: number[][];
  anchoredPieceIds?: number[];
};
export type PersistedJigsawFrame = {
  positions: Array<[number, number]>;
  assembly: PersistedJigsawAssembly;
};
export type PersistedJigsawPatch = {
  positions: Array<[number, number, number]>;
  assembly?: PersistedJigsawAssembly;
};
export type PersistedJigsawRuntime = {
  current: PersistedJigsawFrame;
  undo: PersistedJigsawPatch[];
  redo: PersistedJigsawPatch[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isIndex = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;
const isCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1e7;
const isPair = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && value.every(isCoordinate);
const isTriple = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) && value.length === 3 && isIndex(value[0]) &&
  isCoordinate(value[1]) && isCoordinate(value[2]);
const isIndexedAssembly = (value: unknown): value is PersistedJigsawAssembly =>
  isRecord(value) && Array.isArray(value.joinedComponents) &&
  value.joinedComponents.every((group) => Array.isArray(group) && group.every(isIndex)) &&
  (value.anchoredPieceIds === undefined ||
    (Array.isArray(value.anchoredPieceIds) && value.anchoredPieceIds.every(isIndex)));
const isFrame = (value: unknown): value is PersistedJigsawFrame =>
  isRecord(value) && Array.isArray(value.positions) && value.positions.every(isPair) &&
  isIndexedAssembly(value.assembly);
const isPatch = (value: unknown): value is PersistedJigsawPatch =>
  isRecord(value) && Array.isArray(value.positions) && value.positions.every(isTriple) &&
  (value.assembly === undefined || isIndexedAssembly(value.assembly));

/** A valid current board is enough to preserve progress when history alone is damaged. */
export const hasPersistedJigsawCurrent = (
  value: unknown,
): value is Record<string, unknown> & { current: PersistedJigsawFrame } =>
  isRecord(value) && isFrame(value.current);

export const isPersistedJigsawRuntime = (value: unknown): value is PersistedJigsawRuntime =>
  hasPersistedJigsawCurrent(value) &&
  Array.isArray(value.undo) && value.undo.length <= jigsawHistoryLimit && value.undo.every(isPatch) &&
  Array.isArray(value.redo) && value.redo.length <= jigsawHistoryLimit && value.redo.every(isPatch) &&
  value.undo.length + value.redo.length <= jigsawHistoryLimit;

const cloneAssembly = (assembly: PersistedJigsawAssembly): PersistedJigsawAssembly => ({
  joinedComponents: assembly.joinedComponents.map((component) => [...component]),
  ...(assembly.anchoredPieceIds ? { anchoredPieceIds: [...assembly.anchoredPieceIds] } : {}),
});
const cloneFrame = (frame: PersistedJigsawFrame): PersistedJigsawFrame => ({
  positions: frame.positions.map(([x, y]) => [x, y]),
  assembly: cloneAssembly(frame.assembly),
});
const clonePatches = (patches: PersistedJigsawPatch[]): PersistedJigsawPatch[] =>
  patches.map((patch) => ({
    positions: patch.positions.map(([index, x, y]) => [index, x, y]),
    ...(patch.assembly ? { assembly: cloneAssembly(patch.assembly) } : {}),
  }));

export const normalizePersistedJigsawRuntime = (value: unknown): PersistedJigsawRuntime | null => {
  if (!hasPersistedJigsawCurrent(value)) return null;
  return {
    current: cloneFrame(value.current),
    undo: isPersistedJigsawRuntime(value) ? clonePatches(value.undo) : [],
    redo: isPersistedJigsawRuntime(value) ? clonePatches(value.redo) : [],
  };
};

const encodeFrame = (
  snapshot: JigsawWorkspaceSnapshot,
  pieces: readonly JigsawPiece[],
  indexById: ReadonlyMap<string, number>,
): PersistedJigsawFrame | null => {
  if (snapshot.placements.length !== pieces.length) return null;
  const assembly = parseJigsawAssemblyProgress(snapshot.assembly, pieces);
  if (!assembly) return null;
  const byId = new Map<string, [number, number]>();
  for (const placement of snapshot.placements) {
    if (byId.has(placement.id) || !indexById.has(placement.id) ||
        !isCoordinate(placement.worldX) || !isCoordinate(placement.worldY)) return null;
    byId.set(placement.id, [placement.worldX, placement.worldY]);
  }
  const positions: Array<[number, number]> = [];
  for (const piece of pieces) {
    const position = byId.get(piece.id);
    if (!position) return null;
    positions.push(position);
  }
  const encodeIds = (ids: readonly string[]) => {
    const result: number[] = [];
    for (const id of ids) {
      const index = indexById.get(id);
      if (index === undefined) return null;
      result.push(index);
    }
    return result;
  };
  const joinedComponents: number[][] = [];
  for (const component of assembly.joinedComponents) {
    const joined = encodeIds(component);
    if (!joined) return null;
    joinedComponents.push(joined);
  }
  const anchored = assembly.anchoredPieceIds ? encodeIds(assembly.anchoredPieceIds) : [];
  if (anchored === null) return null;
  return {
    positions,
    assembly: { joinedComponents, ...(anchored.length ? { anchoredPieceIds: anchored } : {}) },
  };
};

/** Encode only the changed coordinates; preserve the immutable per-piece ordering. */
const makePatch = (
  target: JigsawWorkspaceSnapshot,
  successor: JigsawWorkspaceSnapshot,
  pieces: readonly JigsawPiece[],
  indexes: ReadonlyMap<string, number>,
): PersistedJigsawPatch | null => {
  if (target.placements.length !== pieces.length || successor.placements.length !== pieces.length) return null;
  const positions: Array<[number, number, number]> = [];
  for (let index = 0; index < pieces.length; index += 1) {
    const before = target.placements[index]!;
    const after = successor.placements[index]!;
    if (before.id !== pieces[index]!.id || after.id !== before.id ||
        !isCoordinate(before.worldX) || !isCoordinate(before.worldY) ||
        !isCoordinate(after.worldX) || !isCoordinate(after.worldY)) return null;
    if (before.worldX !== after.worldX || before.worldY !== after.worldY) {
      positions.push([index, before.worldX, before.worldY]);
    }
  }
  if (JSON.stringify(target.assembly) === JSON.stringify(successor.assembly)) return { positions };
  const encoded = encodeFrame(target, pieces, indexes);
  return encoded ? { positions, assembly: encoded.assembly } : null;
};

export const buildPersistedJigsawRuntime = (
  runtime: JigsawActionRuntime,
  pieces: readonly JigsawPiece[],
): PersistedJigsawRuntime | null => {
  const indexes = new Map(pieces.map((piece, index) => [piece.id, index] as const));
  const current = encodeFrame(runtime.snapshot, pieces, indexes);
  if (!current || runtime.history.undoStack.length + runtime.history.redoStack.length > jigsawHistoryLimit) return null;
  const encodeStack = (snapshots: JigsawWorkspaceSnapshot[]) => {
    const patches: PersistedJigsawPatch[] = [];
    let successor = runtime.snapshot;
    for (let index = snapshots.length - 1; index >= 0; index -= 1) {
      const target = snapshots[index]!;
      const patch = makePatch(target, successor, pieces, indexes);
      if (!patch) return null;
      patches[index] = patch;
      successor = target;
    }
    return patches;
  };
  const undo = encodeStack(runtime.history.undoStack);
  const redo = encodeStack(runtime.history.redoStack);
  return undo && redo ? { current, undo, redo } : null;
};

const restoreFrame = (frame: PersistedJigsawFrame, pieces: readonly JigsawPiece[]): JigsawWorkspaceSnapshot | null => {
  if (frame.positions.length !== pieces.length) return null;
  const ids = (indices: readonly number[]) => {
    const result: string[] = [];
    for (const index of indices) {
      const piece = pieces[index];
      if (!piece) return null;
      result.push(piece.id);
    }
    return result;
  };
  const joinedComponents: string[][] = [];
  for (const component of frame.assembly.joinedComponents) {
    const members = ids(component);
    if (!members) return null;
    joinedComponents.push(members);
  }
  const anchored = frame.assembly.anchoredPieceIds ? ids(frame.assembly.anchoredPieceIds) : [];
  if (anchored === null) return null;
  const assembly: JigsawAssemblyProgress = {
    joinedComponents,
    ...(anchored.length ? { anchoredPieceIds: anchored } : {}),
  };
  const parsed = parseJigsawAssemblyProgress(assembly, pieces);
  if (!parsed) return null;
  return {
    placements: frame.positions.map(([worldX, worldY], index) => ({
      id: pieces[index]!.id, worldX, worldY,
    })),
    assembly: parsed,
  };
};

const reversePatch = (
  successor: PersistedJigsawFrame,
  patch: PersistedJigsawPatch,
  count: number,
): PersistedJigsawFrame | null => {
  const positions = successor.positions.map(([x, y]): [number, number] => [x, y]);
  const seen = new Set<number>();
  for (const [index, x, y] of patch.positions) {
    if (index >= count || seen.has(index)) return null;
    seen.add(index);
    positions[index] = [x, y];
  }
  return { positions, assembly: cloneAssembly(patch.assembly ?? successor.assembly) };
};

export const restorePersistedJigsawRuntime = (
  value: unknown,
  pieces: readonly JigsawPiece[],
): JigsawActionRuntime | null => {
  const stored = normalizePersistedJigsawRuntime(value);
  if (!stored || stored.current.positions.length !== pieces.length) return null;
  const snapshot = restoreFrame(stored.current, pieces);
  if (!snapshot) return null;
  const restoreStack = (patches: PersistedJigsawPatch[]) => {
    const snapshots: JigsawWorkspaceSnapshot[] = new Array(patches.length);
    let successor = stored.current;
    for (let index = patches.length - 1; index >= 0; index -= 1) {
      const frame = reversePatch(successor, patches[index]!, pieces.length);
      if (!frame) return null;
      const restored = restoreFrame(frame, pieces);
      if (!restored) return null;
      snapshots[index] = restored;
      successor = frame;
    }
    return snapshots;
  };
  const undoStack = restoreStack(stored.undo);
  const redoStack = restoreStack(stored.redo);
  return {
    snapshot,
    history: {
      undoStack: undoStack ?? [],
      redoStack: redoStack ?? [],
    },
  };
};
