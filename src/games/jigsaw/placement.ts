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
const worldScale = 1.75;
const minimumStagingPiecesPerAxis = 5;
const minimumVerticalStagingPieces = 9;
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
    boardHeight + pieceHeight * minimumVerticalStagingPieces,
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

const getScatterSlotLateralOverflow = (
  layout: JigsawWorldLayout,
  slot: ScatterSlot,
  stagingMode: Exclude<JigsawStagingMode, "perimeter">,
  pieceWidth: number,
  pieceHeight: number,
) => {
  const center = stagingMode === "sides"
    ? slot.top + pieceHeight / 2
    : slot.left + pieceWidth / 2;
  const start = stagingMode === "sides" ? layout.boardY : layout.boardX;
  const end = start + (stagingMode === "sides" ? layout.boardHeight : layout.boardWidth);
  return Math.max(0, start - center, center - end);
};

const sortPreferredScatterSlots = (
  layout: JigsawWorldLayout,
  slots: readonly ScatterSlot[],
  stagingMode: Exclude<JigsawStagingMode, "perimeter">,
  pieceWidth: number,
  pieceHeight: number,
  salt: number,
  preferNearestLateralOverflow = false,
) => [...slots].sort((left, right) => {
  if (preferNearestLateralOverflow) {
    // Fill the nearest extra tray space before scattering an outlier far away.
    const lateralDelta =
      getScatterSlotLateralOverflow(layout, left, stagingMode, pieceWidth, pieceHeight) -
      getScatterSlotLateralOverflow(layout, right, stagingMode, pieceWidth, pieceHeight);
    if (Math.abs(lateralDelta) > 0.5) return lateralDelta;
  }
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
    true,
  );
  const overflowSecond = sortPreferredScatterSlots(
    layout,
    secondSide.filter((slot) => !isBoardAlignedScatterSlot(layout, slot, stagingMode, pieceWidth, pieceHeight)),
    stagingMode,
    pieceWidth,
    pieceHeight,
    secondSalt + 101,
    true,
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
  stepRatio = 1.26,
): ScatterSlot[] => {
  // Start with generous gaps; search denser grids only for crowded workspaces.
  const stepX = Math.max(12, layout.pieceWidth * stepRatio);
  const stepY = Math.max(12, layout.pieceHeight * stepRatio);
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
    // Perimeter staging should be an adjacent workbench, not a scatter across
    // the entire world. Shuffled piece order already provides variety.
    const boardRight = layout.boardX + layout.boardWidth;
    const boardBottom = layout.boardY + layout.boardHeight;
    const distance = (slot: ScatterSlot) => {
      const gapX = Math.max(0, layout.boardX - (slot.left + size.width), slot.left - boardRight);
      const gapY = Math.max(0, layout.boardY - (slot.top + size.height), slot.top - boardBottom);
      return Math.hypot(gapX, gapY);
    };
    return [...slots].sort((left, right) => {
      const gap = distance(left) - distance(right);
      return Math.abs(gap) > 0.5
        ? gap
        : mixSlotIndex(left.index + 1) - mixSlotIndex(right.index + 1);
    });
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

const createPackedJigsawPlacements = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  viewport: JigsawViewport | null = null,
): JigsawPlacement[] => {
  const orderedPieces = [...pieces].sort((left, right) => left.currentIndex - right.currentIndex);
  // Reserve contiguous free space for multi-cell pieces before ordinary pieces
  // fragment the available trays. Return placements in shuffle order below.
  const stagingOrder = [...orderedPieces].sort((left, right) => {
    const a = getJigsawPieceCellSpan(left);
    const b = getJigsawPieceCellSpan(right);
    return b.width * b.height - a.width * a.height || left.currentIndex - right.currentIndex;
  });
  const placedBounds: Array<WorldPosition & { width: number; height: number }> = [];
  const separation = Math.min(layout.pieceWidth, layout.pieceHeight) * 0.2;
  const requiredCells = orderedPieces.reduce((total, piece) => {
    const span = getJigsawPieceCellSpan(piece);
    return total + span.width * span.height;
  }, 0);
  // Choose enough room *before* filling the trays. Waiting until the last
  // piece to use a denser grid fragments the free space beyond recovery.
  const stepRatio = [1.26, 1.12, 1].find((ratio) =>
    createScatterSlots(layout, pieces.length, viewport, null, ratio).length >= requiredCells * 1.12,
  ) ?? 1;
  // Most pieces share the same footprint; keep each ordered candidate list once.
  const slotCache = new Map<string, ScatterSlot[]>();
  const slotsFor = (piece: JigsawPiece, ratio: number) => {
    const span = getJigsawPieceCellSpan(piece);
    const key = `${span.width}:${span.height}:${ratio}`;
    let slots = slotCache.get(key);
    if (!slots) {
      slots = createScatterSlots(layout, pieces.length, viewport, piece, ratio);
      slotCache.set(key, slots);
    }
    return slots;
  };
  const placed = stagingOrder.map((piece) => {
    const size = getJigsawPieceWorldSize(layout, piece);
    const slots = slotsFor(piece, stepRatio);
    const fits = (slot: ScatterSlot, gap: number) => {
      const position = normalizeJigsawPieceWorldPosition(layout, piece, slot.left, slot.top);
      return placedBounds.every((used) => !rectanglesOverlap(
        position.worldX, position.worldY, size.width, size.height,
        used.left, used.top, used.width, used.height, gap,
      ));
    };
    const availableSlot = slots.find((slot) => fits(slot, separation))
      ?? slots.find((slot) => fits(slot, 0))
      ?? slotsFor(piece, 1.0).find((slot) => fits(slot, separation))
      ?? slotsFor(piece, 0.5).find((slot) => fits(slot, 0));
    if (!availableSlot) {
      // Never quietly pile a remaining piece on top of another.
      throw new Error("Insufficient free Jigsaw staging space");
    }
    const position = normalizeJigsawPieceWorldPosition(
      layout, piece, availableSlot.left, availableSlot.top,
    );
    placedBounds.push({ left: position.worldX, top: position.worldY, ...size });
    return { id: piece.id, ...position };
  });
  const byId = new Map(placed.map((placement) => [placement.id, placement] as const));
  return orderedPieces.map((piece) => byId.get(piece.id)!);
};


/**
 * Scatter ordinary workbenches in continuous space rather than a slot lattice.
 * The old packing strategy remains a capacity-guaranteed fallback for dense boards.
 * Every choice is seeded from the shuffled piece order; no runtime randomness.
 */
const createNaturalJigsawPlacements = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  viewport: JigsawViewport | null,
): JigsawPlacement[] | null => {
  if (pieces.length < 2 || pieces.length > 96) return null;
  // A tall play area makes space above/below the board more useful;
  // a wide area favors its sides. Continuous bias, not orientation modes.
  const verticalBias = isUsableJigsawViewport(viewport)
    ? clamp(viewport.height / viewport.width, 0.35, 3)
    : 1;
  // Prefer depth, not just a greater piece count, along the long axis of
  // the playable surface. World coordinates are established once at staging.
  const verticalReach = clamp(Math.pow(verticalBias, 0.65), 0.7, 1.8);
  const order = [...pieces].sort((a, b) => {
    const aSpan = getJigsawPieceCellSpan(a);
    const bSpan = getJigsawPieceCellSpan(b);
    return bSpan.width * bSpan.height - aSpan.width * aSpan.height ||
      a.currentIndex - b.currentIndex;
  });
  const baseSeed = order.reduce(
    (seed, piece) => mixSlotIndex(seed ^ mixSlotIndex(piece.currentIndex + piece.solvedIndex * 37 + 1)),
    mixSlotIndex(pieces.length + Math.round(layout.boardWidth) * 17 + Math.round(layout.boardHeight)),
  );
  const boardRight = layout.boardX + layout.boardWidth;
  const boardBottom = layout.boardY + layout.boardHeight;
  const gap = Math.min(layout.pieceWidth, layout.pieceHeight) * 0.14;

  for (const [round, depth, separation] of [
    [0, 1.3, 0.15],
    [1, 2.2, 0.08],
    [2, 3.2, 0.025],
  ] as const) {
    let state = mixSlotIndex(baseSeed + round * 1709) || 1;
    const random = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
    const staged: JigsawPlacement[] = [];
    const occupied: Array<WorldPosition & { width: number; height: number }> = [];
    const sideCounts = [0, 0, 0, 0]; // top, right, bottom, left
    let complete = true;

    for (let index = 0; index < order.length; index += 1) {
      const piece = order[index]!;
      const size = getJigsawPieceWorldSize(layout, piece);
      const maxLeft = layout.worldWidth - size.width - worldPadding;
      const maxTop = layout.worldHeight - size.height - worldPadding;
      type SideZone = { side: number; left: number; right: number; top: number; bottom: number };
      const zones: SideZone[] = [];
      const addZone = (side: number, left: number, right: number, top: number, bottom: number) => {
        const clipped = {
          side,
          left: Math.max(worldPadding, left),
          right: Math.min(maxLeft, right),
          top: Math.max(worldPadding, top),
          bottom: Math.min(maxTop, bottom),
        };
        if (clipped.left <= clipped.right && clipped.top <= clipped.bottom) zones.push(clipped);
      };
      const lateral = depth * 0.65;
      const verticalDepth = depth * verticalReach;
      const horizontalDepth = depth / verticalReach;
      const sideTop = layout.boardY - size.height * lateral;
      const sideBottom = boardBottom - size.height * (1 - lateral);
      const topLeft = layout.boardX - size.width * lateral;
      const topRight = boardRight - size.width * (1 - lateral);

      // Candidate rectangles are clipped to usable world space. Their areas
      // encode actual staging capacity; the board dimensions influence that
      // capacity continuously, without four-sided quotas or row alignment.
      addZone(0, topLeft, topRight,
        layout.boardY - size.height * (1 + verticalDepth) - gap,
        layout.boardY - size.height - gap);
      addZone(1, boardRight + gap, boardRight + gap + size.width * horizontalDepth,
        sideTop, sideBottom);
      addZone(2, topLeft, topRight,
        boardBottom + gap, boardBottom + gap + size.height * verticalDepth);
      addZone(3, layout.boardX - size.width * (1 + horizontalDepth) - gap,
        layout.boardX - size.width - gap, sideTop, sideBottom);

      // Crowded or unsuccessful sides become progressively less attractive.
      // The sampler still explores every feasible side, so pieces can flow
      // naturally into remaining room without predetermined tray positions.
      const missed = [0, 0, 0, 0];
      const selectZone = (): SideZone | null => {
        const weights = zones.map((zone) => {
          const area = Math.max(1, zone.right - zone.left + size.width) *
            Math.max(1, zone.bottom - zone.top + size.height);
          const capacity = area / Math.max(1, size.width * size.height);
          const pressure = (sideCounts[zone.side] ?? 0) / Math.max(1, capacity);
          const availability = Math.max(0.08, (1 - Math.min(1, pressure)) ** 2);
          const orientation = zone.side % 2 === 0 ? verticalBias : 1 / verticalBias;
          const opposite = sideCounts[(zone.side + 2) % 4] ?? 0;
          const imbalance = Math.max(0, (sideCounts[zone.side] ?? 0) - opposite);
          const balance = 1 / (1 + imbalance * 0.45);
          return area * orientation * availability * balance /
            (1 + (missed[zone.side] ?? 0) / 8);
        });
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        if (total <= 0) return null;
        let pick = random() * total;
        for (let side = 0; side < zones.length; side += 1) {
          pick -= weights[side]!;
          if (pick < 0) return zones[side]!;
        }
        return zones[zones.length - 1] ?? null;
      };

      let chosen: JigsawPlacement | null = null;
      for (let attempt = 0; attempt < 300 && zones.length > 0; attempt += 1) {
        const zone = selectZone();
        if (!zone) break;
        const candidate = normalizeJigsawPieceWorldPosition(
          layout,
          piece,
          zone.left + (zone.right - zone.left) * random(),
          zone.top + (zone.bottom - zone.top) * random(),
        );
        if (
          candidate.worldX < worldPadding - 0.01 ||
          candidate.worldY < worldPadding - 0.01 ||
          candidate.worldX + size.width > layout.worldWidth - worldPadding + 0.01 ||
          candidate.worldY + size.height > layout.worldHeight - worldPadding + 0.01 ||
          rectanglesOverlap(
            candidate.worldX, candidate.worldY, size.width, size.height,
            layout.boardX, layout.boardY, layout.boardWidth, layout.boardHeight, gap,
          ) ||
          occupied.some((used) => rectanglesOverlap(
            candidate.worldX, candidate.worldY, size.width, size.height,
            used.left, used.top, used.width, used.height,
            Math.min(layout.pieceWidth, layout.pieceHeight) * separation,
          ))
        ) {
          missed[zone.side]! += 1;
          continue;
        }
        chosen = { id: piece.id, ...candidate };
        sideCounts[zone.side]! += 1;
        break;
      }
      if (!chosen) {
        complete = false;
        break;
      }
      staged.push(chosen);
      occupied.push({
        left: chosen.worldX, top: chosen.worldY,
        width: size.width, height: size.height,
      });
    }

    if (complete) {
      const byId = new Map(staged.map((piece) => [piece.id, piece] as const));
      return pieces.map((piece) => byId.get(piece.id)!);
    }
  }
  return null;
};


