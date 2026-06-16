/// <reference lib="webworker" />

import { generatePuzzle, type Puzzle, type PuzzleRequest } from "../lib/puzzles";

type WorkerResponse = {
  id: string;
  puzzle: Puzzle;
};

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", (event: MessageEvent<PuzzleRequest>) => {
  const puzzle = generatePuzzle(event.data);
  const response: WorkerResponse = {
    id: event.data.id,
    puzzle,
  };

  workerScope.postMessage(response);
});

export {};
