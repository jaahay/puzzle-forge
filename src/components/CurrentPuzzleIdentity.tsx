import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { getPuzzleDefinition } from "../catalog/puzzleCatalog";
import type { GeneratedPuzzle } from "../catalog/types";
import { getPuzzleProvenance } from "../app/puzzleProvenance";
import { defaultSudokuVariation, normalizeSudokuVariation, sudokuVariationLabels } from "../games/sudoku/variation";
import { useLiveLocalDateStamp } from "./NewPuzzleActionVisuals";

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

type CurrentPuzzleIdentityModel = {
  puzzleLabel: string;
  sourceLabel: string | null;
  details: string[];
  difficultyLabel: string | null;
};

type CurrentPuzzleHeaderProps = {
  puzzle: GeneratedPuzzle;
  historyControl?: ComponentChildren;
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
  const provenance = getPuzzleProvenance(puzzle);
  const dailyDateStamp = provenance?.source === "daily" ? provenance.dateStamp : null;
  const sourceLabel = dailyDateStamp
    ? dailyDateStamp === currentDateStamp
      ? "Today"
      : `Daily ${formatDailyDateLabel(dailyDateStamp, currentDateStamp)}`
    : null;
  const definition = getPuzzleDefinition(puzzle.puzzleId);
  const difficultyLabel = puzzle.difficulty ?? null;
  const sizeDetail = puzzle.width === definition.defaultWidth && puzzle.height === definition.defaultHeight
    ? null
    : `${puzzle.width}×${puzzle.height}`;

  if (puzzle.puzzleId === "sudoku") {
    const variation = normalizeSudokuVariation(puzzle.sudokuVariation);
    return {
      puzzleLabel: definition.title,
      sourceLabel,
      details: [
        variation === defaultSudokuVariation ? null : sudokuVariationLabels[variation],
      ].filter((detail): detail is string => Boolean(detail)),
      difficultyLabel,
    };
  }

  if (puzzle.puzzleId === "nonogram") {
    return {
      puzzleLabel: definition.title,
      sourceLabel,
      details: [
        sizeDetail,
        puzzle.uniqueSolution === false ? "Uniqueness not required" : null,
      ].filter((detail): detail is string => Boolean(detail)),
      difficultyLabel,
    };
  }

  return {
    puzzleLabel: definition.title,
    sourceLabel,
    details: [sizeDetail].filter((detail): detail is string => Boolean(detail)),
    difficultyLabel,
  };
};

export const getPuzzleArrivalIdentity = (puzzle: GeneratedPuzzle) => {
  const provenance = getPuzzleProvenance(puzzle);
  return [
    puzzle.puzzleId,
    puzzle.seed,
    puzzle.width,
    puzzle.height,
    puzzle.difficulty ?? "",
    puzzle.uniqueSolution === undefined ? "" : puzzle.uniqueSolution ? "one" : "unchecked",
    puzzle.sudokuVariation ?? "",
    provenance?.source ?? "",
    provenance?.dateStamp ?? "",
  ].join(":");
};

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
  historyControl,
  newPuzzleControl,
  isArriving = false,
}: CurrentPuzzleHeaderProps) => {
  const currentDateStamp = useLiveLocalDateStamp();
  const identity = getCurrentPuzzleIdentity(puzzle, currentDateStamp);
  const fullIdentity = [
    identity.puzzleLabel,
    identity.sourceLabel,
    ...identity.details,
    identity.difficultyLabel,
  ].filter((part): part is string => Boolean(part));

  return (
    <div class="current-puzzle-header">
      <div class="current-puzzle-context">
        <div
          class={`current-puzzle-identity${isArriving ? " is-arriving" : ""}`}
          aria-label={`Current puzzle: ${fullIdentity.join(", ")}`}
        >
          <strong class="current-puzzle-type">{identity.puzzleLabel}</strong>
          {identity.sourceLabel ? <span class="current-puzzle-source">{identity.sourceLabel}</span> : null}
          {identity.details.map((detail) => (
            <span key={detail}>{detail}</span>
          ))}
          {identity.difficultyLabel ? (
            <span class="current-puzzle-difficulty">{identity.difficultyLabel}</span>
          ) : null}
        </div>
        {historyControl}
      </div>
      {newPuzzleControl ? <div class="current-puzzle-new-action">{newPuzzleControl}</div> : null}
    </div>
  );
};
