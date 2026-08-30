import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getPuzzleDefinition, isGeneratable } from "../catalog/puzzleCatalog";
import type {
  GeneratedPuzzle,
  PuzzleDefinition,
  PuzzleDifficulty,
  PuzzleGenerationRequest,
  PuzzleGenerationResponse,
  PuzzleId,
  SolitaireVariation,
  SudokuVariation,
} from "../catalog/types";
import { isImageBackedPuzzleId } from "../games/imageAssets";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { defaultSudokuVariation, normalizeSudokuVariation, sudokuVariationLabels } from "../games/sudoku/variation";
import type { NextPuzzleDraft } from "./generationSettings";
import { defaultPuzzleDifficulty, makeRequestId } from "./runtime";

export type BeginGenerationOptions = Partial<Omit<PuzzleGenerationRequest, "requestId">>;

export type PuzzleGenerationDefaults = {
  selectedPuzzleId: PuzzleId;
  seed: string;
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  sudokuVariation?: SudokuVariation;
};

type MissingPuzzleSurfaceState = {
  hasSelectedPuzzle: boolean;
  isHomeSelected: boolean;
  isGenerating: boolean;
  hasPuzzle: boolean;
  selectedPuzzleIsGeneratable: boolean;
};

type MissingPuzzleGenerationInput = {
  selectedPuzzleId: PuzzleId;
  selectedDefinition: PuzzleDefinition;
  seed: string;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  sudokuVariation: SudokuVariation;
  solitaireVariation: SolitaireVariation;
  makeSeed: () => string;
};

type InitialPuzzleGenerationInput = {
  puzzleId: PuzzleId;
  makeSeed: () => string;
  rememberedDraft?: NextPuzzleDraft | null;
};

export type BeginGenerationResult =
  | {
      kind: "planned";
      puzzleId: PuzzleId;
      title: string;
    }
  | {
      kind: "started";
      request: PuzzleGenerationRequest;
      title: string;
    };

export const shouldRecoverMissingPuzzleSurface = ({
  hasSelectedPuzzle,
  isHomeSelected,
  isGenerating,
  hasPuzzle,
  selectedPuzzleIsGeneratable,
}: MissingPuzzleSurfaceState) => hasSelectedPuzzle && !isHomeSelected && !isGenerating && !hasPuzzle && selectedPuzzleIsGeneratable;

export const shouldAcceptGenerationResponse = (activeRequestId: string | null, responseRequestId: string) =>
  activeRequestId !== null && responseRequestId === activeRequestId;

export const makeInitialPuzzleGenerationOptions = ({
  puzzleId,
  makeSeed,
  rememberedDraft,
}: InitialPuzzleGenerationInput): BeginGenerationOptions => {
  const definition = getPuzzleDefinition(puzzleId);

  return {
    puzzleId,
    seed: makeSeed(),
    width: rememberedDraft?.width ?? definition.defaultWidth,
    height: rememberedDraft?.height ?? definition.defaultHeight,
    difficulty: rememberedDraft?.difficulty ?? defaultPuzzleDifficulty,
    requireUniqueSolution: rememberedDraft?.requireUniqueSolution ?? true,
    sudokuVariation: puzzleId === "sudoku"
      ? rememberedDraft?.sudokuVariation ?? defaultSudokuVariation
      : undefined,
    solitaireVariation: puzzleId === "klondike-solitaire"
      ? rememberedDraft?.solitaireVariation ?? defaultSolitaireVariation
      : undefined,
  };
};

export const makeMissingPuzzleGenerationOptions = ({
  selectedPuzzleId,
  selectedDefinition,
  seed,
  difficulty,
  requireUniqueSolution,
  sudokuVariation,
  solitaireVariation,
  makeSeed,
}: MissingPuzzleGenerationInput): BeginGenerationOptions => ({
  puzzleId: selectedPuzzleId,
  seed: seed.trim() || makeSeed(),
  width: selectedDefinition.defaultWidth,
  height: selectedDefinition.defaultHeight,
  difficulty,
  requireUniqueSolution,
  sudokuVariation: selectedPuzzleId === "sudoku" ? sudokuVariation : undefined,
  solitaireVariation: selectedPuzzleId === "klondike-solitaire" ? solitaireVariation : undefined,
});

export const usePuzzleGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const activeRequestId = useRef<string | null>(null);
  const worker = useMemo(
    () => new Worker(new URL("../workers/puzzleWorker.ts", import.meta.url), { type: "module" }),
    [],
  );

  useEffect(() => () => worker.terminate(), [worker]);

  const cancelGeneration = () => {
    activeRequestId.current = null;
    setIsGenerating(false);
  };

  const beginGeneration = (
    defaults: PuzzleGenerationDefaults,
    options: BeginGenerationOptions = {},
  ): BeginGenerationResult => {
    const puzzleId = options.puzzleId ?? defaults.selectedPuzzleId;
    const seed = options.seed ?? defaults.seed;
    const width = options.width ?? defaults.width;
    const height = options.height ?? defaults.height;
    const difficulty = options.difficulty ?? defaults.difficulty;
    const requireUniqueSolution = options.requireUniqueSolution ?? defaults.requireUniqueSolution;
    const sudokuVariation = puzzleId === "sudoku" ? normalizeSudokuVariation(options.sudokuVariation ?? defaults.sudokuVariation ?? defaultSudokuVariation) : undefined;
    const definition = getPuzzleDefinition(puzzleId);

    if (!isGeneratable(definition)) {
      cancelGeneration();
      return { kind: "planned", puzzleId, title: definition.title };
    }

    const request: PuzzleGenerationRequest = {
      requestId: makeRequestId(),
      puzzleId,
      seed,
      width,
      height,
      difficulty,
      requireUniqueSolution,
      sudokuVariation,
      solitaireVariation: options.solitaireVariation,
      imageId: isImageBackedPuzzleId(puzzleId) ? options.imageId : undefined,
    };

    activeRequestId.current = request.requestId;
    setIsGenerating(true);
    worker.postMessage(request);

    return { kind: "started", request, title: definition.title };
  };

  const handleGenerationMessage = (
    event: MessageEvent<PuzzleGenerationResponse>,
    onGenerated: (puzzle: GeneratedPuzzle) => void,
    onError: (error: string) => void,
  ) => {
    if (!shouldAcceptGenerationResponse(activeRequestId.current, event.data.requestId)) return;

    cancelGeneration();

    if ("error" in event.data) {
      onError(event.data.error);
      return;
    }

    onGenerated(event.data.puzzle);
  };

  const makeReadyMessage = (puzzle: GeneratedPuzzle) =>
    puzzle.puzzleId === "sudoku"
      ? `${puzzle.difficulty ?? defaultPuzzleDifficulty} ${sudokuVariationLabels[normalizeSudokuVariation(puzzle.sudokuVariation)]} Sudoku ready.`
      : puzzle.puzzleId === "nonogram"
        ? puzzle.uniqueSolution
          ? "Unique Nonogram ready."
          : "Open Nonogram ready. Multiple solutions may be possible."
        : `${puzzle.title} ready.`;

  return {
    isGenerating,
    worker,
    beginGeneration,
    cancelGeneration,
    handleGenerationMessage,
    makeReadyMessage,
  };
};
