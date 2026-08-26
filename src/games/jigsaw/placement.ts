import type { JigsawPiece } from "../../catalog/types";

export type JigsawPlacement = {
  id: string;
  worldX: number;
  worldY: number;
  snapped: boolean;
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
) => {
  if (stagingMode === "sides") {
    const centerY = slot.top + layout.pieceHeight / 2;
    return centerY >= layout.boardY && centerY <= layout.boardY + layout.boardHeight;
  }

  const centerX = slot.left + layout.pieceWidth / 2;
  return centerX >= layout.boardX && centerX <= layout.boardX + layout.boardWidth;
};

const createPreferredScatterSlots = (
  layout: JigsawWorldLayout,
  slots: readonly ScatterSlot[],
  stagingMode: Exclude<JigsawStagingMode, "perimeter">,
  boardGap: number,
) => {
  const boardLeft = layout.boardX - boardGap;
  const boardRight = layout.boardX + layout.boardWidth + boardGap;
  const boardTop = layout.boardY - boardGap;
  const boardBottom = layout.boardY + layout.boardHeight + boardGap;
  const firstSide = stagingMode === "sides"
    ? slots.filter((slot) => slot.left + layout.pieceWidth <= boardLeft)
    : slots.filter((slot) => slot.top + layout.pieceHeight <= boardTop);
  const secondSide = stagingMode === "sides"
    ? slots.filter((slot) => slot.left >= boardRight)
    : slots.filter((slot) => slot.top >= boardBottom);
  const firstSalt = stagingMode === "sides" ? 17 : 29;
  const secondSalt = stagingMode === "sides" ? 53 : 71;
  const alignedFirst = sortScatterSlots(
    firstSide.filter((slot) => isBoardAlignedScatterSlot(layout, slot, stagingMode)),
    firstSalt,
  );
  const alignedSecond = sortScatterSlots(
    secondSide.filter((slot) => isBoardAlignedScatterSlot(layout, slot, stagingMode)),
    secondSalt,
  );
  const overflowFirst = sortScatterSlots(
    firstSide.filter((slot) => !isBoardAlignedScatterSlot(layout, slot, stagingMode)),
    firstSalt + 101,
  );
  const overflowSecond = sortScatterSlots(
    secondSide.filter((slot) => !isBoardAlignedScatterSlot(layout, slot, stagingMode)),
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
): WorldPosition[] => {
  const stepX = Math.max(18, layout.pieceWidth * 0.82);
  const stepY = Math.max(18, layout.pieceHeight * 0.82);
  const slots: ScatterSlot[] = [];
  const maximumLeft = layout.worldWidth - layout.pieceWidth - worldPadding;
  const maximumTop = layout.worldHeight - layout.pieceHeight - worldPadding;
  const boardGap = Math.max(10, Math.min(layout.pieceWidth, layout.pieceHeight) * 0.14);

  for (let top = worldPadding; top <= maximumTop + 0.5; top += stepY) {
    for (let left = worldPadding; left <= maximumLeft + 0.5; left += stepX) {
      if (
        rectanglesOverlap(
          left,
          top,
          layout.pieceWidth,
          layout.pieceHeight,
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
    return sortScatterSlots(slots).map(({ left, top }) => ({ left, top }));
  }

  const preferred = createPreferredScatterSlots(layout, slots, stagingMode, boardGap);
  const preferredIds = new Set(preferred.map((slot) => slot.index));
  const fallback = sortScatterSlots(slots.filter((slot) => !preferredIds.has(slot.index)), 97);

  return [...preferred, ...fallback].map(({ left, top }) => ({ left, top }));
};

export const normalizeJigsawWorldPosition = (
  layout: JigsawWorldLayout,
  left: number,
  top: number,
): Pick<JigsawPlacement, "worldX" | "worldY"> => ({
  worldX: clamp(left, 0, Math.max(0, layout.worldWidth - layout.pieceWidth)),
  worldY: clamp(top, 0, Math.max(0, layout.worldHeight - layout.pieceHeight)),
});

export const getJigsawSolvedPosition = (
  layout: JigsawWorldLayout,
  piece: Pick<JigsawPiece, "row" | "column">,
): WorldPosition => ({
  left: layout.boardX + piece.column * layout.pieceWidth,
  top: layout.boardY + piece.row * layout.pieceHeight,
});

export const getJigsawPlacementPosition = (
  layout: JigsawWorldLayout,
  piece: Pick<JigsawPiece, "row" | "column">,
  placement: JigsawPlacement,
): WorldPosition =>
  placement.snapped
    ? getJigsawSolvedPosition(layout, piece)
    : {
        left: clamp(placement.worldX, 0, Math.max(0, layout.worldWidth - layout.pieceWidth)),
        top: clamp(placement.worldY, 0, Math.max(0, layout.worldHeight - layout.pieceHeight)),
      };

export const createInitialJigsawPlacements = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  viewport: JigsawViewport | null = null,
): JigsawPlacement[] => {
  const orderedPieces = [...pieces].sort((left, right) => left.currentIndex - right.currentIndex);
  const slots = createScatterSlots(layout, pieces.length, viewport);
  const fallbackSlots = slots.length > 0 ? slots : [{ left: worldPadding, top: worldPadding }];

  return orderedPieces.map((piece, index) => {
    const slot = fallbackSlots[index % fallbackSlots.length];
    const repeatedLayer = Math.floor(index / fallbackSlots.length);
    const offset = repeatedLayer * 6;
    const position = normalizeJigsawWorldPosition(layout, slot.left + offset, slot.top + offset);
    return { id: piece.id, ...position, snapped: false };
  });
};

export const restageLooseJigsawPlacements = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  placements: readonly JigsawPlacement[],
  viewport: JigsawViewport | null = null,
): JigsawPlacement[] => {
  const snappedIds = new Set(placements.filter((placement) => placement.snapped).map((placement) => placement.id));
  return createInitialJigsawPlacements(layout, pieces, viewport).map((placement) => ({
    ...placement,
    snapped: snappedIds.has(placement.id),
  }));
};

export const shouldSnapJigsawPlacement = (
  layout: JigsawWorldLayout,
  piece: Pick<JigsawPiece, "row" | "column">,
  placement: Pick<JigsawPlacement, "worldX" | "worldY">,
) => {
  const target = getJigsawSolvedPosition(layout, piece);
  const distance = Math.hypot(placement.worldX - target.left, placement.worldY - target.top);
  const threshold = Math.max(18, Math.min(layout.pieceWidth, layout.pieceHeight) * 0.42);
  return distance <= threshold;
};

const clampCameraAxis = (center: number, worldSize: number, visibleSize: number) => {
  const halfVisible = visibleSize / 2;
  const overscroll = Math.min(worldSize * 0.12, visibleSize * 0.2);
  const minimumCenter = halfVisible - overscroll;
  const maximumCenter = worldSize - halfVisible + overscroll;
  if (minimumCenter > maximumCenter) return worldSize / 2;
  return clamp(center, minimumCenter, maximumCenter);
};

export const clampJigsawCamera = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  camera: JigsawCamera,
): JigsawCamera => {
  const zoom = clamp(camera.zoom, jigsawCameraMinimumZoom, jigsawCameraMaximumZoom);
  const safeViewportWidth = Math.max(1, viewport.width);
  const safeViewportHeight = Math.max(1, viewport.height);

  return {
    centerX: clampCameraAxis(camera.centerX, layout.worldWidth, safeViewportWidth / zoom),
    centerY: clampCameraAxis(camera.centerY, layout.worldHeight, safeViewportHeight / zoom),
    zoom,
  };
};

export const createJigsawFitCamera = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  target: JigsawFitTarget = "workspace",
  padding = 32,
): JigsawCamera => {
  const safeViewportWidth = Math.max(1, viewport.width - padding * 2);
  const safeViewportHeight = Math.max(1, viewport.height - padding * 2);
  const targetX = target === "board" ? layout.boardX : 0;
  const targetY = target === "board" ? layout.boardY : 0;
  const targetWidth = target === "board" ? layout.boardWidth : layout.worldWidth;
  const targetHeight = target === "board" ? layout.boardHeight : layout.worldHeight;
  const zoom = clamp(
    Math.min(safeViewportWidth / targetWidth, safeViewportHeight / targetHeight),
    jigsawCameraMinimumZoom,
    jigsawCameraMaximumZoom,
  );

  return clampJigsawCamera(layout, viewport, {
    centerX: targetX + targetWidth / 2,
    centerY: targetY + targetHeight / 2,
    zoom,
  });
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
