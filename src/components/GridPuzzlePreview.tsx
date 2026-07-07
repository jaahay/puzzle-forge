import { useEffect, useState } from "preact/hooks";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { FILLED_NONOGRAM_CELL } from "../games/nonogram/solve";
import { getGridInputMode, isSelectedGridCell, type GridCellSelection } from "../interactions/gridRules";
import { BoardViewport } from "./BoardViewport";

const SUDOKU_BOX_SIZE = 3;
const numericDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const gridSelectionScopeSelector = '[data-grid-selection-scope="true"]';

const sameSudokuBox = (left: PuzzleCell, right: PuzzleCell) =>
  Math.floor(left.row / SUDOKU_BOX_SIZE) === Math.floor(right.row / SUDOKU_BOX_SIZE) &&
  Math.floor(left.column / SUDOKU_BOX_SIZE) === Math.floor(right.column / SUDOKU_BOX_SIZE);

const sameSudokuDiagonal = (left: PuzzleCell, right: PuzzleCell, size: number) =>
  (left.row === left.column && right.row === right.column) ||
  (left.row + left.column === size - 1 && right.row + right.column === size - 1);

const isSudokuMainDiagonalCell = (cell: PuzzleCell, size: number) => cell.row === cell.column || cell.row + cell.column === size - 1;

const formatClueLabel = (values: number[]) => (values.length > 0 ? values.join(", ") : "0");
const getClueValues = (values: number[]) => (values.length > 0 ? values : [0]);
const getMaxClueSlots = (clues: number[][] | undefined) => Math.max(1, ...(clues ?? []).map((values) => getClueValues(values).length));

const renderClue = (values: number[], prefix: string, index: number, className: string) => (
  <div class={`nonogram-clue ${className}`} aria-label={`${prefix} ${index + 1} clue ${formatClueLabel(values)}`} key={`${prefix}-${index}`}>
    {getClueValues(values).map((value, valueIndex) => (
      <span key={`${prefix}-${index}-${valueIndex}`}>{value}</span>
    ))}
  </div>
);

const isTextEditingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT");

type GridPuzzlePreviewProps = {
  puzzle: GridGeneratedPuzzle;
  cells: PuzzleCell[];
  selectedGridCell: GridCellSelection | null;
  onCellClick: (cell: PuzzleCell) => void;
  onCellInput: (cell: PuzzleCell, value: string) => void;
};

