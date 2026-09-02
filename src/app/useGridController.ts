import { useRef, useState } from "preact/hooks";
import type { GeneratedPuzzle, PuzzleCell, PuzzleId } from "../catalog/types";
import { checkGridAnswer, isGridAnswerCompleteAndCorrect, type GridCheckFeedbackTone } from "../interactions/gridChecking";
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

type GridUpdateResult = {
  cells: PuzzleCell[];
  message: string;
  feedbackTone?: GridCheckFeedbackTone;
  clearSelection?: boolean;
};

const SUDOKU_CHECK_FEEDBACK_MS = 750;
const usesNeutralNumericEntryTone = (puzzleId: PuzzleId) => puzzleId === "sudoku" || puzzleId === "futoshiki";

export const clearGridValidationTone = (puzzleId: PuzzleId, cell: PuzzleCell): PuzzleCell => {
  if (cell.locked || cell.tone === "disabled") return cell;

  if (usesNeutralNumericEntryTone(puzzleId) && (cell.tone === "answer" || cell.tone === "hint")) {
    return { ...cell, tone: "empty" };
  }

  if (puzzleId === "nonogram" && cell.tone === "hint") {
    return { ...cell, tone: cell.value === "■" ? "accent" : "empty" };
  }

  return cell;
};

export const getGridEntryTone = (puzzleId: PuzzleId, value: string): PuzzleCell["tone"] =>
  usesNeutralNumericEntryTone(puzzleId) ? "empty" : value ? "answer" : "empty";

