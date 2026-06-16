import type { GridGeneratedPuzzle, PuzzleCell, PuzzleId } from "../catalog/types";

export type GridCellSelection = {
  row: number;
  column: number;
};

export type GridInputMode = "none" | "numeric" | "word";

const numberCharacters = "123456789";
const letterCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const cloneGridCell = (cell: PuzzleCell): PuzzleCell => ({ ...cell });

export const getGridInputMode = (puzzleId: PuzzleId): GridInputMode => {
  if (puzzleId === "sudoku" || puzzleId === "logic-grid") {
    return "numeric";
  }

  if (puzzleId === "word-guess") {
    return "word";
  }

  return "none";
};

const takeLastAllowedCharacter = (value: string, allowedCharacters: string) => {
  const characters = Array.from(value.toUpperCase()).filter((character) => allowedCharacters.includes(character));
  return characters[characters.length - 1] ?? "";
};

export const normalizeCellInput = (mode: GridInputMode, rawValue: string) => {
  if (mode === "numeric") {
    return takeLastAllowedCharacter(rawValue, numberCharacters);
  }

  if (mode === "word") {
    return takeLastAllowedCharacter(rawValue, letterCharacters);
  }

  return rawValue;
};

export const isSelectedGridCell = (selection: GridCellSelection | null, cell: PuzzleCell) =>
  selection?.row === cell.row && selection.column === cell.column;

export const getCellIndex = (cells: PuzzleCell[], cell: GridCellSelection) =>
  cells.findIndex((candidate) => candidate.row === cell.row && candidate.column === cell.column);

export const getGridCell = (cells: PuzzleCell[], cell: GridCellSelection) => {
  const index = getCellIndex(cells, cell);
  return index >= 0 ? cells[index] : undefined;
};

export const prepareGridCells = (puzzle: GridGeneratedPuzzle): PuzzleCell[] =>
  puzzle.cells.map((cell) => {
    if (puzzle.puzzleId === "nonogram") {
      return {
        ...cell,
        value: "",
        locked: false,
        tone: "empty",
        ariaLabel: `Playable nonogram cell at row ${cell.row + 1}, column ${cell.column + 1}`,
      };
    }

    if (!cell.locked && (puzzle.puzzleId === "sudoku" || puzzle.puzzleId === "logic-grid")) {
      return {
        ...cell,
        value: "",
        tone: "empty",
        ariaLabel: `Editable ${puzzle.title} cell at row ${cell.row + 1}, column ${cell.column + 1}`,
      };
    }

    if (puzzle.puzzleId === "word-guess") {
      return {
        ...cell,
        value: "",
        locked: false,
        tone: "empty",
        ariaLabel: `Word Guess cell at row ${cell.row + 1}, column ${cell.column + 1}`,
      };
    }

    return cloneGridCell(cell);
  });
