import type { JigsawPiece } from "../../catalog/types";
import { jigsawEdgeMaximumDepth } from "./edgePaths";

export type JigsawPlacement = {
  id: string;
  worldX: number;
  worldY: number;
};

export type JigsawWorldLayout = {
  worldWidth: number;
  worldHeight: number;
  boardX: number;
  boardY: number;
  boardWidth: number;
  boardHeight: number;
  pieceWidth: number;
  pieceHeight: number;
};

export type JigsawViewport = {
  width: number;
  height: number;
};

export type JigsawWorldBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type JigsawViewportInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type JigsawCamera = {
  centerX: number;
  centerY: number;
  zoom: number;
};

export type JigsawFitTarget = "workspace" | "board";
export type JigsawStagingMode = "perimeter" | "sides" | "top-bottom";

type JigsawWorldLayoutInput = {
  imageWidth: number;
  imageHeight: number;
  puzzleWidth: number;
  puzzleHeight: number;
};

type WorldPosition = {
  left: number;
  top: number;
};

type ScatterSlot = WorldPosition & {
  index: number;
};

type WorldPoint = {
  x: number;
  y: number;
};

const basePieceSize = 96;
const worldPadding = 48;
const worldScale = 1.55;
const minimumStagingPiecesPerAxis = 5;
const jigsawPieceVisualOverhangRatio = jigsawEdgeMaximumDepth / 100;

export const jigsawCameraMinimumZoom = 0.05;
export const jigsawCameraMaximumZoom = 4;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const mixSlotIndex = (value: number) => {
  let mixed = Math.imul(value ^ 0x9e37_79b9, 0x85eb_ca6b);
  mixed ^= mixed >>> 13;
  mixed = Math.imul(mixed, 0xc2b2_ae35);
  return (mixed ^ (mixed >>> 16)) >>> 0;
};

const rectanglesOverlap = (
  left: number,
  top: number,
  width: number,
  height: number,
  boardLeft: number,
  boardTop: number,
  boardWidth: number,
  boardHeight: number,
  gap = 0,
) =>
  left < boardLeft + boardWidth + gap &&
  left + width > boardLeft - gap &&
  top < boardTop + boardHeight + gap &&
  top + height > boardTop - gap;

export const createJigsawWorldLayout = ({
  imageWidth,
  imageHeight,
  puzzleWidth,
  puzzleHeight,
}: JigsawWorldLayoutInput): JigsawWorldLayout => {
  const safePuzzleWidth = Math.max(1, puzzleWidth);
  const safePuzzleHeight = Math.max(1, puzzleHeight);
  const imageRatio = Math.max(0.01, imageWidth / Math.max(1, imageHeight));
  const pieceAspectRatio = Math.max(0.01, imageRatio * safePuzzleHeight / safePuzzleWidth);
  const pieceWidth = basePieceSize * Math.sqrt(pieceAspectRatio);
  const pieceHeight = basePieceSize / Math.sqrt(pieceAspectRatio);
  const boardWidth = pieceWidth * safePuzzleWidth;
  const boardHeight = pieceHeight * safePuzzleHeight;
  const worldWidth = Math.max(
    boardWidth * worldScale,
    boardWidth + pieceWidth * minimumStagingPiecesPerAxis,
  ) + worldPadding * 2;
  const worldHeight = Math.max(
    boardHeight * worldScale,
    boardHeight + pieceHeight * minimumStagingPiecesPerAxis,
  ) + worldPadding * 2;

  return {
    worldWidth,
    worldHeight,
    boardX: (worldWidth - boardWidth) / 2,
    boardY: (worldHeight - boardHeight) / 2,
    boardWidth,
    boardHeight,
    pieceWidth,
    pieceHeight,
  };
};

export const isUsableJigsawViewport = (
  viewport: JigsawViewport | null | undefined,
): viewport is JigsawViewport => Boolean(
  viewport &&
  Number.isFinite(viewport.width) &&
  Number.isFinite(viewport.height) &&
  viewport.width > 0 &&
  viewport.height > 0,
);

const getStagingAspectThreshold = (pieceCount: number) => {
  if (pieceCount >= 64) return 1.2;
  if (pieceCount >= 24) return 1.3;
  if (pieceCount >= 8) return 1.45;
  return 1.65;
};

