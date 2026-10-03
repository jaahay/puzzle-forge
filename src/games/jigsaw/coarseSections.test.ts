import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../../catalog/types";
import {
  createJigsawCoarseSections,
  getJigsawCoarseSectionForPiece,
  isJigsawCoarseSectionComplete,
} from "./coarseSections";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";

const makeGrid = (width: number, height: number): JigsawPiece[] =>
  Array.from({ length: width * height }, (_, solvedIndex) => ({
    id: `tile-${solvedIndex}`,
    currentIndex: width * height - 1 - solvedIndex,
    solvedIndex,
    row: Math.floor(solvedIndex / width),
    column: solvedIndex % width,
    edges: [],
  })).reverse();

describe("Jigsaw coarse sections", () => {
  it("partitions an even grid into four stable solved-space quadrants", () => {
    const sections = createJigsawCoarseSections(makeGrid(4, 4), 4, 4);

    expect(sections).toEqual([
      {
        id: "top-left",
        partitionRow: 0,
        partitionColumn: 0,
        rowStart: 0,
        rowEnd: 2,
        columnStart: 0,
        columnEnd: 2,
        pieceIds: ["tile-0", "tile-1", "tile-4", "tile-5"],
      },
      {
        id: "top-right",
        partitionRow: 0,
        partitionColumn: 1,
        rowStart: 0,
        rowEnd: 2,
        columnStart: 2,
        columnEnd: 4,
        pieceIds: ["tile-2", "tile-3", "tile-6", "tile-7"],
      },
      {
        id: "bottom-left",
        partitionRow: 1,
        partitionColumn: 0,
        rowStart: 2,
        rowEnd: 4,
        columnStart: 0,
        columnEnd: 2,
        pieceIds: ["tile-8", "tile-9", "tile-12", "tile-13"],
      },
      {
        id: "bottom-right",
        partitionRow: 1,
        partitionColumn: 1,
        rowStart: 2,
        rowEnd: 4,
        columnStart: 2,
        columnEnd: 4,
        pieceIds: ["tile-10", "tile-11", "tile-14", "tile-15"],
      },
    ]);
  });

  it("uses deterministic ceil-first splits for odd grid dimensions", () => {
    const sections = createJigsawCoarseSections(makeGrid(5, 3), 5, 3);

    expect(sections.map((section) => ({
      id: section.id,
      rows: [section.rowStart, section.rowEnd],
      columns: [section.columnStart, section.columnEnd],
      count: section.pieceIds.length,
    }))).toEqual([
      {
        id: "top-left",
        rows: [0, 2],
        columns: [0, 3],
        count: 6,
      },
      {
        id: "top-right",
        rows: [0, 2],
        columns: [3, 5],
        count: 4,
      },
      {
        id: "bottom-left",
        rows: [2, 3],
        columns: [0, 3],
        count: 3,
      },
      {
        id: "bottom-right",
        rows: [2, 3],
        columns: [3, 5],
        count: 2,
      },
    ]);
  });

  it("covers every global piece exactly once independent of shuffled current order", () => {
    const pieces = makeGrid(7, 5);
    const sections = createJigsawCoarseSections(pieces, 7, 5);
    const memberships = sections.flatMap((section) => section.pieceIds);

    expect(memberships).toHaveLength(pieces.length);
    expect(new Set(memberships).size).toBe(pieces.length);
    expect([...memberships].sort()).toEqual(
      pieces.map((piece) => piece.id).sort(),
    );
  });

  it("finds the stable section for a global piece id", () => {
    const sections = createJigsawCoarseSections(makeGrid(4, 4), 4, 4);

    expect(getJigsawCoarseSectionForPiece(sections, "tile-6")?.id).toBe("top-right");
    expect(getJigsawCoarseSectionForPiece(sections, "missing")).toBeNull();
  });

  it("derives completion from global assembly membership rather than section-local state", () => {
    const sections = createJigsawCoarseSections(makeGrid(4, 4), 4, 4);
    const topLeft = sections[0]!;

    expect(
      isJigsawCoarseSectionComplete(topLeft, {
        joinedComponents: [["tile-0", "tile-1", "tile-4"]],
      }),
    ).toBe(false);

    expect(
      isJigsawCoarseSectionComplete(topLeft, {
        joinedComponents: [["tile-0", "tile-1", "tile-4", "tile-5"]],
      }),
    ).toBe(true);

    expect(
      isJigsawCoarseSectionComplete(topLeft, {
        joinedComponents: [["tile-0", "tile-1", "tile-2", "tile-4", "tile-5"]],
      }),
    ).toBe(true);
  });

  it("treats a one-piece coarse section as already complete", () => {
    const sections = createJigsawCoarseSections(makeGrid(2, 2), 2, 2);

    expect(sections.every((section) =>
      isJigsawCoarseSectionComplete(section, { joinedComponents: [] }),
    )).toBe(true);
  });

  it("does not construct a four-way partition for an unpartitionable axis", () => {
    expect(createJigsawCoarseSections(makeGrid(1, 4), 1, 4)).toEqual([]);
    expect(createJigsawCoarseSections(makeGrid(4, 1), 4, 1)).toEqual([]);
  });

  it("does not alter global seam topology at section boundaries", () => {
    const puzzle = generateJigsaw({
      puzzleId: "jigsaw",
      seed: "coarse-section-topology",
      width: 6,
      height: 6,
      imageId: defaultJigsawImageAsset.id,
    });
    const sections = createJigsawCoarseSections(
      puzzle.tiles,
      puzzle.width,
      puzzle.height,
    );
    const leftPiece = puzzle.tiles.find((piece) => piece.row === 1 && piece.column === 2)!;
    const rightPiece = puzzle.tiles.find((piece) => piece.row === 1 && piece.column === 3)!;

    expect(getJigsawCoarseSectionForPiece(sections, leftPiece.id)?.id).toBe("top-left");
    expect(getJigsawCoarseSectionForPiece(sections, rightPiece.id)?.id).toBe("top-right");

    const rightEdge = leftPiece.edges.find((edge) => edge.side === "right")!;
    const leftEdge = rightPiece.edges.find((edge) => edge.side === "left")!;

    expect(rightEdge.boundary).toBe(false);
    expect(leftEdge.boundary).toBe(false);
    if (rightEdge.boundary || leftEdge.boundary) {
      throw new Error("Expected an ordinary global interior seam across the section boundary.");
    }

    expect(rightEdge.neighborPieceId).toBe(rightPiece.id);
    expect(leftEdge.neighborPieceId).toBe(leftPiece.id);
    expect(rightEdge.neighborEdgeId).toBe(leftEdge.edgeId);
    expect(leftEdge.neighborEdgeId).toBe(rightEdge.edgeId);
    expect(rightEdge.profileId).toBe(leftEdge.profileId);
    expect(rightEdge.seedOffset).toBe(leftEdge.seedOffset);
  });
});
