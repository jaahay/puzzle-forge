import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { getGridInputMode, isSelectedGridCell, type GridCellSelection } from "../interactions/gridRules";

type GridPuzzlePreviewProps = {
  puzzle: GridGeneratedPuzzle;
  cells: PuzzleCell[];
  selectedGridCell: GridCellSelection | null;
  onCellClick: (cell: PuzzleCell) => void;
  onCellInput: (cell: PuzzleCell, value: string) => void;
};

export const GridPuzzlePreview = ({ puzzle, cells, selectedGridCell, onCellClick, onCellInput }: GridPuzzlePreviewProps) => {
  const inputMode = getGridInputMode(puzzle.puzzleId);

  return (
    <div
      class={`grid ${puzzle.puzzleId}`}
      style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))` }}
    >
      {cells.map((cell) => {
        const isInteractive = cell.tone !== "disabled" && (puzzle.puzzleId === "peg-solitaire" || !cell.locked);
        const cellClass = `cell ${cell.tone} ${isInteractive ? "interactive-cell" : ""} ${isSelectedGridCell(selectedGridCell, cell) ? "selected-grid-cell" : ""}`;

        if (inputMode !== "none") {
          return (
            <input
              aria-label={cell.ariaLabel}
              class={`cell-input ${cellClass}`}
              disabled={!isInteractive}
              inputMode={inputMode === "numeric" ? "numeric" : "text"}
              key={`${cell.row}-${cell.column}`}
              maxLength={1}
              onInput={(event) => onCellInput(cell, event.currentTarget.value)}
              value={cell.value}
            />
          );
        }

        return (
          <button
            aria-label={cell.ariaLabel}
            aria-pressed={isSelectedGridCell(selectedGridCell, cell)}
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
  );
};
