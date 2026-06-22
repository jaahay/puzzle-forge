import type { PuzzleId } from "../catalog/types";

export const puzzleIds: readonly PuzzleId[] = [
  "sudoku",
  "nonogram",
  "word-guess",
  "logic-grid",
  "klondike-solitaire",
  "peg-solitaire",
  "kenken",
  "minesweeper",
  "jigsaw",
  "slitherlink",
];

export const solitaireHistoryLimit = 120;
export const solitaireHistoryLimitNotice = `Undo history is saved on this device for your most recent ${solitaireHistoryLimit} Solitaire steps.`;
