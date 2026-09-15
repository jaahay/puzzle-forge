import type { PuzzleId } from "../catalog/types";

export type PuzzleResourceAlias = {
  puzzleId: PuzzleId;
  alias: string;
  generationId: string;
};

export const puzzleResourceAliases: readonly PuzzleResourceAlias[] = [
  {
    puzzleId: "sudoku",
    alias: "Happy2026!",
    generationId: "ARFoYXBweS0yMDI2LXN1ZG9rdQAB",
  },
  {
    puzzleId: "nonogram",
    alias: "Happy2026!",
    generationId: "ARNoYXBweS0yMDI2LW5vbm9ncmFtAAoKBQ",
  },
  {
    puzzleId: "sudoku",
    alias: "Welcome",
    generationId: "AQ53ZWxjb21lLXN1ZG9rdQAA",
  },
];

export const getPuzzleResourceAlias = (puzzleId: PuzzleId, alias: string) =>
  puzzleResourceAliases.find(
    (candidate) => candidate.puzzleId === puzzleId && candidate.alias === alias,
  );
