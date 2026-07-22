import type { GridPuzzleCage, PuzzleDifficulty, PuzzleGenerator, SudokuVariation } from "../../catalog/types";
import { createGeneratedPuzzle, createRandom, normalizeSeed } from "../shared";
import { normalizeSudokuVariation, sudokuVariationDescriptions, sudokuVariationLabels } from "./variation";

const BOARD_SIZE = 9;
const BOX_SIZE = 3;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const FULL_DIGIT_MASK = (1 << BOARD_SIZE) - 1;
const KILLER_SUM_LIMIT = 45;
const KILLER_SEARCH_NODE_LIMIT = 2_000;
const sudokuDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const difficultyClueTargetsByVariation: Record<SudokuVariation, Record<PuzzleDifficulty, number>> = {
  classic: { Easy: 40, Medium: 34, Hard: 30, Expert: 26 },
  diagonal: { Easy: 38, Medium: 32, Hard: 28, Expert: 24 },
  "zero-killer": { Easy: 40, Medium: 34, Hard: 30, Expert: 26 },
};

const zeroKillerMergeTargets: Record<PuzzleDifficulty, number> = {
  Easy: 8,
  Medium: 12,
  Hard: 16,
  Expert: 20,
};

const zeroKillerMaxCageSizes: Record<PuzzleDifficulty, number> = {
  Easy: 2,
  Medium: 3,
  Hard: 3,
  Expert: 4,
};

type InternalKillerCage = { id: string; cells: number[]; sum: number };
type KillerSearchResult = { alternativeFound: boolean; budgetExceeded: boolean; nodesVisited: number };
type KillerGenerationStats = { uniquenessChecks: number; nodesVisited: number; budgetRejections: number };

const difficultyLabels: PuzzleDifficulty[] = ["Easy", "Medium", "Hard", "Expert"];
const rowByCell = Uint8Array.from({ length: CELL_COUNT }, (_, index) => Math.floor(index / BOARD_SIZE));
const columnByCell = Uint8Array.from({ length: CELL_COUNT }, (_, index) => index % BOARD_SIZE);
const boxByCell = Uint8Array.from({ length: CELL_COUNT }, (_, index) =>
  Math.floor(Math.floor(index / BOARD_SIZE) / BOX_SIZE) * BOX_SIZE + Math.floor((index % BOARD_SIZE) / BOX_SIZE),
);
const digitBit = Uint16Array.from({ length: BOARD_SIZE + 1 }, (_, digit) => (digit === 0 ? 0 : 1 << (digit - 1)));
const digitByBit = new Uint8Array(FULL_DIGIT_MASK + 1);
const bitCount = new Uint8Array(FULL_DIGIT_MASK + 1);
const digitSum = new Uint8Array(FULL_DIGIT_MASK + 1);

for (let digit = 1; digit <= BOARD_SIZE; digit += 1) digitByBit[digitBit[digit]] = digit;
for (let mask = 1; mask <= FULL_DIGIT_MASK; mask += 1) {
  const bit = mask & -mask;
  bitCount[mask] = bitCount[mask ^ bit] + 1;
  digitSum[mask] = digitSum[mask ^ bit] + digitByBit[bit];
}

const killerSumFeasibility = new Uint8Array((FULL_DIGIT_MASK + 1) * (BOARD_SIZE + 1) * (KILLER_SUM_LIMIT + 1));
const killerFeasibilityIndex = (availableMask: number, count: number, sum: number) =>
  ((availableMask * (BOARD_SIZE + 1) + count) * (KILLER_SUM_LIMIT + 1)) + sum;

for (let availableMask = 0; availableMask <= FULL_DIGIT_MASK; availableMask += 1) {
  let subset = availableMask;
  while (true) {
    killerSumFeasibility[killerFeasibilityIndex(availableMask, bitCount[subset], digitSum[subset])] = 1;
    if (subset === 0) break;
    subset = (subset - 1) & availableMask;
  }
}

