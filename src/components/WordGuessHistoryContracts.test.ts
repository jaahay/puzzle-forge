import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("./GridPuzzleWorkspace.tsx", import.meta.url), "utf8");
const gameSource = readFileSync(new URL("./WordGuessGame.tsx", import.meta.url), "utf8");

describe("Word Guess history integration", () => {
  it("exposes shared crown history controls with live availability", () => {
    expect(workspaceSource).toContain("isNonogram || isFutoshiki || isWordGuess");
    expect(workspaceSource).toContain("canUndoNow={canUndoGridNow}");
    expect(workspaceSource).toContain("canRedoNow={canRedoGridNow}");
    expect(workspaceSource).toContain("onCommitCurrentGuess={onCommitGridHistory}");
  });

  it("makes an accepted submitted guess an irreversible history boundary", () => {
    const submitIndex = gameSource.indexOf("onSubmitGuess();");
    const commitIndex = gameSource.indexOf("onCommitCurrentGuess();", submitIndex);

    expect(submitIndex).toBeGreaterThan(-1);
    expect(commitIndex).toBeGreaterThan(submitIndex);
    expect(gameSource.slice(0, submitIndex)).toContain("if (!isValidWordGuess(guess, wordBank))");
    expect(gameSource.slice(0, submitIndex)).toContain("if (hardMode && submittedGuesses.length > 0");
  });

  it("does not manufacture reversible submitted guesses while restoring saved progress", () => {
    expect(gameSource).toContain("let restoredCellInput = false;");
    expect(gameSource).toContain("if (restoredCellInput) onCommitCurrentGuess();");
  });
});
