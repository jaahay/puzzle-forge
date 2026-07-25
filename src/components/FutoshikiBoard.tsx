import type { GridGeneratedPuzzle, GridPuzzleInequality, PuzzleCell } from "../catalog/types";
import { isSelectedGridCell, type GridCellSelection } from "../interactions/gridRules";
import { BoardViewport } from "./BoardViewport";

type FutoshikiBoardProps = {
  puzzle: GridGeneratedPuzzle;
  cells: PuzzleCell[];
  selectedGridCell: GridCellSelection | null;
  onCellClick: (cell: PuzzleCell) => void;
  onCellInput: (cell: PuzzleCell, value: string) => void;
};

const cellKey = (row: number, column: number) => `${row}-${column}`;

const getInequalityPresentation = (inequality: GridPuzzleInequality) => {
  const { lesser, greater } = inequality;
  if (lesser.row === greater.row) {
    const leftIsLesser = lesser.column < greater.column;
    return {
      key: `${cellKey(lesser.row, lesser.column)}-${cellKey(greater.row, greater.column)}`,
      row: lesser.row * 2 + 1,
      column: Math.min(lesser.column, greater.column) * 2 + 2,
      symbol: leftIsLesser ? "<" : ">",
      label: `Row ${lesser.row + 1}, column ${lesser.column + 1} is less than row ${greater.row + 1}, column ${greater.column + 1}`,
    };
  }

  const topIsLesser = lesser.row < greater.row;
  return {
    key: `${cellKey(lesser.row, lesser.column)}-${cellKey(greater.row, greater.column)}`,
    row: Math.min(lesser.row, greater.row) * 2 + 2,
    column: lesser.column * 2 + 1,
    symbol: topIsLesser ? "∧" : "∨",
    label: `Row ${lesser.row + 1}, column ${lesser.column + 1} is less than row ${greater.row + 1}, column ${greater.column + 1}`,
  };
};

export const FutoshikiBoard = ({ puzzle, cells, selectedGridCell, onCellClick, onCellInput }: FutoshikiBoardProps) => {
  const selectedCell = selectedGridCell
    ? cells.find((cell) => cell.row === selectedGridCell.row && cell.column === selectedGridCell.column)
    : undefined;
  const digits = Array.from({ length: puzzle.width }, (_, index) => String(index + 1));
  const activeValue = selectedCell?.value ?? "";
  const gridSize = puzzle.width * 2 - 1;
  const trackTemplate = Array.from({ length: gridSize }, (_, index) => index % 2 === 0 ? "minmax(0, 1fr)" : "clamp(1rem, 4vw, 1.5rem)").join(" ");

  const setSelectedValue = (value: string) => {
    if (!selectedCell || selectedCell.locked) return;
    onCellInput(selectedCell, selectedCell.value === value ? "" : value);
  };

  return (
    <BoardViewport kind="sudoku" columns={puzzle.width} rows={puzzle.height}>
      <div
        aria-label={`${puzzle.width} by ${puzzle.height} Futoshiki board`}
        class="grid futoshiki-board"
        data-grid-selection-scope="true"
        style={{
          display: "grid",
          gridTemplateColumns: trackTemplate,
          gridTemplateRows: trackTemplate,
          alignItems: "center",
          justifyItems: "center",
          gap: 0,
          width: "100%",
          aspectRatio: "1 / 1",
        }}
      >
        {cells.map((cell) => {
          const selected = isSelectedGridCell(selectedGridCell, cell);
          return (
            <button
              aria-label={cell.ariaLabel}
              aria-pressed={selected}
              class={`cell ${cell.tone} interactive-cell ${selected ? "selected-grid-cell" : ""}`}
              key={cellKey(cell.row, cell.column)}
              onClick={() => onCellClick(cell)}
              style={{
                gridRow: cell.row * 2 + 1,
                gridColumn: cell.column * 2 + 1,
                width: "100%",
                height: "100%",
                minWidth: 0,
                minHeight: 0,
              }}
              type="button"
            >
              {cell.value}
            </button>
          );
        })}
        {(puzzle.inequalities ?? []).map((inequality) => {
          const presentation = getInequalityPresentation(inequality);
          return (
            <span
              aria-label={presentation.label}
              key={presentation.key}
              role="img"
              style={{
                gridRow: presentation.row,
                gridColumn: presentation.column,
                fontSize: "clamp(0.8rem, 4vw, 1.35rem)",
                fontWeight: 800,
                lineHeight: 1,
                pointerEvents: "none",
              }}
            >
              {presentation.symbol}
            </span>
          );
        })}
      </div>
      <div class="sudoku-digit-pad" aria-label="Futoshiki digit pad" data-grid-selection-scope="true">
        {digits.map((digit) => (
          <button
            class={activeValue === digit ? "selected-sudoku-digit" : ""}
            key={digit}
            type="button"
            aria-pressed={activeValue === digit}
            onClick={() => setSelectedValue(digit)}
          >
            {digit}
          </button>
        ))}
        <button
          class="sudoku-erase-button"
          type="button"
          onClick={() => selectedCell && !selectedCell.locked && onCellInput(selectedCell, "")}
          disabled={!selectedCell || selectedCell.locked || !selectedCell.value}
          aria-label="Erase selected Futoshiki cell"
        >
          Erase
        </button>
      </div>
      <p class="sudoku-variant-rule">Use each digit once per row and column. The narrow side of each inequality points to the smaller number.</p>
    </BoardViewport>
  );
};
