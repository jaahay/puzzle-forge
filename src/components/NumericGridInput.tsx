import { useEffect, useMemo, useState } from "preact/hooks";
import type { PuzzleCell } from "../catalog/types";
import type { GridCellSelection } from "../interactions/gridRules";

const gridSelectionScopeSelector = '[data-grid-selection-scope="true"]';

const isTextEditingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT");

export const getNumericGridDigits = (digitCount: number) =>
  Array.from({ length: Math.max(0, Math.floor(digitCount)) }, (_, index) => String(index + 1));

export const isNumericGridClearKey = (key: string) => key === "Backspace" || key === "Delete" || key === "0";

export const getNumericGridArrowDelta = (key: string) => {
  switch (key) {
    case "ArrowUp":
      return { row: -1, column: 0 };
    case "ArrowRight":
      return { row: 0, column: 1 };
    case "ArrowDown":
      return { row: 1, column: 0 };
    case "ArrowLeft":
      return { row: 0, column: -1 };
    default:
      return null;
  }
};

type UseNumericGridInputProps = {
  enabled: boolean;
  puzzleIdentity: string;
  digitCount: number;
  cells: PuzzleCell[];
  selectedGridCell: GridCellSelection | null;
  onCellClick: (cell: PuzzleCell) => void;
  onCellInput: (cell: PuzzleCell, value: string) => void;
};

export const useNumericGridInput = ({
  enabled,
  puzzleIdentity,
  digitCount,
  cells,
  selectedGridCell,
  onCellClick,
  onCellInput,
}: UseNumericGridInputProps) => {
  const digits = useMemo(() => getNumericGridDigits(digitCount), [digitCount]);
  const [highlightedDigit, setHighlightedDigit] = useState("");
  const selectedCell = selectedGridCell
    ? cells.find((cell) => cell.row === selectedGridCell.row && cell.column === selectedGridCell.column)
    : undefined;
  const activeValue = selectedCell?.value || highlightedDigit;
  const canClearSelectedCell = Boolean(enabled && selectedCell && !selectedCell.locked && selectedCell.value);

  const setSelectedValue = (value: string) => {
    if (!enabled || !digits.includes(value)) {
      return;
    }

    if (selectedCell && !selectedCell.locked) {
      const nextValue = selectedCell.value === value ? "" : value;
      setHighlightedDigit("");
      onCellInput(selectedCell, nextValue);
      return;
    }

    setHighlightedDigit((currentDigit) => (currentDigit === value ? "" : value));
  };

  const clearSelectedValue = () => {
    setHighlightedDigit("");

    if (enabled && selectedCell && !selectedCell.locked) {
      onCellInput(selectedCell, "");
    }
  };

  useEffect(() => {
    setHighlightedDigit("");
  }, [puzzleIdentity]);

  useEffect(() => {
    if (!enabled || !selectedCell || typeof document === "undefined") {
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
  }, [enabled, onCellClick, selectedCell]);

  useEffect(() => {
    if (!enabled || !selectedCell || typeof document === "undefined") {
      return;
    }

    const handleNumericKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTextEditingTarget(event.target)) {
        return;
      }

      const arrowDelta = getNumericGridArrowDelta(event.key);

      if (arrowDelta) {
        const nextCell = cells.find(
          (cell) =>
            cell.row === selectedCell.row + arrowDelta.row &&
            cell.column === selectedCell.column + arrowDelta.column &&
            cell.tone !== "disabled",
        );

        if (!nextCell) {
          return;
        }

        event.preventDefault();
        onCellClick(nextCell);
        requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>(
              `${gridSelectionScopeSelector} [data-grid-cell-row="${nextCell.row}"][data-grid-cell-column="${nextCell.column}"]`,
            )
            ?.focus();
        });
        return;
      }

      if (digits.includes(event.key)) {
        event.preventDefault();
        setSelectedValue(event.key);
        return;
      }

      if (isNumericGridClearKey(event.key)) {
        event.preventDefault();
        clearSelectedValue();
      }
    };

    document.addEventListener("keydown", handleNumericKeyDown);

    return () => {
      document.removeEventListener("keydown", handleNumericKeyDown);
    };
  }, [cells, digits, enabled, onCellClick, onCellInput, selectedCell]);

  return {
    digits,
    selectedCell,
    activeValue,
    canClearSelectedCell,
    setSelectedValue,
    clearSelectedValue,
  };
};

type NumericGridDigitPadProps = {
  title: string;
  digits: string[];
  activeValue: string;
  canClearSelectedCell: boolean;
  onDigit: (digit: string) => void;
  onClear: () => void;
};

export const NumericGridDigitPad = ({
  title,
  digits,
  activeValue,
  canClearSelectedCell,
  onDigit,
  onClear,
}: NumericGridDigitPadProps) => (
  <div class="sudoku-digit-pad" aria-label={`${title} digit pad`} data-grid-selection-scope="true">
    {digits.map((digit) => (
      <button
        class={activeValue === digit ? "selected-sudoku-digit" : ""}
        key={digit}
        type="button"
        aria-pressed={activeValue === digit}
        onClick={() => onDigit(digit)}
      >
        {digit}
      </button>
    ))}
    <button
      class="sudoku-erase-button"
      type="button"
      onClick={onClear}
      disabled={!canClearSelectedCell}
      aria-label={`Erase selected ${title} cell`}
    >
      Erase
    </button>
  </div>
);
