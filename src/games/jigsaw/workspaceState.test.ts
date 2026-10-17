import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../../catalog/types";
import { getJigsawSolvedPosition, createJigsawWorldLayout } from "./placement";
import {
  resetJigsawWorkspaceState,
  hasMeaningfulJigsawWorkspaceProgress,
  resolveInitialJigsawWorkspaceState,
  restageJigsawWorkspaceState,
} from "./workspaceState";

const makePiece = (solvedIndex: number, width = 4): JigsawPiece => ({
  id: `tile-${solvedIndex}`,
  currentIndex: solvedIndex,
  solvedIndex,
  row: Math.floor(solvedIndex / width),
  column: solvedIndex % width,
  edges: [],
});

describe("Jigsaw workspace state", () => {
  it("waits for a usable viewport before staging", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
    });
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index));

    expect(resolveInitialJigsawWorkspaceState(
      { joinedComponents: [] },
      layout,
      pieces,
      null,
    )).toBeNull();
    expect(resetJigsawWorkspaceState(
      layout,
      pieces,
      { width: 0, height: 800 },
    )).toBeNull();
  });

  it("restores component membership with one rigid translation", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
    });
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index));
    const state = resolveInitialJigsawWorkspaceState(
      { joinedComponents: [["tile-0", "tile-1", "tile-2"]] },
      layout,
      pieces,
      { width: 600, height: 1200 },
    );

    expect(state?.assembly).toEqual({
      joinedComponents: [["tile-0", "tile-1", "tile-2"]],
    });
    expect(state).not.toBeNull();
    if (!state) return;

    const translations = ["tile-0", "tile-1", "tile-2"].map((pieceId) => {
      const piece = pieces.find((candidate) => candidate.id === pieceId)!;
      const placement = state.placements.find((candidate) => candidate.id === pieceId)!;
      const solved = getJigsawSolvedPosition(layout, piece);
      return {
        x: placement.worldX - solved.left,
        y: placement.worldY - solved.top,
      };
    });

    expect(translations[1]!.x).toBeCloseTo(translations[0]!.x);
    expect(translations[1]!.y).toBeCloseTo(translations[0]!.y);
    expect(translations[2]!.x).toBeCloseTo(translations[0]!.x);
    expect(translations[2]!.y).toBeCloseTo(translations[0]!.y);
  });

  it("protects current piece organization, not historical actions", () => {
    const layout = createJigsawWorldLayout({ imageWidth: 1200, imageHeight: 900, puzzleWidth: 4, puzzleHeight: 4 });
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index));
    const initial = resetJigsawWorkspaceState(layout, pieces, { width: 760, height: 560 })!;
    const neutral: { joinedComponents: string[][] } = { joinedComponents: [] };
    const hasProgress = (placements: typeof initial.placements, assembly = neutral) =>
      hasMeaningfulJigsawWorkspaceProgress(layout, initial.placements, placements, assembly);
    expect(hasProgress(initial.placements)).toBe(false);
    const tiny = initial.placements.map((p, i) => i === 0 ? { ...p, worldX: p.worldX + layout.pieceWidth * 0.1 } : p);
    expect(hasProgress(tiny)).toBe(false);
    const organized = initial.placements.map((p, i) => i === 0 ? { ...p, worldX: p.worldX + layout.pieceWidth * 0.5 } : p);
    expect(hasProgress(organized)).toBe(true);
    expect(hasProgress(initial.placements.map(p => ({ ...p })))).toBe(false);
    expect(hasProgress(initial.placements, { joinedComponents: [["tile-0", "tile-1"]] })).toBe(true);
    expect(hasMeaningfulJigsawWorkspaceProgress(layout, null, initial.placements, neutral)).toBe(false);
  });

  it("makes Reset destructive while Restage preserves semantic assembly", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
    });
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index));
    const viewport = { width: 760, height: 560 };
    const assembly = { joinedComponents: [["tile-0", "tile-1"]] };

    const restaged = restageJigsawWorkspaceState(layout, pieces, assembly, viewport);
    const reset = resetJigsawWorkspaceState(layout, pieces, viewport);

    expect(restaged?.assembly).toEqual(assembly);
    expect(restaged?.assembly).not.toBe(assembly);
    expect(reset?.assembly).toEqual({ joinedComponents: [] });
    const anchored = { joinedComponents: [], anchoredPieceIds: ["tile-0"] };
    const retained = restageJigsawWorkspaceState(layout, pieces, anchored, viewport)!;
    expect(retained.assembly).toEqual(anchored);
    expect(retained.placements.find((p) => p.id === "tile-0")).toEqual({
      id: "tile-0", worldX: getJigsawSolvedPosition(layout, pieces[0]!).left,
      worldY: getJigsawSolvedPosition(layout, pieces[0]!).top,
    });
    expect(hasMeaningfulJigsawWorkspaceProgress(layout, null, retained.placements, retained.assembly)).toBe(true);
  });
});
