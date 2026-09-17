import { describe, expect, it } from "vitest";
import { getWordGuessTerminalState } from "./WordGuessGame";

describe("Word Guess terminal mapping", () => {
  it("maps active, won, and lost progress to distinct platform terminal states", () => {
    expect(getWordGuessTerminalState("playing")).toEqual({ kind: "playing" });
    expect(getWordGuessTerminalState("won")).toEqual({ kind: "solved" });
    expect(getWordGuessTerminalState("lost", "No match. The word was CRANE.")).toEqual({
      kind: "failed",
      message: "No match. The word was CRANE.",
    });
  });
});
