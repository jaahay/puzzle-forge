import type { JigsawGeneratedPuzzle } from "../../catalog/types";
import type { JigsawAssemblyProgress } from "./assembly";
import { normalizeJigsawAssemblyProgress } from "./assembly";

export type JigsawCoarsePartitionSectionId =
  | "section-0-0"
  | "section-0-1"
  | "section-1-0"
  | "section-1-1";

export type JigsawCoarsePartitionSection = {
  id: JigsawCoarsePartitionSectionId;
  rowStart: number;
  rowEndExclusive: number;
  columnStart: number;
  columnEndExclusive: number;
  pieceIds: readonly string[];
};

export type JigsawCoarsePartition = {
  kind: "2x2";
  sections: readonly JigsawCoarsePartitionSection[];
};

export const jigsawCoarsePartitionMinimumAxis = 4;

const makeSectionId = (
  rowBand: 0 | 1,
  columnBand: 0 | 1,
): JigsawCoarsePartitionSectionId =>
  `section-${rowBand}-${columnBand}`;

const getBandBounds = (
  size: number,
  band: 0 | 1,
): readonly [number, number] => {
  const split = Math.ceil(size / 2);
  return band === 0 ? [0, split] : [split, size];
};

export const createJigsawCoarsePartition = (
  puzzle: Pick<JigsawGeneratedPuzzle, "width" | "height" | "tiles">,
): JigsawCoarsePartition | null => {
  if (
    puzzle.width < jigsawCoarsePartitionMinimumAxis ||
    puzzle.height < jigsawCoarsePartitionMinimumAxis
  ) return null;

  const sections: JigsawCoarsePartitionSection[] = [];

  for (const rowBand of [0, 1] as const) {
    const [rowStart, rowEndExclusive] = getBandBounds(puzzle.height, rowBand);

    for (const columnBand of [0, 1] as const) {
      const [columnStart, columnEndExclusive] = getBandBounds(
        puzzle.width,
        columnBand,
      );
      const pieceIds = puzzle.tiles
        .filter((piece) =>
          piece.row >= rowStart &&
          piece.row < rowEndExclusive &&
          piece.column >= columnStart &&
          piece.column < columnEndExclusive)
        .sort((left, right) => left.solvedIndex - right.solvedIndex)
        .map((piece) => piece.id);

      if (pieceIds.length === 0) return null;

      sections.push({
        id: makeSectionId(rowBand, columnBand),
        rowStart,
        rowEndExclusive,
        columnStart,
        columnEndExclusive,
        pieceIds,
      });
    }
  }

  return {
    kind: "2x2",
    sections,
  };
};

export const getJigsawCoarsePartitionSectionForPiece = (
  partition: JigsawCoarsePartition,
  pieceId: string,
): JigsawCoarsePartitionSection | null =>
  partition.sections.find((section) => section.pieceIds.includes(pieceId)) ?? null;

export const isJigsawCoarsePartitionSectionComplete = (
  progress: JigsawAssemblyProgress,
  section: JigsawCoarsePartitionSection,
) => {
  if (section.pieceIds.length < 2) return false;

  const normalized = normalizeJigsawAssemblyProgress(progress);
  return normalized.joinedComponents.some((component) => {
    const memberIds = new Set(component);
    return section.pieceIds.every((pieceId) => memberIds.has(pieceId));
  });
};
