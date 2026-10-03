export type PuzzleTerminalState =
  | { kind: "playing" }
  | { kind: "solved" }
  | { kind: "failed"; message?: string };

type PlayingTerminalState = Extract<PuzzleTerminalState, { kind: "playing" }>;
type SolvedTerminalState = Extract<PuzzleTerminalState, { kind: "solved" }>;
type FailedTerminalState = Extract<PuzzleTerminalState, { kind: "failed" }>;

export const playingTerminalState: PlayingTerminalState = { kind: "playing" };
export const solvedTerminalState: SolvedTerminalState = { kind: "solved" };
export const failedTerminalState = (message?: string): FailedTerminalState => ({
  kind: "failed",
  ...(message ? { message } : {}),
});
