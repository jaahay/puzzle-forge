import type { PuzzleSession } from "./session";
import { prepareGridCells } from "../interactions/gridRules";

const hasGeneratedImmutableCells = (puzzleId: PuzzleSession["puzzle"]["puzzleId"]) =>
  puzzleId === "sudoku" || puzzleId === "futoshiki" || puzzleId === "logic-grid";

const cellKey = (row: number, column: number) => `${row}:${column}`;

export const restoredSessionPreservesGeneratedState = (session: PuzzleSession) => {
  if (session.kind !== "grid" || !hasGeneratedImmutableCells(session.puzzle.puzzleId)) return true;

  const baselineCells = prepareGridCells(session.puzzle);
  if (baselineCells.length !== session.progress.cells.length) return false;

  const restoredCells = new Map(
    session.progress.cells.map((cell) => [cellKey(cell.row, cell.column), cell] as const),
  );
  if (restoredCells.size !== baselineCells.length) return false;

  return baselineCells.every((baseline) => {
    const restored = restoredCells.get(cellKey(baseline.row, baseline.column));
    if (!restored || restored.locked !== baseline.locked) return false;
    if (!baseline.locked) return true;

    return restored.value === baseline.value && restored.tone === baseline.tone;
  });
};
