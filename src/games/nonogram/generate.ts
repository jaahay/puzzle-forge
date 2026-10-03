import type { PuzzleDifficulty, PuzzleGenerator } from "../../catalog/types";
import { createGeneratedPuzzle, createRandom, normalizeDimension, normalizeSeed } from "../shared";
import { FILLED_NONOGRAM_CELL, buildNonogramCluesFromSolution, hasUniqueNonogramSolution } from "./solve";

const difficultyConfig: Record<PuzzleDifficulty, { fillThreshold: number; maxAttempts: number; maxSearchNodes: number }> = {
  Easy: { fillThreshold: 0.36, maxAttempts: 120, maxSearchNodes: 22000 },
  Medium: { fillThreshold: 0.48, maxAttempts: 160, maxSearchNodes: 30000 },
  Hard: { fillThreshold: 0.56, maxAttempts: 200, maxSearchNodes: 36000 },
  Expert: { fillThreshold: 0.62, maxAttempts: 240, maxSearchNodes: 42000 },
};

const fallbackUniqueSolution = (width: number, height: number) => Array.from({ length: width * height }, () => true);

export const generateNonogram: PuzzleGenerator = ({ seed, width, height, difficulty, requireUniqueSolution = true }) => {
  const normalizedSeed = normalizeSeed(seed);
  const boundedWidth = normalizeDimension(width, 8, 5, 12);
  const boundedHeight = normalizeDimension(height, 8, 5, 12);
  const normalizedDifficulty = difficulty ?? "Medium";
  const config = difficultyConfig[normalizedDifficulty];
  let solution = fallbackUniqueSolution(boundedWidth, boundedHeight);
  let clues = buildNonogramCluesFromSolution(solution, boundedWidth, boundedHeight);
  let uniqueSolution = true;
  const attemptCount = requireUniqueSolution ? config.maxAttempts : 1;

  for (let attempt = 0; attempt < attemptCount; attempt += 1) {
    const random = createRandom(`nonogram:${normalizedSeed}:${boundedWidth}x${boundedHeight}:${normalizedDifficulty}:${attempt}`);
    const candidateSolution = Array.from({ length: boundedWidth * boundedHeight }, () => random() > config.fillThreshold);
    const candidateClues = buildNonogramCluesFromSolution(candidateSolution, boundedWidth, boundedHeight);

    if (!requireUniqueSolution) {
      solution = candidateSolution;
      clues = candidateClues;
      uniqueSolution = false;
      break;
    }

    if (
      hasUniqueNonogramSolution({
        width: boundedWidth,
        height: boundedHeight,
        clues: candidateClues,
        maxSearchNodes: config.maxSearchNodes,
      })
    ) {
      solution = candidateSolution;
      clues = candidateClues;
      uniqueSolution = true;
      break;
    }
  }

  const answerKey = solution.map((isFilled) => (isFilled ? FILLED_NONOGRAM_CELL : ""));
  const cells = Array.from({ length: boundedWidth * boundedHeight }, (_, index) => {
    const row = Math.floor(index / boundedWidth);
    const column = index % boundedWidth;

    return {
      row,
      column,
      value: "",
      locked: false,
      tone: "empty",
      ariaLabel: `Playable nonogram cell at row ${row + 1}, column ${column + 1}`,
    } as const;
  });

  return createGeneratedPuzzle({
    id: `nonogram-${normalizedSeed}-${normalizedDifficulty.toLowerCase()}-${requireUniqueSolution ? "unique" : "open"}`,
    puzzleId: "nonogram",
    title: "Nonogram",
    seed: normalizedSeed,
    width: boundedWidth,
    height: boundedHeight,
    difficulty: normalizedDifficulty,
    uniqueSolution,
    cells,
    answerKey,
    clues,
    notes: [],
  });
};
