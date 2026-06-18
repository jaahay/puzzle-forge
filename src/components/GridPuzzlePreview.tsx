import { useEffect } from "preact/hooks";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { FILLED_NONOGRAM_CELL } from "../games/nonogram/solve";
import { getGridInputMode, isSelectedGridCell, type GridCellSelection } from "../interactions/gridRules";

const SUDOKU_BOX_SIZE = 3;
const sudokuDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const sudokuSelectionScopeSelector = '[data-sudoku-selection-scope="true"]';

const sameSudokuBox = (left: PuzzleCell, right: PuzzleCell) =>
  Math.floor(left.row / SUDOKU_BOX_SIZE) === Math.floor(right.row / SUDOKU_BOX_SIZE) &&
  Math.floor(left.column / SUDOKU_BOX_SIZE) === Math.floor(right.column / SUDOKU_BOX_SIZE);

const getSudokuInputValue = (rawValue: string) => {
  const digits = Array.from(rawValue).filter((character) => "0123456789".includes(character));
  const lastDigit = digits[digits.length - 1] ?? "";
  return lastDigit === "0" ? "" : lastDigit;
};

const formatClueLabel = (values: number[]) => (values.length > 0 ? values.join(", ") : "0");
const getClueValues = (values: number[]) => (values.length > 0 ? values : [0]);

const renderClue = (values: number[], prefix: string, index: number, className: string) => (
  <div class={`nonogram-clue ${className}`} aria-label={`${prefix} ${index + 1} clue ${formatClueLabel(values)}`} key={`${prefix}-${index}`}>
    {getClueValues(values).map((value, valueIndex) => (
      <span key={`${prefix}-${index}-${valueIndex}`}>{value}</span>
    ))}
  </div>
);

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
  const isNonogram = puzzle.puzzleId === "nonogram";
  const hasSudokuValidation = Boolean(isSudoku && cells.some((cell) => !cell.locked && (cell.tone === "answer" || cell.tone === "hint")));
  const canUseDigitPad = Boolean(isSudoku && selectedCell && !selectedCell.locked);
  const gridTemplateColumns = `repeat(${puzzle.width}, minmax(0, 1fr))`;
  const setSelectedSudokuValue = (value: string) => {
    if (isSudoku && selectedCell && !selectedCell.locked) {
      onCellInput(selectedCell, value);
    }
  };

  useEffect(() => {
    if (!isSudoku || !selectedCell || typeof document === "undefined") {
      return;
    }

    const clearSelectionFromOutsideClick = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Element && target.closest(sudokuSelectionScopeSelector)) {
        return;
      }

      onCellClick(selectedCell);
    };

    document.addEventListener("pointerdown", clearSelectionFromOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", clearSelectionFromOutsideClick);
    };
  }, [isSudoku, onCellClick, selectedCell]);

  const grid = (
    <div
      aria-label={isSudoku ? `${puzzle.difficulty ?? "Medium"} Sudoku board` : isNonogram ? `${puzzle.width} by ${puzzle.height} Nonogram board` : undefined}
      class={`grid ${puzzle.puzzleId}`}
      data-sudoku-selection-scope={isSudoku ? "true" : undefined}
      style={{ gridTemplateColumns }}
    >
      {cells.map((cell) => {
        const isSelectable = cell.tone !== "disabled" && (isSudoku || puzzle.puzzleId === "peg-solitaire" || !cell.locked);
        const isEditable = cell.tone !== "disabled" && (puzzle.puzzleId === "peg-solitaire" || !cell.locked);
        const isSelected = isSelectedGridCell(selectedGridCell, cell);
        const isPeer = Boolean(
          isSudoku &&
            selectedCell &&
            !isSelected &&
            (cell.row === selectedCell.row || cell.column === selectedCell.column || sameSudokuBox(cell, selectedCell)),
        );
        const isSameValue = Boolean(isSudoku && selectedCell?.value && cell.value === selectedCell.value && !isSelected);
        const isCorrectValue = Boolean(isSudoku && hasSudokuValidation && !cell.locked && cell.tone === "answer");
        const visualTone = isSudoku && cell.tone === "hint" ? "empty" : cell.tone;
        const cellClass = [
          "cell",
          visualTone,
          isSelectable ? "interactive-cell" : "",
          isSelected ? "selected-grid-cell" : "",
          isPeer ? "peer-cell" : "",
          isSameValue ? "same-value-cell" : "",
          isCorrectValue ? "correct-cell" : "",
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
              disabled={!isSelectable}
              inputMode={inputMode === "numeric" ? "numeric" : "text"}
              key={`${cell.row}-${cell.column}`}
              maxLength={isSudoku ? 2 : 1}
              onClick={isSudoku ? undefined : () => onCellClick(cell)}
              onFocus={() => onCellClick(cell)}
              onInput={(event) => onCellInput(cell, isSudoku ? getSudokuInputValue(event.currentTarget.value) : event.currentTarget.value)}
              readOnly={!isEditable}
              value={cell.value}
            />
          );
        }

        return (
          <button
            aria-label={cell.ariaLabel}
            aria-pressed={isNonogram ? cell.value === FILLED_NONOGRAM_CELL : isSelected}
            class={cellClass}
            disabled={!isSelectable}
            key={`${cell.row}-${cell.column}`}
            onClick={() => onCellClick(cell)}
            type="button"
          >
            {isNonogram ? "" : cell.value}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {isNonogram ? (
        <section class="nonogram-board" aria-label="Nonogram puzzle with adjacent row and column clues">
          <div class="nonogram-corner" aria-hidden="true">
            Clues
          </div>
          <div class="nonogram-column-clues" style={{ gridTemplateColumns }}>
            {Array.from({ length: puzzle.width }, (_, column) => renderClue(puzzle.clues?.columns?.[column] ?? [], "Column", column, "nonogram-column-clue"))}
          </div>
          <div class="nonogram-row-clues" style={{ gridTemplateRows: `repeat(${puzzle.height}, minmax(0, 1fr))` }}>
            {Array.from({ length: puzzle.height }, (_, row) => renderClue(puzzle.clues?.rows?.[row] ?? [], "Row", row, "nonogram-row-clue"))}
          </div>
          {grid}
        </section>
      ) : (
        grid
      )}

      {isSudoku ? (
        <div class="sudoku-digit-pad" aria-label="Sudoku digit pad" data-sudoku-selection-scope="true">
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
