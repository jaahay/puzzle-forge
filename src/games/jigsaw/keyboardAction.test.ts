import { describe, expect, it } from "vitest";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";
import { createJigsawWorldLayout } from "./placement";
import { advanceJigsawKeyboardPiece } from "./keyboardAction";
import { makeEmptyJigsawAssemblyProgress } from "./assembly";
import { commitJigsawPlacementAction, makeEmptyJigsawHistoryState } from "./history";

const puzzle = generateJigsaw({ seed: "keyboard-ux", width: 2, height: 2, imageId: defaultJigsawImageAsset.id });
const layout = createJigsawWorldLayout({
  imageWidth: puzzle.asset.intrinsicWidth, imageHeight: puzzle.asset.intrinsicHeight,
  puzzleWidth: puzzle.width, puzzleHeight: puzzle.height,
});
const snapshot = {
  placements: puzzle.tiles.map((piece, index) => ({
    id: piece.id,
    worldX: layout.worldWidth / 3 + (index % 2) * layout.pieceWidth * 1.6,
    worldY: layout.worldHeight / 3 + Math.floor(index / 2) * layout.pieceHeight * 1.6,
  })),
  assembly: makeEmptyJigsawAssemblyProgress(),
};

describe("Jigsaw keyboard movement", () => {
  it("moves one component and records one completed placement intention", () => {
    const piece = puzzle.tiles[0]!;
    const after = advanceJigsawKeyboardPiece(layout, puzzle.tiles, snapshot, piece.id, "ArrowRight", false, false)!;
    expect(after.placements.find((p) => p.id === piece.id)!.worldX).toBeGreaterThan(snapshot.placements[0]!.worldX);
    expect(commitJigsawPlacementAction(makeEmptyJigsawHistoryState(), snapshot, after).undoStack).toHaveLength(1);
  });

  it("cannot move an anchored piece", () => {
    const piece = puzzle.tiles[0]!;
    expect(advanceJigsawKeyboardPiece(layout, puzzle.tiles, {
      ...snapshot, assembly: { joinedComponents: [], anchoredPieceIds: [piece.id] },
    }, piece.id, "ArrowDown", false, true)).toBeNull();
  });

  it("Shift moves further without displacing unrelated pieces", () => {
    const piece = puzzle.tiles[0]!;
    const small = advanceJigsawKeyboardPiece(layout, puzzle.tiles, snapshot, piece.id, "ArrowRight", false, false)!;
    const large = advanceJigsawKeyboardPiece(layout, puzzle.tiles, snapshot, piece.id, "ArrowRight", true, false)!;
    expect(large.placements.find((p) => p.id === piece.id)!.worldX).toBeGreaterThan(small.placements.find((p) => p.id === piece.id)!.worldX);
    expect(small.placements.find((p) => p.id === puzzle.tiles[1]!.id)).toEqual(snapshot.placements[1]);
  });
});
