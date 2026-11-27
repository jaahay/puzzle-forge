import type { CrosswordBoard } from "./model";

// One row-major character per cell: # for blocks, . for blanks, A-Z for
// player letters. The immutable solution remains in the generated board.
export const crosswordHistoryLimit = 120;
export type CrosswordHistoryAction = "undo" | "redo";
export type CrosswordHistory = {
  undo: readonly string[];
  redo: readonly string[];
};

export type CrosswordProgress = {
  baselineChecksum: string;
  letters: string;
  history?: CrosswordHistory;
};

export const createCrosswordProgress = (board: CrosswordBoard): CrosswordProgress => ({
  baselineChecksum: board.checksum,
  letters: board.blocks.map(block => block ? "#" : ".").join(""),
});

// Snapshots contain only player letters and share the current blocked-cell mask.
export const isCrosswordHistory = (value: unknown, letters: string): value is CrosswordHistory => {
  if (!value || typeof value !== "object") return false;
  const history = value as Partial<CrosswordHistory>;
  const validSnapshot = (snapshot: unknown) => typeof snapshot === "string"
    && snapshot.length === letters.length
    && [...letters].every((letter, cell) => letter === "#" ? snapshot[cell] === "#" : /^[.A-Z]$/.test(snapshot[cell]));
  return Array.isArray(history.undo) && Array.isArray(history.redo)
    && history.undo.length + history.redo.length <= crosswordHistoryLimit
    && history.undo.every(validSnapshot) && history.redo.every(validSnapshot);
};

export const cloneCrosswordProgress = (progress: CrosswordProgress): CrosswordProgress => ({
  baselineChecksum: progress.baselineChecksum,
  letters: progress.letters,
  ...(progress.history && (progress.history.undo.length || progress.history.redo.length)
    ? { history: { undo: [...progress.history.undo], redo: [...progress.history.redo] } } : {}),
});

export const restoreCrosswordProgress = (board: CrosswordBoard, value: unknown): CrosswordProgress | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CrosswordProgress>;
  if (candidate.baselineChecksum !== board.checksum || typeof candidate.letters !== "string"
      || candidate.letters.length !== board.blocks.length) return null;
  const letters = candidate.letters;
  if (!board.blocks.every((block, cell) => block ? letters[cell] === "#" : /^[.A-Z]$/.test(letters[cell]))) return null;
  if (candidate.history !== undefined && !isCrosswordHistory(candidate.history, letters)) return null;
  return cloneCrosswordProgress({ baselineChecksum: board.checksum, letters, history: candidate.history });
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

export const canMoveCrosswordHistory = (board: CrosswordBoard, current: CrosswordProgress, action: CrosswordHistoryAction): boolean =>
  current.baselineChecksum === board.checksum && !isCrosswordComplete(board, current)
  && Boolean(current.history?.[action].length);

// Only accepted player edits enter history. Selection and checking remain transient.
export const recordCrosswordEdit = (
  board: CrosswordBoard, current: CrosswordProgress, proposed: CrosswordProgress,
): CrosswordProgress | null => {
  if (current.baselineChecksum !== board.checksum || isCrosswordComplete(board, current)) return null;
  const next = restoreCrosswordProgress(board, { baselineChecksum: proposed.baselineChecksum, letters: proposed.letters });
  if (!next || next.letters === current.letters) return null;
  return { ...next, history: {
    undo: [...(current.history?.undo ?? []), current.letters].slice(-crosswordHistoryLimit),
    redo: [],
  } };
};

export const moveCrosswordHistory = (
  board: CrosswordBoard, current: CrosswordProgress, action: CrosswordHistoryAction,
): CrosswordProgress | null => {
  if (!canMoveCrosswordHistory(board, current, action) || !current.history) return null;
  const { undo, redo } = current.history;
  const letters = current.history[action].at(-1)!;
  return cloneCrosswordProgress({
    baselineChecksum: current.baselineChecksum,
    letters,
    history: action === "undo"
      ? { undo: undo.slice(0, -1), redo: [...redo, current.letters] }
      : { undo: [...undo, current.letters], redo: redo.slice(0, -1) },
  });
};