const canMakeKillerSum = (availableMask: number, count: number, sum: number) =>
  count >= 0 && count <= BOARD_SIZE && sum >= 0 && sum <= KILLER_SUM_LIMIT &&
  killerSumFeasibility[killerFeasibilityIndex(availableMask, count, sum)] === 1;

const getDifficulty = (difficulty: string | undefined, random: () => number): PuzzleDifficulty =>
  difficultyLabels.includes(difficulty as PuzzleDifficulty)
    ? (difficulty as PuzzleDifficulty)
    : (difficultyLabels[Math.floor(random() * difficultyLabels.length)] ?? "Medium");

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
    columns.map((column) => digits[(row * BOX_SIZE + Math.floor(row / BOX_SIZE) + column) % BOARD_SIZE] ?? "1"),
  );
};

const getPeers = (cellIndex: number, variation: SudokuVariation) => {
  const row = rowByCell[cellIndex];
  const column = columnByCell[cellIndex];
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
    if (row === column) for (let index = 0; index < BOARD_SIZE; index += 1) peers.add(index * BOARD_SIZE + index);
    if (row + column === BOARD_SIZE - 1) {
      for (let index = 0; index < BOARD_SIZE; index += 1) peers.add(index * BOARD_SIZE + (BOARD_SIZE - 1 - index));
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

  if (!search()) throw new Error("Unable to generate a Sudoku solution for the selected variation.");
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
  cells: cage.cells.map((index) => ({ row: rowByCell[index], column: columnByCell[index] })),
});
const sumSolutionCells = (solution: string[], cells: number[]) => cells.reduce((sum, index) => sum + Number(solution[index] ?? 0), 0);
const getOrthogonalNeighbors = (cellIndex: number) => {
  const row = rowByCell[cellIndex];
  const column = columnByCell[cellIndex];
  const neighbors: number[] = [];
  if (row > 0) neighbors.push(cellIndex - BOARD_SIZE);
  if (row < BOARD_SIZE - 1) neighbors.push(cellIndex + BOARD_SIZE);
  if (column > 0) neighbors.push(cellIndex - 1);
  if (column < BOARD_SIZE - 1) neighbors.push(cellIndex + 1);
  return neighbors;
};
const renumberKillerCages = (cages: InternalKillerCage[]) => cages.map((cage, index) => ({ ...cage, id: `zk-${index + 1}` }));

