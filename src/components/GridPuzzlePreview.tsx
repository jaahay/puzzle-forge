import { useEffect, useRef, useState } from "preact/hooks";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { FILLED_NONOGRAM_CELL } from "../games/nonogram/solve";
import { isGridAnswerCompleteAndCorrect } from "../interactions/gridChecking";
import { getGridInputMode, isSelectedGridCell, type GridCellSelection } from "../interactions/gridRules";
import { BoardViewport } from "./BoardViewport";
import { NumericGridDigitPad, useNumericGridInput } from "./NumericGridInput";

const SUDOKU_BOX_SIZE = 3;

const sameSudokuBox = (left: PuzzleCell, right: PuzzleCell) =>
  Math.floor(left.row / SUDOKU_BOX_SIZE) === Math.floor(right.row / SUDOKU_BOX_SIZE) &&
  Math.floor(left.column / SUDOKU_BOX_SIZE) === Math.floor(right.column / SUDOKU_BOX_SIZE);

const sameSudokuDiagonal = (left: PuzzleCell, right: PuzzleCell, size: number) =>
  (left.row === left.column && right.row === right.column) ||
  (left.row + left.column === size - 1 && right.row + right.column === size - 1);

const isSudokuMainDiagonalCell = (cell: PuzzleCell, size: number) => cell.row === cell.column || cell.row + cell.column === size - 1;
const gridCellKey = (row: number, column: number) => `${row}-${column}`;

export type KillerCageDecoration = {
  cageNumber: number;
  sum: number;
  cellPosition: number;
  cellCount: number;
  isClueCell: boolean;
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
};

export const shouldCelebrateSudokuCompletion = (
  previousIdentity: string,
  previousSolved: boolean,
  currentIdentity: string,
  currentSolved: boolean,
) => previousIdentity === currentIdentity && !previousSolved && currentSolved;

export const makeKillerCageDecorations = (puzzle: GridGeneratedPuzzle) => {
  const decorations = new Map<string, KillerCageDecoration>();

  for (const [cageIndex, cage] of (puzzle.cages ?? []).entries()) {
    const orderedCells = [...cage.cells].sort((left, right) => left.row - right.row || left.column - right.column);
    const cageCellKeys = new Set(orderedCells.map((cell) => gridCellKey(cell.row, cell.column)));
    const clueCell = orderedCells[0];
    const clueKey = clueCell ? gridCellKey(clueCell.row, clueCell.column) : "";

    for (const [cellIndex, cell] of orderedCells.entries()) {
      decorations.set(gridCellKey(cell.row, cell.column), {
        cageNumber: cageIndex + 1,
        sum: cage.sum,
        cellPosition: cellIndex + 1,
        cellCount: orderedCells.length,
        isClueCell: gridCellKey(cell.row, cell.column) === clueKey,
        top: !cageCellKeys.has(gridCellKey(cell.row - 1, cell.column)),
        right: !cageCellKeys.has(gridCellKey(cell.row, cell.column + 1)),
        bottom: !cageCellKeys.has(gridCellKey(cell.row + 1, cell.column)),
        left: !cageCellKeys.has(gridCellKey(cell.row, cell.column - 1)),
      });
    }
  }

  return decorations;
};

export const getGridCellAriaLabel = (cell: PuzzleCell, killerCage?: KillerCageDecoration) => {
  const baseLabel = cell.ariaLabel ?? `Cell at row ${cell.row + 1}, column ${cell.column + 1}`;
  return killerCage
    ? `${baseLabel}. Killer cage ${killerCage.cageNumber}, sum ${killerCage.sum}, cell ${killerCage.cellPosition} of ${killerCage.cellCount}.`
    : baseLabel;
};

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

type GridPuzzlePreviewProps = {
  puzzle: GridGeneratedPuzzle;
  cells: PuzzleCell[];
  selectedGridCell: GridCellSelection | null;
  onCellClick: (cell: PuzzleCell) => void;
  onCellInput: (cell: PuzzleCell, value: string) => void;
};

type SudokuCompletionBaseline = {
  identity: string;
  solved: boolean;
};

type SudokuCompletionEvent = {
  identity: string;
  sequence: number;
};

