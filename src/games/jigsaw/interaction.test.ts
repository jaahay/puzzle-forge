import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../../catalog/types";
import { createJigsawWorldLayout, getJigsawSolvedPosition, type JigsawPlacement } from "./placement";
import { moveJigsawComponent, resolveJigsawComponentDrop } from "./interaction";

const edge = (
  edgeId: string,
  side: "left" | "right",
  neighborPieceId: string | null,
  polarity: "tab" | "blank" = "tab",
) => neighborPieceId === null
  ? {
      edgeId,
      side,
      boundary: true as const,
      neighborPieceId: null,
      neighborEdgeId: null,
      profileId: null,
      polarity: "flat" as const,
      seedOffset: 0,
    }
  : {
      edgeId,
      side,
      boundary: false as const,
      neighborPieceId,
      neighborEdgeId: `${neighborPieceId}-mate`,
      profileId: "classic-bulb" as const,
      polarity,
      seedOffset: 1,
    };

const pieces: JigsawPiece[] = [
  {
    id: "tile-0",
    currentIndex: 0,
    solvedIndex: 0,
    row: 0,
    column: 0,
    edges: [edge("0-left", "left", null), edge("0-right", "right", "tile-1")],
  },
  {
    id: "tile-1",
    currentIndex: 1,
    solvedIndex: 1,
    row: 0,
    column: 1,
    edges: [edge("1-left", "left", "tile-0", "blank"), edge("1-right", "right", "tile-2")],
  },
  {
    id: "tile-2",
    currentIndex: 2,
    solvedIndex: 2,
    row: 0,
    column: 2,
    edges: [edge("2-left", "left", "tile-1", "blank"), edge("2-right", "right", null)],
  },
];

const layout = createJigsawWorldLayout({
  imageWidth: 900,
  imageHeight: 300,
  puzzleWidth: 3,
  puzzleHeight: 1,
});

const placementAtTranslation = (piece: JigsawPiece, x: number, y: number): JigsawPlacement => {
  const solved = getJigsawSolvedPosition(layout, piece);
  return {
    id: piece.id,
    worldX: solved.left + x,
    worldY: solved.top + y,
  };
};

describe("Jigsaw island interaction", () => {
  it("moves a joined component rigidly", () => {
    const placements = [
      placementAtTranslation(pieces[0]!, -40, 20),
      placementAtTranslation(pieces[1]!, -40, 20),
      placementAtTranslation(pieces[2]!, 100, 20),
    ];
    const moved = moveJigsawComponent(layout, placements, ["tile-0", "tile-1"], 24, -12);
    expect(moved[0]!.worldX - placements[0]!.worldX).toBe(24);
    expect(moved[1]!.worldX - placements[1]!.worldX).toBe(24);
    expect(moved[0]!.worldY - placements[0]!.worldY).toBe(-12);
    expect(moved[1]!.worldY - placements[1]!.worldY).toBe(-12);
  });

  it("snaps a free piece to a neighboring island by canonical translation", () => {
    const targetTranslation = { x: 30, y: 18 };
    const placements = [
      placementAtTranslation(pieces[0]!, targetTranslation.x, targetTranslation.y),
      placementAtTranslation(pieces[1]!, targetTranslation.x, targetTranslation.y),
      placementAtTranslation(pieces[2]!, targetTranslation.x + 10, targetTranslation.y + 5),
    ];
    const result = resolveJigsawComponentDrop(
      layout,
      pieces,
      placements,
      { joinedComponents: [["tile-0", "tile-1"]] },
      "tile-2",
    );

    expect(result.joined).toBe(true);
    expect(result.assembly).toEqual({
      joinedComponents: [["tile-0", "tile-1", "tile-2"]],
    });

    const solved = getJigsawSolvedPosition(layout, pieces[2]!);
    const tile2 = result.placements.find((placement) => placement.id === "tile-2");
    expect(tile2).toMatchObject({
      worldX: solved.left + targetTranslation.x,
      worldY: solved.top + targetTranslation.y,
    });
  });

  it("does not treat correct absolute board placement as progress", () => {
    const placements = [
      placementAtTranslation(pieces[0]!, 0, 0),
      placementAtTranslation(pieces[1]!, 200, 0),
      placementAtTranslation(pieces[2]!, 200, 0),
    ];
    const result = resolveJigsawComponentDrop(
      layout,
      pieces,
      placements,
      { joinedComponents: [] },
      "tile-0",
    );

    expect(result.joined).toBe(false);
    expect(result.assembly).toEqual({ joinedComponents: [] });
  });
});
});
});