export const getJigsawStagingMode = (
  layout: JigsawWorldLayout,
  pieceCount: number,
  viewport: JigsawViewport | null = null,
): JigsawStagingMode => {
  if (!isUsableJigsawViewport(viewport)) return "perimeter";

  const boardAspectRatio = layout.boardWidth / Math.max(1, layout.boardHeight);
  const viewportAspectRatio = viewport.width / viewport.height;
  const relativeAspectRatio = viewportAspectRatio / Math.max(0.01, boardAspectRatio);
  const threshold = getStagingAspectThreshold(pieceCount);

  if (relativeAspectRatio >= threshold) return "sides";
  if (relativeAspectRatio <= 1 / threshold) return "top-bottom";
  return "perimeter";
};

const sortScatterSlots = (slots: readonly ScatterSlot[], salt = 0) =>
  [...slots].sort((left, right) =>
    mixSlotIndex(left.index + 1 + salt) - mixSlotIndex(right.index + 1 + salt));

export type JigsawPieceCellSpan = {
  width: number;
  height: number;
};

export const getJigsawPieceCellSpan = (
  piece: Pick<JigsawPiece, "specialShape">,
): JigsawPieceCellSpan =>
  piece.specialShape?.kind === "capsule"
    ? piece.specialShape.orientation === "horizontal"
      ? { width: 2, height: 1 }
      : { width: 1, height: 2 }
    : { width: 1, height: 1 };

export const getJigsawPieceWorldSize = (
  layout: JigsawWorldLayout,
  piece: Pick<JigsawPiece, "specialShape">,
) => {
  const span = getJigsawPieceCellSpan(piece);
  return {
    width: layout.pieceWidth * span.width,
    height: layout.pieceHeight * span.height,
  };
};

const getScatterSlotDistanceFromBoard = (
  layout: JigsawWorldLayout,
  slot: ScatterSlot,
  stagingMode: Exclude<JigsawStagingMode, "perimeter">,
  pieceWidth: number,
  pieceHeight: number,
) => {
  if (stagingMode === "sides") {
    return slot.left + pieceWidth <= layout.boardX
      ? layout.boardX - (slot.left + pieceWidth)
      : slot.left - (layout.boardX + layout.boardWidth);
  }

  return slot.top + pieceHeight <= layout.boardY
    ? layout.boardY - (slot.top + pieceHeight)
    : slot.top - (layout.boardY + layout.boardHeight);
};

const sortPreferredScatterSlots = (
  layout: JigsawWorldLayout,
  slots: readonly ScatterSlot[],
  stagingMode: Exclude<JigsawStagingMode, "perimeter">,
  pieceWidth: number,
  pieceHeight: number,
  salt: number,
) => [...slots].sort((left, right) => {
  const distanceDelta =
    getScatterSlotDistanceFromBoard(layout, left, stagingMode, pieceWidth, pieceHeight) -
    getScatterSlotDistanceFromBoard(layout, right, stagingMode, pieceWidth, pieceHeight);
  if (Math.abs(distanceDelta) > 0.5) return distanceDelta;

  return mixSlotIndex(left.index + 1 + salt) - mixSlotIndex(right.index + 1 + salt);
});

const interleaveScatterSlots = (
  first: readonly ScatterSlot[],
  second: readonly ScatterSlot[],
) => {
  const slots: ScatterSlot[] = [];
  const length = Math.max(first.length, second.length);

  for (let index = 0; index < length; index += 1) {
    const firstSlot = first[index];
    const secondSlot = second[index];
    if (firstSlot) slots.push(firstSlot);
    if (secondSlot) slots.push(secondSlot);
  }

  return slots;
};

const isBoardAlignedScatterSlot = (
  layout: JigsawWorldLayout,
  slot: ScatterSlot,
  stagingMode: Exclude<JigsawStagingMode, "perimeter">,
  pieceWidth: number,
  pieceHeight: number,
) => {
  if (stagingMode === "sides") {
    const centerY = slot.top + pieceHeight / 2;
    return centerY >= layout.boardY && centerY <= layout.boardY + layout.boardHeight;
  }

  const centerX = slot.left + pieceWidth / 2;
  return centerX >= layout.boardX && centerX <= layout.boardX + layout.boardWidth;
};

