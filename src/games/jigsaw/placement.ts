import type { JigsawPiece } from "../../catalog/types";

export type JigsawLayoutMode = "scatter" | "tray";

export type JigsawPlacement = {
  id: string;
  x: number;
  y: number;
  snapped: boolean;
};

export type JigsawStageLayout = {
  mode: JigsawLayoutMode;
  stageWidth: number;
  stageHeight: number;
  boardX: number;
  boardY: number;
  boardWidth: number;
  boardHeight: number;
  pieceWidth: number;
  pieceHeight: number;
};

type JigsawStageLayoutInput = {
  stageWidth: number;
  imageWidth: number;
  imageHeight: number;
  puzzleWidth: number;
  puzzleHeight: number;
  pieceCount: number;
};

type PixelPosition = {
  left: number;
  top: number;
};

const compactBreakpoint = 680;
const stagePadding = 12;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const fitAspectRatio = (imageRatio: number, maxWidth: number, maxHeight: number) => {
  const width = Math.min(maxWidth, maxHeight * imageRatio);
  return { width, height: width / imageRatio };
};

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

export const createJigsawStageLayout = ({
  stageWidth,
  imageWidth,
  imageHeight,
  puzzleWidth,
  puzzleHeight,
  pieceCount,
}: JigsawStageLayoutInput): JigsawStageLayout => {
  const safeStageWidth = Math.max(280, stageWidth);
  const imageRatio = Math.max(0.01, imageWidth / Math.max(1, imageHeight));
  const mode: JigsawLayoutMode = safeStageWidth < compactBreakpoint ? "tray" : "scatter";

  if (mode === "tray") {
    const maximumBoardWidth = safeStageWidth - stagePadding * 2;
    const maximumBoardHeight = Math.min(520, safeStageWidth * 1.1);
    const { width: boardWidth, height: boardHeight } = fitAspectRatio(
      imageRatio,
      maximumBoardWidth,
      maximumBoardHeight,
    );
    const pieceWidth = boardWidth / puzzleWidth;
    const pieceHeight = boardHeight / puzzleHeight;
    const stepX = Math.max(24, pieceWidth * 0.8);
    const stepY = Math.max(20, pieceHeight * 0.76);
    const availableWidth = safeStageWidth - stagePadding * 2;
    const columns = Math.max(2, Math.floor((availableWidth - pieceWidth) / stepX) + 1);
    const rows = Math.max(1, Math.ceil(pieceCount / columns));
    const trayTop = stagePadding + boardHeight + Math.max(32, pieceHeight * 0.55);
    const trayHeight = pieceHeight + (rows - 1) * stepY;

    return {
      mode,
      stageWidth: safeStageWidth,
      stageHeight: trayTop + trayHeight + stagePadding,
      boardX: (safeStageWidth - boardWidth) / 2,
      boardY: stagePadding,
      boardWidth,
      boardHeight,
      pieceWidth,
      pieceHeight,
    };
  }

  const maximumBoardWidth = Math.min(safeStageWidth * 0.56, 640);
  const maximumBoardHeight = Math.min(540, safeStageWidth * 0.62);
  const { width: boardWidth, height: boardHeight } = fitAspectRatio(
    imageRatio,
    maximumBoardWidth,
    maximumBoardHeight,
  );
  const pieceWidth = boardWidth / puzzleWidth;
  const pieceHeight = boardHeight / puzzleHeight;
  const verticalMargin = Math.max(84, pieceHeight * 1.3);
  const stageHeight = Math.max(520, boardHeight + verticalMargin * 2);

  return {
    mode,
    stageWidth: safeStageWidth,
    stageHeight,
    boardX: (safeStageWidth - boardWidth) / 2,
    boardY: (stageHeight - boardHeight) / 2,
    boardWidth,
    boardHeight,
    pieceWidth,
    pieceHeight,
  };
};

const createScatterSlots = (layout: JigsawStageLayout): PixelPosition[] => {
  const stepX = Math.max(28, layout.pieceWidth * 0.78);
  const stepY = Math.max(24, layout.pieceHeight * 0.78);
  const slots: PixelPosition[] = [];
  const maximumLeft = layout.stageWidth - layout.pieceWidth - stagePadding;
  const maximumTop = layout.stageHeight - layout.pieceHeight - stagePadding;
  const boardGap = Math.max(8, Math.min(layout.pieceWidth, layout.pieceHeight) * 0.12);

  for (let top = stagePadding; top <= maximumTop + 0.5; top += stepY) {
    for (let left = stagePadding; left <= maximumLeft + 0.5; left += stepX) {
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

      slots.push({ left, top });
    }
  }

  return slots
    .map((slot, index) => ({ slot, order: mixSlotIndex(index + 1) }))
    .sort((left, right) => left.order - right.order)
    .map(({ slot }) => slot);
};

