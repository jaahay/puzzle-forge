import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { pluralize } from "../app/runtime";
import { scoreWordGuess, wordGuessMarkToTone } from "../games/wordGuess/feedback";
import { buildNonogramCluesFromCells, isNonogramLineFeasible, sameNonogramClue, FILLED_NONOGRAM_CELL } from "../games/nonogram/solve";
import { getWordGuessBank, isValidWordGuess } from "../games/wordGuess/words";
import { cloneGridCell } from "./gridRules";

export type GridCheckFeedbackTone = "progress" | "success" | "error";
export type GridCheckResult = {
  cells: PuzzleCell[];
  message: string;
  feedbackTone: GridCheckFeedbackTone;
};

const makeGridCheckResult = (cells: PuzzleCell[], message: string, feedbackTone: GridCheckFeedbackTone): GridCheckResult => ({
  cells,
  message,
  feedbackTone,
});

const checkWordGuess = (currentPuzzle: GridGeneratedPuzzle, cells: PuzzleCell[]): GridCheckResult => {
  const solutionWord = currentPuzzle.answerKey?.join("") ?? "";

  if (!solutionWord) {
    return makeGridCheckResult(cells, "No checker is available for this word puzzle.", "error");
  }

  const wordBank = getWordGuessBank(currentPuzzle.width);
  let completeGuessCount = 0;
  let solved = false;
  const nextCells = cells.map(cloneGridCell);

  for (let row = 0; row < currentPuzzle.height; row += 1) {
    const rowCells = nextCells.filter((candidate) => candidate.row === row).sort((left, right) => left.column - right.column);
    const guess = rowCells.map((candidate) => candidate.value).join("").toUpperCase();
    const hasAnyLetter = rowCells.some((candidate) => candidate.value);
    const isComplete = rowCells.every((candidate) => candidate.value);

    if (!hasAnyLetter) {
      continue;
    }

    if (!isComplete) {
      return makeGridCheckResult(nextCells, `Row ${row + 1} is incomplete.`, "progress");
    }

    if (!isValidWordGuess(guess, wordBank)) {
      return makeGridCheckResult(nextCells, `${guess} is not in the ${wordBank.length}-letter guess list.`, "error");
    }

    const marks = scoreWordGuess(solutionWord, guess);
    completeGuessCount += 1;
    solved = solved || guess === solutionWord;

    for (const rowCell of rowCells) {
      const mark = marks[rowCell.column] ?? "absent";
      rowCell.tone = wordGuessMarkToTone(mark);
      rowCell.ariaLabel = `${rowCell.value || "Empty"} Word Guess cell at row ${rowCell.row + 1}, column ${rowCell.column + 1}, ${mark}`;
    }
  }

  if (completeGuessCount === 0) {
    return makeGridCheckResult(nextCells, `Enter a complete ${currentPuzzle.width}-letter guess, then check it.`, "progress");
  }

  if (solved) {
    return makeGridCheckResult(nextCells, `Solved in ${completeGuessCount}/${currentPuzzle.height}. The word is ${solutionWord}.`, "success");
  }

  if (completeGuessCount >= currentPuzzle.height) {
    return makeGridCheckResult(nextCells, `No match in the available attempts. The word was ${solutionWord}.`, "error");
  }

  return makeGridCheckResult(nextCells, `Not solved yet. ${pluralize(currentPuzzle.height - completeGuessCount, "attempt")} remain.`, "progress");
};

