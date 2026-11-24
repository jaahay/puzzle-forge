/// <reference lib="webworker" />

import type { PuzzleGenerationRequest, PuzzleGenerationResponse } from "../catalog/types";
import { generatePuzzle } from "../games/registry";
import { loadWordGuessAnswerBank, normalizeWordGuessLength } from "../games/wordGuess/words";

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", async (event: MessageEvent<PuzzleGenerationRequest>) => {
  const { requestId, ...generationRequest } = event.data;

  try {
    if (generationRequest.puzzleId === "word-guess") {
      await loadWordGuessAnswerBank(normalizeWordGuessLength(generationRequest.width));
    }

    const response: PuzzleGenerationResponse = {
      requestId,
      puzzle: generatePuzzle(generationRequest),
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
