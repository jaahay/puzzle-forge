import type { CrosswordBoard, CrosswordDirection } from "./model";
import { isCrosswordCell, isCrosswordComplete, writeCrosswordLetter, type CrosswordProgress } from "./progress";

export type CrosswordSelection = { cell: number; direction: CrosswordDirection };
export type CrosswordAction = { selection: CrosswordSelection; progress: CrosswordProgress };

export const initialCrosswordSelection = (board: CrosswordBoard): CrosswordSelection => ({
  cell: board.blocks.findIndex(block => !block), direction: "across",
});

const opposite = (direction: CrosswordDirection): CrosswordDirection =>
  direction === "across" ? "down" : "across";

export const activeCrosswordEntry = (board: CrosswordBoard, selection: CrosswordSelection) =>
  board.entries.find(entry => entry.direction === selection.direction && entry.cells.includes(selection.cell));

export const selectCrosswordCell = (
  board: CrosswordBoard, selection: CrosswordSelection, cell: number,
): CrosswordSelection => {
  if (!isCrosswordCell(board, cell)) return selection;
  return { cell, direction: cell === selection.cell ? opposite(selection.direction) : selection.direction };
};

export const selectCrosswordEntry = (
  board: CrosswordBoard, progress: CrosswordProgress, selection: CrosswordSelection,
  number: number, direction: CrosswordDirection,
): CrosswordSelection => {
  const entry = board.entries.find(candidate => candidate.number === number && candidate.direction === direction);
  if (!entry) return selection;
  const cell = entry.cells.find(index => progress.letters[index] === ".") ?? entry.cells[0];
  return { cell, direction };
};

// Clue traversal follows the visible list: Across first, then Down.
export const moveCrosswordClue = (
  board: CrosswordBoard, progress: CrosswordProgress, selection: CrosswordSelection, offset: -1 | 1,
): CrosswordSelection => {
  const entries = [
    ...board.entries.filter(entry => entry.direction === "across"),
    ...board.entries.filter(entry => entry.direction === "down"),
  ];
  const current = activeCrosswordEntry(board, selection);
  const index = current ? entries.indexOf(current) : -1;
  if (index < 0) return selection;
  const next = entries[(index + offset + entries.length) % entries.length];
  return selectCrosswordEntry(board, progress, selection, next.number, next.direction);
};

const moveSpatially = (board: CrosswordBoard, selection: CrosswordSelection, key: string): CrosswordSelection | null => {
  const { width, height } = board;
  const column = selection.cell % width;
  const row = Math.floor(selection.cell / width);
  let dx = 0, dy = 0;
  switch (key) {
    case "ArrowLeft": dx = -1; break;
    case "ArrowRight": dx = 1; break;
    case "ArrowUp": dy = -1; break;
    case "ArrowDown": dy = 1; break;
    default: return null;
  }
  const direction = dx ? "across" : "down";
  for (let x = column + dx, y = row + dy; x >= 0 && x < width && y >= 0 && y < height; x += dx, y += dy) {
    const cell = y * width + x;
    if (isCrosswordCell(board, cell)) return { cell, direction };
  }
  return { ...selection, direction };
};

// Both hardware and on-screen keys use the same transition. Navigation is
// transient; only a changed progress value becomes a session action.
export const applyCrosswordKey = (
  board: CrosswordBoard, progress: CrosswordProgress, selection: CrosswordSelection, key: string,
): CrosswordAction | null => {
  if (progress.baselineChecksum !== board.checksum || !isCrosswordCell(board, selection.cell)) return null;
  const entry = activeCrosswordEntry(board, selection);
  if (!entry) return null;
  const movement = moveSpatially(board, selection, key);
  if (movement) return { selection: movement, progress };
  if (key === " " || key === "Enter") {
    return { selection: { ...selection, direction: opposite(selection.direction) }, progress };
  }
  if (key === "Home" || key === "End") {
    return { selection: { ...selection, cell: key === "Home" ? entry.cells[0] : entry.cells[entry.cells.length - 1] }, progress };
  }
  if (isCrosswordComplete(board, progress)) return null;
  const index = entry.cells.indexOf(selection.cell);
  if (key === "Backspace" || key === "Delete") {
    const cell = key === "Backspace" && progress.letters[selection.cell] === "." && index > 0
      ? entry.cells[index - 1] : selection.cell;
    return { selection: { ...selection, cell }, progress: writeCrosswordLetter(board, progress, cell, ".") };
  }
  if (!/^[a-zA-Z]$/.test(key)) return null;
  const next = writeCrosswordLetter(board, progress, selection.cell, key.toUpperCase());
  return {
    selection: { ...selection, cell: entry.cells[Math.min(index + 1, entry.cells.length - 1)] },
    progress: next,
  };
};
