import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getPuzzleDefinition, isGeneratable } from "../catalog/puzzleCatalog";
import type {
  GeneratedPuzzle,
  JigsawBoundaryMode,
  JigsawCutStyle,
  JigsawSpecialPiecesMode,
  PuzzleDefinition,
  PuzzleDifficulty,
  PuzzleGenerationRequest,
  PuzzleGenerationResponse,
  PuzzleId,
  SolitaireVariation,
  SudokuVariation,
} from "../catalog/types";
import { isImageBackedPuzzleId } from "../games/imageAssets";
import { defaultJigsawBoundaryMode } from "../games/jigsaw/boundaryContours";
import { defaultJigsawCutStyle } from "../games/jigsaw/cutStyle";
import { defaultJigsawSpecialPiecesMode } from "../games/jigsaw/specialPieces";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { defaultSudokuVariation, normalizeSudokuVariation } from "../games/sudoku/variation";
import type { NextPuzzleDraft } from "./generationSettings";
import { withPuzzleProvenance, type PuzzleProvenance } from "./puzzleProvenance";
import { defaultPuzzleDifficulty, makeRequestId } from "./runtime";

export type BeginGenerationOptions = Partial<Omit<PuzzleGenerationRequest, "requestId">> & {
  provenance?: PuzzleProvenance;
};

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
  hasActiveGenerationRequest?: boolean;
  hasPuzzle: boolean;
  selectedPuzzleIsGeneratable: boolean;
};

type MissingPuzzleGenerationInput = {
  selectedPuzzleId: PuzzleId;
  selectedDefinition: PuzzleDefinition;
  seed: string;
  width?: number;
  height?: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  sudokuVariation: SudokuVariation;
  solitaireVariation: SolitaireVariation;
  jigsawCutStyle?: JigsawCutStyle;
  jigsawBoundaryMode?: JigsawBoundaryMode;
  jigsawSpecialPiecesMode?: JigsawSpecialPiecesMode;
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

const normalizeDimension = (value: number | undefined, minimum: number, maximum: number, fallback: number) => {
  const numericValue = Number.isFinite(value) ? Math.round(Number(value)) : fallback;
  return Math.min(maximum, Math.max(minimum, numericValue));
};

export const shouldRecoverMissingPuzzleSurface = ({
  hasSelectedPuzzle,
  isHomeSelected,
  isGenerating,
  hasActiveGenerationRequest = false,
  hasPuzzle,
  selectedPuzzleIsGeneratable,
}: MissingPuzzleSurfaceState) =>
  hasSelectedPuzzle &&
  !isHomeSelected &&
  !isGenerating &&
  !hasActiveGenerationRequest &&
  !hasPuzzle &&
  selectedPuzzleIsGeneratable;

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
    width: normalizeDimension(rememberedDraft?.width, definition.minWidth, definition.maxWidth, definition.defaultWidth),
    height: normalizeDimension(rememberedDraft?.height, definition.minHeight, definition.maxHeight, definition.defaultHeight),
    difficulty: rememberedDraft?.difficulty ?? defaultPuzzleDifficulty,
    requireUniqueSolution: rememberedDraft?.requireUniqueSolution ?? true,
    sudokuVariation: puzzleId === "sudoku"
      ? rememberedDraft?.sudokuVariation ?? defaultSudokuVariation
      : undefined,
    solitaireVariation: puzzleId === "klondike-solitaire"
      ? rememberedDraft?.solitaireVariation ?? defaultSolitaireVariation
      : undefined,
    imageId: isImageBackedPuzzleId(puzzleId) ? rememberedDraft?.imageId : undefined,
    jigsawCutStyle: puzzleId === "jigsaw"
      ? rememberedDraft?.jigsawCutStyle ?? defaultJigsawCutStyle
      : undefined,
    jigsawBoundaryMode: puzzleId === "jigsaw"
      ? rememberedDraft?.jigsawBoundaryMode ?? defaultJigsawBoundaryMode
      : undefined,
    jigsawSpecialPiecesMode: puzzleId === "jigsaw"
      ? rememberedDraft?.jigsawSpecialPiecesMode ?? defaultJigsawSpecialPiecesMode
      : undefined,
  };
};

