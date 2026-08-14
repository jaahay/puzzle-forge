import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../../catalog/types";
import {
  createInitialJigsawPlacements,
  createJigsawFitCamera,
  createJigsawWorldLayout,
  getJigsawCameraTransform,
  getJigsawPlacementPosition,
  getJigsawSolvedPosition,
  normalizeJigsawWorldPosition,
  panJigsawCamera,
  screenToJigsawWorld,
  shouldSnapJigsawPlacement,
  zoomJigsawCameraAtPoint,
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

describe("Jigsaw world layout", () => {
  it("keeps artwork composition exact while making world size independent of the viewport", () => {
    const landscape = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 7,
      puzzleHeight: 5,
    });
    const portrait = createJigsawWorldLayout({
      imageWidth: 721,
      imageHeight: 2048,
      puzzleWidth: 6,
      puzzleHeight: 17,
    });

    expect(landscape.boardWidth / landscape.boardHeight).toBeCloseTo(1200 / 900);
    expect(portrait.boardWidth / portrait.boardHeight).toBeCloseTo(721 / 2048);
    expect(landscape.pieceWidth * landscape.pieceHeight).toBeCloseTo(96 * 96);
    expect(portrait.pieceWidth * portrait.pieceHeight).toBeCloseTo(96 * 96);
    expect(landscape.worldWidth).toBeGreaterThan(landscape.boardWidth);
    expect(landscape.worldHeight).toBeGreaterThan(landscape.boardHeight);
  });

  it("scatters loose pieces around the board in logical world coordinates", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
    });
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index));
    const placements = createInitialJigsawPlacements(layout, pieces);

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

  it("provides unique staging positions at the 32 by 32 technical ceiling", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1600,
      imageHeight: 1600,
      puzzleWidth: 32,
      puzzleHeight: 32,
    });
    const pieces = Array.from({ length: 1024 }, (_, index) => makePiece(index, 32));
    const placements = createInitialJigsawPlacements(layout, pieces);

    expect(placements).toHaveLength(1024);
    expect(new Set(placements.map(({ worldX, worldY }) => `${worldX.toFixed(3)}:${worldY.toFixed(3)}`)).size).toBe(1024);
  });

  it("maps solved pieces to exact board coordinates and snaps only near their target", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
    });
    const piece = makePiece(6);
    const target = getJigsawSolvedPosition(layout, piece);
    const near = normalizeJigsawWorldPosition(layout, target.left + 5, target.top + 5);
    const far = normalizeJigsawWorldPosition(layout, target.left + layout.pieceWidth, target.top + layout.pieceHeight);

    expect(target.left).toBeCloseTo(layout.boardX + layout.pieceWidth * 2);
    expect(target.top).toBeCloseTo(layout.boardY + layout.pieceHeight);
    expect(shouldSnapJigsawPlacement(layout, piece, near)).toBe(true);
    expect(shouldSnapJigsawPlacement(layout, piece, far)).toBe(false);
  });
});

describe("Jigsaw camera", () => {
  const layout = createJigsawWorldLayout({
    imageWidth: 1600,
    imageHeight: 1200,
    puzzleWidth: 11,
    puzzleHeight: 9,
  });
  const viewport = { width: 1000, height: 650 };

  it("fits either the whole workspace or just the assembly board", () => {
    const workspaceCamera = createJigsawFitCamera(layout, viewport, "workspace");
    const boardCamera = createJigsawFitCamera(layout, viewport, "board");

    expect(boardCamera.zoom).toBeGreaterThan(workspaceCamera.zoom);
    expect(workspaceCamera.centerX).toBeCloseTo(layout.worldWidth / 2);
    expect(workspaceCamera.centerY).toBeCloseTo(layout.worldHeight / 2);

    const transform = getJigsawCameraTransform(workspaceCamera, viewport);
    expect(layout.worldWidth / 2 * transform.scale + transform.translateX).toBeCloseTo(viewport.width / 2);
    expect(layout.worldHeight / 2 * transform.scale + transform.translateY).toBeCloseTo(viewport.height / 2);
  });

  it("keeps the world point under the pointer stable while zooming", () => {
    const camera = createJigsawFitCamera(layout, viewport, "workspace");
    const pointer = { x: 730, y: 240 };
    const before = screenToJigsawWorld(camera, viewport, pointer.x, pointer.y);
    const zoomed = zoomJigsawCameraAtPoint(layout, viewport, camera, camera.zoom * 1.8, pointer.x, pointer.y);
    const after = screenToJigsawWorld(zoomed, viewport, pointer.x, pointer.y);

    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("pans in screen-distance units and remains clamped to the world", () => {
    const camera = createJigsawFitCamera(layout, viewport, "board");
    const panned = panJigsawCamera(layout, viewport, camera, 120, -80);
    const extreme = panJigsawCamera(layout, viewport, panned, 1_000_000, 1_000_000);

    expect(panned.centerX).toBeGreaterThan(camera.centerX);
    expect(panned.centerY).toBeLessThan(camera.centerY);
    expect(extreme.centerX).toBeLessThan(layout.worldWidth + viewport.width / extreme.zoom);
    expect(extreme.centerY).toBeLessThan(layout.worldHeight + viewport.height / extreme.zoom);
  });
});