/**
 * Crowded workspaces need the capacity guarantee of the packed baseline.
 * Reinsert pieces into available irregular pockets without ever compromising it.
 * Large moves (not cosmetic jitter) break up the unnatural row structure.
 */
const loosenPackedJigsawPlacements = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  packed: readonly JigsawPlacement[],
): JigsawPlacement[] => {
  const pieceById = new Map(pieces.map((piece) => [piece.id, piece] as const));
  const positions = new Map(packed.map((placement) => [placement.id, { ...placement }] as const));
  let state = pieces.reduce(
    (seed, piece) => mixSlotIndex(seed ^ mixSlotIndex(piece.currentIndex + piece.solvedIndex * 31 + 1)),
    mixSlotIndex(pieces.length * 131 + Math.round(layout.boardWidth)),
  ) || 1;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  const gap = Math.min(layout.pieceWidth, layout.pieceHeight) * 0.14;
  const order = [...pieces].sort((a, b) => a.currentIndex - b.currentIndex);

  for (let sweep = 0; sweep < 6; sweep += 1) {
    for (const piece of order) {
      const current = positions.get(piece.id);
      if (!current) continue;
      const size = getJigsawPieceWorldSize(layout, piece);
      const rangeX = layout.worldWidth - size.width - 2 * worldPadding;
      const rangeY = layout.worldHeight - size.height - 2 * worldPadding;
      if (rangeX <= 0 || rangeY <= 0) continue;

      for (let attempt = 0; attempt < 45; attempt += 1) {
        const global = attempt % 3 === 0;
        const x = global
          ? worldPadding + random() * rangeX
          : current.worldX + (random() - 0.5) * layout.pieceWidth * 4;
        const y = global
          ? worldPadding + random() * rangeY
          : current.worldY + (random() - 0.5) * layout.pieceHeight * 4;
        const candidate = normalizeJigsawPieceWorldPosition(layout, piece, x, y);
        if (
          Math.hypot(
            (candidate.worldX - current.worldX) / layout.pieceWidth,
            (candidate.worldY - current.worldY) / layout.pieceHeight,
          ) < 0.3 ||
          candidate.worldX < worldPadding ||
          candidate.worldY < worldPadding ||
          candidate.worldX + size.width > layout.worldWidth - worldPadding ||
          candidate.worldY + size.height > layout.worldHeight - worldPadding ||
          rectanglesOverlap(
            candidate.worldX, candidate.worldY, size.width, size.height,
            layout.boardX, layout.boardY, layout.boardWidth, layout.boardHeight, gap,
          )
        ) continue;

        const collides = [...positions.values()].some((other) => {
          if (other.id === piece.id) return false;
          const neighbor = pieceById.get(other.id);
          const otherSize = neighbor
            ? getJigsawPieceWorldSize(layout, neighbor)
            : { width: layout.pieceWidth, height: layout.pieceHeight };
          return rectanglesOverlap(
            candidate.worldX, candidate.worldY, size.width, size.height,
            other.worldX, other.worldY, otherSize.width, otherSize.height, gap * 0.5,
          );
        });
        if (collides) continue;
        positions.set(piece.id, { id: piece.id, ...candidate });
        break;
      }
    }
  }
  return packed.map((placement) => positions.get(placement.id)!);
};

