import { snapWordSearchEnd, wordSearchPath } from "./model";

export type WordSearchEndpoints = { start: number; end: number };
export type WordSearchPoint = { x: number; y: number };
export type WordSearchBounds = { left: number; top: number; width: number; height: number };

export const wordSearchCellAt = (size: number, bounds: WordSearchBounds, point: WordSearchPoint): number | null => {
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  const column = Math.floor((point.x - bounds.left) / bounds.width * size);
  const row = Math.floor((point.y - bounds.top) / bounds.height * size);
  return Number.isInteger(row) && Number.isInteger(column) && row >= 0 && row < size && column >= 0 && column < size
    ? row * size + column : null;
};

export const wordSearchDragEnd = (size: number, start: number, bounds: WordSearchBounds, point: WordSearchPoint): number =>
  bounds.width > 0 && bounds.height > 0
    ? snapWordSearchEnd(size, start, (point.y - bounds.top) / bounds.height * size - 0.5,
        (point.x - bounds.left) / bounds.width * size - 0.5)
    : start;

export type WordSearchEndpointChoice = {
  anchor: number | null;
  selection: WordSearchEndpoints | null;
};

// The first activation anchors, the second submits an exact straight line.
// An illegal endpoint begins a new selection; selecting the anchor cancels.
export const chooseWordSearchEndpoint = (size: number, anchor: number | null, cell: number): WordSearchEndpointChoice => {
  if (wordSearchPath(size, cell, cell).length !== 1) return { anchor, selection: null };
  if (anchor === null) return { anchor: cell, selection: null };
  if (anchor === cell) return { anchor: null, selection: null };
  if (wordSearchPath(size, anchor, cell).length < 2) return { anchor: cell, selection: null };
  return { anchor: null, selection: { start: anchor, end: cell } };
};

export const moveWordSearchFocus = (size: number, cell: number, key: string): number | null => {
  const row = Math.floor(cell / size), col = cell % size;
  switch (key) {
    case "ArrowLeft": return row * size + Math.max(0, col - 1);
    case "ArrowRight": return row * size + Math.min(size - 1, col + 1);
    case "ArrowUp": return Math.max(0, row - 1) * size + col;
    case "ArrowDown": return Math.min(size - 1, row + 1) * size + col;
    case "Home": return row * size;
    case "End": return row * size + size - 1;
    default: return null;
  }
};
