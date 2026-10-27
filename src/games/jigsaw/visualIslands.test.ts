import { describe, expect, it } from "vitest";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";
import { createJigsawWorldLayout, getJigsawSolvedPosition } from "./placement";
import {
  getJigsawVisualMembershipKey, positionJigsawVisualIslands,
  prepareJigsawVisualGeometry, reconcileJigsawVisualScene,
} from "./visualIslands";

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
const first = puzzle.tiles.find((piece) => piece.row === 0 && piece.column === 0)!;
const second = puzzle.tiles.find((piece) => piece.row === 0 && piece.column === 1)!;
const third = puzzle.tiles.find((piece) => piece.row === 0 && piece.column === 2)!;

describe("island-aware Jigsaw visual composition", () => {
  it("prepares all outlines and seams just once, preserving their references on joins", () => {
    expect(geometry.size).toBe(puzzle.tiles.length);
    const prepared = geometry.get(first.id)!;
    expect(prepared.outline).toBeTruthy();
    expect(prepared.seams).toHaveLength(first.edges.length);
    const initial = reconcileJigsawVisualScene(puzzle.tiles, { joinedComponents: [] }, geometry);
    expect(initial.islands).toHaveLength(puzzle.tiles.length);
    expect(initial.byPieceId.get(first.id)!.members[0]).toBe(prepared);
    const joined = reconcileJigsawVisualScene(puzzle.tiles,
      { joinedComponents: [[first.id, second.id]] }, geometry, initial);
    expect(joined.byPieceId.get(first.id)!.members).toContain(prepared);
  });

  it("absorbs the smaller island without replacing the larger island identity", () => {
    const initial = reconcileJigsawVisualScene(puzzle.tiles, { joinedComponents: [] }, geometry);
    const paired = reconcileJigsawVisualScene(puzzle.tiles,
      { joinedComponents: [[second.id, third.id]] }, geometry, initial);
    const originalKey = paired.byPieceId.get(second.id)!.key;
    const joined = reconcileJigsawVisualScene(puzzle.tiles,
      { joinedComponents: [[first.id, second.id, third.id]] }, geometry, paired);
    const absorbed = joined.byPieceId.get(first.id)!;
    expect(absorbed.key).toBe(originalKey);
    expect(absorbed.members).toHaveLength(3);
    expect(joined.islands).toHaveLength(puzzle.tiles.length - 2);
    expect(new Set(joined.islands.map((island) => island.key)).size).toBe(joined.islands.length);
  });

  it("retains geometry and positioned identity for unaffected islands across moves", () => {
    const scene = reconcileJigsawVisualScene(puzzle.tiles, { joinedComponents: [] }, geometry);
    const firstPose = positionJigsawVisualIslands(scene, layout, placements);
    const moved = placements.map((placement) => placement.id === first.id
      ? { ...placement, worldX: placement.worldX + 30, worldY: placement.worldY + 20 } : placement);
    const after = positionJigsawVisualIslands(scene, layout, moved, firstPose);
    expect(after.find((island) => island.key === scene.byPieceId.get(first.id)!.key))
      .not.toBe(firstPose.find((island) => island.key === scene.byPieceId.get(first.id)!.key));
    const unaffectedKey = scene.byPieceId.get(second.id)!.key;
    expect(after.find((island) => island.key === unaffectedKey))
      .toBe(firstPose.find((island) => island.key === unaffectedKey));
    expect(scene.islands).toBe(scene.islands);
    expect(getJigsawVisualMembershipKey({ joinedComponents: [[first.id, second.id]] }))
      .toBe(getJigsawVisualMembershipKey({ joinedComponents: [[second.id, first.id]] }));
  });

  it("preserves identity through anchor-only updates, splitting and Undo/Redo", () => {
    const initial = reconcileJigsawVisualScene(puzzle.tiles, { joinedComponents: [] }, geometry);
    const group = { joinedComponents: [[first.id, second.id, third.id]] };
    const merged = reconcileJigsawVisualScene(puzzle.tiles, group, geometry, initial);
    const anchorOnly = reconcileJigsawVisualScene(puzzle.tiles,
      { ...group, anchoredPieceIds: [first.id, second.id, third.id] }, geometry, merged);
    expect(anchorOnly.byPieceId.get(first.id)).toBe(merged.byPieceId.get(first.id));
    const split = reconcileJigsawVisualScene(puzzle.tiles,
      { joinedComponents: [[first.id, second.id]] }, geometry, anchorOnly);
    expect(split.byPieceId.get(first.id)!.key).toBe(merged.byPieceId.get(first.id)!.key);
    const restored = reconcileJigsawVisualScene(puzzle.tiles, group, geometry, split);
    expect(restored.byPieceId.get(first.id)!.key).toBe(split.byPieceId.get(first.id)!.key);
    expect(new Set(restored.islands.map((island) => island.key)).size).toBe(restored.islands.length);
  });

  it("maintains pose alignment for joined pieces without mutating prepared geometry", () => {
    const scene = reconcileJigsawVisualScene(puzzle.tiles,
      { joinedComponents: [[first.id, second.id]] }, geometry);
    const placed = positionJigsawVisualIslands(scene, layout, placements);
    const joined = placed.find((island) => island.members.length === 2)!;
    expect(joined.widthCells).toBe(2);
    expect(joined.heightCells).toBe(1);
    expect(joined.worldX).toBeCloseTo(layout.boardX + 15);
    expect(joined.worldY).toBeCloseTo(layout.boardY + 19);
  });

  it("retains exact canonical special-piece contours", () => {
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
