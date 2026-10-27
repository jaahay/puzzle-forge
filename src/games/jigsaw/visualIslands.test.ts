import { describe, expect, it } from "vitest";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";
import { createJigsawWorldLayout, getJigsawSolvedPosition } from "./placement";
import { composeJigsawVisualIslands, prepareJigsawVisualGeometry } from "./visualIslands";

const puzzle = generateJigsaw({
  puzzleId: "jigsaw", seed: "island-composition", width: 6, height: 6,
  imageId: defaultJigsawImageAsset.id,
});
const layout = createJigsawWorldLayout({
  imageWidth: puzzle.asset.intrinsicWidth, imageHeight: puzzle.asset.intrinsicHeight,
  puzzleWidth: puzzle.width, puzzleHeight: puzzle.height,
});
const geometry = prepareJigsawVisualGeometry(puzzle.tiles, puzzle.edgeModel);
const placements = puzzle.tiles.map((piece) => {
  const solved = getJigsawSolvedPosition(layout, piece);
  return { id: piece.id, worldX: solved.left + 15, worldY: solved.top + 19 };
});

describe("island-aware Jigsaw visual composition", () => {
  it("reuses prepared geometry and preserves source pieces", () => {
    expect(geometry.size).toBe(puzzle.tiles.length);
    const piece = puzzle.tiles[0]!;
    const prepared = geometry.get(piece.id)!;
    const initialPath = prepared.outline;
    const group = composeJigsawVisualIslands(layout, puzzle.tiles, placements,
      { joinedComponents: [] }, geometry);
    expect(group).toHaveLength(puzzle.tiles.length);
    expect(group[0]!.members[0]).toBe(prepared);
    expect(prepared.outline).toBe(initialPath);
  });

  it("combines adjacent pieces into one shared visual island with stable local geometry", () => {
    const first = puzzle.tiles.find((piece) => piece.row === 0 && piece.column === 0)!;
    const second = puzzle.tiles.find((piece) => piece.row === 0 && piece.column === 1)!;
    const island = composeJigsawVisualIslands(layout, puzzle.tiles, placements, {
      joinedComponents: [[first.id, second.id]], anchoredPieceIds: [first.id, second.id],
    }, geometry);
    expect(island).toHaveLength(puzzle.tiles.length - 1);
    const joined = island.find((entry) => entry.members.length === 2)!;
    expect(joined.anchored).toBe(true);
    expect(joined.widthCells).toBe(2);
    expect(joined.heightCells).toBe(1);
    expect(joined.worldX).toBeCloseTo(layout.boardX + 15);
    expect(joined.worldY).toBeCloseTo(layout.boardY + 19);
    expect(joined.members.map((entry) => entry.outline)).toEqual([
      geometry.get(first.id)!.outline, geometry.get(second.id)!.outline,
    ]);
    const moved = placements.map((p) => p.id === first.id || p.id === second.id
      ? { ...p, worldX: p.worldX + 30, worldY: p.worldY + 20 } : p);
    const shifted = composeJigsawVisualIslands(layout, puzzle.tiles, moved,
      { joinedComponents: [[first.id, second.id]] }, geometry)
      .find((entry) => entry.members.length === 2)!;
    expect(shifted.worldX - joined.worldX).toBeCloseTo(30);
    expect(shifted.worldY - joined.worldY).toBeCloseTo(20);
    expect(shifted.members[0]).toBe(joined.members[0]);
  });

  it("retains all source contours for special-piece geometry", () => {
    const seed = Array.from({ length: 128 }, (_, index) => index).map((index) =>
      generateJigsaw({
        puzzleId: "jigsaw", seed: `island-special-${index}`, width: 6, height: 6,
        imageId: defaultJigsawImageAsset.id, jigsawSpecialPiecesMode: "always",
      })).find((candidate) => candidate.tiles.some((piece) => piece.specialShape?.kind === "capsule"));
    expect(seed).toBeDefined();
    const prepared = prepareJigsawVisualGeometry(seed!.tiles, seed!.edgeModel);
    const capsule = seed!.tiles.find((piece) => piece.specialShape?.kind === "capsule")!;
    expect(prepared.get(capsule.id)!.outline).toContain("A");
    expect(prepared.get(capsule.id)!.span.width * prepared.get(capsule.id)!.span.height).toBe(2);
  });
});
