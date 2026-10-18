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

type WorldPoint = {
  x: number;
  y: number;
};

const basePieceSize = 96;
const worldPadding = 48;
const worldScale = 1.95;
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
    boardHeight * 1.32,
  ) + worldPadding * 2;
  const worldHeight = Math.max(
    boardHeight * worldScale,
    boardHeight + pieceHeight * minimumVerticalStagingPieces,
    boardWidth * 1.32,
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

/**
 * One deterministic, continuously sampled table layout for every puzzle.
 * Candidate coordinates are genuinely continuous, not jittered grid cells.
 * Prefer an artwork/viewport-shaped region around the board, while spreading
 * pieces into underused space rather than leaving large holes. That region is
 * a soft preference: the same search can use the entire world when crowded.
 *
 * This function is only called on initial staging and an explicit restage.
 * Changing the camera never moves already staged pieces.
 */
export const createInitialJigsawPlacements = (
  layout: JigsawWorldLayout,
  pieces: readonly JigsawPiece[],
  viewport: JigsawViewport | null = null,
): JigsawPlacement[] => {
  if (pieces.length === 0) return [];

  const ordered = [...pieces].sort((a, b) => a.currentIndex - b.currentIndex);
  const stagingOrder = [...ordered].sort((a, b) => {
    const left = getJigsawPieceCellSpan(a);
    const right = getJigsawPieceCellSpan(b);
    return right.width * right.height - left.width * left.height ||
      a.currentIndex - b.currentIndex;
  });
  const seed = ordered.reduce(
    (value, piece) => mixSlotIndex(value ^ mixSlotIndex(piece.currentIndex +
      piece.solvedIndex * 37 + 1)),
    mixSlotIndex(pieces.length * 131 + Math.round(layout.boardWidth) * 17),
  );

  const boardRatio = layout.boardWidth / layout.boardHeight;
  const viewRatio = isUsableJigsawViewport(viewport)
    ? clamp(viewport.width / viewport.height, 0.3, 3)
    : boardRatio;
  const targetRatio = clamp(
    Math.pow(viewRatio, 0.7) * Math.pow(boardRatio, 0.3), 0.38, 2.6,
  );
  const pieceArea = pieces.reduce((area, piece) => {
    const size = getJigsawPieceWorldSize(layout, piece);
    return area + size.width * size.height;
  }, 0);
  const targetArea = layout.boardWidth * layout.boardHeight + pieceArea * 2.55;
  const targetWidth = Math.min(
    layout.worldWidth - 2 * worldPadding,
    Math.max(layout.boardWidth + layout.pieceWidth * 2.7,
      Math.sqrt(targetArea * targetRatio)),
  );
  const targetHeight = Math.min(
    layout.worldHeight - 2 * worldPadding,
    Math.max(layout.boardHeight + layout.pieceHeight * 2.7,
      Math.sqrt(targetArea / targetRatio)),
  );
  const centerX = layout.boardX + layout.boardWidth / 2;
  const centerY = layout.boardY + layout.boardHeight / 2;
  const pieceGap = Math.min(layout.pieceWidth, layout.pieceHeight) * 0.03;
  const boardGap = Math.min(layout.pieceWidth, layout.pieceHeight) * 0.14;

  // Scrambled low-discrepancy coordinates cover the whole table without rows,
  // columns, sectors, or prescribed rings. Each successive piece receives a
  // different deterministic part of the same continuous candidate sequence.
  const radicalInverse = (index: number, base: number) => {
    let result = 0;
    let factor = 1 / base;
    for (let remaining = index; remaining > 0; remaining = Math.floor(remaining / base)) {
      result += (remaining % base) * factor;
      factor /= base;
    }
    return result;
  };
  const random = (value: number) => mixSlotIndex(value) / 4294967296;
  const offsetX = random(seed ^ 0x9b72);
  const offsetY = random(seed ^ 0xa512);
  const sampleCount = Math.max(200, Math.ceil(pieces.length * 0.35));

  type UsedBounds = { x: number; y: number; width: number; height: number };
  const bucketSize = Math.max(layout.pieceWidth, layout.pieceHeight) * 2.8;
  const buckets = new Map<string, UsedBounds[]>();
  const bucketIndex = (coordinate: number) => Math.floor(coordinate / bucketSize);
  const bucketKey = (x: number, y: number) => `${x}:${y}`;
  const visitNeighbors = (
    bounds: UsedBounds,
    radius: number,
    visit: (used: UsedBounds) => boolean,
  ) => {
    for (let iy = bucketIndex(bounds.y - radius); iy <= bucketIndex(bounds.y + bounds.height + radius); iy += 1) {
      for (let ix = bucketIndex(bounds.x - radius); ix <= bucketIndex(bounds.x + bounds.width + radius); ix += 1) {
        const entries = buckets.get(bucketKey(ix, iy)) ?? [];
        for (const entry of entries) if (visit(entry)) return true;
      }
    }
    return false;
  };
  const remember = (bounds: UsedBounds) => {
    for (let iy = bucketIndex(bounds.y); iy <= bucketIndex(bounds.y + bounds.height); iy += 1) {
      for (let ix = bucketIndex(bounds.x); ix <= bucketIndex(bounds.x + bounds.width); ix += 1) {
        const key = bucketKey(ix, iy);
        const entries = buckets.get(key) ?? [];
        entries.push(bounds);
        buckets.set(key, entries);
      }
    }
  };

  const staged = new Map<string, JigsawPlacement>();
  let candidateIndex = 0;
  for (const piece of stagingOrder) {
    const size = getJigsawPieceWorldSize(layout, piece);
    let best: UsedBounds | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let sample = 0; sample < sampleCount; sample += 1) {
      const index = ++candidateIndex;
      const x = worldPadding + (
        (radicalInverse(index, 2) + offsetX) % 1
      ) * (layout.worldWidth - 2 * worldPadding - size.width);
      const y = worldPadding + (
        (radicalInverse(index, 3) + offsetY) % 1
      ) * (layout.worldHeight - 2 * worldPadding - size.height);
      const bounds = { x, y, ...size };
      if (rectanglesOverlap(
        x, y, size.width, size.height,
        layout.boardX, layout.boardY, layout.boardWidth, layout.boardHeight, boardGap,
      )) continue;
      if (visitNeighbors(bounds, pieceGap, (used) => rectanglesOverlap(
        x, y, size.width, size.height,
        used.x, used.y, used.width, used.height, pieceGap,
      ))) continue;

      // Soft blue-noise spacing: resist clumps, but preserve variation in gaps.
      // Pure farthest-point selection produces its own conspicuous lattice.
      let nearest = 5.5;
      visitNeighbors(bounds, Math.max(layout.pieceWidth, layout.pieceHeight) * 5.7, (used) => {
        const dx = (x + size.width / 2 - used.x - used.width / 2) / layout.pieceWidth;
        const dy = (y + size.height / 2 - used.y - used.height / 2) / layout.pieceHeight;
        nearest = Math.min(nearest, Math.hypot(dx, dy));
        return false;
      });
      const outsideX = Math.max(0, Math.abs(x + size.width / 2 - centerX) - targetWidth / 2);
      const outsideY = Math.max(0, Math.abs(y + size.height / 2 - centerY) - targetHeight / 2);
      const outside = Math.hypot(outsideX / layout.pieceWidth, outsideY / layout.pieceHeight);
      const score = nearest * 0.55 - outside * 1.35 +
        random(seed ^ Math.imul(index, 37)) * 1.7;
      if (score > bestScore) {
        bestScore = score;
        best = bounds;
      }
    }
    if (!best) throw new Error("Insufficient free Jigsaw staging space");
    staged.set(piece.id, { id: piece.id, worldX: best.x, worldY: best.y });
    remember(best);
  }
  return ordered.map((piece) => staged.get(piece.id)!);
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
): JigsawCamera => {
  const bounds = getJigsawOccupiedBounds(layout, placements, pieces);
  const centered = createJigsawBoundsFitCamera(
    layout, viewport, bounds, padding, 1.25,
  );
  const safe = normalizeViewportInsets(viewport, insets);
  // A floating toolbar in the upper corner need not push the entire table
  // downward when the centered content already clears it.
  const left = viewport.width / 2 + (bounds.x - centered.centerX) * centered.zoom;
  const right = left + bounds.width * centered.zoom;
  const top = viewport.height / 2 + (bounds.y - centered.centerY) * centered.zoom;
  const bottom = top + bounds.height * centered.zoom;
  if (left >= safe.left && right <= viewport.width - safe.right &&
      top >= safe.top && bottom <= viewport.height - safe.bottom) return centered;
  return createJigsawBoundsFitCamera(
    layout, viewport, bounds, padding, 1.25, insets,
  );
};

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
