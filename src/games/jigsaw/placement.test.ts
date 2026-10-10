import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../../catalog/types";
import {
  createInitialJigsawPlacements,
  createJigsawFitCamera,
  createJigsawOccupiedFitCamera,
  createJigsawWorkingFitCamera,
  createJigsawWorldLayout,
  getJigsawOccupiedBounds,
  getJigsawWorkingBounds,
  getJigsawCameraTransform,
  getJigsawPieceCellSpan,
  getJigsawPieceWorldSize,
  getJigsawPlacementPosition,
  getJigsawSolvedPosition,
  getJigsawStagingMode,
  isUsableJigsawViewport,
  normalizeJigsawPieceWorldPosition,
  normalizeJigsawWorldPosition,
  panJigsawCamera,
  screenToJigsawWorld,
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

const makeCapsulePiece = (
  orientation: "horizontal" | "vertical",
  currentIndex: number,
): JigsawPiece => ({
  ...makePiece(currentIndex, 6),
  id: `capsule-${orientation}`,
  currentIndex,
  specialShape: {
    kind: "capsule",
    orientation,
    anchorRow: 3,
    anchorColumn: 3,
    radiusX: 40,
    radiusY: 40,
    socketPieceIds: ["a", "b", "c", "d", "e", "f"],
  },
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
  it("derives and clamps multi-cell visual spans for capsule pieces", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 6,
      puzzleHeight: 6,
    });
    const horizontal = {
      specialShape: {
        kind: "capsule" as const,
        orientation: "horizontal" as const,
        anchorRow: 2,
        anchorColumn: 2,
        radiusX: 30,
        radiusY: 40,
        socketPieceIds: ["a", "b", "c", "d", "e", "f"] as const,
      },
    };
    const vertical = {
      specialShape: {
        ...horizontal.specialShape,
        orientation: "vertical" as const,
      },
    };

    expect(getJigsawPieceCellSpan(horizontal)).toEqual({ width: 2, height: 1 });
    expect(getJigsawPieceCellSpan(vertical)).toEqual({ width: 1, height: 2 });
    expect(getJigsawPieceWorldSize(layout, horizontal)).toEqual({
      width: layout.pieceWidth * 2,
      height: layout.pieceHeight,
    });

    const clamped = normalizeJigsawPieceWorldPosition(
      layout,
      horizontal,
      layout.worldWidth,
      layout.worldHeight,
    );
    expect(clamped.worldX).toBeCloseTo(layout.worldWidth - layout.pieceWidth * 2);
    expect(clamped.worldY).toBeCloseTo(layout.worldHeight - layout.pieceHeight);
  });

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
      const position = getJigsawPlacementPosition(layout, placement!);
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

  it.each([
    { orientation: "horizontal" as const, viewport: null, expectedMode: "perimeter" as const },
    { orientation: "vertical" as const, viewport: null, expectedMode: "perimeter" as const },
    { orientation: "horizontal" as const, viewport: { width: 1440, height: 800 }, expectedMode: "sides" as const },
    { orientation: "vertical" as const, viewport: { width: 1440, height: 800 }, expectedMode: "sides" as const },
    { orientation: "horizontal" as const, viewport: { width: 760, height: 1280 }, expectedMode: "top-bottom" as const },
    { orientation: "vertical" as const, viewport: { width: 760, height: 1280 }, expectedMode: "top-bottom" as const },
  ])("keeps a $orientation capsule clear of the board in $expectedMode staging", ({
    orientation,
    viewport,
    expectedMode,
  }) => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 1200,
      puzzleWidth: 6,
      puzzleHeight: 6,
    });
    const pieces = [
      ...Array.from({ length: 36 }, (_, index) => makePiece(index, 6)),
      makeCapsulePiece(orientation, 36),
    ];
    const placements = createInitialJigsawPlacements(layout, pieces, viewport);
    const capsule = pieces.at(-1)!;
    const placement = placements.find((candidate) => candidate.id === capsule.id)!;
    const position = getJigsawPlacementPosition(layout, placement, capsule);
    const size = getJigsawPieceWorldSize(layout, capsule);

    expect(getJigsawStagingMode(layout, pieces.length, viewport)).toBe(expectedMode);
    expect(overlapsBoard(
      position.left,
      position.top,
      size.width,
      size.height,
      layout.boardX,
      layout.boardY,
      layout.boardWidth,
      layout.boardHeight,
    )).toBe(false);
    expect(position.left).toBeGreaterThanOrEqual(0);
    expect(position.top).toBeGreaterThanOrEqual(0);
    expect(position.left + size.width).toBeLessThanOrEqual(layout.worldWidth);
    expect(position.top + size.height).toBeLessThanOrEqual(layout.worldHeight);
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

  it("keeps the first overflow piece adjacent to its top/bottom tray", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200, imageHeight: 900, puzzleWidth: 4, puzzleHeight: 3,
    });
    const viewport = { width: 390, height: 844 };
    const placements = createInitialJigsawPlacements(
      layout, Array.from({ length: 40 }, (_, index) => makePiece(index, 4)), viewport,
    );
    expect(getJigsawStagingMode(layout, placements.length, viewport)).toBe("top-bottom");
    const firstOverflow = placements.find(
      (piece) => !isBoardAlignedTopBottomSlot(layout, piece.worldX),
    );
    expect(firstOverflow).toBeDefined();
    const center = firstOverflow!.worldX + layout.pieceWidth / 2;
    const lateralOverhang = Math.max(
      0,
      layout.boardX - center,
      center - (layout.boardX + layout.boardWidth),
    );
    expect(lateralOverhang).toBeLessThan(layout.pieceWidth * 1.5);
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

  it("treats world placement as workspace organization even when it lies over the board", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
    });
    const piece = makePiece(6);
    const solved = getJigsawSolvedPosition(layout, piece);
    const placement = {
      id: piece.id,
      ...normalizeJigsawWorldPosition(layout, solved.left + 7, solved.top - 5),
    };

    expect(getJigsawPlacementPosition(layout, placement)).toEqual({
      left: placement.worldX,
      top: placement.worldY,
    });
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

  it("keeps canonical solved coordinates as geometry without making the board a snap target", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
    });
    const piece = makePiece(6);
    const target = getJigsawSolvedPosition(layout, piece);
    const arbitrary = normalizeJigsawWorldPosition(layout, target.left + 5, target.top + 5);

    expect(target.left).toBeCloseTo(layout.boardX + layout.pieceWidth * 2);
    expect(target.top).toBeCloseTo(layout.boardY + layout.pieceHeight);
    expect(getJigsawPlacementPosition(layout, { id: piece.id, ...arbitrary })).toEqual({
      left: arbitrary.worldX,
      top: arbitrary.worldY,
    });
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

  it("uses a board-first working fit instead of shrinking to every loose piece", () => {
    const compactLayout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 7,
      puzzleHeight: 5,
    });
    const pieces = Array.from({ length: 35 }, (_, index) => makePiece(index, 7));
    const portraitViewport = { width: 390, height: 844 };
    const placements = createInitialJigsawPlacements(compactLayout, pieces, portraitViewport);
    const occupiedBounds = getJigsawOccupiedBounds(compactLayout, placements);
    const workingBounds = getJigsawWorkingBounds(compactLayout, placements);
    const occupiedCamera = createJigsawOccupiedFitCamera(compactLayout, portraitViewport, placements);
    const workingCamera = createJigsawWorkingFitCamera(compactLayout, portraitViewport, placements);

    expect(workingBounds.width).toBeLessThanOrEqual(occupiedBounds.width);
    expect(workingBounds.height).toBeLessThan(occupiedBounds.height);
    expect(workingBounds.height).toBeGreaterThanOrEqual(compactLayout.boardHeight);
    expect(workingCamera.zoom).toBeGreaterThan(occupiedCamera.zoom);
    expect(workingCamera.zoom).toBeLessThanOrEqual(1.25);
    expect(workingCamera.zoom * Math.sqrt(compactLayout.pieceWidth * compactLayout.pieceHeight)).toBeGreaterThan(68);

    // Working view is deliberately allowed to crop distant staging inventory.
    const allPieces = getScreenBounds(occupiedBounds, workingCamera, portraitViewport);
    expect(allPieces.right - allPieces.left).toBeGreaterThan(portraitViewport.width);
    const boardCenter = screenToJigsawWorld(
      workingCamera, portraitViewport, portraitViewport.width / 2, portraitViewport.height / 2,
    );
    expect(boardCenter.x).toBeCloseTo(compactLayout.boardX + compactLayout.boardWidth / 2, 4);
    expect(boardCenter.y).toBeCloseTo(compactLayout.boardY + compactLayout.boardHeight / 2, 4);
  });

  it.each([
    { name: "portrait phone", viewport: { width: 390, height: 844 }, insets: {} },
    { name: "compact portrait phone", viewport: { width: 320, height: 568 }, insets: {} },
    { name: "expanded portrait with chrome", viewport: { width: 390, height: 1350 },
      insets: { top: 64, bottom: 80, left: 68, right: 12 } },
    { name: "landscape phone", viewport: { width: 740, height: 360 },
      insets: { top: 36, bottom: 70, left: 52, right: 24 } },
    { name: "desktop", viewport: { width: 1280, height: 760 }, insets: {} },
  ])("starts with readable pieces and a board-centered $name workbench", ({ viewport: size, insets }) => {
    const portraitLayout = createJigsawWorldLayout({
      imageWidth: 1200, imageHeight: 900, puzzleWidth: 7, puzzleHeight: 5,
    });
    const pieces = Array.from({ length: 35 }, (_, index) => makePiece(index, 7));
    const placements = createInitialJigsawPlacements(portraitLayout, pieces, size);
    const camera = createJigsawWorkingFitCamera(portraitLayout, size, placements, 28, insets, pieces);
    const targetPixels = Math.min(
      72,
      (size.width - (insets.left ?? 0) - (insets.right ?? 0) - 56) / 4.5,
      (size.height - (insets.top ?? 0) - (insets.bottom ?? 0) - 56) / 4.5,
    );
    expect(camera.zoom * Math.sqrt(portraitLayout.pieceWidth * portraitLayout.pieceHeight))
      .toBeGreaterThanOrEqual(targetPixels - 0.01);
    expect(camera.zoom).toBeLessThanOrEqual(1.25);
    const board = getScreenBounds({
      x: portraitLayout.boardX, y: portraitLayout.boardY,
      width: portraitLayout.boardWidth, height: portraitLayout.boardHeight,
    }, camera, size);
    expect(board.left).toBeLessThan(size.width - (insets.right ?? 0));
    expect(board.right).toBeGreaterThan(insets.left ?? 0);
    expect(board.top).toBeLessThan(size.height - (insets.bottom ?? 0));
    expect(board.bottom).toBeGreaterThan(insets.top ?? 0);
  });

  it("does not open a blank center of a very large board with all pieces out of view", () => {
    const largeLayout = createJigsawWorldLayout({
      imageWidth: 1600, imageHeight: 1200, puzzleWidth: 32, puzzleHeight: 32,
    });
    const size = { width: 390, height: 844 };
    const pieces = Array.from({ length: 64 }, (_, index) => makePiece(index, 32));
    const placements = createInitialJigsawPlacements(largeLayout, pieces, size);
    const camera = createJigsawWorkingFitCamera(largeLayout, size, placements);
    const transform = getJigsawCameraTransform(camera, size);
    const visiblePieces = placements.filter((placement) => {
      const x = (placement.worldX + largeLayout.pieceWidth / 2) * transform.scale + transform.translateX;
      const y = (placement.worldY + largeLayout.pieceHeight / 2) * transform.scale + transform.translateY;
      return x >= 28 && x <= size.width - 28 && y >= 28 && y <= size.height - 28;
    });
    expect(camera.zoom * Math.sqrt(largeLayout.pieceWidth * largeLayout.pieceHeight))
      .toBeGreaterThanOrEqual(50);
    expect(visiblePieces.length).toBeGreaterThan(0);
    const board = getScreenBounds({
      x: largeLayout.boardX, y: largeLayout.boardY,
      width: largeLayout.boardWidth, height: largeLayout.boardHeight,
    }, camera, size);
    expect(board.left).toBeLessThan(size.width);
    expect(board.top).toBeLessThan(size.height);
    expect(board.right).toBeGreaterThan(0);
    expect(board.bottom).toBeGreaterThan(0);
  });

  it("keeps explicit Fit board and Show all independent of the automatic readability floor", () => {
    const compactLayout = createJigsawWorldLayout({
      imageWidth: 1200, imageHeight: 900, puzzleWidth: 7, puzzleHeight: 5,
    });
    const pieces = Array.from({ length: 35 }, (_, index) => makePiece(index, 7));
    const portraitViewport = { width: 390, height: 844 };
    const placements = createInitialJigsawPlacements(compactLayout, pieces, portraitViewport);
    const working = createJigsawWorkingFitCamera(compactLayout, portraitViewport, placements);
    const all = createJigsawOccupiedFitCamera(compactLayout, portraitViewport, placements);
    const board = createJigsawFitCamera(compactLayout, portraitViewport, "board");
    expect(working.zoom).toBeGreaterThan(all.zoom);
    expect(board.zoom).toBeGreaterThan(all.zoom);
    const bounds = getScreenBounds(getJigsawOccupiedBounds(compactLayout, placements), all, portraitViewport);
    expect(bounds.left).toBeGreaterThanOrEqual(27.9);
    expect(bounds.right).toBeLessThanOrEqual(portraitViewport.width - 27.9);
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
