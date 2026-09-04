import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { GeneratedPuzzle } from "../catalog/types";
import { getCanonicalDailyPuzzleLabel } from "../games/shared/daily";
import { normalizeSudokuVariation, sudokuVariationLabels } from "../games/sudoku/variation";
import { useLiveLocalDateStamp } from "./NewPuzzleActionVisuals";

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

type CurrentPuzzleIdentityModel = {
  sourceLabel: string | null;
  details: string[];
};

type CurrentPuzzleHeaderProps = {
  puzzle: GeneratedPuzzle;
  newPuzzleControl?: ComponentChildren;
  isArriving?: boolean;
};

const formatDailyDateLabel = (dateStamp: string, currentDateStamp: string) => {
  const [year = "", month = "1", day = "1"] = dateStamp.split("-");
  const [currentYear = ""] = currentDateStamp.split("-");
  const monthIndex = Math.max(0, Math.min(11, Number(month) - 1));
  const yearSuffix = year && year !== currentYear ? `, ${year}` : "";
  return `${monthLabels[monthIndex]} ${Number(day)}${yearSuffix}`;
};

export const getCurrentPuzzleIdentity = (
  puzzle: GeneratedPuzzle,
  currentDateStamp: string,
): CurrentPuzzleIdentityModel => {
  const dailyDateStamp = getCanonicalDailyPuzzleLabel(puzzle);
  const sourceLabel = dailyDateStamp
    ? dailyDateStamp === currentDateStamp
      ? "Today"
      : `Daily ${formatDailyDateLabel(dailyDateStamp, currentDateStamp)}`
    : null;

  if (puzzle.puzzleId === "sudoku") {
    return {
      sourceLabel,
      details: [
        puzzle.difficulty,
        sudokuVariationLabels[normalizeSudokuVariation(puzzle.sudokuVariation)],
      ].filter((detail): detail is string => Boolean(detail)),
    };
  }

  if (puzzle.puzzleId === "nonogram") {
    return {
      sourceLabel,
      details: [
        puzzle.difficulty,
        `${puzzle.width}×${puzzle.height}`,
        puzzle.uniqueSolution ? "Exactly one solution" : "Uniqueness not required",
      ].filter((detail): detail is string => Boolean(detail)),
    };
  }

  return {
    sourceLabel,
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
  const currentDateStamp = useLiveLocalDateStamp();
  const identity = getCurrentPuzzleIdentity(puzzle, currentDateStamp);
  const fullIdentity = [identity.sourceLabel, ...identity.details]
    .filter((part): part is string => Boolean(part));

  return (
    <div class="current-puzzle-header">
      <div
        class={`current-puzzle-identity${isArriving ? " is-arriving" : ""}`}
        aria-label={`Current puzzle: ${fullIdentity.join(", ")}`}
      >
        {identity.sourceLabel ? <strong>{identity.sourceLabel}</strong> : null}
        {identity.details.map((detail) => (
          <span key={detail}>{detail}</span>
        ))}
      </div>
      {newPuzzleControl}
    </div>
  );
};
