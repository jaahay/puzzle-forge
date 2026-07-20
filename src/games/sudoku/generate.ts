import type { GridPuzzleCage, PuzzleDifficulty, PuzzleGenerator, SudokuVariation } from "../../catalog/types";
import { createGeneratedPuzzle, createRandom, normalizeSeed } from "../shared";
import { normalizeSudokuVariation, sudokuVariationDescriptions, sudokuVariationLabels } from "./variation";

const BOARD_SIZE = 9;
const BOX_SIZE = 3;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const sudokuDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const difficultyClueTargetsByVariation: Record<SudokuVariation, Record<PuzzleDifficulty, number>> = {
  classic: {
    Easy: 40,
    Medium: 34,
    Hard: 30,
    Expert: 26,
  },
  diagonal: {
    Easy: 38,
    Medium: 32,
    Hard: 28,
    Expert: 24,
  },
  "zero-killer": {
    Easy: 40,
    Medium: 34,
    Hard: 30,
    Expert: 26,
  },
};

type InternalKillerCage = {
  id: string;
  cells: number[];
  sum: number;
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

const buildClassicPatternSolution = (random: () => number) => {
  const digits = shuffle(sudokuDigits, random);
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

const getPeers = (cellIndex: number, variation: SudokuVariation) => {
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

  if (variation === "diagonal") {
    if (row === column) {
      for (let diagonalIndex = 0; diagonalIndex < BOARD_SIZE; diagonalIndex += 1) {
        peers.add(diagonalIndex * BOARD_SIZE + diagonalIndex);
      }
    }

    if (row + column === BOARD_SIZE - 1) {
      for (let diagonalIndex = 0; diagonalIndex < BOARD_SIZE; diagonalIndex += 1) {
        peers.add(diagonalIndex * BOARD_SIZE + (BOARD_SIZE - 1 - diagonalIndex));
      }
    }
  }

  peers.delete(cellIndex);
  return [...peers];
};

const makePeerMap = (variation: SudokuVariation) => Array.from({ length: CELL_COUNT }, (_, index) => getPeers(index, variation));

const getCandidates = (working: string[], peerMap: number[][], index: number) => {
  const usedDigits = new Set(peerMap[index].map((peerIndex) => working[peerIndex]).filter(Boolean));
  return sudokuDigits.filter((digit) => !usedDigits.has(digit));
};

const buildBacktrackingSolution = (random: () => number, peerMap: number[][]) => {
  const working = Array.from({ length: CELL_COUNT }, () => "");

  const search = (): boolean => {
    let bestIndex = -1;
    let bestCandidates: string[] = [];

    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (working[index]) continue;

      const candidates = getCandidates(working, peerMap, index);
      if (candidates.length === 0) return false;
      if (bestIndex < 0 || candidates.length < bestCandidates.length) {
        bestIndex = index;
        bestCandidates = candidates;
      }
    }

    if (bestIndex < 0) return true;

    for (const candidate of shuffle(bestCandidates, random)) {
      working[bestIndex] = candidate;
      if (search()) return true;
      working[bestIndex] = "";
    }

    return false;
  };

  if (!search()) {
    throw new Error("Unable to generate a Sudoku solution for the selected variation.");
  }

  return working;
};

const buildSolution = (random: () => number, variation: SudokuVariation, peerMap: number[][]) =>
  variation === "diagonal" ? buildBacktrackingSolution(random, peerMap) : buildClassicPatternSolution(random);

const countSolutions = (board: string[], peerMap: number[][], maxSolutions = 2) => {
  let solutionCount = 0;
  const working = [...board];

  const search = () => {
    if (solutionCount >= maxSolutions) return;

    let bestIndex = -1;
    let bestCandidates: string[] = [];

    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (working[index]) continue;

      const candidates = getCandidates(working, peerMap, index);
      if (candidates.length === 0) return;
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
      if (solutionCount >= maxSolutions) return;
    }
  };

  search();
  return solutionCount;
};

