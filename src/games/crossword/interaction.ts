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

export const crossingCrosswordEntry = (board: CrosswordBoard, selection: CrosswordSelection) =>
  activeCrosswordEntry(board, { ...selection, direction: opposite(selection.direction) });

export const selectCrosswordCell = (
  board: CrosswordBoard, selection: CrosswordSelection, cell: number,
): CrosswordSelection => {
  if (!isCrosswordCell(board, cell)) return selection;
  return cell === selection.cell ? selection : { cell, direction: selection.direction };
};

export const selectCrosswordEntry = (
  board: CrosswordBoard, progress: CrosswordProgress, selection: CrosswordSelection,
  number: number, direction: CrosswordDirection,
): CrosswordSelection => {
  const entry = board.entries.find(candidate => candidate.number === number && candidate.direction === direction);
  if (!entry) return selection;
  const cell = entry.cells.includes(selection.cell)
    ? selection.cell
    : entry.cells.find(index => progress.letters[index] === ".") ?? entry.cells[0];
  return { cell, direction };
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
  return selection;
};

// Hardware and native text input share the same transition. Navigation is
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
  // Filling a blank respects letters already supplied by crossings. Overwriting
  // a filled cell instead advances sequentially, allowing a full answer rewrite.
  const following = entry.cells.slice(index + 1);
  const cell = progress.letters[selection.cell] === "."
    ? following.find(candidate => next.letters[candidate] === ".") ?? selection.cell
    : following[0] ?? selection.cell;
  return { selection: { ...selection, cell }, progress: next };
};
