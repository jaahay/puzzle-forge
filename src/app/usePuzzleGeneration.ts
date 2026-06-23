import { useMemo, useRef, useState } from "preact/hooks";
import { getPuzzleDefinition, isGeneratable } from "../catalog/puzzleCatalog";
import type { GeneratedPuzzle, PuzzleDifficulty, PuzzleGenerationRequest, PuzzleGenerationResponse, PuzzleId } from "../catalog/types";
import { defaultSudokuDifficulty, makeRequestId } from "./runtime";

export type BeginGenerationOptions = Partial<Omit<PuzzleGenerationRequest, "requestId">>;

export type PuzzleGenerationState = {
  isGenerating: boolean;
  activeRequestId: string | null;
};

export type PuzzleGenerationDefaults = {
  selectedPuzzleId: PuzzleId;
  seed: string;
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
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

export const usePuzzleGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const activeRequestId = useRef<string | null>(null);
  const worker = useMemo(
    () => new Worker(new URL("../workers/puzzleWorker.ts", import.meta.url), { type: "module" }),
    [],
  );

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
    const definition = getPuzzleDefinition(puzzleId);

    if (!isGeneratable(definition)) {
      activeRequestId.current = null;
      setIsGenerating(false);
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
      solitaireVariation: options.solitaireVariation,
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
    if (event.data.requestId !== activeRequestId.current) {
      return;
    }

    setIsGenerating(false);

    if ("error" in event.data) {
      activeRequestId.current = null;
      onError(event.data.error);
      return;
    }

    activeRequestId.current = null;
    onGenerated(event.data.puzzle);
  };

  const makeReadyMessage = (puzzle: GeneratedPuzzle) =>
    puzzle.puzzleId === "sudoku"
      ? `${puzzle.difficulty ?? defaultSudokuDifficulty} Sudoku ready.`
      : puzzle.puzzleId === "nonogram"
        ? puzzle.uniqueSolution
          ? "Unique Nonogram ready."
          : "Open Nonogram ready. Multiple solutions may be possible."
        : `${puzzle.title} generated from seed ${puzzle.seed}.`;

  return {
    isGenerating,
    activeRequestId: activeRequestId.current,
    worker,
    beginGeneration,
    handleGenerationMessage,
    makeReadyMessage,
    setIsGenerating,
  };
};
