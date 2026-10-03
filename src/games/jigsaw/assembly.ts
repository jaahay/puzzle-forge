import type { JigsawPiece } from "../../catalog/types";

export type JigsawAssemblyProgress = {
  joinedComponents: string[][];
};

export const makeEmptyJigsawAssemblyProgress = (): JigsawAssemblyProgress => ({
  joinedComponents: [],
});

const comparePieceIds = (left: string, right: string) => left.localeCompare(right);

const compareComponents = (left: readonly string[], right: readonly string[]) => {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const comparison = (left[index] ?? "").localeCompare(right[index] ?? "");
    if (comparison !== 0) return comparison;
  }
  return left.length - right.length;
};

export const normalizeJigsawAssemblyProgress = (
  progress: JigsawAssemblyProgress,
): JigsawAssemblyProgress => ({
  joinedComponents: progress.joinedComponents
    .filter((component) => component.length > 1)
    .map((component) => [...component].sort(comparePieceIds))
    .sort(compareComponents),
});

export const cloneJigsawAssemblyProgress = (
  progress: JigsawAssemblyProgress,
): JigsawAssemblyProgress => ({
  joinedComponents: progress.joinedComponents.map((component) => [...component]),
});

export const sameJigsawAssemblyProgress = (
  left: JigsawAssemblyProgress,
  right: JigsawAssemblyProgress,
) => {
  const normalizedLeft = normalizeJigsawAssemblyProgress(left);
  const normalizedRight = normalizeJigsawAssemblyProgress(right);
  return normalizedLeft.joinedComponents.length === normalizedRight.joinedComponents.length &&
    normalizedLeft.joinedComponents.every((component, componentIndex) => {
      const other = normalizedRight.joinedComponents[componentIndex];
      return Boolean(
        other &&
        component.length === other.length &&
        component.every((pieceId, pieceIndex) => pieceId === other[pieceIndex]),
      );
    });
};

const getConnectedNeighborIds = (piece: JigsawPiece) =>
  piece.edges.flatMap((edge) =>
    edge.boundary || edge.neighborPieceId === null ? [] : [edge.neighborPieceId]);

const isTopologyConnected = (
  component: readonly string[],
  piecesById: ReadonlyMap<string, JigsawPiece>,
) => {
  const componentIds = new Set(component);
  const first = component[0];
  if (!first) return false;

  const visited = new Set<string>([first]);
  const pending = [first];

  while (pending.length > 0) {
    const pieceId = pending.pop();
    if (!pieceId) continue;
    const piece = piecesById.get(pieceId);
    if (!piece) return false;

    for (const neighborId of getConnectedNeighborIds(piece)) {
      if (!componentIds.has(neighborId) || visited.has(neighborId)) continue;
      visited.add(neighborId);
      pending.push(neighborId);
    }
  }

  return visited.size === component.length;
};

export const parseJigsawAssemblyProgress = (
  value: unknown,
  pieces: readonly JigsawPiece[],
): JigsawAssemblyProgress | null => {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("joinedComponents" in value)
  ) return null;

  const rawComponents = (value as { joinedComponents?: unknown }).joinedComponents;
  if (!Array.isArray(rawComponents)) return null;

  const piecesById = new Map(pieces.map((piece) => [piece.id, piece] as const));
  const seen = new Set<string>();
  const components: string[][] = [];

  for (const rawComponent of rawComponents) {
    if (
      !Array.isArray(rawComponent) ||
      rawComponent.length < 2 ||
      rawComponent.some((pieceId) => typeof pieceId !== "string")
    ) return null;

    const component = rawComponent as string[];
    const local = new Set<string>();
    for (const pieceId of component) {
      if (!piecesById.has(pieceId) || local.has(pieceId) || seen.has(pieceId)) return null;
      local.add(pieceId);
      seen.add(pieceId);
    }

    if (!isTopologyConnected(component, piecesById)) return null;
    components.push([...component]);
  }

  return normalizeJigsawAssemblyProgress({ joinedComponents: components });
};

export const getJigsawComponentPieceIds = (
  progress: JigsawAssemblyProgress,
  pieceId: string,
) => {
  const component = progress.joinedComponents.find((candidate) => candidate.includes(pieceId));
  return component ? [...component] : [pieceId];
};

export const getJigsawAssemblyComponents = (
  progress: JigsawAssemblyProgress,
  pieces: readonly JigsawPiece[],
) => {
  const normalized = normalizeJigsawAssemblyProgress(progress);
  const joinedIds = new Set(normalized.joinedComponents.flat());
  const currentIndexById = new Map(pieces.map((piece) => [piece.id, piece.currentIndex] as const));
  const components = [
    ...normalized.joinedComponents.map((component) => [...component]),
    ...pieces.filter((piece) => !joinedIds.has(piece.id)).map((piece) => [piece.id]),
  ];

  return components.sort((left, right) => {
    const leftIndex = Math.min(...left.map((pieceId) => currentIndexById.get(pieceId) ?? Number.MAX_SAFE_INTEGER));
    const rightIndex = Math.min(...right.map((pieceId) => currentIndexById.get(pieceId) ?? Number.MAX_SAFE_INTEGER));
    return leftIndex - rightIndex || compareComponents(left, right);
  });
};

export const mergeJigsawAssemblyComponents = (
  progress: JigsawAssemblyProgress,
  leftPieceId: string,
  rightPieceId: string,
): JigsawAssemblyProgress => {
  const normalized = normalizeJigsawAssemblyProgress(progress);
  const left = normalized.joinedComponents.find((component) => component.includes(leftPieceId)) ?? [leftPieceId];
  const right = normalized.joinedComponents.find((component) => component.includes(rightPieceId)) ?? [rightPieceId];
  if (left.some((pieceId) => right.includes(pieceId))) return normalized;

  const replacedIds = new Set([...left, ...right]);
  const joinedComponents = normalized.joinedComponents
    .filter((component) => !component.some((pieceId) => replacedIds.has(pieceId)));
  joinedComponents.push([...replacedIds]);

  return normalizeJigsawAssemblyProgress({ joinedComponents });
};

export const getJigsawConnectedPieceCount = (progress: JigsawAssemblyProgress) =>
  normalizeJigsawAssemblyProgress(progress).joinedComponents
    .reduce((count, component) => count + component.length, 0);

export const isJigsawAssemblySolved = (
  progress: JigsawAssemblyProgress,
  pieceCount: number,
) => {
  const normalized = normalizeJigsawAssemblyProgress(progress);
  return pieceCount > 0 &&
    normalized.joinedComponents.length === 1 &&
    normalized.joinedComponents[0]?.length === pieceCount;
};
