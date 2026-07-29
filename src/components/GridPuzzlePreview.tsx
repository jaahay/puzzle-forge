import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { FILLED_NONOGRAM_CELL } from "../games/nonogram/solve";
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

export const GridPuzzlePreview = ({ puzzle, cells, selectedGridCell, onCellClick, onCellInput }: GridPuzzlePreviewProps) => {
  const inputMode = getGridInputMode(puzzle.puzzleId);
  const isSudoku = puzzle.puzzleId === "sudoku";
  const isNumericGridPuzzle = inputMode === "numeric";
  const isDiagonalSudoku = isSudoku && puzzle.sudokuVariation === "diagonal";
  const isZeroKillerSudoku = isSudoku && puzzle.sudokuVariation === "zero-killer";
  const isNonogram = puzzle.puzzleId === "nonogram";
  const numericInput = useNumericGridInput({
    enabled: isNumericGridPuzzle,
    puzzleIdentity: `${puzzle.puzzleId}:${puzzle.seed}:${puzzle.sudokuVariation ?? ""}:${puzzle.width}:${puzzle.height}`,
    digitCount: puzzle.width,
    cells,
    selectedGridCell,
    onCellClick,
    onCellInput,
  });
  const selectedCell = numericInput.selectedCell;
  const killerCageDecorations = isZeroKillerSudoku ? makeKillerCageDecorations(puzzle) : new Map<string, KillerCageDecoration>();
  const hasSudokuValidation = Boolean(isSudoku && cells.some((cell) => !cell.locked && (cell.tone === "answer" || cell.tone === "hint")));
  const gridTemplateColumns = `repeat(${puzzle.width}, minmax(0, 1fr))`;
  const sudokuVariantRuleId = isDiagonalSudoku || isZeroKillerSudoku ? "sudoku-variant-rule" : undefined;

  const digitPad = isNumericGridPuzzle ? (
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
      aria-label={isSudoku ? `${puzzle.difficulty ?? "Medium"} ${puzzle.title} board` : isNonogram ? `${puzzle.width} by ${puzzle.height} Nonogram board` : undefined}
      class={`grid ${puzzle.puzzleId} ${isDiagonalSudoku ? "diagonal-sudoku" : ""} ${isZeroKillerSudoku ? "zero-killer-sudoku" : ""}`}
      data-grid-selection-scope={isNumericGridPuzzle ? "true" : undefined}
      style={{ gridTemplateColumns }}
    >
      {cells.map((cell) => {
        const killerCage = killerCageDecorations.get(gridCellKey(cell.row, cell.column));
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
        const isSameValue = Boolean(isNumericGridPuzzle && numericInput.activeValue && cell.value === numericInput.activeValue && !isSelected);
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
            disabled={!isSelectable}
            key={`${cell.row}-${cell.column}`}
            onClick={() => onCellClick(cell)}
            type="button"
          >
            {isNonogram ? "" : isSudoku ? (
              <>
                {killerCage?.isClueCell ? <span aria-hidden="true" class="killer-cage-sum">{killerCage.sum}</span> : null}
                <span class="sudoku-cell-value">{cell.value}</span>
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