export const GridPuzzlePreview = ({ puzzle, cells, selectedGridCell, onCellClick, onCellInput }: GridPuzzlePreviewProps) => {
  const [highlightedNumericDigit, setHighlightedNumericDigit] = useState("");
  const inputMode = getGridInputMode(puzzle.puzzleId);
  const selectedCell = selectedGridCell
    ? cells.find((cell) => cell.row === selectedGridCell.row && cell.column === selectedGridCell.column)
    : undefined;
  const isSudoku = puzzle.puzzleId === "sudoku";
  const isNumericGridPuzzle = inputMode === "numeric";
  const isDiagonalSudoku = isSudoku && puzzle.sudokuVariation === "diagonal";
  const isNonogram = puzzle.puzzleId === "nonogram";
  const hasSudokuValidation = Boolean(isSudoku && cells.some((cell) => !cell.locked && (cell.tone === "answer" || cell.tone === "hint")));
  const activeNumericValue = selectedCell?.value || highlightedNumericDigit;
  const gridTemplateColumns = `repeat(${puzzle.width}, minmax(0, 1fr))`;
  const canClearSelectedNumericCell = Boolean(isNumericGridPuzzle && selectedCell && !selectedCell.locked && selectedCell.value);

  const setSelectedNumericValue = (value: string) => {
    if (!isNumericGridPuzzle) {
      return;
    }

    if (selectedCell && !selectedCell.locked) {
      const nextValue = selectedCell.value === value ? "" : value;
      setHighlightedNumericDigit("");
      onCellInput(selectedCell, nextValue);
      return;
    }

    if (value) {
      setHighlightedNumericDigit((currentDigit) => (currentDigit === value ? "" : value));
    }
  };

  const clearSelectedNumericValue = () => {
    setHighlightedNumericDigit("");

    if (selectedCell && !selectedCell.locked) {
      onCellInput(selectedCell, "");
    }
  };

  const digitPad = isNumericGridPuzzle ? (
    <div class="sudoku-digit-pad" aria-label={`${puzzle.title} digit pad`} data-grid-selection-scope="true">
      {numericDigits.map((digit) => (
        <button
          class={activeNumericValue === digit ? "selected-sudoku-digit" : ""}
          key={digit}
          type="button"
          aria-pressed={activeNumericValue === digit}
          onClick={() => setSelectedNumericValue(digit)}
        >
          {digit}
        </button>
      ))}
      <button
        class="sudoku-erase-button"
        type="button"
        onClick={clearSelectedNumericValue}
        disabled={!canClearSelectedNumericCell}
        aria-label={`Erase selected ${puzzle.title} cell`}
      >
        Erase
      </button>
    </div>
  ) : null;

  useEffect(() => {
    setHighlightedNumericDigit("");
  }, [puzzle.puzzleId, puzzle.seed, puzzle.sudokuVariation]);

  useEffect(() => {
    if (!isNumericGridPuzzle || !selectedCell || typeof document === "undefined") {
      return;
    }

    const clearSelectionFromOutsideClick = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Element && target.closest(gridSelectionScopeSelector)) {
        return;
      }

      onCellClick(selectedCell);
    };

    document.addEventListener("pointerdown", clearSelectionFromOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", clearSelectionFromOutsideClick);
    };
  }, [isNumericGridPuzzle, onCellClick, selectedCell]);

  useEffect(() => {
    if (!isNumericGridPuzzle || !selectedCell || typeof document === "undefined") {
      return;
    }

    const handleNumericKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTextEditingTarget(event.target)) {
        return;
      }

      if (numericDigits.includes(event.key)) {
        event.preventDefault();
        setSelectedNumericValue(event.key);
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        event.preventDefault();
        clearSelectedNumericValue();
      }
    };

    document.addEventListener("keydown", handleNumericKeyDown);

    return () => {
      document.removeEventListener("keydown", handleNumericKeyDown);
    };
  }, [isNumericGridPuzzle, selectedCell]);

  const grid = (
    <div
      aria-label={isSudoku ? `${puzzle.difficulty ?? "Medium"} ${isDiagonalSudoku ? "Diagonal " : ""}Sudoku board` : isNonogram ? `${puzzle.width} by ${puzzle.height} Nonogram board` : undefined}
      class={`grid ${puzzle.puzzleId} ${isDiagonalSudoku ? "diagonal-sudoku" : ""}`}
      data-grid-selection-scope={isNumericGridPuzzle ? "true" : undefined}
      style={{ gridTemplateColumns }}
    >
      {cells.map((cell) => {
        const isSelectable = cell.tone !== "disabled" && (isNumericGridPuzzle || puzzle.puzzleId === "peg-solitaire" || !cell.locked);
        const isEditable = cell.tone !== "disabled" && (puzzle.puzzleId === "peg-solitaire" || !cell.locked);
        const isSelected = isSelectedGridCell(selectedGridCell, cell);
        const isDiagonalPeer = Boolean(isDiagonalSudoku && selectedCell && sameSudokuDiagonal(cell, selectedCell, puzzle.width));
        const isPeer = Boolean(
          isSudoku &&
            selectedCell &&
            !isSelected &&
            (cell.row === selectedCell.row || cell.column === selectedCell.column || sameSudokuBox(cell, selectedCell) || isDiagonalPeer),
        );
        const isSameValue = Boolean(isNumericGridPuzzle && activeNumericValue && cell.value === activeNumericValue && !isSelected);
        const isCorrectValue = Boolean(isSudoku && hasSudokuValidation && !cell.locked && cell.tone === "answer");
        const isIncorrectValue = Boolean(isSudoku && hasSudokuValidation && !cell.locked && cell.tone === "hint");
        const isDiagonalCell = Boolean(isDiagonalSudoku && isSudokuMainDiagonalCell(cell, puzzle.width));
        const visualTone = cell.tone;
        const cellClass = [
          "cell",
          visualTone,
          isSelectable ? "interactive-cell" : "",
          isSelected ? "selected-grid-cell" : "",
          isPeer ? "peer-cell" : "",
          isSameValue ? "same-value-cell" : "",
          isCorrectValue ? "correct-cell" : "",
          isIncorrectValue ? "incorrect-cell" : "",
          isDiagonalCell ? "diagonal-cell" : "",
          isSudoku && cell.column % SUDOKU_BOX_SIZE === 0 && cell.column > 0 ? "box-left" : "",
          isSudoku && cell.row % SUDOKU_BOX_SIZE === 0 && cell.row > 0 ? "box-top" : "",
        ]
          .filter(Boolean)
          .join(" ");

        if (inputMode === "word") {
          return (
            <input
              aria-label={cell.ariaLabel}
              class={`cell-input ${cellClass}`}
              disabled={!isSelectable}
              inputMode="text"
              key={`${cell.row}-${cell.column}`}
              maxLength={1}
              onClick={() => onCellClick(cell)}
              onFocus={() => onCellClick(cell)}
              onInput={(event) => onCellInput(cell, event.currentTarget.value)}
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

  if (isNonogram) {
    return (
      <BoardViewport
        kind="nonogram"
        columns={puzzle.width}
        rows={puzzle.height}
        rowClueSlots={getMaxClueSlots(puzzle.clues?.rows)}
        columnClueSlots={getMaxClueSlots(puzzle.clues?.columns)}
      >
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
      </BoardViewport>
    );
  }

  if (isNumericGridPuzzle) {
    return (
      <BoardViewport kind="sudoku" columns={puzzle.width} rows={puzzle.height}>
        {grid}
        {digitPad}
        {isDiagonalSudoku ? (
          <p class="sudoku-variant-rule">Diagonal rule: both main diagonals also contain 1-9.</p>
        ) : null}
      </BoardViewport>
    );
  }

  return grid;
};