import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../../catalog/types";
import {
  createInitialJigsawPlacements,
  createJigsawStageLayout,
  getJigsawPlacementPosition,
  getJigsawSolvedPosition,
  normalizeJigsawPosition,
  shouldSnapJigsawPlacement,
} from "./placement";

const makePiece = (solvedIndex: number, width = 4): JigsawPiece => ({
  id: `tile-${solvedIndex}`,
  currentIndex: solvedIndex,
  solvedIndex,
  row: Math.floor(solvedIndex / width),
  column: solvedIndex % width,
  edges: [],
});

const overlapsBoard = (
  left: number,
  top: number,
  pieceWidth: number,
  pieceHeight: number,
  boardX: number,
  boardY: number,
  boardWidth: number,
  boardHeight: number,
) =>
  left < boardX + boardWidth &&
  left + pieceWidth > boardX &&
  top < boardY + boardHeight &&
  top + pieceHeight > boardY;

describe("Jigsaw free-position layout", () => {
  it("centers a desktop assembly board and scatters loose pieces outside it", () => {
    const layout = createJigsawStageLayout({
      stageWidth: 900,
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
      pieceCount: 16,
    });
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index));
    const placements = createInitialJigsawPlacements(layout, pieces);

    expect(layout.mode).toBe("scatter");
    expect(layout.boardX).toBeCloseTo((layout.stageWidth - layout.boardWidth) / 2);
    expect(layout.boardY).toBeCloseTo((layout.stageHeight - layout.boardHeight) / 2);
    expect(placements).toHaveLength(16);

    for (const piece of pieces) {
      const placement = placements.find((candidate) => candidate.id === piece.id);
      expect(placement).toBeDefined();
      const position = getJigsawPlacementPosition(layout, piece, placement!);
      expect(overlapsBoard(
        position.left,
        position.top,
        layout.pieceWidth,
        layout.pieceHeight,
        layout.boardX,
        layout.boardY,
        layout.boardWidth,
        layout.boardHeight,
      )).toBe(false);
    }
  });

  it("stages compact layouts in a tray below the board", () => {
    const layout = createJigsawStageLayout({
      stageWidth: 390,
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
      pieceCount: 16,
    });
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index));
    const placements = createInitialJigsawPlacements(layout, pieces);
    const boardBottom = layout.boardY + layout.boardHeight;

    expect(layout.mode).toBe("tray");
    for (const piece of pieces) {
      const placement = placements.find((candidate) => candidate.id === piece.id)!;
      const position = getJigsawPlacementPosition(layout, piece, placement);
      expect(position.top).toBeGreaterThan(boardBottom);
    }
  });

  it("preserves extreme artwork ratios while fitting the board within layout bounds", () => {
    const portrait = createJigsawStageLayout({
      stageWidth: 900,
      imageWidth: 721,
      imageHeight: 2048,
      puzzleWidth: 4,
      puzzleHeight: 4,
      pieceCount: 16,
    });
    const panorama = createJigsawStageLayout({
      stageWidth: 900,
      imageWidth: 3200,
      imageHeight: 800,
      puzzleWidth: 4,
      puzzleHeight: 4,
      pieceCount: 16,
    });
    const compactPortrait = createJigsawStageLayout({
      stageWidth: 390,
      imageWidth: 721,
      imageHeight: 2048,
      puzzleWidth: 4,
      puzzleHeight: 4,
      pieceCount: 16,
    });

    expect(portrait.boardWidth / portrait.boardHeight).toBeCloseTo(721 / 2048);
    expect(portrait.boardHeight).toBeLessThanOrEqual(540);
    expect(portrait.boardX).toBeCloseTo((portrait.stageWidth - portrait.boardWidth) / 2);

    expect(panorama.boardWidth / panorama.boardHeight).toBeCloseTo(4);
    expect(panorama.boardWidth).toBeLessThanOrEqual(900 * 0.56);

    expect(compactPortrait.boardWidth / compactPortrait.boardHeight).toBeCloseTo(721 / 2048);
    expect(compactPortrait.boardHeight).toBeLessThanOrEqual(390 * 1.1);
    expect(compactPortrait.boardX).toBeCloseTo((compactPortrait.stageWidth - compactPortrait.boardWidth) / 2);
  });

  it("maps solved pieces to their exact board row and column", () => {
    const layout = createJigsawStageLayout({
      stageWidth: 900,
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
      pieceCount: 16,
    });
    const piece = makePiece(6);
    const target = getJigsawSolvedPosition(layout, piece);

    expect(target.left).toBeCloseTo(layout.boardX + layout.pieceWidth * 2);
    expect(target.top).toBeCloseTo(layout.boardY + layout.pieceHeight);
  });

  it("snaps only when a loose piece is close to its own solved position", () => {
    const layout = createJigsawStageLayout({
      stageWidth: 900,
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
      pieceCount: 16,
    });
    const piece = makePiece(6);
    const target = getJigsawSolvedPosition(layout, piece);
    const near = normalizeJigsawPosition(layout, target.left + 5, target.top + 5);
    const far = normalizeJigsawPosition(layout, target.left + layout.pieceWidth, target.top + layout.pieceHeight);

    expect(shouldSnapJigsawPlacement(layout, piece, near)).toBe(true);
    expect(shouldSnapJigsawPlacement(layout, piece, far)).toBe(false);
  });

  it("provides enough deterministic staging positions for an 8 by 8 puzzle", () => {
    const layout = createJigsawStageLayout({
      stageWidth: 960,
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 8,
      puzzleHeight: 8,
      pieceCount: 64,
    });
    const pieces = Array.from({ length: 64 }, (_, index) => makePiece(index, 8));
    const placements = createInitialJigsawPlacements(layout, pieces);

    expect(placements).toHaveLength(64);
    expect(new Set(placements.map(({ x, y }) => `${x.toFixed(5)}:${y.toFixed(5)}`)).size).toBe(64);
  });
});
