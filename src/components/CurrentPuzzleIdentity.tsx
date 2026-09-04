import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { GeneratedPuzzle } from "../catalog/types";
import { getCanonicalDailyPuzzleLabel } from "../games/shared/daily";
import { normalizeSudokuVariation, sudokuVariationLabels } from "../games/sudoku/variation";

type CurrentPuzzleIdentityModel = {
  isToday: boolean;
  details: string[];
};

type CurrentPuzzleHeaderProps = {
  puzzle: GeneratedPuzzle;
  newPuzzleControl?: ComponentChildren;
  isArriving?: boolean;
};

export const getCurrentPuzzleIdentity = (puzzle: GeneratedPuzzle): CurrentPuzzleIdentityModel => {
  const isToday = Boolean(getCanonicalDailyPuzzleLabel(puzzle));

  if (puzzle.puzzleId === "sudoku") {
    return {
      isToday,
      details: [
        puzzle.difficulty,
        sudokuVariationLabels[normalizeSudokuVariation(puzzle.sudokuVariation)],
      ].filter((detail): detail is string => Boolean(detail)),
    };
  }

  if (puzzle.puzzleId === "nonogram") {
    return {
      isToday,
      details: [
        puzzle.difficulty,
        `${puzzle.width}×${puzzle.height}`,
        puzzle.uniqueSolution ? "Exactly one solution" : "Uniqueness not required",
      ].filter((detail): detail is string => Boolean(detail)),
    };
  }

  return {
    isToday,
    details: [
      puzzle.difficulty,
      `${puzzle.width}×${puzzle.height}`,
    ].filter((detail): detail is string => Boolean(detail)),
  };
};

export const getPuzzleArrivalIdentity = (puzzle: GeneratedPuzzle) => [
  puzzle.puzzleId,
  puzzle.seed,
  puzzle.width,
  puzzle.height,
  puzzle.difficulty ?? "",
  puzzle.uniqueSolution === undefined ? "" : puzzle.uniqueSolution ? "one" : "unchecked",
  puzzle.sudokuVariation ?? "",
].join(":");

export const usePuzzleArrival = (identity: string | null) => {
  const previousIdentityRef = useRef<string | null>(null);
  const isArriving = Boolean(
    identity && previousIdentityRef.current && previousIdentityRef.current !== identity,
  );

  useEffect(() => {
    previousIdentityRef.current = identity;
  }, [identity]);

  return isArriving;
};

export const CurrentPuzzleHeader = ({
  puzzle,
  newPuzzleControl,
  isArriving = false,
}: CurrentPuzzleHeaderProps) => {
  const identity = getCurrentPuzzleIdentity(puzzle);
  const fullIdentity = [identity.isToday ? "Today" : null, ...identity.details]
    .filter((part): part is string => Boolean(part));

  return (
    <div class="current-puzzle-header">
      <div
        class={`current-puzzle-identity${isArriving ? " is-arriving" : ""}`}
        aria-label={`Current puzzle: ${fullIdentity.join(", ")}`}
      >
        {identity.isToday ? <strong>Today</strong> : null}
        {identity.details.map((detail) => (
          <span key={detail}>{detail}</span>
        ))}
      </div>
      {newPuzzleControl}
    </div>
  );
};
