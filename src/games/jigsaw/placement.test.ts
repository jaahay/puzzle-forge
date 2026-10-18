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

  it("uses the same deterministic placement algorithm with or without a measured viewport", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200, imageHeight: 1200, puzzleWidth: 8, puzzleHeight: 8,
    });
    const pieces = Array.from({ length: 64 }, (_, index) => makePiece(index, 8));
    const neutral = createInitialJigsawPlacements(layout, pieces);
    expect(neutral).toEqual(createInitialJigsawPlacements(layout, pieces, null));
    expect(neutral).toEqual(createInitialJigsawPlacements(layout, pieces, { width: 0, height: 800 }));
    expect(neutral).toHaveLength(64);
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

  it("composes a broad, irregular table rather than a tight fixed-depth ring", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200, imageHeight: 900, puzzleWidth: 4, puzzleHeight: 4,
    });
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index));
    const portrait = { width: 390, height: 844 };
    const placements = createInitialJigsawPlacements(layout, pieces, portrait);
    const bounds = getJigsawOccupiedBounds(layout, placements, pieces);
    expect(bounds.height / bounds.width).toBeGreaterThan(0.9);
    expect(bounds.height).toBeGreaterThan(layout.boardHeight * 1.8);
    expect(createInitialJigsawPlacements(layout, pieces, portrait)).toEqual(placements);
  });

  it.each([
    { orientation: "horizontal" as const, viewport: null },
    { orientation: "vertical" as const, viewport: null },
    { orientation: "horizontal" as const, viewport: { width: 1440, height: 800 } },
    { orientation: "vertical" as const, viewport: { width: 1440, height: 800 } },
    { orientation: "horizontal" as const, viewport: { width: 760, height: 1280 } },
    { orientation: "vertical" as const, viewport: { width: 760, height: 1280 } },
  ])("keeps a $orientation capsule clear of the board across viewport geometries", ({
    orientation, viewport,
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

  it.each([
    { imageWidth: 721, imageHeight: 2048, columns: 6, rows: 17, viewport: { width: 1440, height: 800 } },
    { imageWidth: 2048, imageHeight: 721, columns: 17, rows: 6, viewport: { width: 760, height: 1280 } },
  ])("composes the whole table for artwork and viewport with contrasting proportions", ({
    imageWidth, imageHeight, columns, rows, viewport,
  }) => {
    const layout = createJigsawWorldLayout({
      imageWidth, imageHeight, puzzleWidth: columns, puzzleHeight: rows,
    });
    const pieces = Array.from({ length: 48 }, (_, index) => makePiece(index, columns));
    const placements = createInitialJigsawPlacements(layout, pieces, viewport);
    const occupied = getJigsawOccupiedBounds(layout, placements, pieces);
    const fit = createJigsawOccupiedFitCamera(layout, viewport, placements, 28, {}, pieces);
    const screen = getScreenBounds(occupied, fit, viewport);
    expect(screen.left).toBeGreaterThanOrEqual(27.9);
    expect(screen.top).toBeGreaterThanOrEqual(27.9);
    expect(screen.right).toBeLessThanOrEqual(viewport.width - 27.9);
    expect(screen.bottom).toBeLessThanOrEqual(viewport.height - 27.9);
    expect(placements).toHaveLength(48);
    expect(placements.some((p) => p.worldX < layout.boardX)).toBe(true);
    expect(placements.some((p) => p.worldX > layout.boardX + layout.boardWidth)).toBe(true);
    expect(placements.some((p) => p.worldY < layout.boardY)).toBe(true);
    expect(placements.some((p) => p.worldY > layout.boardY + layout.boardHeight)).toBe(true);
  });

  it("keeps all loose pieces non-overlapping as continuous staging fills", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200, imageHeight: 900, puzzleWidth: 8, puzzleHeight: 8,
    });
    const pieces = Array.from({ length: 64 }, (_, index) => makePiece(index, 8))
      .concat([makeCapsulePiece("horizontal", 64), makeCapsulePiece("vertical", 65)]);
    const placements = createInitialJigsawPlacements(layout, pieces, { width: 390, height: 844 });
    expect(placements).toHaveLength(pieces.length);
    for (let index = 0; index < placements.length; index++) {
      const first = placements[index];
      const firstSize = getJigsawPieceWorldSize(layout, pieces[index]);
      for (let j = index + 1; j < placements.length; j++) {
        const other = placements[j];
        const secondSize = getJigsawPieceWorldSize(layout, pieces[j]);
        expect(first.worldX + firstSize.width <= other.worldX ||
          other.worldX + secondSize.width <= first.worldX ||
          first.worldY + firstSize.height <= other.worldY ||
          other.worldY + secondSize.height <= first.worldY).toBe(true);
      }
    }
    expect(createInitialJigsawPlacements(layout, pieces, { width: 390, height: 844 }))
      .toEqual(placements);
  });

  it("stages ordinary and special pieces as distinct loose pieces rather than touching strips", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200, imageHeight: 900, puzzleWidth: 7, puzzleHeight: 5,
    });
    const pieces = Array.from({ length: 33 }, (_, index) => makePiece(index, 7))
      .concat([makeCapsulePiece("horizontal", 33), makeCapsulePiece("vertical", 34)]);
    const viewport = { width: 390, height: 844 };
    const placed = createInitialJigsawPlacements(layout, pieces, viewport);
    for (let index = 0; index < placed.length; index++) {
      const first = placed[index];
      const firstPiece = pieces.find(piece => piece.id === first.id)!;
      const firstSize = getJigsawPieceWorldSize(layout, firstPiece);
      for (const other of placed.slice(index + 1)) {
        const otherPiece = pieces.find(piece => piece.id === other.id)!;
        const otherSize = getJigsawPieceWorldSize(layout, otherPiece);
        const horizontalGap = Math.max(
          0, other.worldX - (first.worldX + firstSize.width),
          first.worldX - (other.worldX + otherSize.width),
        );
        const verticalGap = Math.max(
          0, other.worldY - (first.worldY + firstSize.height),
          first.worldY - (other.worldY + otherSize.height),
        );
        expect(horizontalGap > 0 || verticalGap > 0).toBe(true);
      }
    }
    expect(createInitialJigsawPlacements(layout, pieces, viewport)).toEqual(placed);
  });

  it("grows the occupied footprint with piece count using the same table algorithm", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200, imageHeight: 1200, puzzleWidth: 8, puzzleHeight: 8,
    });
    const viewport = { width: 390, height: 844 };
    const small = Array.from({ length: 4 }, (_, index) => makePiece(index, 8));
    const large = Array.from({ length: 64 }, (_, index) => makePiece(index, 8));
    const smallBounds = getJigsawOccupiedBounds(
      layout, createInitialJigsawPlacements(layout, small, viewport), small,
    );
    const largeBounds = getJigsawOccupiedBounds(
      layout, createInitialJigsawPlacements(layout, large, viewport), large,
    );
    expect(largeBounds.height * largeBounds.width).toBeGreaterThan(
      smallBounds.height * smallBounds.width,
    );
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

  it.each([
    { name: "square artwork", imageWidth: 1200, imageHeight: 1200, width: 4, height: 4, count: 16 },
    { name: "landscape artwork", imageWidth: 1600, imageHeight: 900, width: 7, height: 5, count: 35 },
    { name: "portrait artwork", imageWidth: 721, imageHeight: 2048, width: 5, height: 7, count: 35 },
    { name: "dense artwork", imageWidth: 1400, imageHeight: 900, width: 10, height: 10, count: 100 },
  ])("keeps the $name composition centered around its board without symmetric quotas", ({
    imageWidth, imageHeight, width, height, count,
  }) => {
    const layout = createJigsawWorldLayout({
      imageWidth, imageHeight, puzzleWidth: width, puzzleHeight: height,
    });
    const pieces = Array.from({ length: count }, (_, index) => makePiece(index, width));
    const viewport = { width: 390, height: 1000 };
    const placements = createInitialJigsawPlacements(layout, pieces, viewport);
    const bounds = getJigsawOccupiedBounds(layout, placements, pieces);
    const boardCenterX = layout.boardX + layout.boardWidth / 2;
    const boardCenterY = layout.boardY + layout.boardHeight / 2;
    expect(Math.abs(bounds.x + bounds.width / 2 - boardCenterX))
      .toBeLessThan(layout.pieceWidth * 1.5);
    expect(Math.abs(bounds.y + bounds.height / 2 - boardCenterY))
      .toBeLessThan(layout.pieceHeight * 1.5);
    expect(placements).toEqual(createInitialJigsawPlacements(layout, pieces, viewport));
  });

  it("does not align loose pieces into conspicuous grid columns", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1600, imageHeight: 900, puzzleWidth: 7, puzzleHeight: 5,
    });
    const pieces = Array.from({ length: 35 }, (_, index) => makePiece(index, 7));
    const placed = createInitialJigsawPlacements(layout, pieces, { width: 390, height: 1000 });
    const nearlySharedColumns = placed.reduce((count, a, i) =>
      count + placed.slice(i + 1).filter((b) =>
        Math.abs(a.worldX - b.worldX) < layout.pieceWidth * 0.04,
      ).length, 0);
    expect(nearlySharedColumns).toBeLessThan(18);
  });

  it("scatters small puzzles at varied non-lattice positions without covering the board", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1600, imageHeight: 900, puzzleWidth: 5, puzzleHeight: 4,
    });
    const pieces = Array.from({ length: 20 }, (_, index) => makePiece(index, 5));
    const viewport = { width: 390, height: 844 };
    const placements = createInitialJigsawPlacements(layout, pieces, viewport);
    const distinctFractions = new Set(placements.map((p) =>
      Math.round(((p.worldX / layout.pieceWidth) % 1 + 1) % 1 * 100),
    ));
    expect(distinctFractions.size).toBeGreaterThan(8);
    expect(createInitialJigsawPlacements(layout, pieces, viewport)).toEqual(placements);
    for (const placement of placements) {
      expect(overlapsBoard(
        placement.worldX, placement.worldY, layout.pieceWidth, layout.pieceHeight,
        layout.boardX, layout.boardY, layout.boardWidth, layout.boardHeight,
      )).toBe(false);
    }
  });

  it.each([
    { name: "small with a special piece", width: 4, height: 4, count: 16, special: true, minimumVariations: 9 },
    { name: "medium landscape", width: 7, height: 5, count: 35, special: false, minimumVariations: 18 },
  ])("retains irregular staging on $name", ({ width, height, count, special, minimumVariations }) => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1600, imageHeight: 900, puzzleWidth: width, puzzleHeight: height,
    });
    const pieces = Array.from({ length: count }, (_, index) => makePiece(index, width));
    if (special) pieces.push(makeCapsulePiece("horizontal", count));
    const placements = createInitialJigsawPlacements(layout, pieces, { width: 390, height: 844 });
    const distinctFractions = new Set(placements.map((p) =>
      Math.round(((p.worldX / layout.pieceWidth) % 1 + 1) % 1 * 100),
    ));
    expect(distinctFractions.size).toBeGreaterThan(minimumVariations);
    expect(createInitialJigsawPlacements(layout, pieces, { width: 390, height: 844 })).toEqual(placements);
    for (let index = 0; index < placements.length; index += 1) {
      const a = placements[index]!;
      const sizeA = getJigsawPieceWorldSize(layout, pieces[index]!);
      for (let j = index + 1; j < placements.length; j += 1) {
        const b = placements[j]!;
        const sizeB = getJigsawPieceWorldSize(layout, pieces[j]!);
        expect(
          a.worldX + sizeA.width <= b.worldX ||
          b.worldX + sizeB.width <= a.worldX ||
          a.worldY + sizeA.height <= b.worldY ||
          b.worldY + sizeB.height <= a.worldY,
        ).toBe(true);
      }
    }
  });

  it("uses vertically available staging depth, not just a top/bottom piece count", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1000, imageHeight: 1000, puzzleWidth: 6, puzzleHeight: 6,
    });
    const pieces = Array.from({ length: 36 }, (_, index) => makePiece(index, 6));
    const measure = (viewport: { width: number; height: number }) => {
      const placements = createInitialJigsawPlacements(layout, pieces, viewport);
      const bounds = getJigsawOccupiedBounds(layout, placements, pieces);
      const camera = createJigsawOccupiedFitCamera(layout, viewport, placements, 28, {}, pieces);
      const screen = getScreenBounds(bounds, camera, viewport);
      expect(screen.left).toBeGreaterThanOrEqual(27.9);
      expect(screen.top).toBeGreaterThanOrEqual(27.9);
      expect(screen.right).toBeLessThanOrEqual(viewport.width - 27.9);
      expect(screen.bottom).toBeLessThanOrEqual(viewport.height - 27.9);
      return bounds.height / bounds.width;
    };
    expect(measure({ width: 390, height: 1000 })).toBeGreaterThan(
      measure({ width: 1000, height: 390 }),
    );
  });

  it("biases the same square puzzle toward the taller dimension of its initial workspace", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1000, imageHeight: 1000, puzzleWidth: 4, puzzleHeight: 4,
    });
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index, 4));
    const tallViewport = { width: 390, height: 1100 };
    const wideViewport = { width: 1100, height: 390 };
    let tallVertical = 0;
    let tallHorizontal = 0;
    let wideVertical = 0;
    let wideHorizontal = 0;
    // Assess the directional tendency across several seeded permutations,
    // not an accidental tie from a single 16-piece scatter.
    for (const offset of [0, 1, 3, 5, 7, 11]) {
      const shuffled = pieces.map((piece, index) => ({
        ...piece, currentIndex: (index + offset) % pieces.length,
      }));
      const tall = createInitialJigsawPlacements(layout, shuffled, tallViewport);
      const wide = createInitialJigsawPlacements(layout, shuffled, wideViewport);
      tallVertical += tall.filter((placement) => isTopBottomStaged(layout, placement.worldY)).length;
      tallHorizontal += tall.filter((placement) => isSideStaged(layout, placement.worldX)).length;
      wideVertical += wide.filter((placement) => isTopBottomStaged(layout, placement.worldY)).length;
      wideHorizontal += wide.filter((placement) => isSideStaged(layout, placement.worldX)).length;
      expect(createInitialJigsawPlacements(layout, shuffled, tallViewport)).toEqual(tall);
    }
    expect(tallVertical).toBeGreaterThan(wideVertical);
    expect(wideHorizontal).toBeGreaterThan(tallHorizontal);
  });

  it("favors board proportions without treating horizontal and vertical as exclusive modes", () => {
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index, 4));
    const viewport = { width: 850, height: 850 };
    const wide = createJigsawWorldLayout({
      imageWidth: 1800, imageHeight: 900, puzzleWidth: 4, puzzleHeight: 4,
    });
    const tall = createJigsawWorldLayout({
      imageWidth: 900, imageHeight: 1800, puzzleWidth: 4, puzzleHeight: 4,
    });
    const widePieces = createInitialJigsawPlacements(wide, pieces, viewport);
    const tallPieces = createInitialJigsawPlacements(tall, pieces, viewport);
    expect(widePieces.filter((p) => isTopBottomStaged(wide, p.worldY)).length)
      .toBeGreaterThan(tallPieces.filter((p) => isTopBottomStaged(tall, p.worldY)).length);
    expect(tallPieces.filter((p) => isSideStaged(tall, p.worldX)).length)
      .toBeGreaterThan(widePieces.filter((p) => isSideStaged(wide, p.worldX)).length);
    for (const [layout, placements] of [[wide, widePieces], [tall, tallPieces]] as const) {
      const fit = createJigsawOccupiedFitCamera(layout, viewport, placements, 28, {}, pieces);
      const bounds = getScreenBounds(getJigsawOccupiedBounds(layout, placements, pieces), fit, viewport);
      expect(bounds.left).toBeGreaterThanOrEqual(27.9);
      expect(bounds.top).toBeGreaterThanOrEqual(27.9);
      expect(bounds.right).toBeLessThanOrEqual(viewport.width - 27.9);
      expect(bounds.bottom).toBeLessThanOrEqual(viewport.height - 27.9);
    }
  });

  it("handles dense medium puzzles through the same deterministic collision-free distribution", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200, imageHeight: 900, puzzleWidth: 12, puzzleHeight: 8,
    });
    const pieces = Array.from({ length: 97 }, (_, i) => makePiece(i, 12));
    const viewport = { width: 1440, height: 900 };
    const scattered = createInitialJigsawPlacements(layout, pieces, viewport);
    expect(scattered).toHaveLength(97);
    expect(createInitialJigsawPlacements(layout, pieces, viewport)).toEqual(scattered);
    const fractions = new Set(scattered.map((p) =>
      Math.round(((p.worldX / layout.pieceWidth) % 1 + 1) % 1 * 100),
    ));
    expect(fractions.size).toBeGreaterThan(20);
    for (let i = 0; i < scattered.length; i += 1) {
      const a = scattered[i]!;
      for (let j = i + 1; j < scattered.length; j += 1) {
        const b = scattered[j]!;
        expect(
          a.worldX + layout.pieceWidth <= b.worldX ||
          b.worldX + layout.pieceWidth <= a.worldX ||
          a.worldY + layout.pieceHeight <= b.worldY ||
          b.worldY + layout.pieceHeight <= a.worldY,
        ).toBe(true);
      }
    }
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

  it("does not move a centered overview away from unused corner controls", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200, imageHeight: 900, puzzleWidth: 4, puzzleHeight: 4,
    });
    const viewport = { width: 390, height: 1000 };
    const pieces = Array.from({ length: 16 }, (_, index) => makePiece(index, 4));
    const placements = createInitialJigsawPlacements(layout, pieces, viewport);
    const withoutControls = createJigsawOccupiedFitCamera(
      layout, viewport, placements, 28, {}, pieces,
    );
    const withUpperControls = createJigsawOccupiedFitCamera(
      layout, viewport, placements, 28, { top: 88 }, pieces,
    );
    const occupied = getScreenBounds(getJigsawOccupiedBounds(layout, placements, pieces), withoutControls, viewport);
    expect(occupied.top).toBeGreaterThan(88);
    expect(withUpperControls).toEqual(withoutControls);

    const crowdedViewport = { width: 390, height: 520 };
    const crowded = createJigsawOccupiedFitCamera(
      layout, crowdedViewport, placements, 28, { top: 140 }, pieces,
    );
    const visible = getScreenBounds(getJigsawOccupiedBounds(layout, placements, pieces), crowded, crowdedViewport);
    expect(visible.top).toBeGreaterThanOrEqual(139.9);
    expect(visible.bottom).toBeLessThanOrEqual(crowdedViewport.height - 27.9);
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

  it("preserves the board center during repeated centered zoom steps on a tall phone", () => {
    const portrait = createJigsawWorldLayout({
      imageWidth: 1637, imageHeight: 2048, puzzleWidth: 5, puzzleHeight: 7,
    });
    const phone = { width: 390, height: 1100 };
    const pieces = Array.from({ length: 35 }, (_, index) => makePiece(index, 5));
    const placements = createInitialJigsawPlacements(portrait, pieces, phone);
    const original = createJigsawWorkingFitCamera(portrait, phone, placements, 28, {}, pieces);
    const first = zoomJigsawCameraAtPoint(
      portrait, phone, original, original.zoom * 0.6, phone.width / 2, phone.height / 2,
    );
    const second = zoomJigsawCameraAtPoint(
      portrait, phone, first, original.zoom * 1.15, phone.width / 2, phone.height / 2,
    );
    expect(first.centerX).toBeCloseTo(original.centerX);
    expect(first.centerY).toBeCloseTo(original.centerY);
    expect(second.centerX).toBeCloseTo(original.centerX);
    expect(second.centerY).toBeCloseTo(original.centerY);
    expect(first.zoom).toBeLessThan(original.zoom);
  });

  it("stages a portrait 35-piece puzzle without repeated modes or an implicit grid", () => {
    const portrait = createJigsawWorldLayout({
      imageWidth: 1637, imageHeight: 2048, puzzleWidth: 5, puzzleHeight: 7,
    });
    const phone = { width: 390, height: 1100 };
    const pieces = Array.from({ length: 35 }, (_, index) => makePiece(index, 5));
    const scattered = createInitialJigsawPlacements(portrait, pieces, phone);
    const columns = new Set(scattered.map((p) => Math.round(p.worldX / 5)));
    const rows = new Set(scattered.map((p) => Math.round(p.worldY / 5)));
    expect(columns.size).toBeGreaterThan(12);
    expect(rows.size).toBeGreaterThan(12);
    expect(createInitialJigsawPlacements(portrait, pieces, phone)).toEqual(scattered);
    for (let i = 0; i < scattered.length; i++) {
      const a = scattered[i]!;
      for (let j = i + 1; j < scattered.length; j++) {
        const b = scattered[j]!;
        expect(
          a.worldX + portrait.pieceWidth <= b.worldX ||
          b.worldX + portrait.pieceWidth <= a.worldX ||
          a.worldY + portrait.pieceHeight <= b.worldY ||
          b.worldY + portrait.pieceHeight <= a.worldY,
        ).toBe(true);
      }
    }
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
