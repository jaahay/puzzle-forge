import type { GridPuzzleClues, PuzzleCell } from "../../catalog/types";

export const FILLED_NONOGRAM_CELL = "\u25a0";

type CountSolutionsOptions = {
  width: number;
  height: number;
  clues: Required<GridPuzzleClues>;
  maxSolutions?: number;
  maxSearchNodes?: number;
};

export const summarizeNonogramRuns = (values: boolean[]) => {
  const runs: number[] = [];
  let currentRun = 0;

  for (const value of values) {
    if (value) {
      currentRun += 1;
    } else if (currentRun > 0) {
      runs.push(currentRun);
      currentRun = 0;
    }
  }

  if (currentRun > 0) {
    runs.push(currentRun);
  }

  return runs;
};

export const sameNonogramClue = (left: number[], right: number[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export const buildNonogramCluesFromSolution = (solution: boolean[], width: number, height: number): Required<GridPuzzleClues> => ({
  rows: Array.from({ length: height }, (_, row) => summarizeNonogramRuns(solution.slice(row * width, row * width + width))),
  columns: Array.from({ length: width }, (_, column) =>
    summarizeNonogramRuns(Array.from({ length: height }, (_, row) => solution[row * width + column] ?? false)),
  ),
});

export const buildNonogramCluesFromCells = (cells: PuzzleCell[], width: number, height: number): Required<GridPuzzleClues> =>
  buildNonogramCluesFromSolution(
    Array.from({ length: width * height }, (_, index) => cells[index]?.value === FILLED_NONOGRAM_CELL),
    width,
    height,
  );

const enumerateLinePatterns = (length: number, clues: number[]) => {
  if (clues.length === 0) {
    return [Array.from({ length }, () => false)];
  }

  const patterns: boolean[][] = [];

  const placeRun = (runIndex: number, cursor: number, line: boolean[]) => {
    if (runIndex >= clues.length) {
      patterns.push(line);
      return;
    }

    const runLength = clues[runIndex] ?? 0;
    const remainingRuns = clues.slice(runIndex + 1);
    const minimumRemainingLength = remainingRuns.reduce((total, run) => total + run, 0) + remainingRuns.length;
    const maxStart = length - runLength - minimumRemainingLength;

    for (let start = cursor; start <= maxStart; start += 1) {
      const nextLine = [...line];

      for (let index = start; index < start + runLength; index += 1) {
        nextLine[index] = true;
      }

      placeRun(runIndex + 1, start + runLength + 1, nextLine);
    }
  };

  placeRun(0, 0, Array.from({ length }, () => false));

  return patterns;
};

export const countNonogramSolutions = ({
  width,
  height,
  clues,
  maxSolutions = 2,
  maxSearchNodes = 30000,
}: CountSolutionsOptions) => {
  const rowPatterns = clues.rows.map((rowClues) => enumerateLinePatterns(width, rowClues));
  const columnPatterns = clues.columns.map((columnClues) => enumerateLinePatterns(height, columnClues));
  const initialColumnCandidates = columnPatterns.map((patterns) => patterns.map((_, index) => index));
  let solutionCount = 0;
  let visitedNodes = 0;

  const search = (row: number, columnCandidates: number[][]) => {
    if (solutionCount >= maxSolutions || visitedNodes >= maxSearchNodes) {
      return;
    }

    visitedNodes += 1;

    if (row >= height) {
      solutionCount += 1;
      return;
    }

    for (const rowPattern of rowPatterns[row] ?? []) {
      const nextColumnCandidates: number[][] = [];
      let rowCanFit = true;

      for (let column = 0; column < width; column += 1) {
        const filteredCandidates = (columnCandidates[column] ?? []).filter(
          (patternIndex) => columnPatterns[column]?.[patternIndex]?.[row] === rowPattern[column],
        );

        if (filteredCandidates.length === 0) {
          rowCanFit = false;
          break;
        }

        nextColumnCandidates[column] = filteredCandidates;
      }

      if (rowCanFit) {
        search(row + 1, nextColumnCandidates);
      }
    }
  };

  search(0, initialColumnCandidates);

  return visitedNodes >= maxSearchNodes && solutionCount < maxSolutions ? maxSolutions : solutionCount;
};

export const hasUniqueNonogramSolution = (options: Omit<CountSolutionsOptions, "maxSolutions">) =>
  countNonogramSolutions({ ...options, maxSolutions: 2 }) === 1;