export const createInitialJigsawPlacements = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  viewport: JigsawViewport | null = null,
  natural = true,
): JigsawPlacement[] => {
  const loose = natural ? createNaturalJigsawPlacements(layout, pieces, viewport) : null;
  if (loose) return loose;
  const packed = createPackedJigsawPlacements(layout, pieces, viewport);
  return natural && pieces.length >= 2 && pieces.length <= 256
    ? loosenPackedJigsawPlacements(layout, pieces, packed)
    : packed;
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
  // to include an entire staging tray. Around 4-5 pieces across is a useful
  // touch-scale target, regardless of the artwork's aspect ratio.
  const readablePiecePixels = Math.min(112, Math.max(72, usableWidth / 9), usableWidth / 4.5, usableHeight / 4.5);
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

  const cameraAtAnchor = {
    centerX: worldPoint.x - (screenX - viewport.width / 2) / zoom,
    centerY: worldPoint.y - (screenY - viewport.height / 2) / zoom,
    zoom,
  };
  // The +/- controls use the screen center. Clamping that center to newly
  // calculated visible-world limits makes the whole table slide as it zooms.
  // Preserve the established world-space focus for a centered zoom; panning
  // continues to enforce world limits independently.
  if (Math.abs(screenX - viewport.width / 2) < 0.01 &&
      Math.abs(screenY - viewport.height / 2) < 0.01) {
    return cameraAtAnchor;
  }
  return clampJigsawCamera(layout, viewport, cameraAtAnchor);
};