const searchForAlternativeKillerSolution = (
  cages: InternalKillerCage[],
  targetSolution: string[],
  nodeLimit = KILLER_SEARCH_NODE_LIMIT,
): KillerSearchResult => {
  const board = new Uint8Array(CELL_COUNT);
  const rowMasks = new Uint16Array(BOARD_SIZE);
  const columnMasks = new Uint16Array(BOARD_SIZE);
  const boxMasks = new Uint16Array(BOARD_SIZE);
  const cageByCell = new Int16Array(CELL_COUNT);
  const cageUsedMasks = new Uint16Array(cages.length);
  const cageRemainingSums = new Uint8Array(cages.length);
  const cageRemainingCounts = new Uint8Array(cages.length);
  cageByCell.fill(-1);

  cages.forEach((cage, cageIndex) => {
    cageRemainingSums[cageIndex] = cage.sum;
    cageRemainingCounts[cageIndex] = cage.cells.length;
    cage.cells.forEach((cellIndex) => { cageByCell[cellIndex] = cageIndex; });
  });

  let nodesVisited = 0;
  let budgetExceeded = false;

  const getKillerCandidateMask = (cellIndex: number) => {
    let candidates = FULL_DIGIT_MASK & ~(rowMasks[rowByCell[cellIndex]] | columnMasks[columnByCell[cellIndex]] | boxMasks[boxByCell[cellIndex]]);
    const cageIndex = cageByCell[cellIndex];
    if (cageIndex < 0) return candidates;

    candidates &= ~cageUsedMasks[cageIndex];
    const remainingCount = cageRemainingCounts[cageIndex] - 1;
    const remainingSum = cageRemainingSums[cageIndex];
    let feasibleCandidates = 0;
    for (let bits = candidates; bits !== 0; bits &= bits - 1) {
      const bit = bits & -bits;
      const digit = digitByBit[bit];
      const availableMask = FULL_DIGIT_MASK & ~(cageUsedMasks[cageIndex] | bit);
      if (canMakeKillerSum(availableMask, remainingCount, remainingSum - digit)) feasibleCandidates |= bit;
    }
    return feasibleCandidates;
  };

  const search = (hasDiverged: boolean, filledCount: number): boolean => {
    nodesVisited += 1;
    if (nodesVisited > nodeLimit) {
      budgetExceeded = true;
      return false;
    }
    if (filledCount === CELL_COUNT) return hasDiverged;

    let bestIndex = -1;
    let bestMask = 0;
    let bestCount = BOARD_SIZE + 1;
    for (let cellIndex = 0; cellIndex < CELL_COUNT; cellIndex += 1) {
      if (board[cellIndex] !== 0) continue;
      const candidates = getKillerCandidateMask(cellIndex);
      const candidateCount = bitCount[candidates];
      if (candidateCount === 0) return false;
      if (candidateCount < bestCount) {
        bestIndex = cellIndex;
        bestMask = candidates;
        bestCount = candidateCount;
        if (candidateCount === 1) break;
      }
    }

    const targetDigit = Number(targetSolution[bestIndex] ?? 0);
    const targetBit = digitBit[targetDigit];
    const tryCandidate = (bit: number) => {
      const digit = digitByBit[bit];
      const row = rowByCell[bestIndex];
      const column = columnByCell[bestIndex];
      const box = boxByCell[bestIndex];
      const cageIndex = cageByCell[bestIndex];

      board[bestIndex] = digit;
      rowMasks[row] |= bit;
      columnMasks[column] |= bit;
      boxMasks[box] |= bit;
      if (cageIndex >= 0) {
        cageUsedMasks[cageIndex] |= bit;
        cageRemainingSums[cageIndex] -= digit;
        cageRemainingCounts[cageIndex] -= 1;
      }

      const found = search(hasDiverged || digit !== targetDigit, filledCount + 1);

      if (cageIndex >= 0) {
        cageUsedMasks[cageIndex] ^= bit;
        cageRemainingSums[cageIndex] += digit;
        cageRemainingCounts[cageIndex] += 1;
      }
      rowMasks[row] ^= bit;
      columnMasks[column] ^= bit;
      boxMasks[box] ^= bit;
      board[bestIndex] = 0;
      return found;
    };

    for (let bits = bestMask & ~targetBit; bits !== 0; bits &= bits - 1) {
      if (tryCandidate(bits & -bits)) return true;
      if (budgetExceeded) return false;
    }
    return Boolean(bestMask & targetBit) && tryCandidate(targetBit);
  };

  return { alternativeFound: search(false, 0), budgetExceeded, nodesVisited };
};

const proveUniqueKillerSolution = (
  cages: InternalKillerCage[],
  targetSolution: string[],
  stats?: KillerGenerationStats,
  nodeLimit = KILLER_SEARCH_NODE_LIMIT,
) => {
  const result = searchForAlternativeKillerSolution(cages, targetSolution, nodeLimit);
  if (stats) {
    stats.uniquenessChecks += 1;
    stats.nodesVisited += result.nodesVisited;
    if (result.budgetExceeded) stats.budgetRejections += 1;
  }
  return !result.alternativeFound && !result.budgetExceeded;
};

const removeSingletonCages = (
  solution: string[],
  random: () => number,
  targetCount: number,
  stats: KillerGenerationStats,
) => {
  let cages: InternalKillerCage[] = solution.map((value, index) => ({ id: `zk-${index + 1}`, cells: [index], sum: Number(value) }));
  let cagedCellCount = CELL_COUNT;
  const pairStarts = shuffle(Array.from({ length: Math.ceil(CELL_COUNT / 2) }, (_, index) => index), random);

  for (const index of pairStarts) {
    if (cagedCellCount <= targetCount) break;
    const mirrorIndex = CELL_COUNT - 1 - index;
    const removedCells = new Set([index, mirrorIndex]);
    const testCages = cages.filter((cage) => !removedCells.has(cage.cells[0]));
    const removedCount = cages.length - testCages.length;
    if (removedCount === 0 || cagedCellCount - removedCount < targetCount) continue;
    if (!proveUniqueKillerSolution(testCages, solution, stats)) continue;
    cages = testCages;
    cagedCellCount -= removedCount;
  }

  return renumberKillerCages(cages);
};

