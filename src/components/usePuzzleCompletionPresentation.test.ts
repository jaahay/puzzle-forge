import { describe, expect, it } from "vitest";
import { isTrackedCompletionKey, shouldStartCompletionPresentation } from "./usePuzzleCompletionPresentation";

describe("completion presentation transition semantics", () => {
  it("starts only for an unsolved-to-solved transition on the same enabled puzzle", () => {
    expect(
      shouldStartCompletionPresentation(
        { enabled: true, identity: "sudoku:seed-a", solved: false },
        { enabled: true, identity: "sudoku:seed-a", solved: true },
      ),
    ).toBe(true);

    expect(
      shouldStartCompletionPresentation(
        { enabled: true, identity: "sudoku:seed-a", solved: true },
        { enabled: true, identity: "sudoku:seed-a", solved: true },
      ),
    ).toBe(false);

    expect(
      shouldStartCompletionPresentation(
        { enabled: true, identity: "sudoku:seed-a", solved: false },
        { enabled: true, identity: "sudoku:seed-b", solved: true },
      ),
    ).toBe(false);
  });

  it("does not treat enabling an already-solved restored puzzle as a live completion", () => {
    expect(
      shouldStartCompletionPresentation(
        { enabled: false, identity: "sudoku:seed-a", solved: false },
        { enabled: true, identity: "sudoku:seed-a", solved: true },
      ),
    ).toBe(false);
  });

  it("tracks only keyboard inputs declared relevant by the puzzle surface", () => {
    const trackedKeys = ["1", "2", "3", "4"];

    expect(isTrackedCompletionKey("3", trackedKeys)).toBe(true);
    expect(isTrackedCompletionKey("Enter", trackedKeys)).toBe(false);
    expect(isTrackedCompletionKey("Shift", trackedKeys)).toBe(false);
  });
});
