import type { CrosswordBoard } from "./model";

// One row-major character per cell: # for blocks, . for blanks, A-Z for
// player letters. The immutable solution remains in the generated board.
export type CrosswordProgress = {
  baselineChecksum: string;
  letters: string;
};

export const createCrosswordProgress = (board: CrosswordBoard): CrosswordProgress => ({
  baselineChecksum: board.checksum,
  letters: board.blocks.map(block => block ? "#" : ".").join(""),
});

export const restoreCrosswordProgress = (board: CrosswordBoard, value: unknown): CrosswordProgress | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CrosswordProgress>;
  if (candidate.baselineChecksum !== board.checksum || typeof candidate.letters !== "string"
      || candidate.letters.length !== board.blocks.length) return null;
  const letters = candidate.letters;
  if (!board.blocks.every((block, cell) => block ? letters[cell] === "#" : /^[.A-Z]$/.test(letters[cell]))) return null;
  return { baselineChecksum: board.checksum, letters };
};

export const isCrosswordCell = (board: CrosswordBoard, cell: number): boolean =>
  Number.isInteger(cell) && cell >= 0 && cell < board.blocks.length && !board.blocks[cell];

export const isCrosswordComplete = (board: CrosswordBoard, progress: CrosswordProgress): boolean =>
  progress.baselineChecksum === board.checksum && progress.letters === board.solution;

// Explicit checking is a read-only projection of the current snapshot.
export const getCrosswordIncorrectCells = (board: CrosswordBoard, progress: CrosswordProgress): number[] => {
  if (!restoreCrosswordProgress(board, progress)) return [];
  return board.blocks.flatMap((block, cell) =>
    !block && progress.letters[cell] !== "." && progress.letters[cell] !== board.solution[cell] ? [cell] : []);
};

export const writeCrosswordLetter = (
  board: CrosswordBoard, progress: CrosswordProgress, cell: number, letter: string,
): CrosswordProgress => {
  if (progress.baselineChecksum !== board.checksum || !isCrosswordCell(board, cell)
      || isCrosswordComplete(board, progress) || !/^[.A-Z]$/.test(letter) || progress.letters[cell] === letter) return progress;
  return { baselineChecksum: board.checksum, letters: progress.letters.slice(0, cell) + letter + progress.letters.slice(cell + 1) };
};
