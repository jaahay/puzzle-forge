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

  it("invokes the contextual Next action from the terminal dock", () => {
    let called = 0;
    const dock = PuzzleTerminalDock({
      state: { kind: "solved" },
      label: "Puzzle solved",
      onNextPuzzle: () => { called += 1; },
    });
    const actions = (dock.props.children as { props: { children: { props: { children: string; onClick: () => void } }[] } }[])[1];
    const next = actions.props.children[2];
    expect(next.props.children).toBe("Next puzzle");
    next.props.onClick();
    expect(called).toBe(1);
  });

  it("announces terminal outcomes by default and supports a local live-region opt-out", () => {
    const defaultDock = PuzzleTerminalDock({
      state: { kind: "solved" },
      label: "Puzzle solved",
      onReset: () => {},
      onNextPuzzle: () => {},
    });
    const quietDock = PuzzleTerminalDock({
      state: { kind: "solved" },
      label: "Puzzle solved",
      announce: false,
      onReset: () => {},
      onNextPuzzle: () => {},
    });

    expect(defaultDock.props["aria-live"]).toBe("polite");
    expect(quietDock.props["aria-live"]).toBeUndefined();
  });
});
