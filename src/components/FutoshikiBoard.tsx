import type { GridGeneratedPuzzle, GridPuzzleInequality, PuzzleCell } from "../catalog/types";
import { isSelectedGridCell, type GridCellSelection } from "../interactions/gridRules";
import { BoardViewport } from "./BoardViewport";
import { NumericGridDigitPad, useNumericGridInput } from "./NumericGridInput";

type FutoshikiBoardProps = {
  puzzle: GridGeneratedPuzzle;
  cells: PuzzleCell[];
  selectedGridCell: GridCellSelection | null;
  onCellClick: (cell: PuzzleCell) => void;
  onCellInput: (cell: PuzzleCell, value: string) => void;
};

type Coordinate = GridPuzzleInequality["lesser"];
type Direction = "above" | "below" | "left" | "right";
type InequalityPresentation = {
  key: string;
  slotRow: number;
  slotColumn: number;
  rotation: "right" | "down" | "left" | "up";
};

const cellKey = (row: number, column: number) => `${row}-${column}`;
const sameCoordinate = (left: Coordinate, right: Coordinate) => left.row === right.row && left.column === right.column;

const describeRelativePosition = (origin: Coordinate, target: Coordinate): Direction => {
  if (target.row < origin.row) return "above";
  if (target.row > origin.row) return "below";
  if (target.column < origin.column) return "left";
  return "right";
};

export const getFutoshikiCellConstraintLabels = (cell: PuzzleCell, inequalities: GridPuzzleInequality[]) =>
  inequalities.flatMap((inequality) => {
    if (sameCoordinate(cell, inequality.lesser)) {
      return [`Less than the cell ${describeRelativePosition(inequality.lesser, inequality.greater)}`];
    }

    if (sameCoordinate(cell, inequality.greater)) {
      return [`Greater than the cell ${describeRelativePosition(inequality.greater, inequality.lesser)}`];
    }

    return [];
  });

export const getFutoshikiCellAriaLabel = (cell: PuzzleCell, inequalities: GridPuzzleInequality[]) => {
  const baseLabel = cell.ariaLabel ?? `Cell at row ${cell.row + 1}, column ${cell.column + 1}`;
  const constraintLabels = getFutoshikiCellConstraintLabels(cell, inequalities);
  return constraintLabels.length > 0 ? `${baseLabel}. ${constraintLabels.join(". ")}.` : baseLabel;
};

export const getFutoshikiInequalityPresentation = (inequality: GridPuzzleInequality): InequalityPresentation => {
  const { lesser, greater } = inequality;

  if (lesser.row === greater.row) {
    const lesserIsLeft = lesser.column < greater.column;
    return {
      key: `${cellKey(lesser.row, lesser.column)}-${cellKey(greater.row, greater.column)}`,
      slotRow: lesser.row * 2,
      slotColumn: Math.min(lesser.column, greater.column) * 2 + 1,
      rotation: lesserIsLeft ? "left" : "right",
    };
  }

  const lesserIsAbove = lesser.row < greater.row;
  return {
    key: `${cellKey(lesser.row, lesser.column)}-${cellKey(greater.row, greater.column)}`,
    slotRow: Math.min(lesser.row, greater.row) * 2 + 1,
    slotColumn: lesser.column * 2,
    rotation: lesserIsAbove ? "up" : "down",
  };
};

export const FutoshikiBoard = ({ puzzle, cells, selectedGridCell, onCellClick, onCellInput }: FutoshikiBoardProps) => {
  const inequalities = puzzle.inequalities ?? [];
  const input = useNumericGridInput({
    enabled: true,
    puzzleIdentity: `${puzzle.puzzleId}:${puzzle.seed}:${puzzle.width}:${puzzle.height}`,
    digitCount: puzzle.width,
    cells,
    selectedGridCell,
    onCellClick,
    onCellInput,
  });
  const cellBySlot = new Map(cells.map((cell) => [cellKey(cell.row * 2, cell.column * 2), cell]));
  const inequalityBySlot = new Map(
    inequalities.map((inequality) => {
      const presentation = getFutoshikiInequalityPresentation(inequality);
      return [cellKey(presentation.slotRow, presentation.slotColumn), presentation] as const;
    }),
  );
  const slotCount = puzzle.width * 2 - 1;
  const slots = Array.from({ length: slotCount * slotCount }, (_, index) => ({
    row: Math.floor(index / slotCount),
    column: index % slotCount,
  }));
  const hasValidation = cells.some((cell) => !cell.locked && (cell.tone === "answer" || cell.tone === "hint"));

  return (
    <BoardViewport kind="sudoku" columns={puzzle.width} rows={puzzle.height}>
      <div
        aria-describedby="futoshiki-rule"
        aria-label={`${puzzle.width} by ${puzzle.height} Futoshiki board`}
        class="futoshiki-board"
        data-grid-selection-scope="true"
      >
        {slots.map(({ row, column }) => {
          const key = cellKey(row, column);
          const cell = cellBySlot.get(key);

          if (cell) {
            const selected = isSelectedGridCell(selectedGridCell, cell);
            const isPeer = Boolean(input.selectedCell && !selected && (cell.row === input.selectedCell.row || cell.column === input.selectedCell.column));
            const isSameValue = Boolean(input.activeValue && cell.value === input.activeValue && !selected);
            const cellClass = [
              "cell",
              cell.tone,
              "interactive-cell",
              selected ? "selected-grid-cell" : "",
              isPeer ? "peer-cell" : "",
              isSameValue ? "same-value-cell" : "",
              hasValidation && !cell.locked && cell.tone === "answer" ? "correct-cell" : "",
              hasValidation && !cell.locked && cell.tone === "hint" ? "incorrect-cell" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                aria-label={getFutoshikiCellAriaLabel(cell, inequalities)}
                aria-pressed={selected}
                class={cellClass}
                key={key}
                onClick={() => onCellClick(cell)}
                type="button"
              >
                {cell.value}
              </button>
            );
          }

          const inequality = inequalityBySlot.get(key);
          return inequality ? (
            <span aria-hidden="true" class={`futoshiki-inequality ${inequality.rotation}`} key={inequality.key}>
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M7 4l10 8L7 20" />
              </svg>
            </span>
          ) : (
            <span aria-hidden="true" class="futoshiki-spacer" key={key} />
          );
        })}
      </div>
      <NumericGridDigitPad
        title={puzzle.title}
        digits={input.digits}
        activeValue={input.activeValue}
        canClearSelectedCell={input.canClearSelectedCell}
        onDigit={input.setSelectedValue}
        onClear={input.clearSelectedValue}
      />
      <p class="sudoku-variant-rule" id="futoshiki-rule">
        Use each digit once per row and column. The narrow side of each inequality points to the smaller number.
      </p>
    </BoardViewport>
  );
};
