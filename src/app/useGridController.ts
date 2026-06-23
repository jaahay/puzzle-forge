import { useState } from "preact/hooks";
import type { GeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { checkGridAnswer } from "../interactions/gridChecking";
import {
  cloneGridCell,
  getCellIndex,
  getGridCell,
  getGridInputMode,
  normalizeCellInput,
  prepareGridCells,
  type GridCellSelection,
} from "../interactions/gridRules";

export type GridControllerSnapshot = {
  gridCells: PuzzleCell[] | null;
  selectedGridCell: GridCellSelection | null;
};

export const useGridController = () => {
  const [gridCells, setGridCells] = useState<PuzzleCell[] | null>(null);
  const [selectedGridCell, setSelectedGridCell] = useState<GridCellSelection | null>(null);

  const clearGridInteraction = () => {
    setSelectedGridCell(null);
  };

  const resetGrid = () => {
    setGridCells(null);
    clearGridInteraction();
  };

  const restoreGridSnapshot = ({ gridCells: nextGridCells, selectedGridCell: nextSelectedGridCell }: GridControllerSnapshot) => {
    setGridCells(nextGridCells?.map(cloneGridCell) ?? null);
    setSelectedGridCell(nextSelectedGridCell ? { ...nextSelectedGridCell } : null);
  };

  const prepareGeneratedGrid = (puzzle: GeneratedPuzzle) => {
    setGridCells(puzzle.kind === "grid" ? prepareGridCells(puzzle) : null);
    clearGridInteraction();
  };

  const updateGridCells = (
    updater: (cells: PuzzleCell[]) => { cells: PuzzleCell[]; message: string },
    onStatusMessage: (message: string) => void,
  ) => {
    setGridCells((currentCells) => {
      if (!currentCells) {
        return currentCells;
      }

      const { cells, message } = updater(currentCells.map(cloneGridCell));
      onStatusMessage(message);
      return cells;
    });
  };

  const handleGridCellInput = (puzzle: GeneratedPuzzle | null, cell: PuzzleCell, rawValue: string, onStatusMessage: (message: string) => void) => {
    if (!puzzle || puzzle.kind !== "grid" || cell.locked) {
      return;
    }

    const inputMode = getGridInputMode(puzzle.puzzleId);
    const nextValue = normalizeCellInput(inputMode, rawValue);

    setSelectedGridCell({ row: cell.row, column: cell.column });
    updateGridCells((cells) => {
      const index = getCellIndex(cells, cell);
      const current = cells[index];

      if (!current) {
        return { cells, message: "Cell no longer exists." };
      }

      cells[index] = {
        ...current,
        value: nextValue,
        tone: puzzle.puzzleId === "sudoku" ? "empty" : nextValue ? "answer" : "empty",
        ariaLabel: `${nextValue || "Empty"} cell at row ${current.row + 1}, column ${current.column + 1}`,
      };

      return { cells, message: puzzle.puzzleId === "sudoku" ? "Sudoku entry updated." : nextValue ? `Set cell to ${nextValue}.` : "Cleared cell." };
    }, onStatusMessage);
  };

  const toggleNonogramCell = (cell: PuzzleCell, onStatusMessage: (message: string) => void) => {
    clearGridInteraction();
    updateGridCells((cells) => {
      const index = getCellIndex(cells, cell);
      const current = cells[index];

      if (!current) {
        return { cells, message: "Cell no longer exists." };
      }

      const nextValue = current.value === "■" ? "" : "■";
      cells[index] = {
        ...current,
        value: nextValue,
        tone: nextValue ? "accent" : "empty",
        ariaLabel: `${nextValue ? "Filled" : "Empty"} nonogram cell at row ${current.row + 1}, column ${current.column + 1}`,
      };

      return { cells, message: nextValue ? "Marked filled square." : "Cleared square." };
    }, onStatusMessage);
  };

  const handlePegSolitaireCellClick = (cell: PuzzleCell, onStatusMessage: (message: string) => void) => {
    if (cell.tone === "disabled") {
      return;
    }

    if (!selectedGridCell) {
      if (cell.value === "●") {
        setSelectedGridCell({ row: cell.row, column: cell.column });
        onStatusMessage(`Selected peg at row ${cell.row + 1}, column ${cell.column + 1}.`);
      } else {
        onStatusMessage("Select a peg, then jump it into an empty hole two spaces away.");
      }

      return;
    }

    if (selectedGridCell.row === cell.row && selectedGridCell.column === cell.column) {
      clearGridInteraction();
      onStatusMessage("Peg selection cleared.");
      return;
    }

    if (cell.value === "●") {
      setSelectedGridCell({ row: cell.row, column: cell.column });
      onStatusMessage(`Selected peg at row ${cell.row + 1}, column ${cell.column + 1}.`);
      return;
    }

    updateGridCells((cells) => {
      const source = getGridCell(cells, selectedGridCell);
      const destination = getGridCell(cells, cell);

      if (!source || !destination || source.value !== "●" || destination.value !== "○") {
        return { cells, message: "Peg jumps must start on a peg and land in an empty hole." };
      }

      const rowDelta = destination.row - source.row;
      const columnDelta = destination.column - source.column;
      const isOrthogonalJump =
        (Math.abs(rowDelta) === 2 && columnDelta === 0) || (Math.abs(columnDelta) === 2 && rowDelta === 0);

      if (!isOrthogonalJump) {
        return { cells, message: "Peg jumps must move exactly two spaces horizontally or vertically." };
      }

      const middleCell = getGridCell(cells, {
        row: source.row + rowDelta / 2,
        column: source.column + columnDelta / 2,
      });

      if (!middleCell || middleCell.value !== "●") {
        return { cells, message: "A jump must hop over another peg." };
      }

      const nextCells: PuzzleCell[] = cells.map((candidate): PuzzleCell => {
        const isSource = candidate.row === source.row && candidate.column === source.column;
        const isDestination = candidate.row === destination.row && candidate.column === destination.column;
        const isMiddle = candidate.row === middleCell.row && candidate.column === middleCell.column;

        if (isSource || isMiddle) {
          return { ...candidate, value: "○", locked: false, tone: "empty" };
        }

        if (isDestination) {
          return { ...candidate, value: "●", locked: true, tone: "given" };
        }

        return candidate;
      });
      const pegCount = nextCells.filter((candidate) => candidate.value === "●").length;

      return { cells: nextCells, message: pegCount === 1 ? "Solved: one peg remains." : `Jumped peg. ${pegCount} pegs remain.` };
    }, onStatusMessage);

    clearGridInteraction();
  };

  const handleGridCellClick = (puzzle: GeneratedPuzzle | null, cell: PuzzleCell, onStatusMessage: (message: string) => void) => {
    if (!puzzle || puzzle.kind !== "grid") {
      return;
    }

    if (puzzle.puzzleId === "sudoku") {
      if (selectedGridCell?.row === cell.row && selectedGridCell.column === cell.column) {
        clearGridInteraction();
        return;
      }

      setSelectedGridCell({ row: cell.row, column: cell.column });
      return;
    }

    if (puzzle.puzzleId === "nonogram") {
      toggleNonogramCell(cell, onStatusMessage);
      return;
    }

    if (puzzle.puzzleId === "peg-solitaire") {
      handlePegSolitaireCellClick(cell, onStatusMessage);
    }
  };

  const checkGrid = (puzzle: GeneratedPuzzle, onStatusMessage: (message: string) => void) => {
    if (puzzle.puzzleId === "peg-solitaire") {
      const pegCount = gridCells?.filter((cell) => cell.value === "●").length ?? 0;
      onStatusMessage(pegCount === 1 ? "Solved. One peg remains." : `Not solved: ${pegCount} pegs remain.`);
      return;
    }

    if (!gridCells || puzzle.kind !== "grid") {
      return;
    }

    updateGridCells((cells) => checkGridAnswer(puzzle, cells), onStatusMessage);
  };

  return {
    gridCells,
    selectedGridCell,
    setGridCells,
    setSelectedGridCell,
    clearGridInteraction,
    resetGrid,
    restoreGridSnapshot,
    prepareGeneratedGrid,
    handleGridCellInput,
    handleGridCellClick,
    checkGrid,
  };
};