export const GridPuzzlePreview = ({ puzzle, cells, selectedGridCell, onCellClick, onCellInput }: GridPuzzlePreviewProps) => {
  const inputMode = getGridInputMode(puzzle.puzzleId);
  const isSudoku = puzzle.puzzleId === "sudoku";
  const isSudokuSolved = isSudoku && isGridAnswerCompleteAndCorrect(puzzle, cells);
  const isNumericGridPuzzle = inputMode === "numeric";
  const isDiagonalSudoku = isSudoku && puzzle.sudokuVariation === "diagonal";
  const isZeroKillerSudoku = isSudoku && puzzle.sudokuVariation === "zero-killer";
  const isNonogram = puzzle.puzzleId === "nonogram";
  const puzzleIdentity = `${puzzle.puzzleId}:${puzzle.seed}:${puzzle.sudokuVariation ?? ""}:${puzzle.width}:${puzzle.height}`;
  const sudokuCompletionBaseline = useRef<SudokuCompletionBaseline>({ identity: puzzleIdentity, solved: isSudokuSolved });
  const [sudokuCompletionEvent, setSudokuCompletionEvent] = useState<SudokuCompletionEvent | null>(null);

  useEffect(() => {
    const previous = sudokuCompletionBaseline.current;
    const puzzleChanged = previous.identity !== puzzleIdentity;

    if (!isSudoku || puzzleChanged || !isSudokuSolved) {
      setSudokuCompletionEvent(null);
    } else if (shouldCelebrateSudokuCompletion(previous.identity, previous.solved, puzzleIdentity, isSudokuSolved)) {
      setSudokuCompletionEvent((current) => ({
        identity: puzzleIdentity,
        sequence: (current?.sequence ?? 0) + 1,
      }));
    }

    sudokuCompletionBaseline.current = { identity: puzzleIdentity, solved: isSudokuSolved };
  }, [isSudoku, isSudokuSolved, puzzleIdentity]);

  const showSudokuCompletionEffect = Boolean(
    isSudokuSolved &&
      sudokuCompletionBaseline.current.identity === puzzleIdentity &&
      sudokuCompletionEvent?.identity === puzzleIdentity,
  );
  const numericInput = useNumericGridInput({
    enabled: isNumericGridPuzzle && !isSudokuSolved,
    puzzleIdentity,
    digitCount: puzzle.width,
    cells,
    selectedGridCell: isSudokuSolved ? null : selectedGridCell,
    onCellClick,
    onCellInput,
  });
  const selectedCell = numericInput.selectedCell;
  const activeNumericValue = isSudokuSolved ? null : numericInput.activeValue;
  const killerCageDecorations = isZeroKillerSudoku ? makeKillerCageDecorations(puzzle) : new Map<string, KillerCageDecoration>();
  const hasSudokuValidation = Boolean(isSudoku && cells.some((cell) => !cell.locked && (cell.tone === "answer" || cell.tone === "hint")));
  const gridTemplateColumns = `repeat(${puzzle.width}, minmax(0, 1fr))`;
  const sudokuVariantRuleId = isDiagonalSudoku || isZeroKillerSudoku ? "sudoku-variant-rule" : undefined;

  const digitPad = isNumericGridPuzzle && !isSudokuSolved ? (
    <NumericGridDigitPad
      title={puzzle.title}
      digits={numericInput.digits}
      activeValue={numericInput.activeValue}
      canClearSelectedCell={numericInput.canClearSelectedCell}
      onDigit={numericInput.setSelectedValue}
      onClear={numericInput.clearSelectedValue}
    />
  ) : null;

  const grid = (
    <div
      aria-describedby={sudokuVariantRuleId}
      aria-label={isSudoku ? `${puzzle.difficulty ?? "Medium"} ${puzzle.title} board${isSudokuSolved ? ", solved" : ""}` : isNonogram ? `${puzzle.width} by ${puzzle.height} Nonogram board` : undefined}
      class={`grid ${puzzle.puzzleId} ${isDiagonalSudoku ? "diagonal-sudoku" : ""} ${isZeroKillerSudoku ? "zero-killer-sudoku" : ""} ${showSudokuCompletionEffect ? "solved-grid" : ""}`}
      data-completion-event={showSudokuCompletionEffect ? sudokuCompletionEvent?.sequence : undefined}
      data-grid-selection-scope={isNumericGridPuzzle && !isSudokuSolved ? "true" : undefined}
      style={{ gridTemplateColumns }}
    >
      {cells.map((cell) => {
        const killerCage = killerCageDecorations.get(gridCellKey(cell.row, cell.column));
        const isSelectable = !isSudokuSolved && cell.tone !== "disabled" && (isNumericGridPuzzle || puzzle.puzzleId === "peg-solitaire" || !cell.locked);
        const isEditable = !isSudokuSolved && cell.tone !== "disabled" && (puzzle.puzzleId === "peg-solitaire" || !cell.locked);
        const isSelected = !isSudokuSolved && isSelectedGridCell(selectedGridCell, cell);
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
          killerCage ? "killer-cage-cell" : "",
          killerCage?.top ? "killer-cage-top" : "",
          killerCage?.right ? "killer-cage-right" : "",
          killerCage?.bottom ? "killer-cage-bottom" : "",
          killerCage?.left ? "killer-cage-left" : "",
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
            aria-label={getGridCellAriaLabel(cell, killerCage)}
            aria-pressed={isNonogram ? cell.value === FILLED_NONOGRAM_CELL : isSelected}
            class={cellClass}
            data-grid-cell-column={isNumericGridPuzzle ? cell.column : undefined}
            data-grid-cell-row={isNumericGridPuzzle ? cell.row : undefined}
            disabled={!isSelectable}
            key={`${cell.row}-${cell.column}`}
            onClick={() => onCellClick(cell)}
            type="button"
          >
            {isNonogram ? "" : isSudoku ? (
              <>
                {killerCage?.isClueCell ? <span aria-hidden="true" class="killer-cage-sum">{killerCage.sum}</span> : null}
                <span
                  class={`sudoku-cell-value ${cell.locked ? "sudoku-given-value" : "sudoku-player-value"}`}
                  style={{
                    color: cell.locked ? "#f8fafc" : "#cbd5e1",
                    fontWeight: cell.locked ? 900 : 600,
                  }}
                >
                  {cell.value}
                </span>
              </>
            ) : (
              cell.value
            )}
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
      <BoardViewport kind="square-grid" columns={puzzle.width} rows={puzzle.height}>
        {grid}
        {digitPad}
        {isDiagonalSudoku ? (
          <p class="sudoku-variant-rule" id={sudokuVariantRuleId}>Diagonal rule: both main diagonals also contain 1-9.</p>
        ) : isZeroKillerSudoku ? (
          <p class="sudoku-variant-rule" id={sudokuVariantRuleId}>Zero Killer rule: digits in each cage add to its displayed sum and may not repeat within that cage. Uncaged cells follow normal Sudoku rules.</p>
        ) : null}
      </BoardViewport>
    );
  }

  return grid;
};
