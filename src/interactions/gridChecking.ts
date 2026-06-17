import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { pluralize } from "../app/runtime";
import { cloneGridCell } from "./gridRules";

const checkWordGuess = (currentPuzzle: GridGeneratedPuzzle, cells: PuzzleCell[]) => {
  const solutionWord = currentPuzzle.answerKey?.join("") ?? "";

  if (!solutionWord) {
    return { cells, message: "No checker is available for this word puzzle." };
  }

  let completeGuessCount = 0;
  let solved = false;
  const nextCells = cells.map(cloneGridCell);

  for (let row = 0; row < currentPuzzle.height; row += 1) {
    const rowCells = nextCells.filter((candidate) => candidate.row === row).sort((left, right) => left.column - right.column);
    const guess = rowCells.map((candidate) => candidate.value).join("");
    const hasAnyLetter = rowCells.some((candidate) => candidate.value);
    const isComplete = rowCells.every((candidate) => candidate.value);

    if (!hasAnyLetter) {
      continue;
    }

    if (!isComplete) {
      return { cells: nextCells, message: `Row ${row + 1} is incomplete.` };
    }

    completeGuessCount += 1;
    solved = solved || guess === solutionWord;

    for (const rowCell of rowCells) {
      const expected = solutionWord[rowCell.column] ?? "";
      const exact = rowCell.value === expected;
      const present = !exact && solutionWord.includes(rowCell.value);
      rowCell.tone = exact ? "answer" : present ? "hint" : "empty";
    }
  }

  if (completeGuessCount === 0) {
    return { cells: nextCells, message: "Enter a complete five-letter guess, then check it." };
  }

  if (solved) {
    return { cells: nextCells, message: `Solved. The word is ${solutionWord}.` };
  }

  if (completeGuessCount >= currentPuzzle.height) {
    return { cells: nextCells, message: "No match in the available attempts." };
  }

  return { cells: nextCells, message: `Not solved yet. ${currentPuzzle.height - completeGuessCount} attempt(s) remain.` };
};

export const checkGridAnswer = (currentPuzzle: GridGeneratedPuzzle, cells: PuzzleCell[]) => {
  if (currentPuzzle.puzzleId === "word-guess") {
    return checkWordGuess(currentPuzzle, cells);
  }

  const answerKey = currentPuzzle.answerKey;

  if (!answerKey?.length) {
    return { cells, message: `${currentPuzzle.title} does not expose a checker yet.` };
  }

  let emptyCount = 0;
  let incorrectCount = 0;

  const nextCells = cells.map((cell, index): PuzzleCell => {
    if (cell.tone === "disabled" || cell.locked) {
      return cell;
    }

    const expected = answerKey[index] ?? "";
    const actual = cell.value;
    const isEmpty = actual === "";
    const isCorrect = actual === expected;

    if (isEmpty && expected !== "") {
      emptyCount += 1;
    } else if (!isCorrect) {
      incorrectCount += 1;
    }

    if (currentPuzzle.puzzleId === "nonogram") {
      return {
        ...cell,
        tone: isCorrect ? (actual === "■" ? "accent" : "empty") : "hint",
      };
    }

    return {
      ...cell,
      tone: isEmpty ? "empty" : isCorrect ? "answer" : "hint",
    };
  });

  if (currentPuzzle.puzzleId === "sudoku") {
    if (emptyCount === 0 && incorrectCount === 0) {
      return { cells: nextCells, message: "Sudoku solved. Beautifully done." };
    }

    if (incorrectCount === 0) {
      return {
        cells: nextCells,
        message: `Sudoku validation: no mistakes found. ${pluralize(emptyCount, "empty square")} remain.`,
      };
    }

    return {
      cells: nextCells,
      message: `Sudoku validation: ${pluralize(incorrectCount, "incorrect entry", "incorrect entries")} marked in red${
        emptyCount > 0 ? `, and ${pluralize(emptyCount, "empty square")} remain` : ""
      }.`,
    };
  }

  if (emptyCount === 0 && incorrectCount === 0) {
    return { cells: nextCells, message: `Solved. ${currentPuzzle.title} is correct.` };
  }

  return {
    cells: nextCells,
    message: `Not solved: ${emptyCount} empty cell(s), ${incorrectCount} incorrect cell(s).`,
  };
};