const removeClues = (solution: string[], random: () => number, clueTarget: number, peerMap: number[][]) => {
  const puzzle = [...solution];
  const pairStarts = shuffle(Array.from({ length: Math.ceil(CELL_COUNT / 2) }, (_, index) => index), random);
  let clueCount = CELL_COUNT;

  for (const index of pairStarts) {
    if (clueCount <= clueTarget) break;

    const mirrorIndex = CELL_COUNT - 1 - index;
    const removedValues: Array<[number, string]> = [[index, puzzle[index] ?? ""]];
    if (mirrorIndex !== index) removedValues.push([mirrorIndex, puzzle[mirrorIndex] ?? ""]);
    if (removedValues.some(([, value]) => value === "")) continue;

    for (const [cellIndex] of removedValues) puzzle[cellIndex] = "";

    if (countSolutions(puzzle, peerMap, 2) !== 1) {
      for (const [cellIndex, value] of removedValues) puzzle[cellIndex] = value;
      continue;
    }

    clueCount -= removedValues.length;
  }

  return puzzle;
};

const cellKey = (row: number, column: number) => `${row}-${column}`;

const toCellIndex = (row: number, column: number) => row * BOARD_SIZE + column;

const toPublicCage = (cage: InternalKillerCage): GridPuzzleCage => ({
  id: cage.id,
  sum: cage.sum,
  cells: cage.cells.map((index) => ({ row: Math.floor(index / BOARD_SIZE), column: index % BOARD_SIZE })),
});

const sumSolutionCells = (solution: string[], cells: number[]) =>
  cells.reduce((sum, cellIndex) => sum + Number(solution[cellIndex] ?? 0), 0);

const getOrthogonalNeighbors = (cellIndex: number) => {
  const row = Math.floor(cellIndex / BOARD_SIZE);
  const column = cellIndex % BOARD_SIZE;
  const neighbors: number[] = [];

  if (row > 0) neighbors.push(toCellIndex(row - 1, column));
  if (row < BOARD_SIZE - 1) neighbors.push(toCellIndex(row + 1, column));
  if (column > 0) neighbors.push(toCellIndex(row, column - 1));
  if (column < BOARD_SIZE - 1) neighbors.push(toCellIndex(row, column + 1));

  return neighbors;
};

const makeKillerCageAssignments = (cage: InternalKillerCage) => {
  const assignments: string[][] = [];

  const search = (position: number, sum: number, usedDigits: Set<string>, values: string[]) => {
    if (position === cage.cells.length) {
      if (sum === cage.sum) assignments.push([...values]);
      return;
    }

    for (const digit of sudokuDigits) {
      if (usedDigits.has(digit)) continue;
      const nextSum = sum + Number(digit);
      if (nextSum > cage.sum) continue;

      usedDigits.add(digit);
      values[position] = digit;
      search(position + 1, nextSum, usedDigits, values);
      usedDigits.delete(digit);
      values[position] = "";
    }
  };

  search(0, 0, new Set(), []);
  return assignments;
};

const countKillerSolutions = (cages: InternalKillerCage[], maxSolutions = 2) => {
  const peerMap = makePeerMap("classic");
  const working = Array.from({ length: CELL_COUNT }, () => "");
  const cageByCell = new Map<number, { cageIndex: number; position: number }>();
  const assignmentsByCage = cages.map(makeKillerCageAssignments);
  let solutionCount = 0;

  if (assignmentsByCage.some((assignments) => assignments.length === 0)) {
    return 0;
  }

  cages.forEach((cage, cageIndex) => {
    cage.cells.forEach((cellIndex, position) => {
      cageByCell.set(cellIndex, { cageIndex, position });
    });
  });

  const assignmentFitsCurrentGrid = (assignment: string[], cage: InternalKillerCage) =>
    cage.cells.every((cellIndex, position) => {
      const digit = assignment[position] ?? "";
      const currentValue = working[cellIndex];
      if (currentValue) return currentValue === digit;

      return peerMap[cellIndex].every((peerIndex) => working[peerIndex] !== digit);
    });

  const getKillerCandidates = (cellIndex: number) => {
    const usedDigits = new Set(peerMap[cellIndex].map((peerIndex) => working[peerIndex]).filter(Boolean));
    const sudokuCandidates = sudokuDigits.filter((digit) => !usedDigits.has(digit));
    const cageCell = cageByCell.get(cellIndex);

    if (!cageCell) {
      return sudokuCandidates;
    }

    const cage = cages[cageCell.cageIndex];
    const assignments = assignmentsByCage[cageCell.cageIndex] ?? [];
    const cageCandidates = new Set(
      assignments
        .filter((assignment) => cage && assignmentFitsCurrentGrid(assignment, cage))
        .map((assignment) => assignment[cageCell.position] ?? ""),
    );

    return sudokuCandidates.filter((digit) => cageCandidates.has(digit));
  };

  const search = () => {
    if (solutionCount >= maxSolutions) return;

    let bestIndex = -1;
    let bestCandidates: string[] = [];

    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (working[index]) continue;

      const candidates = getKillerCandidates(index);
      if (candidates.length === 0) return;
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
      if (solutionCount >= maxSolutions) return;
    }
  };

  search();
  return solutionCount;
};