const cagesAreAdjacent = (left: InternalKillerCage, right: InternalKillerCage) => {
  const rightCells = new Set(right.cells);
  return left.cells.some((cellIndex) => getOrthogonalNeighbors(cellIndex).some((neighbor) => rightCells.has(neighbor)));
};

const mergeKillerCages = (
  solution: string[],
  initialCages: InternalKillerCage[],
  random: () => number,
  difficulty: PuzzleDifficulty,
  stats: KillerGenerationStats,
) => {
  let cages = renumberKillerCages(initialCages);
  let mergeCount = 0;
  const maxMergedSize = zeroKillerMaxCageSizes[difficulty];
  const maxMergeCount = zeroKillerMergeTargets[difficulty];

  while (mergeCount < maxMergeCount) {
    const pairs = shuffle(
      cages.flatMap((left, leftIndex) => cages.slice(leftIndex + 1).map((right) => [left, right] as const)),
      random,
    ).filter(([left, right]) => {
      const cells = [...left.cells, ...right.cells];
      if (cells.length > maxMergedSize || !cagesAreAdjacent(left, right)) return false;
      const values = cells.map((cellIndex) => solution[cellIndex] ?? "");
      return new Set(values).size === values.length;
    });

    let merged = false;
    for (const [left, right] of pairs) {
      const cells = [...left.cells, ...right.cells];
      const mergedCage: InternalKillerCage = { id: left.id, cells, sum: sumSolutionCells(solution, cells) };
      const testCages = renumberKillerCages(cages.filter((cage) => cage !== left && cage !== right).concat(mergedCage));
      if (!proveUniqueKillerSolution(testCages, solution, stats)) continue;
      cages = testCages;
      mergeCount += 1;
      merged = true;
      break;
    }
    if (!merged) break;
  }

  return cages;
};

const buildZeroKillerCages = (solution: string[], random: () => number, difficulty: PuzzleDifficulty) => {
  const stats: KillerGenerationStats = { uniquenessChecks: 0, nodesVisited: 0, budgetRejections: 0 };
  const sparseSingletons = removeSingletonCages(solution, random, difficultyClueTargetsByVariation["zero-killer"][difficulty], stats);
  const cages = mergeKillerCages(solution, sparseSingletons, random, difficulty, stats);
  return { cages: renumberKillerCages(cages), stats };
};

const makeSudokuCells = (values: string[], title: string) =>
  values.map((value, index) => {
    const row = rowByCell[index];
    const column = columnByCell[index];
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
  hasUniqueKillerSolution: (cages: GridPuzzleCage[], solution: string[], nodeLimit = 1_000_000) =>
    proveUniqueKillerSolution(
      cages.map((cage) => ({ id: cage.id, sum: cage.sum, cells: cage.cells.map((cell) => toCellIndex(cell.row, cell.column)) })),
      solution,
      undefined,
      nodeLimit,
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
    const { cages: internalCages, stats } = buildZeroKillerCages(solution, random, selectedDifficulty);
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
      uniqueSolution: true,
      cells,
      answerKey: solution,
      cages,
      notes: [
        `${selectedDifficulty} zero killer puzzle with ${cages.length} cages and ${uncagedCount} uncaged cells.`,
        sudokuVariationDescriptions[selectedVariation],
        `Generated with ${stats.uniquenessChecks} bounded uniqueness checks.`,
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
    uniqueSolution: true,
    cells,
    answerKey: solution,
    notes: [`${selectedDifficulty} ${variationLabel.toLowerCase()} puzzle with ${givenCount} givens and a unique generated solution.`, sudokuVariationDescriptions[selectedVariation]],
  });
  return { ...generatedPuzzle, sudokuVariation: selectedVariation };
};
