export type PuzzleTerminalState =
  | { kind: "playing" }
  | { kind: "solved" }
  | { kind: "failed"; message?: string };

export const playingTerminalState: PuzzleTerminalState = { kind: "playing" };
export const solvedTerminalState: PuzzleTerminalState = { kind: "solved" };
export const failedTerminalState = (message?: string): PuzzleTerminalState => ({
  kind: "failed",
  ...(message ? { message } : {}),
});