const createPreferredScatterSlots = (
  layout: JigsawWorldLayout,
  slots: readonly ScatterSlot[],
  stagingMode: Exclude<JigsawStagingMode, "perimeter">,
  boardGap: number,
  pieceWidth: number,
  pieceHeight: number,
) => {
  const boardLeft = layout.boardX - boardGap;
  const boardRight = layout.boardX + layout.boardWidth + boardGap;
  const boardTop = layout.boardY - boardGap;
  const boardBottom = layout.boardY + layout.boardHeight + boardGap;
  const firstSide = stagingMode === "sides"
    ? slots.filter((slot) => slot.left + pieceWidth <= boardLeft)
    : slots.filter((slot) => slot.top + pieceHeight <= boardTop);
  const secondSide = stagingMode === "sides"
    ? slots.filter((slot) => slot.left >= boardRight)
    : slots.filter((slot) => slot.top >= boardBottom);
  const firstSalt = stagingMode === "sides" ? 17 : 29;
  const secondSalt = stagingMode === "sides" ? 53 : 71;
  const alignedFirst = sortPreferredScatterSlots(
    layout,
    firstSide.filter((slot) => isBoardAlignedScatterSlot(layout, slot, stagingMode, pieceWidth, pieceHeight)),
    stagingMode,
    pieceWidth,
    pieceHeight,
    firstSalt,
  );
  const alignedSecond = sortPreferredScatterSlots(
    layout,
    secondSide.filter((slot) => isBoardAlignedScatterSlot(layout, slot, stagingMode, pieceWidth, pieceHeight)),
    stagingMode,
    pieceWidth,
    pieceHeight,
    secondSalt,
  );
  const overflowFirst = sortPreferredScatterSlots(
    layout,
    firstSide.filter((slot) => !isBoardAlignedScatterSlot(layout, slot, stagingMode, pieceWidth, pieceHeight)),
    stagingMode,
    pieceWidth,
    pieceHeight,
    firstSalt + 101,
  );
  const overflowSecond = sortPreferredScatterSlots(
    layout,
    secondSide.filter((slot) => !isBoardAlignedScatterSlot(layout, slot, stagingMode, pieceWidth, pieceHeight)),
    stagingMode,
    pieceWidth,
    pieceHeight,
    secondSalt + 101,
  );

  return [
    ...interleaveScatterSlots(alignedFirst, alignedSecond),
    ...interleaveScatterSlots(overflowFirst, overflowSecond),
  ];
};

const createScatterSlots = (
  layout: JigsawWorldLayout,
  pieceCount: number,
  viewport: JigsawViewport | null = null,
  piece: Pick<JigsawPiece, "specialShape"> | null = null,
): ScatterSlot[] => {
  const stepX = Math.max(18, layout.pieceWidth * 0.82);
  const stepY = Math.max(18, layout.pieceHeight * 0.82);
  const slots: ScatterSlot[] = [];
  const size = piece
    ? getJigsawPieceWorldSize(layout, piece)
    : { width: layout.pieceWidth, height: layout.pieceHeight };
  const maximumLeft = layout.worldWidth - size.width - worldPadding;
  const maximumTop = layout.worldHeight - size.height - worldPadding;
  const boardGap = Math.max(10, Math.min(layout.pieceWidth, layout.pieceHeight) * 0.14);

  for (let top = worldPadding; top <= maximumTop + 0.5; top += stepY) {
    for (let left = worldPadding; left <= maximumLeft + 0.5; left += stepX) {
      if (
        rectanglesOverlap(
          left,
          top,
          size.width,
          size.height,
          layout.boardX,
          layout.boardY,
          layout.boardWidth,
          layout.boardHeight,
          boardGap,
        )
      ) {
        continue;
      }

      slots.push({ left, top, index: slots.length });
    }
  }

  const stagingMode = getJigsawStagingMode(layout, pieceCount, viewport);
  if (stagingMode === "perimeter") {
    return sortScatterSlots(slots);
  }

  const preferred = createPreferredScatterSlots(
    layout,
    slots,
    stagingMode,
    boardGap,
    size.width,
    size.height,
  );
  const preferredIds = new Set(preferred.map((slot) => slot.index));
  const fallback = sortScatterSlots(slots.filter((slot) => !preferredIds.has(slot.index)), 97);

  return [...preferred, ...fallback];
};

