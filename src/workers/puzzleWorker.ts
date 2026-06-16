/// <reference lib="webworker" />

import type { PuzzleGenerationRequest, PuzzleGenerationResponse } from "../catalog/types";
import { generatePuzzle } from "../games/registry";

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", (event: MessageEvent<PuzzleGenerationRequest>) => {
  const { requestId, ...generationRequest } = event.data;

  try {
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
