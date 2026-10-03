import { describe, expect, it } from "vitest";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";
import {
  createJigsawCoarsePartition,
  getJigsawCoarsePartitionSectionForPiece,
  isJigsawCoarsePartitionSectionComplete,
} from "./partition";

const makePuzzle = (width = 5, height = 4) =>
  generateJigsaw({
    puzzleId: "jigsaw",
    seed: "coarse-partition-model",
    width,
    height,
    imageId: defaultJigsawImageAsset.id,
  });

describe("Jigsaw coarse partition model", () => {
  it("derives four stable sections over one global piece set", () => {
    const puzzle = makePuzzle(5, 4);
    const partition = createJigsawCoarsePartition(puzzle);

    expect(partition).not.toBeNull();
    expect(partition?.kind).toBe("2x2");
    expect(partition?.sections.map((section) => ({
      id: section.id,
      rows: [section.rowStart, section.rowEndExclusive],
      columns: [section.columnStart, section.columnEndExclusive],
      pieceCount: section.pieceIds.length,
    }))).toEqual([
      {
        id: "section-0-0",
        rows: [0, 2],
        columns: [0, 3],
        pieceCount: 6,
      },
      {
        id: "section-0-1",
        rows: [0, 2],
        columns: [3, 5],
        pieceCount: 4,
      },
      {
        id: "section-1-0",
        rows: [2, 4],
        columns: [0, 3],
        pieceCount: 6,
      },
      {
        id: "section-1-1",
        rows: [2, 4],
        columns: [3, 5],
        pieceCount: 4,
      },
    ]);

    const partitionPieceIds = partition!.sections.flatMap((section) => section.pieceIds);
    expect(partitionPieceIds).toHaveLength(puzzle.tiles.length);
    expect(new Set(partitionPieceIds)).toEqual(new Set(puzzle.tiles.map((piece) => piece.id)));
  });

  it("is derived deterministically from solved coordinates rather than shuffled tile order", () => {
    const puzzle = makePuzzle(5, 5);
    const reversed = {
      ...puzzle,
      tiles: [...puzzle.tiles].reverse(),
    };

    expect(createJigsawCoarsePartition(reversed)).toEqual(
      createJigsawCoarsePartition(puzzle),
    );
  });

  it("does not alter global piece identities, solved coordinates, or seam geometry", () => {
    const puzzle = makePuzzle(6, 6);
    const before = new Map(
      puzzle.tiles.map((piece) => [
        piece.id,
        {
          row: piece.row,
          column: piece.column,
          solvedIndex: piece.solvedIndex,
          edges: structuredClone(piece.edges),
        },
      ]),
    );

    const partition = createJigsawCoarsePartition(puzzle);
    expect(partition).not.toBeNull();

    for (const piece of puzzle.tiles) {
      expect({
        row: piece.row,
        column: piece.column,
        solvedIndex: piece.solvedIndex,
        edges: piece.edges,
      }).toEqual(before.get(piece.id));
    }

    const crossingSectionSeam = puzzle.tiles
      .flatMap((piece) => piece.edges.map((edge) => ({ piece, edge })))
      .find(({ piece, edge }) => {
        if (edge.boundary || !edge.neighborPieceId) return false;
        const leftSection = getJigsawCoarsePartitionSectionForPiece(partition!, piece.id);
        const rightSection = getJigsawCoarsePartitionSectionForPiece(
          partition!,
          edge.neighborPieceId,
        );
        return leftSection?.id !== rightSection?.id;
      });

    expect(crossingSectionSeam).toBeDefined();
    expect(crossingSectionSeam?.edge.boundary).toBe(false);
    expect(crossingSectionSeam?.edge.profileId).not.toBeNull();
  });

  it("derives section completion from the one global assembly state", () => {
    const puzzle = makePuzzle(4, 4);
    const partition = createJigsawCoarsePartition(puzzle)!;
    const section = partition.sections[0]!;
    const otherSection = partition.sections[1]!;

    expect(
      isJigsawCoarsePartitionSectionComplete(
        { joinedComponents: [] },
        section,
      ),
    ).toBe(false);

    expect(
      isJigsawCoarsePartitionSectionComplete(
        { joinedComponents: [[...section.pieceIds]] },
        section,
      ),
    ).toBe(true);

    expect(
      isJigsawCoarsePartitionSectionComplete(
        {
          joinedComponents: [[
            ...section.pieceIds,
            otherSection.pieceIds[0]!,
          ]],
        },
        section,
      ),
    ).toBe(true);
  });

  it("requires a genuinely coarse puzzle before introducing sections", () => {
    expect(createJigsawCoarsePartition(makePuzzle(3, 8))).toBeNull();
    expect(createJigsawCoarsePartition(makePuzzle(8, 3))).toBeNull();
    expect(createJigsawCoarsePartition(makePuzzle(4, 4))).not.toBeNull();
  });

  it("does not treat a singleton section as completed semantic progress", () => {
    const puzzle = makePuzzle(4, 4);
    const section = {
      ...createJigsawCoarsePartition(puzzle)!.sections[0]!,
      pieceIds: [puzzle.tiles[0]!.id],
    };

    expect(
      isJigsawCoarsePartitionSectionComplete(
        { joinedComponents: [] },
        section,
      ),
    ).toBe(false);
  });
});
