import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../../catalog/types";
import {
  createInitialJigsawPlacements,
  createJigsawFitCamera,
  createJigsawOccupiedFitCamera,
  createJigsawWorldLayout,
  getJigsawOccupiedBounds,
  getJigsawCameraTransform,
  getJigsawPlacementPosition,
  getJigsawSolvedPosition,
  getJigsawStagingMode,
  isUsableJigsawViewport,
  normalizeJigsawWorldPosition,
  panJigsawCamera,
  restageLooseJigsawPlacements,
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

const isSideStaged = (
  layout: ReturnType<typeof createJigsawWorldLayout>,
  worldX: number,
) =>
  worldX + layout.pieceWidth <= layout.boardX || worldX >= layout.boardX + layout.boardWidth;

const isTopBottomStaged = (
  layout: ReturnType<typeof createJigsawWorldLayout>,
  worldY: number,
) =>
  worldY + layout.pieceHeight <= layout.boardY || worldY >= layout.boardY + layout.boardHeight;

const isBoardAlignedSideSlot = (
  layout: ReturnType<typeof createJigsawWorldLayout>,
  worldY: number,
) => {
  const centerY = worldY + layout.pieceHeight / 2;
  return centerY >= layout.boardY && centerY <= layout.boardY + layout.boardHeight;
};

const isBoardAlignedTopBottomSlot = (
  layout: ReturnType<typeof createJigsawWorldLayout>,
  worldX: number,
) => {
  const centerX = worldX + layout.pieceWidth / 2;
  return centerX >= layout.boardX && centerX <= layout.boardX + layout.boardWidth;
};

const getSideStagingGap = (
  layout: ReturnType<typeof createJigsawWorldLayout>,
  worldX: number,
) => worldX < layout.boardX
  ? layout.boardX - (worldX + layout.pieceWidth)
  : worldX - (layout.boardX + layout.boardWidth);

const getTopBottomStagingGap = (
  layout: ReturnType<typeof createJigsawWorldLayout>,
  worldY: number,
) => worldY < layout.boardY
  ? layout.boardY - (worldY + layout.pieceHeight)
  : worldY - (layout.boardY + layout.boardHeight);

const getScreenBounds = (
  bounds: ReturnType<typeof getJigsawOccupiedBounds>,
  camera: ReturnType<typeof createJigsawOccupiedFitCamera>,
  viewport: { width: number; height: number },
) => {
  const transform = getJigsawCameraTransform(camera, viewport);
  return {
    left: bounds.x * transform.scale + transform.translateX,
    top: bounds.y * transform.scale + transform.translateY,
    right: (bounds.x + bounds.width) * transform.scale + transform.translateX,
    bottom: (bounds.y + bounds.height) * transform.scale + transform.translateY,
  };
};

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

  it("recognizes only finite, positive play-surface measurements", () => {
    expect(isUsableJigsawViewport({ width: 1200, height: 800 })).toBe(true);
    expect(isUsableJigsawViewport(null)).toBe(false);
    expect(isUsableJigsawViewport({ width: 0, height: 800 })).toBe(false);
    expect(isUsableJigsawViewport({ width: 1200, height: Number.POSITIVE_INFINITY })).toBe(false);
  });

  it("falls back to neutral perimeter staging when no measured play surface is available", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 1200,
      puzzleWidth: 8,
      puzzleHeight: 8,
    });

    expect(getJigsawStagingMode(layout, 64, null)).toBe("perimeter");
    expect(getJigsawStagingMode(layout, 64, { width: 0, height: 800 })).toBe("perimeter");
  });

  it("scatters loose pieces around the board in logical world coordinates", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
    });
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index));
    const placements = createInitialJigsawPlacements(layout, pieces, { width: 1000, height: 750 });

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

  it("prefers balanced, board-aligned side trays for a portrait puzzle on a wide display", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 721,
      imageHeight: 2048,
      puzzleWidth: 6,
      puzzleHeight: 17,
    });
    const pieces = Array.from({ length: 48 }, (_, index) => makePiece(index, 6));
    const viewport = { width: 1440, height: 800 };
    const placements = createInitialJigsawPlacements(layout, pieces, viewport);

    expect(getJigsawStagingMode(layout, pieces.length, viewport)).toBe("sides");
    expect(placements.every((placement) => isSideStaged(layout, placement.worldX))).toBe(true);
    expect(placements.slice(0, 24).every((placement) => isBoardAlignedSideSlot(layout, placement.worldY))).toBe(true);
    expect(placements.some((placement) => placement.worldX < layout.boardX)).toBe(true);
    expect(placements.some((placement) => placement.worldX > layout.boardX + layout.boardWidth)).toBe(true);
    expect(Math.max(...placements.map((placement) => getSideStagingGap(layout, placement.worldX))))
      .toBeLessThan(layout.pieceWidth * 2.75);
  });

  it("prefers balanced, board-aligned top and bottom trays for a panoramic puzzle on a tall display", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 2048,
      imageHeight: 721,
      puzzleWidth: 17,
      puzzleHeight: 6,
    });
    const pieces = Array.from({ length: 48 }, (_, index) => makePiece(index, 17));
    const viewport = { width: 760, height: 1280 };
    const placements = createInitialJigsawPlacements(layout, pieces, viewport);

    expect(getJigsawStagingMode(layout, pieces.length, viewport)).toBe("top-bottom");
    expect(placements.every((placement) => isTopBottomStaged(layout, placement.worldY))).toBe(true);
    expect(placements.slice(0, 24).every((placement) => isBoardAlignedTopBottomSlot(layout, placement.worldX))).toBe(true);
    expect(placements.some((placement) => placement.worldY < layout.boardY)).toBe(true);
    expect(placements.some((placement) => placement.worldY > layout.boardY + layout.boardHeight)).toBe(true);
    expect(Math.max(...placements.map((placement) => getTopBottomStagingGap(layout, placement.worldY))))
      .toBeLessThan(layout.pieceHeight * 2.75);
  });

  it("uses piece count to decide when moderate extra side space should become trays", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 1200,
      puzzleWidth: 8,
      puzzleHeight: 8,
    });
    const viewport = { width: 1200, height: 800 };

    expect(getJigsawStagingMode(layout, 4, viewport)).toBe("perimeter");
    expect(getJigsawStagingMode(layout, 64, viewport)).toBe("sides");
  });

  it("keeps adaptive staging deterministic for the same puzzle and play surface", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 721,
      imageHeight: 2048,
      puzzleWidth: 6,
      puzzleHeight: 17,
    });
    const pieces = Array.from({ length: 48 }, (_, index) => makePiece(index, 6));
    const viewport = { width: 1440, height: 800 };

    expect(createInitialJigsawPlacements(layout, pieces, viewport)).toEqual(
      createInitialJigsawPlacements(layout, pieces, viewport),
    );
  });

  it("uses an explicit viewport when intentionally restaging while preserving snapped pieces", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 1200,
      puzzleWidth: 4,
      puzzleHeight: 4,
    });
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index));
    const initial = createInitialJigsawPlacements(layout, pieces, { width: 1200, height: 600 });
    const withSnappedPiece = initial.map((placement, index) => index === 0
      ? { ...placement, snapped: true }
      : placement);
    const restaged = restageLooseJigsawPlacements(
      layout,
      pieces,
      withSnappedPiece,
      { width: 600, height: 1200 },
    );

    expect(getJigsawStagingMode(layout, pieces.length, { width: 600, height: 1200 })).toBe("top-bottom");
    expect(restaged.find((placement) => placement.id === withSnappedPiece[0].id))
      .toEqual(withSnappedPiece[0]);
    expect(restaged.filter((placement) => !placement.snapped).every((placement) =>
      isTopBottomStaged(layout, placement.worldY))).toBe(true);
  });

  it("provides unique staging positions at the 32 by 32 technical ceiling", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1600,
      imageHeight: 1600,
      puzzleWidth: 32,
      puzzleHeight: 32,
    });
    const pieces = Array.from({ length: 1024 }, (_, index) => makePiece(index, 32));
    const placements = createInitialJigsawPlacements(layout, pieces, { width: 900, height: 900 });

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

  it("fits occupied board and loose-piece bounds instead of unused world space", () => {
    const compactLayout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
    });
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index));
    const compactViewport = { width: 1000, height: 650 };
    const placements = createInitialJigsawPlacements(compactLayout, pieces, compactViewport);
    const bounds = getJigsawOccupiedBounds(compactLayout, placements);
    const occupiedCamera = createJigsawOccupiedFitCamera(compactLayout, compactViewport, placements);
    const workspaceCamera = createJigsawFitCamera(compactLayout, compactViewport, "workspace");

    const nominalLeft = Math.min(compactLayout.boardX, ...placements.map((placement) => placement.worldX));
    const nominalTop = Math.min(compactLayout.boardY, ...placements.map((placement) => placement.worldY));
    const nominalRight = Math.max(
      compactLayout.boardX + compactLayout.boardWidth,
      ...placements.map((placement) => placement.worldX + compactLayout.pieceWidth),
    );
    const nominalBottom = Math.max(
      compactLayout.boardY + compactLayout.boardHeight,
      ...placements.map((placement) => placement.worldY + compactLayout.pieceHeight),
    );

    expect(bounds.x).toBeLessThan(nominalLeft);
    expect(bounds.y).toBeLessThan(nominalTop);
    expect(bounds.x + bounds.width).toBeGreaterThan(nominalRight);
    expect(bounds.y + bounds.height).toBeGreaterThan(nominalBottom);
    expect(occupiedCamera.zoom).toBeGreaterThan(workspaceCamera.zoom);
    expect(occupiedCamera.zoom).toBeLessThanOrEqual(1.25);
  });

  it.each([
    {
      name: "desktop landscape",
      imageWidth: 1600,
      imageHeight: 1200,
      puzzleWidth: 8,
      puzzleHeight: 6,
      viewport: { width: 1280, height: 760 },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    {
      name: "narrow mobile with immersive chrome",
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
      viewport: { width: 390, height: 844 },
      insets: { top: 64, right: 12, bottom: 76, left: 92 },
    },
    {
      name: "portrait artwork on a wide viewport",
      imageWidth: 721,
      imageHeight: 2048,
      puzzleWidth: 6,
      puzzleHeight: 17,
      viewport: { width: 1360, height: 720 },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    {
      name: "panoramic artwork on a tall viewport",
      imageWidth: 2048,
      imageHeight: 721,
      puzzleWidth: 17,
      puzzleHeight: 6,
      viewport: { width: 760, height: 1180 },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    },
  ])("keeps occupied content inside the usable $name view", ({
    imageWidth,
    imageHeight,
    puzzleWidth,
    puzzleHeight,
    viewport: caseViewport,
    insets,
  }) => {
    const caseLayout = createJigsawWorldLayout({
      imageWidth,
      imageHeight,
      puzzleWidth,
      puzzleHeight,
    });
    const pieceCount = Math.min(puzzleWidth * puzzleHeight, 64);
    const pieces = Array.from({ length: pieceCount }, (_, index) => makePiece(index, puzzleWidth));
    const placements = createInitialJigsawPlacements(caseLayout, pieces, caseViewport);
    const bounds = getJigsawOccupiedBounds(caseLayout, placements);
    const padding = 28;
    const camera = createJigsawOccupiedFitCamera(
      caseLayout,
      caseViewport,
      placements,
      padding,
      insets,
    );
    const screenBounds = getScreenBounds(bounds, camera, caseViewport);

    expect(screenBounds.left).toBeGreaterThanOrEqual(insets.left + padding - 0.01);
    expect(screenBounds.top).toBeGreaterThanOrEqual(insets.top + padding - 0.01);
    expect(screenBounds.right).toBeLessThanOrEqual(caseViewport.width - insets.right - padding + 0.01);
    expect(screenBounds.bottom).toBeLessThanOrEqual(caseViewport.height - insets.bottom - padding + 0.01);
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
