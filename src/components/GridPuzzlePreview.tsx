import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { getGridInputMode, isSelectedGridCell, type GridCellSelection } from "../interactions/gridRules";

const SUDOKU_BOX_SIZE = 3;
const sudokuDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const sameSudokuBox = (left: PuzzleCell, right: PuzzleCell) =>
  Math.floor(left.row / SUDOKU_BOX_SIZE) === Math.floor(right.row / SUDOKU_BOX_SIZE) &&
  Math.floor(left.column / SUDOKU_BOX_SIZE) === Math.floor(right.column / SUDOKU_BOX_SIZE);

const hasSudokuConflict = (cell: PuzzleCell, cells: PuzzleCell[]) => {
  if (!cell.value) {
    return false;
  }

  return cells.some(
    (candidate) =>
      candidate !== cell &&
      candidate.value === cell.value &&
      (candidate.row === cell.row || candidate.column === cell.column || sameSudokuBox(candidate, cell)),
  );
};

const getSudokuInputValue = (rawValue: string) => {
  const digits = Array.from(rawValue).filter((character) => "0123456789".includes(character));
  const lastDigit = digits[digits.length - 1] ?? "";
  return lastDigit === "0" ? "" : lastDigit;
};

type GridPuzzlePreviewProps = {
  puzzle: GridGeneratedPuzzle;
  cells: PuzzleCell[];
  selectedGridCell: GridCellSelection | null;
  onCellClick: (cell: PuzzleCell) => void;
  onCellInput: (cell: PuzzleCell, value: string) => void;
};

export const GridPuzzlePreview = ({ puzzle, cells, selectedGridCell, onCellClick, onCellInput }: GridPuzzlePreviewProps) => {
  const inputMode = getGridInputMode(puzzle.puzzleId);
  const selectedCell = selectedGridCell
    ? cells.find((cell) => cell.row === selectedGridCell.row && cell.column === selectedGridCell.column)
    : undefined;
  const isSudoku = puzzle.puzzleId === "sudoku";
  const hasValidationMistakes = Boolean(isSudoku && cells.some((cell) => !cell.locked && cell.tone === "hint"));
  const canUseDigitPad = Boolean(isSudoku && selectedCell && !selectedCell.locked);
  const setSelectedSudokuValue = (value: string) => {
    if (isSudoku && selectedCell && !selectedCell.locked) {
      onCellInput(selectedCell, value);
    }
  };

  return (
    <>
      <div
        aria-label={isSudoku ? `${puzzle.difficulty ?? "Medium"} Sudoku board` : undefined}
        class={`grid ${puzzle.puzzleId}`}
        style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))` }}
      >
        {cells.map((cell) => {
          const isInteractive = cell.tone !== "disabled" && (puzzle.puzzleId === "peg-solitaire" || !cell.locked);
          const isSelected = isSelectedGridCell(selectedGridCell, cell);
          const isPeer = Boolean(
            isSudoku &&
              selectedCell &&
              !isSelected &&
              (cell.row === selectedCell.row || cell.column === selectedCell.column || sameSudokuBox(cell, selectedCell)),
          );
          const isSameValue = Boolean(isSudoku && selectedCell?.value && cell.value === selectedCell.value && !isSelected);
          const hasConflict = isSudoku && hasSudokuConflict(cell, cells);
          const isCorrectValue = Boolean(isSudoku && hasValidationMistakes && !cell.locked && cell.tone === "answer");
          const isMistakeValue = Boolean(isSudoku && !cell.locked && cell.tone === "hint");
          const cellClass = [
            "cell",
            cell.tone,
            isInteractive ? "interactive-cell" : "",
            isSelected ? "selected-grid-cell" : "",
            isPeer ? "peer-cell" : "",
            isSameValue ? "same-value-cell" : "",
            hasConflict ? "conflict-cell" : "",
            isCorrectValue ? "correct-cell" : "",
            isMistakeValue ? "mistake-cell" : "",
            isSudoku && cell.column % SUDOKU_BOX_SIZE === 0 && cell.column > 0 ? "box-left" : "",
            isSudoku && cell.row % SUDOKU_BOX_SIZE === 0 && cell.row > 0 ? "box-top" : "",
          ]
            .filter(Boolean)
            .join(" ");

          if (inputMode !== "none") {
            return (
              <input
                aria-label={cell.ariaLabel}
                class={`cell-input ${cellClass}`}
                disabled={!isInteractive}
                inputMode={inputMode === "numeric" ? "numeric" : "text"}
                key={`${cell.row}-${cell.column}`}
                maxLength={isSudoku ? 2 : 1}
                onFocus={() => onCellClick(cell)}
                onInput={(event) => onCellInput(cell, isSudoku ? getSudokuInputValue(event.currentTarget.value) : event.currentTarget.value)}
                value={cell.value}
              />
            );
          }

          return (
            <button
              aria-label={cell.ariaLabel}
              aria-pressed={isSelected}
              class={cellClass}
              disabled={!isInteractive}
              key={`${cell.row}-${cell.column}`}
              onClick={() => onCellClick(cell)}
              type="button"
            >
              {cell.value}
            </button>
          );
        })}
      </div>

      {isSudoku ? (
        <div class="sudoku-digit-pad" aria-label="Sudoku digit pad">
          {sudokuDigits.map((digit) => (
            <button key={digit} type="button" disabled={!canUseDigitPad} onClick={() => setSelectedSudokuValue(digit)}>
              {digit}
            </button>
          ))}
          <button type="button" disabled={!canUseDigitPad} onClick={() => setSelectedSudokuValue("")}>
            0 Clear
          </button>
        </div>
      ) : null}
    </>
  );
};