const checkNonogram = (currentPuzzle: GridGeneratedPuzzle, cells: PuzzleCell[]): GridCheckResult => {
  const targetRows = currentPuzzle.clues?.rows ?? [];
  const targetColumns = currentPuzzle.clues?.columns ?? [];
  const actualClues = buildNonogramCluesFromCells(cells, currentPuzzle.width, currentPuzzle.height);
  const rowMatches = Array.from({ length: currentPuzzle.height }, (_, row) => sameNonogramClue(actualClues.rows[row] ?? [], targetRows[row] ?? []));
  const columnMatches = Array.from({ length: currentPuzzle.width }, (_, column) =>
    sameNonogramClue(actualClues.columns[column] ?? [], targetColumns[column] ?? []),
  );
  const rowFeasible = Array.from({ length: currentPuzzle.height }, (_, row) =>
    isNonogramLineFeasible(
      currentPuzzle.width,
      targetRows[row] ?? [],
      cells
        .filter((cell) => cell.row === row && cell.value === FILLED_NONOGRAM_CELL)
        .map((cell) => cell.column),
    ),
  );
  const columnFeasible = Array.from({ length: currentPuzzle.width }, (_, column) =>
    isNonogramLineFeasible(
      currentPuzzle.height,
      targetColumns[column] ?? [],
      cells
        .filter((cell) => cell.column === column && cell.value === FILLED_NONOGRAM_CELL)
        .map((cell) => cell.row),
    ),
  );
  const incorrectRowCount = rowFeasible.filter((feasible) => !feasible).length;
  const incorrectColumnCount = columnFeasible.filter((feasible) => !feasible).length;
  const nextCells = cells.map((cell): PuzzleCell => {
    if (cell.tone === "disabled" || cell.locked) {
      return cell;
    }

    const isFilled = cell.value === FILLED_NONOGRAM_CELL;
    const crossesImpossibleLine = rowFeasible[cell.row] === false || columnFeasible[cell.column] === false;

    return {
      ...cell,
      tone: isFilled ? (crossesImpossibleLine ? "hint" : "accent") : "empty",
    };
  });

  if (rowMatches.every(Boolean) && columnMatches.every(Boolean)) {
    return makeGridCheckResult(nextCells, "Solved. All clues match.", "success");
  }

  if (incorrectRowCount === 0 && incorrectColumnCount === 0) {
    return makeGridCheckResult(nextCells, "Looks good so far.", "progress");
  }

  const incorrectClueCount = incorrectRowCount + incorrectColumnCount;
  const clueErrorParts = [
    incorrectRowCount > 0 ? pluralize(incorrectRowCount, "row clue") : null,
    incorrectColumnCount > 0 ? pluralize(incorrectColumnCount, "column clue") : null,
  ].filter((part): part is string => Boolean(part));

  return makeGridCheckResult(
    nextCells,
    `${clueErrorParts.join(" and ")} ${incorrectClueCount === 1 ? "needs" : "need"} attention.`,
    "error",
  );
};

export type GridAnswerAssessment = {
  hasAnswerKey: boolean;
  filled: boolean;
  solved: boolean;
  emptyCount: number;
  incorrectCount: number;
  emptyCellIndices: number[];
  incorrectCellIndices: number[];
};

export const assessGridAnswer = (currentPuzzle: GridGeneratedPuzzle, cells: PuzzleCell[]): GridAnswerAssessment => {
  const answerKey = currentPuzzle.answerKey;

  if (!answerKey?.length) {
    return {
      hasAnswerKey: false,
      filled: false,
      solved: false,
      emptyCount: 0,
      incorrectCount: 0,
      emptyCellIndices: [],
      incorrectCellIndices: [],
    };
  }

  const emptyCellIndices: number[] = [];
  const incorrectCellIndices: number[] = [];

  for (let index = 0; index < answerKey.length; index += 1) {
    const expected = answerKey[index] ?? "";
    const actual = cells[index]?.value ?? "";

    if (expected !== "" && actual === "") {
      emptyCellIndices.push(index);
    } else if (actual !== expected) {
      incorrectCellIndices.push(index);
    }
  }

  if (cells.length > answerKey.length) {
    for (let index = answerKey.length; index < cells.length; index += 1) {
      incorrectCellIndices.push(index);
    }
  }

  const cellCountMatches = cells.length === answerKey.length;
  const emptyCount = emptyCellIndices.length;
  const incorrectCount = incorrectCellIndices.length;

  return {
    hasAnswerKey: true,
    filled: cellCountMatches && emptyCount === 0,
    solved: cellCountMatches && emptyCount === 0 && incorrectCount === 0,
    emptyCount,
    incorrectCount,
    emptyCellIndices,
    incorrectCellIndices,
  };
};