const hasUniqueKillerSolution = (cages: InternalKillerCage[]) => countKillerSolutions(cages, 2) === 1;

const renumberKillerCages = (cages: InternalKillerCage[]) =>
  cages.map((cage, index) => ({
    ...cage,
    id: `zk-${index + 1}`,
  }));

const minimizeKillerCages = (cages: InternalKillerCage[], random: () => number) => {
  let minimized = renumberKillerCages(cages);
  let changed = true;
  let passCount = 0;

  while (changed && passCount < 3) {
    changed = false;
    passCount += 1;

    for (const cage of shuffle(minimized, random)) {
      const testCages = minimized.filter((candidate) => candidate.id !== cage.id);

      if (testCages.length > 0 && hasUniqueKillerSolution(testCages)) {
        minimized = renumberKillerCages(testCages);
        changed = true;
      }
    }
  }

  return minimized;
};

const cagesAreAdjacent = (left: InternalKillerCage, right: InternalKillerCage) => {
  const rightCells = new Set(right.cells);

  return left.cells.some((cellIndex) => getOrthogonalNeighbors(cellIndex).some((neighbor) => rightCells.has(neighbor)));
};

const mergeKillerCages = (solution: string[], cages: InternalKillerCage[], random: () => number, difficulty: PuzzleDifficulty) => {
  const maxMergedSize = difficulty === "Easy" ? 2 : difficulty === "Expert" ? 4 : 3;
  let merged = renumberKillerCages(cages);
  let mergeCount = 0;
  const maxMergeCount = difficulty === "Easy" ? 8 : difficulty === "Medium" ? 12 : difficulty === "Hard" ? 16 : 20;

  while (mergeCount < maxMergeCount) {
    const pairs = shuffle(
      merged.flatMap((left, leftIndex) =>
        merged.slice(leftIndex + 1).map((right) => [left, right] as const),
      ),
      random,
    ).filter(([left, right]) => left.cells.length + right.cells.length <= maxMergedSize && cagesAreAdjacent(left, right));

    let didMerge = false;

    for (const [left, right] of pairs) {
      const mergedCage: InternalKillerCage = {
        id: left.id,
        cells: [...left.cells, ...right.cells],
        sum: sumSolutionCells(solution, [...left.cells, ...right.cells]),
      };
      const testCages = renumberKillerCages(merged.filter((cage) => cage.id !== left.id && cage.id !== right.id).concat(mergedCage));

      if (hasUniqueKillerSolution(testCages)) {
        merged = testCages;
        mergeCount += 1;
        didMerge = true;
        break;
      }
    }

    if (!didMerge) break;
  }

  return merged;
};

const buildZeroKillerCages = (solution: string[], random: () => number, difficulty: PuzzleDifficulty) => {
  const peerMap = makePeerMap("classic");
  const clueTarget = difficultyClueTargetsByVariation["zero-killer"][difficulty];
  const clueValues = removeClues(solution, random, clueTarget, peerMap);
  const singleCellCages = clueValues.flatMap((value, index): InternalKillerCage[] =>
    value
      ? [
          {
            id: `zk-${index + 1}`,
            cells: [index],
            sum: Number(value),
          },
        ]
      : [],
  );
  const minimized = minimizeKillerCages(singleCellCages, random);
  const merged = mergeKillerCages(solution, minimized, random, difficulty);
  const fallbackCages = Array.from({ length: CELL_COUNT }, (_, index) => ({
    id: `zk-${index + 1}`,
    cells: [index],
    sum: Number(solution[index] ?? 0),
  }));

  return minimizeKillerCages(merged.length > 0 ? merged : fallbackCages, random);
};