const createTraySlots = (layout: JigsawStageLayout, pieceCount: number): PixelPosition[] => {
  const stepX = Math.max(24, layout.pieceWidth * 0.8);
  const stepY = Math.max(20, layout.pieceHeight * 0.76);
  const availableWidth = layout.stageWidth - stagePadding * 2;
  const columns = Math.max(2, Math.floor((availableWidth - layout.pieceWidth) / stepX) + 1);
  const trayTop = layout.boardY + layout.boardHeight + Math.max(32, layout.pieceHeight * 0.55);

  return Array.from({ length: pieceCount }, (_, index) => ({
    left: stagePadding + (index % columns) * stepX,
    top: trayTop + Math.floor(index / columns) * stepY,
  }));
};

export const normalizeJigsawPosition = (
  layout: JigsawStageLayout,
  left: number,
  top: number,
): Pick<JigsawPlacement, "x" | "y"> => {
  const maximumLeft = Math.max(0, layout.stageWidth - layout.pieceWidth);
  const maximumTop = Math.max(0, layout.stageHeight - layout.pieceHeight);
  return {
    x: clamp(left, 0, maximumLeft) / layout.stageWidth,
    y: clamp(top, 0, maximumTop) / layout.stageHeight,
  };
};

export const getJigsawSolvedPosition = (
  layout: JigsawStageLayout,
  piece: Pick<JigsawPiece, "row" | "column">,
): PixelPosition => ({
  left: layout.boardX + piece.column * layout.pieceWidth,
  top: layout.boardY + piece.row * layout.pieceHeight,
});

export const getJigsawPlacementPosition = (
  layout: JigsawStageLayout,
  piece: Pick<JigsawPiece, "row" | "column">,
  placement: JigsawPlacement,
): PixelPosition =>
  placement.snapped
    ? getJigsawSolvedPosition(layout, piece)
    : {
        left: clamp(placement.x * layout.stageWidth, 0, Math.max(0, layout.stageWidth - layout.pieceWidth)),
        top: clamp(placement.y * layout.stageHeight, 0, Math.max(0, layout.stageHeight - layout.pieceHeight)),
      };

export const createInitialJigsawPlacements = (
  layout: JigsawStageLayout,
  pieces: readonly JigsawPiece[],
): JigsawPlacement[] => {
  const orderedPieces = [...pieces].sort((left, right) => left.currentIndex - right.currentIndex);
  const slots = layout.mode === "tray" ? createTraySlots(layout, orderedPieces.length) : createScatterSlots(layout);
  const fallbackSlots = slots.length > 0 ? slots : [{ left: stagePadding, top: stagePadding }];

  return orderedPieces.map((piece, index) => {
    const slot = fallbackSlots[index % fallbackSlots.length];
    const repeatedLayer = Math.floor(index / fallbackSlots.length);
    const offset = repeatedLayer * 6;
    const normalized = normalizeJigsawPosition(layout, slot.left + offset, slot.top + offset);
    return { id: piece.id, ...normalized, snapped: false };
  });
};

export const restageLooseJigsawPlacements = (
  layout: JigsawStageLayout,
  pieces: readonly JigsawPiece[],
  placements: readonly JigsawPlacement[],
): JigsawPlacement[] => {
  const snappedIds = new Set(placements.filter((placement) => placement.snapped).map((placement) => placement.id));
  return createInitialJigsawPlacements(layout, pieces).map((placement) => ({
    ...placement,
    snapped: snappedIds.has(placement.id),
  }));
};

export const shouldSnapJigsawPlacement = (
  layout: JigsawStageLayout,
  piece: Pick<JigsawPiece, "row" | "column">,
  placement: Pick<JigsawPlacement, "x" | "y">,
) => {
  const target = getJigsawSolvedPosition(layout, piece);
  const currentLeft = placement.x * layout.stageWidth;
  const currentTop = placement.y * layout.stageHeight;
  const distance = Math.hypot(currentLeft - target.left, currentTop - target.top);
  const threshold = Math.max(18, Math.min(layout.pieceWidth, layout.pieceHeight) * 0.42);
  return distance <= threshold;
};
