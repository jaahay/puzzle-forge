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
    generationId: "eyJzIjoiaGFwcHktMjAyNi1zdWRva3UiLCJkIjoiTWVkaXVtIiwieCI6ImNsYXNzaWMifQ",
  },
  {
    puzzleId: "nonogram",
    alias: "Happy2026!",
    generationId: "eyJzIjoiaGFwcHktMjAyNi1ub25vZ3JhbSIsInciOjEwLCJoIjoxMCwiZCI6Ik1lZGl1bSIsInUiOjF9",
  },
  {
    puzzleId: "sudoku",
    alias: "Welcome",
    generationId: "eyJzIjoid2VsY29tZS1zdWRva3UiLCJkIjoiRWFzeSIsIngiOiJjbGFzc2ljIn0",
  },
];

export const getPuzzleResourceAlias = (puzzleId: PuzzleId, alias: string) =>
  puzzleResourceAliases.find(
    (candidate) => candidate.puzzleId === puzzleId && candidate.alias === alias,
  );
