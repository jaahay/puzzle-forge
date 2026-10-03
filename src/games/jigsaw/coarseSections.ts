import type { JigsawPiece } from "../../catalog/types";
import type { JigsawAssemblyProgress } from "./assembly";

export const jigsawCoarseSectionIds = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;

export type JigsawCoarseSectionId = (typeof jigsawCoarseSectionIds)[number];

export type JigsawCoarseSection = {
  id: JigsawCoarseSectionId;
  partitionRow: 0 | 1;
  partitionColumn: 0 | 1;
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
  pieceIds: readonly string[];
};

const sectionDescriptors: readonly Pick<
  JigsawCoarseSection,
  "id" | "partitionRow" | "partitionColumn"
>[] = [
  { id: "top-left", partitionRow: 0, partitionColumn: 0 },
  { id: "top-right", partitionRow: 0, partitionColumn: 1 },
  { id: "bottom-left", partitionRow: 1, partitionColumn: 0 },
  { id: "bottom-right", partitionRow: 1, partitionColumn: 1 },
];

const getAxisBounds = (
  length: number,
  partitionIndex: 0 | 1,
): readonly [start: number, end: number] => {
  const split = Math.ceil(length / 2);
  return partitionIndex === 0
    ? [0, split]
    : [split, length];
};

export const createJigsawCoarseSections = (
  pieces: readonly JigsawPiece[],
  width: number,
  height: number,
): readonly JigsawCoarseSection[] => {
  if (width < 2 || height < 2) return [];

  const piecesInSolvedOrder = [...pieces].sort(
    (left, right) =>
      left.solvedIndex - right.solvedIndex ||
      left.id.localeCompare(right.id),
  );

  return sectionDescriptors.map((descriptor) => {
    const [rowStart, rowEnd] = getAxisBounds(
      height,
      descriptor.partitionRow,
    );
    const [columnStart, columnEnd] = getAxisBounds(
      width,
      descriptor.partitionColumn,
    );

    return {
      ...descriptor,
      rowStart,
      rowEnd,
      columnStart,
      columnEnd,
      pieceIds: piecesInSolvedOrder
        .filter(
          (piece) =>
            piece.row >= rowStart &&
            piece.row < rowEnd &&
            piece.column >= columnStart &&
            piece.column < columnEnd,
        )
        .map((piece) => piece.id),
    };
  });
};

export const getJigsawCoarseSectionForPiece = (
  sections: readonly JigsawCoarseSection[],
  pieceId: string,
): JigsawCoarseSection | null =>
  sections.find((section) => section.pieceIds.includes(pieceId)) ?? null;

export const isJigsawCoarseSectionComplete = (
  section: JigsawCoarseSection,
  assembly: JigsawAssemblyProgress,
) => {
  const firstPieceId = section.pieceIds[0];
  if (!firstPieceId) return false;
  if (section.pieceIds.length === 1) return true;

  const component = assembly.joinedComponents.find((candidate) =>
    candidate.includes(firstPieceId),
  );
  if (!component) return false;

  const componentIds = new Set(component);
  return section.pieceIds.every((pieceId) => componentIds.has(pieceId));
};


export const getJigsawCoarseSectionFocusPieceIds = (
  section: JigsawCoarseSection,
  assembly: JigsawAssemblyProgress,
  pieces: readonly JigsawPiece[],
) => {
  const focusedIds = new Set(section.pieceIds);

  for (const component of assembly.joinedComponents) {
    if (!component.some((pieceId) => focusedIds.has(pieceId))) continue;
    for (const pieceId of component) focusedIds.add(pieceId);
  }

  return pieces
    .filter((piece) => focusedIds.has(piece.id))
    .sort(
      (left, right) =>
        left.solvedIndex - right.solvedIndex ||
        left.id.localeCompare(right.id),
    )
    .map((piece) => piece.id);
};
