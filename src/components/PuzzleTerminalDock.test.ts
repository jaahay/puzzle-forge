import { describe, expect, it } from "vitest";
import { getPuzzleTerminalDockPresentation, PuzzleTerminalDock } from "./PuzzleTerminalDock";

describe("PuzzleTerminalDock presentation", () => {
  it("uses affirmative solved presentation only for solved outcomes", () => {
    expect(getPuzzleTerminalDockPresentation({ kind: "solved" })).toEqual({
      mark: "✓",
      tone: "solved",
    });
    expect(getPuzzleTerminalDockPresentation({ kind: "failed", message: "No match" })).toEqual({
      mark: "—",
      tone: "failed",
    });
  });

  it("announces terminal outcomes by default and supports a local live-region opt-out", () => {
    const defaultDock = PuzzleTerminalDock({
      state: { kind: "solved" },
      label: "Puzzle solved",
      onNewPuzzle: () => {},
    });
    const quietDock = PuzzleTerminalDock({
      state: { kind: "solved" },
      label: "Puzzle solved",
      announce: false,
      onNewPuzzle: () => {},
    });

    expect(defaultDock.props["aria-live"]).toBe("polite");
    expect(quietDock.props["aria-live"]).toBeUndefined();
  });
});