export const normalizeJigsawWorldPosition = (
  layout: JigsawWorldLayout,
  left: number,
  top: number,
): Pick<JigsawPlacement, "worldX" | "worldY"> => ({
  worldX: clamp(left, 0, Math.max(0, layout.worldWidth - layout.pieceWidth)),
  worldY: clamp(top, 0, Math.max(0, layout.worldHeight - layout.pieceHeight)),
});

export const normalizeJigsawPieceWorldPosition = (
  layout: JigsawWorldLayout,
  piece: Pick<JigsawPiece, "specialShape">,
  left: number,
  top: number,
): Pick<JigsawPlacement, "worldX" | "worldY"> => {
  const size = getJigsawPieceWorldSize(layout, piece);
  return {
    worldX: clamp(left, 0, Math.max(0, layout.worldWidth - size.width)),
    worldY: clamp(top, 0, Math.max(0, layout.worldHeight - size.height)),
  };
};

export const getJigsawSolvedPosition = (
  layout: JigsawWorldLayout,
  piece: Pick<JigsawPiece, "row" | "column">,
): WorldPosition => ({
  left: layout.boardX + piece.column * layout.pieceWidth,
  top: layout.boardY + piece.row * layout.pieceHeight,
});

export const getJigsawPlacementPosition = (
  layout: JigsawWorldLayout,
  placement: JigsawPlacement,
  piece?: Pick<JigsawPiece, "specialShape">,
): WorldPosition => {
  const size = piece
    ? getJigsawPieceWorldSize(layout, piece)
    : { width: layout.pieceWidth, height: layout.pieceHeight };
  return {
    left: clamp(placement.worldX, 0, Math.max(0, layout.worldWidth - size.width)),
    top: clamp(placement.worldY, 0, Math.max(0, layout.worldHeight - size.height)),
  };
};

export const getJigsawOccupiedBounds = (
  layout: JigsawWorldLayout,
  placements: readonly JigsawPlacement[],
  pieces: readonly JigsawPiece[] = [],
): JigsawWorldBounds => {
  let left = layout.boardX;
  let top = layout.boardY;
  let right = layout.boardX + layout.boardWidth;
  let bottom = layout.boardY + layout.boardHeight;
  const horizontalOverhang = layout.pieceWidth * jigsawPieceVisualOverhangRatio;
  const verticalOverhang = layout.pieceHeight * jigsawPieceVisualOverhangRatio;
  const piecesById = new Map(pieces.map((piece) => [piece.id, piece] as const));

  for (const placement of placements) {
    const piece = piecesById.get(placement.id);
    const size = piece
      ? getJigsawPieceWorldSize(layout, piece)
      : { width: layout.pieceWidth, height: layout.pieceHeight };
    left = Math.min(left, placement.worldX - horizontalOverhang);
    top = Math.min(top, placement.worldY - verticalOverhang);
    right = Math.max(right, placement.worldX + size.width + horizontalOverhang);
    bottom = Math.max(bottom, placement.worldY + size.height + verticalOverhang);
  }

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
};

export const getJigsawWorkingBounds = (
  layout: JigsawWorldLayout,
  placements: readonly JigsawPlacement[],
  pieces: readonly JigsawPiece[] = [],
): JigsawWorldBounds => {
  let left = layout.boardX;
  let top = layout.boardY;
  let right = layout.boardX + layout.boardWidth;
  let bottom = layout.boardY + layout.boardHeight;
  const horizontalOverhang = layout.pieceWidth * jigsawPieceVisualOverhangRatio;
  const verticalOverhang = layout.pieceHeight * jigsawPieceVisualOverhangRatio;
  const maximumHorizontalGap = layout.pieceWidth * 0.45;
  const maximumVerticalGap = layout.pieceHeight * 0.45;
  const boardRight = layout.boardX + layout.boardWidth;
  const boardBottom = layout.boardY + layout.boardHeight;
  const piecesById = new Map(pieces.map((piece) => [piece.id, piece] as const));

  for (const placement of placements) {
    const piece = piecesById.get(placement.id);
    const size = piece
      ? getJigsawPieceWorldSize(layout, piece)
      : { width: layout.pieceWidth, height: layout.pieceHeight };
    const pieceLeft = placement.worldX - horizontalOverhang;
    const pieceTop = placement.worldY - verticalOverhang;
    const pieceRight = placement.worldX + size.width + horizontalOverhang;
    const pieceBottom = placement.worldY + size.height + verticalOverhang;
    const horizontalGap = pieceRight < layout.boardX
      ? layout.boardX - pieceRight
      : pieceLeft > boardRight
        ? pieceLeft - boardRight
        : 0;
    const verticalGap = pieceBottom < layout.boardY
      ? layout.boardY - pieceBottom
      : pieceTop > boardBottom
        ? pieceTop - boardBottom
        : 0;

    if (horizontalGap > maximumHorizontalGap || verticalGap > maximumVerticalGap) continue;

    left = Math.min(left, pieceLeft);
    top = Math.min(top, pieceTop);
    right = Math.max(right, pieceRight);
    bottom = Math.max(bottom, pieceBottom);
  }

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
};

