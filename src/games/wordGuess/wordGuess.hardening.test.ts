import { describe, expect, it } from "vitest";
import { scoreWordGuess } from "./feedback";
import { generateWordGuess } from "./generate";
import { readWordGuessProgress, writeWordGuessProgress } from "./progress";

const withMockStorage = (testBody: (storage: Map<string, string>) => void) => {
  const storage = new Map<string, string>();
  const originalWindow = globalThis.window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });

  try {
    testBody(storage);
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
};

describe("Word Guess hardening", () => {
  it("handles duplicate letters with exact remaining-letter accounting", () => {
    expect(scoreWordGuess("BALMY", "ALLEY")).toEqual(["present", "present", "absent", "absent", "correct"]);
    expect(scoreWordGuess("APPLE", "PAPER")).toEqual(["present", "present", "correct", "present", "absent"]);
    expect(scoreWordGuess("SHEEP", "PEELS")).toEqual(["present", "present", "correct", "absent", "present"]);
  });

  it("generates the same answer and layout for the same seed and dimensions", () => {
    const request = {
      puzzleId: "word-guess" as const,
      seed: "repeatable-word-seed",
      width: 5,
      height: 6,
    };
    const first = generateWordGuess(request);
    const second = generateWordGuess(request);

    expect(first.id).toBe(second.id);
    expect(first.answerKey).toEqual(second.answerKey);
    expect(first.width).toBe(5);
    expect(first.height).toBe(6);
    expect(first.cells).toHaveLength(30);
  });

  it("persists submitted guesses separately from active row input", () => {
    withMockStorage(() => {
      writeWordGuessProgress({
        puzzleId: "word-guess-5x6-progress",
        wordLength: 5,
        maxGuesses: 6,
        guesses: ["SLATE"],
        currentInput: "CR",
        status: "playing",
      });

      expect(readWordGuessProgress("word-guess-5x6-progress")).toEqual({
        puzzleId: "word-guess-5x6-progress",
        wordLength: 5,
        maxGuesses: 6,
        guesses: ["SLATE"],
        currentInput: "CR",
        status: "playing",
      });
    });
  });

  it("ignores malformed active row input in stored progress", () => {
    withMockStorage((storage) => {
      storage.set(
        "puzzle-forge:word-guess:bad-current-input",
        JSON.stringify({
          puzzleId: "bad-current-input",
          wordLength: 5,
          maxGuesses: 6,
          guesses: ["SLATE"],
          currentInput: 3,
          status: "playing",
        }),
      );

      expect(readWordGuessProgress("bad-current-input")).toBeNull();
    });
  });
});
