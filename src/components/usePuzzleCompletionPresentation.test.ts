import { describe, expect, it } from "vitest";
import {
  isTrackedCompletionKey,
  shouldStageCompletionPresentation,
  shouldStartCompletionPresentation,
} from "./usePuzzleCompletionPresentation";

describe("completion presentation transition semantics", () => {
  const previousUnsolved = { enabled: true, identity: "sudoku:seed-a", solved: false };
  const currentSolved = { enabled: true, identity: "sudoku:seed-a", solved: true };

  it("recognizes only an unsolved-to-solved transition on the same enabled puzzle", () => {
    expect(shouldStartCompletionPresentation(previousUnsolved, currentSolved)).toBe(true);

    expect(
      shouldStartCompletionPresentation(
        { enabled: true, identity: "sudoku:seed-a", solved: true },
        currentSolved,
      ),
    ).toBe(false);

    expect(
      shouldStartCompletionPresentation(
        previousUnsolved,
        { enabled: true, identity: "sudoku:seed-b", solved: true },
      ),
    ).toBe(false);
  });

  it("stages celebration only when the solved transition has a causative user input", () => {
    expect(shouldStageCompletionPresentation(previousUnsolved, currentSolved, true)).toBe(true);
    expect(shouldStageCompletionPresentation(previousUnsolved, currentSolved, false)).toBe(false);
  });

  it("does not treat enabling an already-solved restored puzzle as a live completion", () => {
    expect(
      shouldStageCompletionPresentation(
        { enabled: false, identity: "sudoku:seed-a", solved: false },
        currentSolved,
        true,
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
