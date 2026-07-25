import type { GridPuzzleInequality, PuzzleDifficulty, PuzzleGenerator } from "../../catalog/types";
import { createGeneratedPuzzle, createRandom, normalizeDimension, normalizeSeed } from "../shared";

const difficultyConfig: Record<PuzzleDifficulty, { givenRatio: number; inequalityRatio: number }> = {
  Easy: { givenRatio: 0.44, inequalityRatio: 0.48 },
  Medium: { givenRatio: 0.3, inequalityRatio: 0.4 },
  Hard: { givenRatio: 0.2, inequalityRatio: 0.34 },
  Expert: { givenRatio: 0.12, inequalityRatio: 0.3 },
};

const shuffle = <T>(values: T[], random: () => number) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const cellIndex = (row: number, column: number, size: number) => row * size + column;

const makeSolution = (size: number, random: () => number) => {
  const symbols = shuffle(Array.from({ length: size }, (_, index) => index + 1), random);
  const rows = shuffle(Array.from({ length: size }, (_, index) => index), random);
  const columns = shuffle(Array.from({ length: size }, (_, index) => index), random);
  return rows.flatMap((sourceRow) => columns.map((sourceColumn) => symbols[(sourceRow + sourceColumn) % size]));
};

const makeInequalities = (solution: number[], size: number, ratio: number, random: () => number): GridPuzzleInequality[] => {
  const pairs: Array<[{ row: number; column: number }, { row: number; column: number }]> = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (column + 1 < size) pairs.push([{ row, column }, { row, column: column + 1 }]);
      if (row + 1 < size) pairs.push([{ row, column }, { row: row + 1, column }]);
    }
  }

  const target = Math.max(size, Math.round(pairs.length * ratio));
  return shuffle(pairs, random).slice(0, target).map(([left, right]) =>
    solution[cellIndex(left.row, left.column, size)] < solution[cellIndex(right.row, right.column, size)]
      ? { lesser: left, greater: right }
      : { lesser: right, greater: left },
  );
};

export const countFutoshikiSolutions = (
  size: number,
  givens: Array<number | null>,
  inequalities: GridPuzzleInequality[],
  limit = 2,
) => {
  const values = givens.map((value) => value ?? 0);
  const rowUsed = Array.from({ length: size }, () => new Set<number>());
  const columnUsed = Array.from({ length: size }, () => new Set<number>());
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value) continue;
    rowUsed[Math.floor(index / size)].add(value);
    columnUsed[index % size].add(value);
  }

  const related = Array.from({ length: size * size }, () => [] as GridPuzzleInequality[]);
  for (const inequality of inequalities) {
    related[cellIndex(inequality.lesser.row, inequality.lesser.column, size)].push(inequality);
    related[cellIndex(inequality.greater.row, inequality.greater.column, size)].push(inequality);
  }

  const respectsInequalities = (index: number, value: number) => related[index].every((inequality) => {
    const lesserIndex = cellIndex(inequality.lesser.row, inequality.lesser.column, size);
    const greaterIndex = cellIndex(inequality.greater.row, inequality.greater.column, size);
    const lesserValue = lesserIndex === index ? value : values[lesserIndex];
    const greaterValue = greaterIndex === index ? value : values[greaterIndex];
    return !lesserValue || !greaterValue || lesserValue < greaterValue;
  });

  let solutionCount = 0;
  const search = () => {
    if (solutionCount >= limit) return;
    let chosenIndex = -1;
    let chosenCandidates: number[] = [];
    for (let index = 0; index < values.length; index += 1) {
      if (values[index]) continue;
      const row = Math.floor(index / size);
      const column = index % size;
      const candidates = Array.from({ length: size }, (_, offset) => offset + 1).filter(
        (value) => !rowUsed[row].has(value) && !columnUsed[column].has(value) && respectsInequalities(index, value),
      );
      if (candidates.length === 0) return;
      if (chosenIndex < 0 || candidates.length < chosenCandidates.length) {
        chosenIndex = index;
        chosenCandidates = candidates;
        if (candidates.length === 1) break;
      }
    }
    if (chosenIndex < 0) {
      solutionCount += 1;
      return;
    }
    const row = Math.floor(chosenIndex / size);
    const column = chosenIndex % size;
    for (const value of chosenCandidates) {
      values[chosenIndex] = value;
      rowUsed[row].add(value);
      columnUsed[column].add(value);
      search();
      rowUsed[row].delete(value);
      columnUsed[column].delete(value);
      values[chosenIndex] = 0;
      if (solutionCount >= limit) return;
    }
  };

  search();
  return solutionCount;
};

export const generateFutoshiki: PuzzleGenerator = ({ seed, width, difficulty }) => {
  const normalizedSeed = normalizeSeed(seed);
  const size = normalizeDimension(width, 5, 4, 6);
  const normalizedDifficulty = difficulty ?? "Medium";
  const config = difficultyConfig[normalizedDifficulty];
  const random = createRandom(`futoshiki:v1:${normalizedSeed}:${size}:${normalizedDifficulty}`);
  const solution = makeSolution(size, random);
  const inequalities = makeInequalities(solution, size, config.inequalityRatio, random);
  const givens: Array<number | null> = [...solution];
  const targetGivenCount = Math.max(1, Math.round(size * size * config.givenRatio));

  for (const index of shuffle(Array.from({ length: size * size }, (_, value) => value), random)) {
    if (givens.filter(Boolean).length <= targetGivenCount) break;
    const previous = givens[index];
    givens[index] = null;
    if (countFutoshikiSolutions(size, givens, inequalities) !== 1) givens[index] = previous;
  }

  const cells = solution.map((value, index) => {
    const row = Math.floor(index / size);
    const column = index % size;
    const given = givens[index];
    return {
      row,
      column,
      value: given ? String(given) : "",
      locked: Boolean(given),
      tone: given ? "given" : "empty",
      ariaLabel: `${given ? `Given ${given}` : "Editable"} Futoshiki cell at row ${row + 1}, column ${column + 1}`,
    } as const;
  });

  return createGeneratedPuzzle({
    id: `futoshiki-${normalizedSeed}-${size}-${normalizedDifficulty.toLowerCase()}`,
    puzzleId: "futoshiki",
    title: "Futoshiki",
    seed: normalizedSeed,
    width: size,
    height: size,
    difficulty: normalizedDifficulty,
    uniqueSolution: true,
    cells,
    answerKey: solution.map(String),
    inequalities,
    notes: ["Fill each row and column with 1 through the board size. Every inequality must be true."],
  });
};
