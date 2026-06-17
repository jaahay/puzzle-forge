import type { PuzzleDifficulty, PuzzleGenerator } from "../../catalog/types";
import { createGeneratedPuzzle, createRandom, normalizeSeed } from "../shared";

const BOARD_SIZE = 9;
const BOX_SIZE = 3;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

const difficultyClueTargets: Record<PuzzleDifficulty, number> = {
  Easy: 40,
  Medium: 34,
  Hard: 30,
  Expert: 26,
};

const difficultyLabels: PuzzleDifficulty[] = ["Easy", "Medium", "Hard", "Expert"];

const getDifficulty = (difficulty: string | undefined, random: () => number): PuzzleDifficulty => {
  if (difficultyLabels.includes(difficulty as PuzzleDifficulty)) {
    return difficulty as PuzzleDifficulty;
  }

  return difficultyLabels[Math.floor(random() * difficultyLabels.length)] ?? "Medium";
};

const shuffle = <T>(items: T[], random: () => number) => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

const buildSolution = (random: () => number) => {
  const digits = shuffle(["1", "2", "3", "4", "5", "6", "7", "8", "9"], random);
  const bands = shuffle([0, 1, 2], random);
  const stacks = shuffle([0, 1, 2], random);
  const rows = bands.flatMap((band) => shuffle([0, 1, 2], random).map((row) => band * BOX_SIZE + row));
  const columns = stacks.flatMap((stack) => shuffle([0, 1, 2], random).map((column) => stack * BOX_SIZE + column));

  return rows.flatMap((row) =>
    columns.map((column) => {
      const pattern = (row * BOX_SIZE + Math.floor(row / BOX_SIZE) + column) % BOARD_SIZE;
      return digits[pattern] ?? "1";
    }),
  );
};

const getPeers = (cellIndex: number) => {
  const row = Math.floor(cellIndex / BOARD_SIZE);
  const column = cellIndex % BOARD_SIZE;
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxColumn = Math.floor(column / BOX_SIZE) * BOX_SIZE;
  const peers = new Set<number>();

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    peers.add(row * BOARD_SIZE + index);
    peers.add(index * BOARD_SIZE + column);
  }

  for (let rowOffset = 0; rowOffset < BOX_SIZE; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < BOX_SIZE; columnOffset += 1) {
      peers.add((boxRow + rowOffset) * BOARD_SIZE + boxColumn + columnOffset);
    }
  }

  peers.delete(cellIndex);
  return [...peers];
};

const peerMap = Array.from({ length: CELL_COUNT }, (_, index) => getPeers(index));

const countSolutions = (board: string[], maxSolutions = 2) => {
  let solutionCount = 0;
  const working = [...board];

  const search = () => {
    if (solutionCount >= maxSolutions) {
      return;
    }

    let bestIndex = -1;
    let bestCandidates: string[] = [];

    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (working[index]) {
        continue;
      }

      const usedDigits = new Set(peerMap[index].map((peerIndex) => working[peerIndex]).filter(Boolean));
      const candidates = difficultyLabels.length
        ? ["1", "2", "3", "4", "5", "6", "7", "8", "9"].filter((digit) => !usedDigits.has(digit))
        : [];

      if (candidates.length === 0) {
        return;
      }

      if (bestIndex < 0 || candidates.length < bestCandidates.length) {
        bestIndex = index;
        bestCandidates = candidates;
      }
    }

    if (bestIndex < 0) {
      solutionCount += 1;
      return;
    }

    for (const candidate of bestCandidates) {
      working[bestIndex] = candidate;
      search();
      working[bestIndex] = "";

      if (solutionCount >= maxSolutions) {
        return;
      }
    }
  };

  search();
  return solutionCount;
};

const removeClues = (solution: string[], random: () => number, clueTarget: number) => {
  const puzzle = [...solution];
  const pairStarts = shuffle(
    Array.from({ length: Math.ceil(CELL_COUNT / 2) }, (_, index) => index),
    random,
  );

  let clueCount = CELL_COUNT;

  for (const index of pairStarts) {
    if (clueCount <= clueTarget) {
      break;
    }

    const mirrorIndex = CELL_COUNT - 1 - index;
    const removedValues: Array<[number, string]> = [[index, puzzle[index] ?? ""]];

    if (mirrorIndex !== index) {
      removedValues.push([mirrorIndex, puzzle[mirrorIndex] ?? ""]);
    }

    if (removedValues.some(([, value]) => value === "")) {
      continue;
    }

    for (const [cellIndex] of removedValues) {
      puzzle[cellIndex] = "";
    }

    if (countSolutions(puzzle, 2) !== 1) {
      for (const [cellIndex, value] of removedValues) {
        puzzle[cellIndex] = value;
      }
      continue;
    }

    clueCount -= removedValues.length;
  }

  return puzzle;
};

export const generateSudoku: PuzzleGenerator = ({ seed, difficulty }) => {
  const normalizedSeed = normalizeSeed(seed);
  const random = createRandom(`sudoku:${normalizedSeed}`);
  const selectedDifficulty = getDifficulty(difficulty, random);
  const solution = buildSolution(random);
  const puzzleValues = removeClues(solution, random, difficultyClueTargets[selectedDifficulty]);
  const givenCount = puzzleValues.filter(Boolean).length;

  const cells = puzzleValues.map((value, index) => {
    const row = Math.floor(index / BOARD_SIZE);
    const column = index % BOARD_SIZE;
    const locked = Boolean(value);

    return {
      row,
      column,
      value,
      locked,
      tone: locked ? "given" : "empty",
      ariaLabel: locked ? `Given ${value} at row ${row + 1}, column ${column + 1}` : `Empty Sudoku cell at row ${row + 1}, column ${column + 1}`,
    } as const;
  });

  return createGeneratedPuzzle({
    id: `sudoku-${normalizedSeed}`,
    puzzleId: "sudoku",
    title: "Sudoku",
    seed: normalizedSeed,
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    difficulty: selectedDifficulty,
    cells,
    answerKey: solution,
    notes: [`${selectedDifficulty} puzzle with ${givenCount} givens and a unique generated solution.`],
  });
};
