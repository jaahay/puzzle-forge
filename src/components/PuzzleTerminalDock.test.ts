import { describe, expect, it } from "vitest";
import { getPuzzleTerminalDockPresentation } from "./PuzzleTerminalDock";

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
});
