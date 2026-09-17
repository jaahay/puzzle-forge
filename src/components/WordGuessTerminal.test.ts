import { describe, expect, it } from "vitest";
import { getWordGuessActionPresentation, getWordGuessTerminalState } from "./WordGuessGame";

describe("Word Guess terminal mapping", () => {
  it("maps active, won, and lost progress to distinct platform terminal states", () => {
    expect(getWordGuessTerminalState("playing")).toEqual({ kind: "playing" });
    expect(getWordGuessTerminalState("won")).toEqual({ kind: "solved" });
    expect(getWordGuessTerminalState("lost", "No match. The word was CRANE.")).toEqual({
      kind: "failed",
      message: "No match. The word was CRANE.",
    });
  });

  it("switches terminal outcomes from Submit to Retry and New puzzle while retaining Share", () => {
    expect(getWordGuessActionPresentation("playing", 0)).toEqual({
      terminal: false,
      terminalLabel: null,
      resetLabel: "Reset",
      canShare: false,
    });
    expect(getWordGuessActionPresentation("playing", 2)).toEqual({
      terminal: false,
      terminalLabel: null,
      resetLabel: "Reset",
      canShare: true,
    });
    expect(getWordGuessActionPresentation("won", 3)).toEqual({
      terminal: true,
      terminalLabel: "Word solved",
      resetLabel: "Retry",
      canShare: true,
    });
    expect(getWordGuessActionPresentation("lost", 6)).toEqual({
      terminal: true,
      terminalLabel: "Attempts exhausted",
      resetLabel: "Retry",
      canShare: true,
    });
  });
});