const makeSudokuCells = (values: string[], title: string) =>
  values.map((value, index) => {
    const row = Math.floor(index / BOARD_SIZE);
    const column = index % BOARD_SIZE;
    const locked = Boolean(value);

    return {
      row,
      column,
      value,
      locked,
      tone: locked ? "given" : "empty",
      ariaLabel: locked ? `Given ${value} at row ${row + 1}, column ${column + 1}` : `Empty ${title} cell at row ${row + 1}, column ${column + 1}`,
    } as const;
  });

export const sudokuTestHooks = {
  countKillerSolutions: (cages: GridPuzzleCage[]) =>
    countKillerSolutions(
      cages.map((cage) => ({
        id: cage.id,
        sum: cage.sum,
        cells: cage.cells.map((cell) => toCellIndex(cell.row, cell.column)),
      })),
      2,
    ),
};

export const generateSudoku: PuzzleGenerator = ({ seed, difficulty, sudokuVariation }) => {
  const normalizedSeed = normalizeSeed(seed);
  const selectedVariation = normalizeSudokuVariation(sudokuVariation);
  const selectedDifficulty = getDifficulty(difficulty, createRandom(`sudoku:${normalizedSeed}:difficulty`));
  const random = createRandom(`sudoku:${selectedVariation}:${normalizedSeed}:${selectedDifficulty}`);
  const peerMap = makePeerMap(selectedVariation);
  const solution = buildSolution(random, selectedVariation, peerMap);
  const variationLabel = sudokuVariationLabels[selectedVariation];
  const title = selectedVariation === "classic" ? "Sudoku" : `${variationLabel} Sudoku`;

  if (selectedVariation === "zero-killer") {
    const internalCages = buildZeroKillerCages(solution, random, selectedDifficulty);
    const cages = internalCages.map(toPublicCage);
    const cagedCells = new Set(cages.flatMap((cage) => cage.cells.map((cell) => cellKey(cell.row, cell.column))));
    const uncagedCount = CELL_COUNT - cagedCells.size;
    const cells = makeSudokuCells(Array.from({ length: CELL_COUNT }, () => ""), title);

    const generatedPuzzle = createGeneratedPuzzle({
      id: `sudoku-${selectedVariation}-${normalizedSeed}-${selectedDifficulty.toLowerCase()}`,
      puzzleId: "sudoku",
      title,
      seed: normalizedSeed,
      width: BOARD_SIZE,
      height: BOARD_SIZE,
      difficulty: selectedDifficulty,
      cells,
      answerKey: solution,
      cages,
      notes: [
        `${selectedDifficulty} zero killer puzzle with ${cages.length} necessary cage clues and ${uncagedCount} uncaged cells.`,
        sudokuVariationDescriptions[selectedVariation],
      ],
    });

    return { ...generatedPuzzle, sudokuVariation: selectedVariation };
  }

  const clueTarget = difficultyClueTargetsByVariation[selectedVariation][selectedDifficulty];
  const puzzleValues = removeClues(solution, random, clueTarget, peerMap);
  const givenCount = puzzleValues.filter(Boolean).length;
  const cells = makeSudokuCells(puzzleValues, title);

  const generatedPuzzle = createGeneratedPuzzle({
    id: `sudoku-${selectedVariation}-${normalizedSeed}-${selectedDifficulty.toLowerCase()}`,
    puzzleId: "sudoku",
    title,
    seed: normalizedSeed,
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    difficulty: selectedDifficulty,
    cells,
    answerKey: solution,
    notes: [`${selectedDifficulty} ${variationLabel.toLowerCase()} puzzle with ${givenCount} givens and a unique generated solution.`, sudokuVariationDescriptions[selectedVariation]],
  });

  return { ...generatedPuzzle, sudokuVariation: selectedVariation };
};
