import { useRef, useState } from "preact/hooks";
import { getPuzzleDefinition } from "../catalog/puzzleCatalog";
import type { GeneratedPuzzle, PuzzleId } from "../catalog/types";
import { isImageBackedPuzzleId } from "../games/imageAssets";
import { defaultSolitaireVariation, normalizeSolitaireVariation } from "../games/solitaire/variation";
import { defaultSudokuVariation, normalizeSudokuVariation } from "../games/sudoku/variation";
import type { GenerationSettings, NextPuzzleDraft } from "./generationSettings";
import type { GenerationRuntimeSettings } from "./generationIdentity";
import {
  loadNextPuzzleDraftCache,
  saveNextPuzzleDraftCache,
  type NextPuzzleDraftCache,
} from "./nextPuzzleDraftPersistence";
import { defaultPuzzleDifficulty } from "./runtime";

type BuildNextPuzzleDraftInput = {
  puzzleId: PuzzleId;
  selectedPuzzleId: PuzzleId;
  currentPuzzle: GeneratedPuzzle | null;
  runtimeSettings: GenerationRuntimeSettings;
};

export const buildNextPuzzleDraft = ({
  puzzleId,
  selectedPuzzleId,
  currentPuzzle,
  runtimeSettings,
}: BuildNextPuzzleDraftInput): NextPuzzleDraft => {
  const definition = getPuzzleDefinition(puzzleId);
  const puzzle = currentPuzzle?.puzzleId === puzzleId ? currentPuzzle : null;
  const cards = puzzle?.kind === "cards" ? puzzle : null;
  const imageId = puzzle?.kind === "tiles" && puzzle.asset.kind === "image" ? puzzle.asset.id : undefined;
  const useRuntimeFallback = puzzleId === selectedPuzzleId;

  return {
    width: puzzle?.width ?? (useRuntimeFallback ? runtimeSettings.width : definition.defaultWidth),
    height: puzzle?.height ?? (useRuntimeFallback ? runtimeSettings.height : definition.defaultHeight),
    difficulty: puzzle?.difficulty ?? (useRuntimeFallback ? runtimeSettings.difficulty : defaultPuzzleDifficulty),
    requireUniqueSolution: puzzle?.uniqueSolution ?? (useRuntimeFallback ? runtimeSettings.requireUniqueSolution : true),
    sudokuVariation:
      puzzle?.puzzleId === "sudoku"
        ? normalizeSudokuVariation(puzzle.sudokuVariation)
        : useRuntimeFallback
          ? normalizeSudokuVariation(runtimeSettings.sudokuVariation)
          : defaultSudokuVariation,
    solitaireVariation:
      cards?.puzzleId === "klondike-solitaire"
        ? normalizeSolitaireVariation(cards.solitaireVariation)
        : useRuntimeFallback
          ? normalizeSolitaireVariation(runtimeSettings.solitaireVariation)
          : defaultSolitaireVariation,
    ...(imageId ? { imageId } : {}),
  };
};

const updateDraft = (base: NextPuzzleDraft, settings: GenerationSettings): NextPuzzleDraft => ({
  width: Number.isFinite(settings.width) ? Number(settings.width) : base.width,
  height: Number.isFinite(settings.height) ? Number(settings.height) : base.height,
  difficulty: settings.difficulty ?? base.difficulty,
  requireUniqueSolution:
    typeof settings.requireUniqueSolution === "boolean"
      ? settings.requireUniqueSolution
      : base.requireUniqueSolution,
  sudokuVariation: settings.sudokuVariation
    ? normalizeSudokuVariation(settings.sudokuVariation)
    : base.sudokuVariation,
  solitaireVariation: settings.solitaireVariation
    ? normalizeSolitaireVariation(settings.solitaireVariation)
    : base.solitaireVariation,
  imageId: settings.imageId ?? base.imageId,
});

type UseNextPuzzleDraftsInput = {
  selectedPuzzleId: PuzzleId;
  puzzle: GeneratedPuzzle | null;
  runtimeSettings: GenerationRuntimeSettings;
};

export const useNextPuzzleDrafts = ({
  selectedPuzzleId,
  puzzle,
  runtimeSettings,
}: UseNextPuzzleDraftsInput) => {
  const [drafts, setDrafts] = useState<NextPuzzleDraftCache>(loadNextPuzzleDraftCache);
  const draftsRef = useRef(drafts);
  const [seedLoadInputs, setSeedLoadInputs] = useState<Partial<Record<PuzzleId, string>>>({});
  draftsRef.current = drafts;

  const makeDraft = (puzzleId: PuzzleId) =>
    buildNextPuzzleDraft({
      puzzleId,
      selectedPuzzleId,
      currentPuzzle: puzzle,
      runtimeSettings,
    });

  const updateDrafts = (updater: (current: NextPuzzleDraftCache) => NextPuzzleDraftCache) => {
    const next = updater(draftsRef.current);
    draftsRef.current = next;
    setDrafts(next);
    saveNextPuzzleDraftCache(next);
  };

  const currentPuzzleIsVisibleImageConfig =
    isImageBackedPuzzleId(selectedPuzzleId) && puzzle?.puzzleId === selectedPuzzleId;
  const visibleImageDraft = currentPuzzleIsVisibleImageConfig ? makeDraft(selectedPuzzleId) : null;
  const nextPuzzleDraft = visibleImageDraft ?? drafts[selectedPuzzleId] ?? makeDraft(selectedPuzzleId);
  const seedLoadInput = seedLoadInputs[selectedPuzzleId] ?? "";

  const getRememberedNextPuzzleDraft = (puzzleId: PuzzleId) => draftsRef.current[puzzleId] ?? null;

  const updateNextPuzzleDraft = (settings: GenerationSettings) => {
    updateDrafts((current) => {
      const base = current[selectedPuzzleId] ?? makeDraft(selectedPuzzleId);
      return { ...current, [selectedPuzzleId]: updateDraft(base, settings) };
    });
  };

  const updateSeedLoadInput = (seed: string) => {
    setSeedLoadInputs((current) => ({ ...current, [selectedPuzzleId]: seed }));
  };

  const rememberNextPuzzleDraft = () => {
    updateDrafts((current) =>
      currentPuzzleIsVisibleImageConfig || !current[selectedPuzzleId]
        ? { ...current, [selectedPuzzleId]: nextPuzzleDraft }
        : current,
    );
  };

  return {
    nextPuzzleDraft,
    seedLoadInput,
    getRememberedNextPuzzleDraft,
    updateNextPuzzleDraft,
    updateSeedLoadInput,
    rememberNextPuzzleDraft,
  };
};
