import { describe, expect, it } from "vitest";
import { failedTerminalState, playingTerminalState, solvedTerminalState } from "./puzzleTerminalState";

describe("puzzle terminal state", () => {
  it("keeps playing, solved, and failed outcomes semantically distinct", () => {
    expect(playingTerminalState).toEqual({ kind: "playing" });
    expect(solvedTerminalState).toEqual({ kind: "solved" });
    expect(failedTerminalState("No match")).toEqual({ kind: "failed", message: "No match" });
  });
});
