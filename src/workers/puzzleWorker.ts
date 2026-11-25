/// <reference lib="webworker" />

import type { PuzzleGenerationWorkerRequest, PuzzleGenerationResponse } from "../catalog/types";
import { generatePuzzle } from "../games/registry";
import { loadGeneralWordSearchWords } from "../games/wordSearch/generalWords";

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", async (event: MessageEvent<PuzzleGenerationWorkerRequest>) => {
  const { requestId, wordGuessAnswers, ...generationRequest } = event.data;

  try {
    const generalWords = generationRequest.puzzleId === "word-search" && generationRequest.wordSearchTheme === "general"
      ? await loadGeneralWordSearchWords() : undefined;
    const response: PuzzleGenerationResponse = {
      requestId,
      puzzle: generatePuzzle(generationRequest, wordGuessAnswers, generalWords),
    };

    workerScope.postMessage(response);
  } catch (reason) {
    const response: PuzzleGenerationResponse = {
      requestId,
      error: reason instanceof Error ? reason.message : "Puzzle generation failed.",
    };

    workerScope.postMessage(response);
  }
});

export {};