export const createInitialJigsawPlacements = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  viewport: JigsawViewport | null = null,
): JigsawPlacement[] => {
  const orderedPieces = [...pieces].sort((left, right) => left.currentIndex - right.currentIndex);
  const usedSlotPositions = new Set<string>();
  const slotPositionKey = (slot: WorldPosition) => `${slot.left.toFixed(6)}:${slot.top.toFixed(6)}`;

  return orderedPieces.map((piece, index) => {
    const slots = createScatterSlots(layout, pieces.length, viewport, piece);
    const availableSlot = slots.find((slot) => !usedSlotPositions.has(slotPositionKey(slot)));
    const fallbackSlots = slots.length > 0
      ? slots
      : [{ left: worldPadding, top: worldPadding, index: -1 }];
    const slot = availableSlot ?? fallbackSlots[index % fallbackSlots.length];
    if (availableSlot) usedSlotPositions.add(slotPositionKey(availableSlot));
    const repeatedLayer = availableSlot ? 0 : Math.floor(index / fallbackSlots.length);
    const offset = repeatedLayer * 6;
    const position = normalizeJigsawPieceWorldPosition(
      layout,
      piece,
      slot.left + offset,
      slot.top + offset,
    );
    return { id: piece.id, ...position };
  });
};

const clampCameraAxis = (center: number, worldSize: number, visibleSize: number) => {
  const halfVisible = visibleSize / 2;
  const overscroll = Math.min(worldSize * 0.12, visibleSize * 0.2);
  const minimumCenter = halfVisible - overscroll;
  const maximumCenter = worldSize - halfVisible + overscroll;
  if (minimumCenter > maximumCenter) {
    return clamp(center, worldSize - halfVisible, halfVisible);
  }
  return clamp(center, minimumCenter, maximumCenter);
};

const normalizeViewportInsets = (
  viewport: JigsawViewport,
  insets: Partial<JigsawViewportInsets>,
): JigsawViewportInsets => ({
  top: clamp(Math.max(0, insets.top ?? 0), 0, viewport.height * 0.49),
  right: clamp(Math.max(0, insets.right ?? 0), 0, viewport.width * 0.49),
  bottom: clamp(Math.max(0, insets.bottom ?? 0), 0, viewport.height * 0.49),
  left: clamp(Math.max(0, insets.left ?? 0), 0, viewport.width * 0.49),
});

const clampCameraAxisForViewport = (
  center: number,
  worldSize: number,
  viewportSize: number,
  leadingInset: number,
  trailingInset: number,
  zoom: number,
  visualOverhang: number,
) => {
  const safeViewportSize = Math.max(1, viewportSize - leadingInset - trailingInset);
  const safeViewportCenter = leadingInset + safeViewportSize / 2;
  const viewportCenter = viewportSize / 2;
  const screenOffset = safeViewportCenter - viewportCenter;
  const safeWorldCenter = center + screenOffset / zoom;
  const extendedWorldSize = worldSize + visualOverhang * 2;
  const clampedSafeWorldCenter =
    clampCameraAxis(
      safeWorldCenter + visualOverhang,
      extendedWorldSize,
      safeViewportSize / zoom,
    ) - visualOverhang;

  return clampedSafeWorldCenter - screenOffset / zoom;
};