export const isGridAnswerCompleteAndCorrect = (currentPuzzle: GridGeneratedPuzzle, cells: PuzzleCell[]) =>
  assessGridAnswer(currentPuzzle, cells).solved;

export const isGridPuzzleSolved = (currentPuzzle: GridGeneratedPuzzle, cells: PuzzleCell[]) => {
  if (currentPuzzle.puzzleId !== "nonogram") {
    return isGridAnswerCompleteAndCorrect(currentPuzzle, cells);
  }

  const targetRows = currentPuzzle.clues?.rows;
  const targetColumns = currentPuzzle.clues?.columns;
  if (targetRows?.length !== currentPuzzle.height || targetColumns?.length !== currentPuzzle.width) {
    return false;
  }

  const actualClues = buildNonogramCluesFromCells(cells, currentPuzzle.width, currentPuzzle.height);
  return targetRows.every((clue, row) => sameNonogramClue(actualClues.rows[row] ?? [], clue)) &&
    targetColumns.every((clue, column) => sameNonogramClue(actualClues.columns[column] ?? [], clue));
};

export const checkGridAnswer = (currentPuzzle: GridGeneratedPuzzle, cells: PuzzleCell[]): GridCheckResult => {
  if (currentPuzzle.puzzleId === "word-guess") {
    return checkWordGuess(currentPuzzle, cells);
  }

  if (currentPuzzle.puzzleId === "nonogram") {
    return checkNonogram(currentPuzzle, cells);
  }

  const answerKey = currentPuzzle.answerKey;
  const assessment = assessGridAnswer(currentPuzzle, cells);

  if (!assessment.hasAnswerKey || !answerKey?.length) {
    return makeGridCheckResult(cells, `${currentPuzzle.title} does not expose a checker yet.`, "error");
  }

  const nextCells = cells.map((cell, index): PuzzleCell => {
    if (cell.tone === "disabled" || cell.locked) {
      return cell;
    }

    const expected = answerKey[index] ?? "";
    const actual = cell.value;
    const isEmpty = actual === "";
    const isCorrect = actual === expected;

    return {
      ...cell,
      tone: currentPuzzle.puzzleId === "sudoku" || currentPuzzle.puzzleId === "futoshiki"
        ? (isEmpty || isCorrect ? "empty" : "hint")
        : isEmpty ? "empty" : isCorrect ? "answer" : "hint",
    };
  });

  if (currentPuzzle.puzzleId === "sudoku") {
    if (assessment.solved) {
      return makeGridCheckResult(nextCells, "Solved.", "success");
    }

    if (assessment.incorrectCount === 0) {
      return makeGridCheckResult(
        nextCells,
        `Looks good so far. ${pluralize(assessment.emptyCount, "square")} remaining.`,
        "progress",
      );
    }

    return makeGridCheckResult(
      nextCells,
      `${pluralize(assessment.incorrectCount, "entry", "entries")} ${assessment.incorrectCount === 1 ? "needs" : "need"} attention${assessment.emptyCount > 0 ? `; ${pluralize(assessment.emptyCount, "square")} empty` : ""}.`,
      "error",
    );
  }

  if (assessment.solved) {
    return makeGridCheckResult(nextCells, `Solved. ${currentPuzzle.title} is correct.`, "success");
  }

  if (currentPuzzle.puzzleId === "futoshiki") {
    if (assessment.incorrectCount === 0) {
      return makeGridCheckResult(
        nextCells,
        `Looks good so far. ${pluralize(assessment.emptyCount, "cell")} remaining.`,
        "progress",
      );
    }

    return makeGridCheckResult(
      nextCells,
      `${pluralize(assessment.incorrectCount, "entry", "entries")} ${assessment.incorrectCount === 1 ? "needs" : "need"} attention${assessment.emptyCount > 0 ? `; ${pluralize(assessment.emptyCount, "cell")} empty` : ""}.`,
      "error",
    );
  }

  return makeGridCheckResult(
    nextCells,
    `Not solved: ${assessment.emptyCount} empty cell(s), ${assessment.incorrectCount} incorrect cell(s).`,
    "error",
  );
};
