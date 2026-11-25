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

  it("switches terminal outcomes from Submit to Retry and identifies shareable result progress", () => {
    expect(getWordGuessActionPresentation("playing", 0)).toEqual({
      terminal: false,
      terminalLabel: null,
      resetLabel: "Reset",
      hasShareableProgress: false,
    });
    expect(getWordGuessActionPresentation("playing", 2)).toEqual({
      terminal: false,
      terminalLabel: null,
      resetLabel: "Reset",
      hasShareableProgress: true,
    });
    expect(getWordGuessActionPresentation("won", 3)).toEqual({
      terminal: true,
      terminalLabel: "Word solved",
      resetLabel: "Retry",
      hasShareableProgress: true,
    });
    expect(getWordGuessActionPresentation("lost", 6)).toEqual({
      terminal: true,
      terminalLabel: "Attempts exhausted",
      resetLabel: "Retry",
      hasShareableProgress: true,
    });
  });
});