export const makeMissingPuzzleGenerationOptions = ({
  selectedPuzzleId,
  selectedDefinition,
  seed,
  width,
  height,
  difficulty,
  requireUniqueSolution,
  sudokuVariation,
  solitaireVariation,
  jigsawCutStyle,
  jigsawBoundaryMode,
  jigsawSpecialPiecesMode,
  makeSeed,
}: MissingPuzzleGenerationInput): BeginGenerationOptions => ({
  puzzleId: selectedPuzzleId,
  seed: seed.trim() || makeSeed(),
  width: normalizeDimension(width, selectedDefinition.minWidth, selectedDefinition.maxWidth, selectedDefinition.defaultWidth),
  height: normalizeDimension(height, selectedDefinition.minHeight, selectedDefinition.maxHeight, selectedDefinition.defaultHeight),
  difficulty,
  requireUniqueSolution,
  sudokuVariation: selectedPuzzleId === "sudoku" ? sudokuVariation : undefined,
  solitaireVariation: selectedPuzzleId === "klondike-solitaire" ? solitaireVariation : undefined,
  jigsawCutStyle: selectedPuzzleId === "jigsaw" ? jigsawCutStyle : undefined,
  jigsawBoundaryMode: selectedPuzzleId === "jigsaw" ? jigsawBoundaryMode : undefined,
  jigsawSpecialPiecesMode:
    selectedPuzzleId === "jigsaw" ? jigsawSpecialPiecesMode : undefined,
});

export const usePuzzleGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const activeRequestId = useRef<string | null>(null);
  const activeProvenance = useRef<PuzzleProvenance | undefined>(undefined);
  const worker = useMemo(
    () => new Worker(new URL("../workers/puzzleWorker.ts", import.meta.url), { type: "module" }),
    [],
  );

  useEffect(() => () => worker.terminate(), [worker]);

  const hasActiveRequest = () => activeRequestId.current !== null;

  const cancelGeneration = () => {
    activeRequestId.current = null;
    activeProvenance.current = undefined;
    setIsGenerating(false);
  };

  const beginGeneration = (
    defaults: PuzzleGenerationDefaults,
    options: BeginGenerationOptions = {},
  ): BeginGenerationResult => {
    const puzzleId = options.puzzleId ?? defaults.selectedPuzzleId;
    const definition = getPuzzleDefinition(puzzleId);
    const seed = options.seed ?? defaults.seed;
    const width = normalizeDimension(options.width ?? defaults.width, definition.minWidth, definition.maxWidth, definition.defaultWidth);
    const height = normalizeDimension(options.height ?? defaults.height, definition.minHeight, definition.maxHeight, definition.defaultHeight);
    const difficulty = options.difficulty ?? defaults.difficulty;
    const requireUniqueSolution = options.requireUniqueSolution ?? defaults.requireUniqueSolution;
    const sudokuVariation = puzzleId === "sudoku" ? normalizeSudokuVariation(options.sudokuVariation ?? defaults.sudokuVariation ?? defaultSudokuVariation) : undefined;

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
      jigsawCutStyle: puzzleId === "jigsaw"
        ? options.jigsawCutStyle ?? defaultJigsawCutStyle
        : undefined,
      jigsawBoundaryMode: puzzleId === "jigsaw"
        ? options.jigsawBoundaryMode ?? defaultJigsawBoundaryMode
        : undefined,
      jigsawSpecialPiecesMode: puzzleId === "jigsaw"
        ? options.jigsawSpecialPiecesMode ?? defaultJigsawSpecialPiecesMode
        : undefined,
    };

    activeRequestId.current = request.requestId;
    activeProvenance.current = options.provenance ? { ...options.provenance } : undefined;
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

    const provenance = activeProvenance.current ? { ...activeProvenance.current } : undefined;
    cancelGeneration();

    if ("error" in event.data) {
      onError(event.data.error);
      return;
    }

    onGenerated(withPuzzleProvenance(event.data.puzzle, provenance));
  };

  return {
    isGenerating,
    worker,
    beginGeneration,
    hasActiveRequest,
    cancelGeneration,
    handleGenerationMessage,
  };
};