export const clampJigsawCamera = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  camera: JigsawCamera,
  insets: Partial<JigsawViewportInsets> = {},
): JigsawCamera => {
  const zoom = clamp(camera.zoom, jigsawCameraMinimumZoom, jigsawCameraMaximumZoom);
  const normalizedInsets = normalizeViewportInsets(viewport, insets);
  const horizontalOverhang = layout.pieceWidth * jigsawPieceVisualOverhangRatio;
  const verticalOverhang = layout.pieceHeight * jigsawPieceVisualOverhangRatio;

  return {
    centerX: clampCameraAxisForViewport(
      camera.centerX,
      layout.worldWidth,
      Math.max(1, viewport.width),
      normalizedInsets.left,
      normalizedInsets.right,
      zoom,
      horizontalOverhang,
    ),
    centerY: clampCameraAxisForViewport(
      camera.centerY,
      layout.worldHeight,
      Math.max(1, viewport.height),
      normalizedInsets.top,
      normalizedInsets.bottom,
      zoom,
      verticalOverhang,
    ),
    zoom,
  };
};

export const createJigsawBoundsFitCamera = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  bounds: JigsawWorldBounds,
  padding = 32,
  maximumZoom = jigsawCameraMaximumZoom,
  insets: Partial<JigsawViewportInsets> = {},
): JigsawCamera => {
  const top = Math.max(0, insets.top ?? 0);
  const right = Math.max(0, insets.right ?? 0);
  const bottom = Math.max(0, insets.bottom ?? 0);
  const left = Math.max(0, insets.left ?? 0);
  const safeViewportWidth = Math.max(1, viewport.width - left - right - padding * 2);
  const safeViewportHeight = Math.max(1, viewport.height - top - bottom - padding * 2);
  const zoom = clamp(
    Math.min(safeViewportWidth / Math.max(1, bounds.width), safeViewportHeight / Math.max(1, bounds.height)),
    jigsawCameraMinimumZoom,
    Math.min(jigsawCameraMaximumZoom, Math.max(jigsawCameraMinimumZoom, maximumZoom)),
  );
  const safeCenterX = left + padding + safeViewportWidth / 2;
  const safeCenterY = top + padding + safeViewportHeight / 2;
  const viewportCenterX = viewport.width / 2;
  const viewportCenterY = viewport.height / 2;

  return clampJigsawCamera(layout, viewport, {
    centerX: bounds.x + bounds.width / 2 - (safeCenterX - viewportCenterX) / zoom,
    centerY: bounds.y + bounds.height / 2 - (safeCenterY - viewportCenterY) / zoom,
    zoom,
  }, { top, right, bottom, left });
};

export const createJigsawFitCamera = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  target: JigsawFitTarget = "workspace",
  padding = 32,
  insets: Partial<JigsawViewportInsets> = {},
): JigsawCamera => createJigsawBoundsFitCamera(
  layout,
  viewport,
  target === "board"
    ? { x: layout.boardX, y: layout.boardY, width: layout.boardWidth, height: layout.boardHeight }
    : { x: 0, y: 0, width: layout.worldWidth, height: layout.worldHeight },
  padding,
  jigsawCameraMaximumZoom,
  insets,
);

export const createJigsawOccupiedFitCamera = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  placements: readonly JigsawPlacement[],
  padding = 28,
  insets: Partial<JigsawViewportInsets> = {},
  pieces: readonly JigsawPiece[] = [],
): JigsawCamera => createJigsawBoundsFitCamera(
  layout,
  viewport,
  getJigsawOccupiedBounds(layout, placements, pieces),
  padding,
  1.25,
  insets,
);