export const useGridController = () => {
  const [gridCells, setGridCellsState] = useState<PuzzleCell[] | null>(null);
  const gridCellsRef = useRef<PuzzleCell[] | null>(null);
  const [selectedGridCell, setSelectedGridCell] = useState<GridCellSelection | null>(null);
  const [checkFeedbackTone, setCheckFeedbackTone] = useState<GridCheckFeedbackTone | null>(null);
  const sudokuValidationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setGridCells = (nextCells: PuzzleCell[] | null) => {
    gridCellsRef.current = nextCells;
    setGridCellsState(nextCells);
  };

  const clearSudokuValidationTimer = () => {
    if (sudokuValidationTimer.current !== null) {
      clearTimeout(sudokuValidationTimer.current);
      sudokuValidationTimer.current = null;
    }
  };

  const scheduleSudokuValidationReset = () => {
    clearSudokuValidationTimer();
    sudokuValidationTimer.current = setTimeout(() => {
      const currentCells = gridCellsRef.current;
      if (currentCells) setGridCells(currentCells.map((cell) => clearGridValidationTone("sudoku", cell)));
      sudokuValidationTimer.current = null;
    }, SUDOKU_CHECK_FEEDBACK_MS);
  };

  const clearGridInteraction = () => setSelectedGridCell(null);
  const clearCheckFeedback = () => setCheckFeedbackTone(null);

  const resetGrid = () => {
    clearSudokuValidationTimer();
    setGridCells(null);
    clearGridInteraction();
    clearCheckFeedback();
  };

  const restoreGridSnapshot = ({ gridCells: nextGridCells, selectedGridCell: nextSelectedGridCell }: GridControllerSnapshot) => {
    clearSudokuValidationTimer();
    setGridCells(nextGridCells?.map(cloneGridCell) ?? null);
    setSelectedGridCell(nextSelectedGridCell ? { ...nextSelectedGridCell } : null);
    clearCheckFeedback();
  };

  const prepareGeneratedGrid = (puzzle: GeneratedPuzzle) => {
    clearSudokuValidationTimer();
    setGridCells(puzzle.kind === "grid" ? prepareGridCells(puzzle) : null);
    clearGridInteraction();
    clearCheckFeedback();
  };

  const updateGridCells = (
    updater: (cells: PuzzleCell[]) => GridUpdateResult,
    onStatusMessage: (message: string) => void,
  ): GridUpdateResult | null => {
    const currentCells = gridCellsRef.current;
    if (!currentCells) return null;

    const result = updater(currentCells.map(cloneGridCell));
    setGridCells(result.cells);
    setCheckFeedbackTone(result.feedbackTone ?? null);
    if (result.clearSelection) clearGridInteraction();
    onStatusMessage(result.message);
    return result;
  };

  const handleGridCellInput = (puzzle: GeneratedPuzzle | null, cell: PuzzleCell, rawValue: string, onStatusMessage: (message: string) => void) => {
    if (!puzzle || puzzle.kind !== "grid" || cell.locked) return;

    const currentCells = gridCellsRef.current;
    if (puzzle.puzzleId === "sudoku" && currentCells && isGridAnswerCompleteAndCorrect(puzzle, currentCells)) {
      clearGridInteraction();
      onStatusMessage("Solved.");
      return;
    }

    if (puzzle.puzzleId === "sudoku") clearSudokuValidationTimer();

    const inputMode = getGridInputMode(puzzle.puzzleId);
    const nextValue = normalizeCellInput(inputMode, rawValue);

    setSelectedGridCell({ row: cell.row, column: cell.column });
    const result = updateGridCells((cells) => {
      const editableCells = cells.map((candidate) => clearGridValidationTone(puzzle.puzzleId, candidate));
      const index = getCellIndex(editableCells, cell);
      const current = editableCells[index];

      if (!current) return { cells: editableCells, message: "Cell no longer exists." };

      editableCells[index] = {
        ...current,
        value: nextValue,
        tone: getGridEntryTone(puzzle.puzzleId, nextValue),
        ariaLabel: `${nextValue || "Empty"} cell at row ${current.row + 1}, column ${current.column + 1}`,
      };

      if (puzzle.puzzleId === "sudoku" && isGridAnswerCompleteAndCorrect(puzzle, editableCells)) {
        return {
          cells: editableCells,
          message: "Solved.",
          feedbackTone: "success",
          clearSelection: true,
        };
      }

      const puzzleName = puzzle.puzzleId === "sudoku" ? "Sudoku" : puzzle.puzzleId === "futoshiki" ? "Futoshiki" : null;
      return {
        cells: editableCells,
        message: puzzleName ? `${puzzleName} entry updated.` : nextValue ? `Set cell to ${nextValue}.` : "Cleared cell.",
      };
    }, onStatusMessage);

    if (puzzle.puzzleId === "sudoku" && result?.feedbackTone !== "success") scheduleSudokuValidationReset();
  };

  const toggleNonogramCell = (cell: PuzzleCell, onStatusMessage: (message: string) => void) => {
    clearGridInteraction();
    updateGridCells((cells) => {
      const editableCells = cells.map((candidate) => clearGridValidationTone("nonogram", candidate));
      const index = getCellIndex(editableCells, cell);
      const current = editableCells[index];
      if (!current) return { cells: editableCells, message: "Cell no longer exists." };

      const nextValue = current.value === "■" ? "" : "■";
      editableCells[index] = {
        ...current,
        value: nextValue,
        tone: nextValue ? "accent" : "empty",
        ariaLabel: `${nextValue ? "Filled" : "Empty"} nonogram cell at row ${current.row + 1}, column ${current.column + 1}`,
      };
      return { cells: editableCells, message: nextValue ? "Marked filled square." : "Cleared square." };
    }, onStatusMessage);
  };

  const handlePegSolitaireCellClick = (cell: PuzzleCell, onStatusMessage: (message: string) => void) => {
    if (cell.tone === "disabled") return;

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
      if (!isOrthogonalJump) return { cells, message: "Peg jumps must move exactly two spaces horizontally or vertically." };

      const middleCell = getGridCell(cells, {
        row: source.row + rowDelta / 2,
        column: source.column + columnDelta / 2,
      });
      if (!middleCell || middleCell.value !== "●") return { cells, message: "A jump must hop over another peg." };

      const nextCells: PuzzleCell[] = cells.map((candidate): PuzzleCell => {
        const isSource = candidate.row === source.row && candidate.column === source.column;
        const isDestination = candidate.row === destination.row && candidate.column === destination.column;
        const isMiddle = candidate.row === middleCell.row && candidate.column === middleCell.column;
        if (isSource || isMiddle) return { ...candidate, value: "○", locked: false, tone: "empty" };
        if (isDestination) return { ...candidate, value: "●", locked: true, tone: "given" };
        return candidate;
      });
      const pegCount = nextCells.filter((candidate) => candidate.value === "●").length;
      return {
        cells: nextCells,
        message: pegCount === 1 ? "Solved: one peg remains." : `Jumped peg. ${pegCount} pegs remain.`,
        feedbackTone: pegCount === 1 ? "success" : undefined,
      };
    }, onStatusMessage);

    clearGridInteraction();
  };

  const selectNumericGridCell = (cell: PuzzleCell) => {
    if (selectedGridCell?.row === cell.row && selectedGridCell.column === cell.column) {
      clearGridInteraction();
      return;
    }
    setSelectedGridCell({ row: cell.row, column: cell.column });
  };

  const handleGridCellClick = (puzzle: GeneratedPuzzle | null, cell: PuzzleCell, onStatusMessage: (message: string) => void) => {
    if (!puzzle || puzzle.kind !== "grid") return;

    const currentCells = gridCellsRef.current;
    if (puzzle.puzzleId === "sudoku" && currentCells && isGridAnswerCompleteAndCorrect(puzzle, currentCells)) {
      clearGridInteraction();
      return;
    }

    if (getGridInputMode(puzzle.puzzleId) === "numeric") {
      selectNumericGridCell(cell);
      return;
    }
    if (puzzle.puzzleId === "nonogram") {
      toggleNonogramCell(cell, onStatusMessage);
      return;
    }
    if (puzzle.puzzleId === "peg-solitaire") handlePegSolitaireCellClick(cell, onStatusMessage);
  };

  const checkGrid = (puzzle: GeneratedPuzzle, onStatusMessage: (message: string) => void) => {
    const currentCells = gridCellsRef.current;
    if (puzzle.puzzleId === "peg-solitaire") {
      const pegCount = currentCells?.filter((cell) => cell.value === "●").length ?? 0;
      setCheckFeedbackTone(pegCount === 1 ? "success" : "error");
      onStatusMessage(pegCount === 1 ? "Solved. One peg remains." : `Not solved: ${pegCount} pegs remain.`);
      return;
    }
    if (!currentCells || puzzle.kind !== "grid") return;

    const result = updateGridCells((cells) => {
      const checked = checkGridAnswer(puzzle, cells);
      return {
        ...checked,
        clearSelection: puzzle.puzzleId === "sudoku" && checked.feedbackTone === "success",
      };
    }, onStatusMessage);

    if (puzzle.puzzleId === "sudoku" && result?.feedbackTone !== "success") scheduleSudokuValidationReset();
  };

  return {
    gridCells,
    selectedGridCell,
    checkFeedbackTone,
    resetGrid,
    restoreGridSnapshot,
    prepareGeneratedGrid,
    handleGridCellInput,
    handleGridCellClick,
    checkGrid,
  };
};