export const createJigsawWorkingFitCamera = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  placements: readonly JigsawPlacement[],
  padding = 28,
  insets: Partial<JigsawViewportInsets> = {},
  pieces: readonly JigsawPiece[] = [],
): JigsawCamera => {
  const fitted = createJigsawBoundsFitCamera(
    layout,
    viewport,
    getJigsawWorkingBounds(layout, placements, pieces),
    padding,
    1.25,
    insets,
  );

  const safe = normalizeViewportInsets(viewport, insets);
  const usableWidth = Math.max(1, viewport.width - safe.left - safe.right - padding * 2);
  const usableHeight = Math.max(1, viewport.height - safe.top - safe.bottom - padding * 2);

  // The automatic camera is a working view, not Show all. Fit the available
  // neighborhood when possible, but don't shrink ordinary pieces to thumbnails
  // to include an entire staging tray. Around 5-6 pieces across is a useful
  // touch-scale target, regardless of the artwork's aspect ratio.
  const readablePiecePixels = Math.min(64, usableWidth / 5.5, usableHeight / 4.5);
  const ordinaryPieceExtent = Math.sqrt(layout.pieceWidth * layout.pieceHeight);
  const minimumWorkingZoom = clamp(
    readablePiecePixels / Math.max(1, ordinaryPieceExtent),
    jigsawCameraMinimumZoom,
    1.25,
  );
  if (fitted.zoom >= minimumWorkingZoom) return fitted;

  const zoom = minimumWorkingZoom;
  const boardCenterX = layout.boardX + layout.boardWidth / 2;
  const boardCenterY = layout.boardY + layout.boardHeight / 2;
  const cameraFor = (worldX: number, worldY: number) => clampJigsawCamera(
    layout,
    viewport,
    {
      centerX: worldX - (safe.left - safe.right) / (2 * zoom),
      centerY: worldY - (safe.top - safe.bottom) / (2 * zoom),
      zoom,
    },
    safe,
  );

  // The board center is a good anchor on ordinary puzzles. Very large boards
  // can fill the entire screen with blank board, hiding every staged piece.
  // If none is visible, center a work area straddling the nearest piece and
  // the board perimeter, so the player can actually begin solving.
  const centered = cameraFor(boardCenterX, boardCenterY);
  const pieceById = new Map(pieces.map((piece) => [piece.id, piece] as const));
  const positioned = placements.map((placement) => {
    const piece = pieceById.get(placement.id);
    const size = piece
      ? getJigsawPieceWorldSize(layout, piece)
      : { width: layout.pieceWidth, height: layout.pieceHeight };
    return {
      x: placement.worldX + size.width / 2,
      y: placement.worldY + size.height / 2,
    };
  });
  const isVisible = (center: WorldPoint) => {
    const x = viewport.width / 2 + (center.x - centered.centerX) * zoom;
    const y = viewport.height / 2 + (center.y - centered.centerY) * zoom;
    return x >= safe.left + padding && x <= viewport.width - safe.right - padding &&
      y >= safe.top + padding && y <= viewport.height - safe.bottom - padding;
  };
  if (positioned.length === 0 || positioned.some(isVisible)) return centered;

  const nearest = positioned.reduce<{ x: number; y: number; distance: number }>((best, candidate) => {
    const distance = (candidate.x - boardCenterX) ** 2 + (candidate.y - boardCenterY) ** 2;
    return distance < best.distance ? { ...candidate, distance } : best;
  }, { x: boardCenterX, y: boardCenterY, distance: Number.POSITIVE_INFINITY });
  const nearestBoardX = clamp(nearest.x, layout.boardX, layout.boardX + layout.boardWidth);
  const nearestBoardY = clamp(nearest.y, layout.boardY, layout.boardY + layout.boardHeight);
  return cameraFor(
    (nearest.x + nearestBoardX) / 2,
    (nearest.y + nearestBoardY) / 2,
  );
};

export const screenToJigsawWorld = (
  camera: JigsawCamera,
  viewport: JigsawViewport,
  screenX: number,
  screenY: number,
): WorldPoint => ({
  x: camera.centerX + (screenX - viewport.width / 2) / camera.zoom,
  y: camera.centerY + (screenY - viewport.height / 2) / camera.zoom,
});

export const getJigsawCameraTransform = (
  camera: JigsawCamera,
  viewport: JigsawViewport,
) => ({
  translateX: viewport.width / 2 - camera.centerX * camera.zoom,
  translateY: viewport.height / 2 - camera.centerY * camera.zoom,
  scale: camera.zoom,
});

export const panJigsawCamera = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  camera: JigsawCamera,
  deltaScreenX: number,
  deltaScreenY: number,
): JigsawCamera =>
  clampJigsawCamera(layout, viewport, {
    ...camera,
    centerX: camera.centerX + deltaScreenX / camera.zoom,
    centerY: camera.centerY + deltaScreenY / camera.zoom,
  });

export const zoomJigsawCameraAtPoint = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  camera: JigsawCamera,
  nextZoom: number,
  screenX: number,
  screenY: number,
): JigsawCamera => {
  const worldPoint = screenToJigsawWorld(camera, viewport, screenX, screenY);
  const zoom = clamp(nextZoom, jigsawCameraMinimumZoom, jigsawCameraMaximumZoom);

  return clampJigsawCamera(layout, viewport, {
    centerX: worldPoint.x - (screenX - viewport.width / 2) / zoom,
    centerY: worldPoint.y - (screenY - viewport.height / 2) / zoom,
    zoom,
  });
};
