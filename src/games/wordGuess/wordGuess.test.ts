import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { getWordGuessAnalysis, getWordGuessCandidateSteps, getWordGuessCandidates, getWordGuessDifficultyBand, rankWordGuessStarter } from "./analysis";
import { getWordGuessDailyLabel, getWordGuessDailySeed } from "./daily";
import { scoreWordGuess, wordGuessMarkToEmoji } from "./feedback";
import { readWordGuessProgress, writeWordGuessProgress } from "./progress";
import { formatWordGuessShareText } from "./share";
import { createWordGuessState, reduceWordGuess } from "./state";
import { getWordGuessAnswerBank, isValidWordGuess, loadWordGuessBank, parseWordGuessGuesses, type WordGuessWordBank } from "./words";

const makeTinyBank = (): WordGuessWordBank => ({
  dictionaryId: "test-5",
  answerPoolId: "test-answers",
  length: 5,
  answers: ["CRANE", "SLATE", "TRACE", "ABBEY"],
  validGuesses: ["CRANE", "SLATE", "TRACE", "ABBEY"],
});

describe("Word Guess feedback", () => {
  it("scores exact, present, and absent letters with duplicate-aware accounting", () => {
    expect(scoreWordGuess("LEVEL", "LELEE")).toEqual(["correct", "correct", "present", "correct", "absent"]);
    expect(scoreWordGuess("ABBEY", "ALLEY")).toEqual(["correct", "absent", "absent", "correct", "correct"]);
    expect(scoreWordGuess("CIVIC", "VIVID")).toEqual(["absent", "correct", "correct", "correct", "absent"]);
  });

  it("rejects mismatched answer and guess lengths", () => {
    expect(() => scoreWordGuess("CODE", "CODES")).toThrow("same length");
  });

  it("maps marks to share emoji", () => {
    expect(scoreWordGuess("LEVEL", "LELEE").map(wordGuessMarkToEmoji).join("")).toBe("🟩🟩🟨🟩⬛");
  });
});

describe("Word Guess word banks", () => {
  it("keeps answer-only generation data distinct from the loaded validator", () => {
    const bank = getWordGuessAnswerBank(5);
    expect(bank.answers.length).toBeGreaterThan(1300);
    expect("validGuesses" in bank).toBe(false);
    expect(bank.answerPoolId).not.toBe(bank.dictionaryId);
  });

  it("validates words against the loaded accepted-guess list", () => {
    const text = readFileSync(new URL("../../../public/lexicon/word-guess/5.txt", import.meta.url), "utf8");
    const bank = parseWordGuessGuesses(text, 5);
    expect(isValidWordGuess(" forge ", bank)).toBe(true);
    expect(isValidWordGuess("ABBOT", bank)).toBe(true);
    expect(isValidWordGuess("toolong", bank)).toBe(false);
    expect(isValidWordGuess("zzzzz", bank)).toBe(false);
  });
});

describe("Word Guess compiled dictionary", () => {
  it("loads ordinary guesses on demand, with caching", async () => {
    const text = readFileSync(new URL("../../../public/lexicon/word-guess/5.txt", import.meta.url), "utf8");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => text });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const bank = await loadWordGuessBank(5);
      expect(bank.validGuesses.length).toBeGreaterThan(5000);
      expect(isValidWordGuess("ABBOT", bank)).toBe(true);
      expect(isValidWordGuess("FORGE", bank)).toBe(true);
      expect(isValidWordGuess("ZZZZZ", bank)).toBe(false);
      expect(bank.answers.length).toBeLessThan(bank.validGuesses.length);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(await loadWordGuessBank(5)).toBe(bank);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("Word Guess loading recovery", () => {
  it("does not cache a failed request, then accepts a previously omitted word", async () => {
    const text = readFileSync(new URL("../../../public/lexicon/word-guess/10.txt", import.meta.url), "utf8");
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ ok: true, text: async () => text });
    vi.stubGlobal("fetch", fetchMock);
    try {
      await expect(loadWordGuessBank(10)).rejects.toThrow("offline");
      const bank = await loadWordGuessBank(10);
      expect(isValidWordGuess("JAVASCRIPT", bank)).toBe(true);
      expect(bank.answers.length).toBeGreaterThan(900);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects malformed and incomplete derived assets", () => {
    expect(() => parseWordGuessGuesses("CRANE\\n", 5)).toThrow("incomplete");
    const text = readFileSync(new URL("../../../public/lexicon/word-guess/4.txt", import.meta.url), "utf8");
    expect(() => parseWordGuessGuesses(text.replace("ABLE", "AB-L"), 4)).toThrow("malformed");
  });
});

describe("Word Guess analysis", () => {
  it("filters candidates by observed guess feedback", () => {
    const bank = makeTinyBank();

    expect(getWordGuessCandidates("CRANE", ["SLATE"], bank)).toEqual(["CRANE"]);
  });

  it("reports candidate reduction steps", () => {
    const bank = makeTinyBank();

    expect(getWordGuessCandidateSteps("CRANE", ["SLATE", "TRACE"], bank)).toEqual([
      { guess: "SLATE", before: 4, after: 1, eliminated: 3 },
      { guess: "TRACE", before: 1, after: 1, eliminated: 0 },
    ]);
  });

  it("ranks starters and returns a difficulty band", () => {
    const bank = makeTinyBank();
    const rank = rankWordGuessStarter("SLATE", bank);
    const analysis = getWordGuessAnalysis("CRANE", [], bank);

    expect(rank.guess).toBe("SLATE");
    expect(rank.averageRemaining).toBeGreaterThan(0);
    expect(["gentle", "steady", "sharp", "severe"]).toContain(getWordGuessDifficultyBand(rank, bank));
    expect(analysis.bestStarter.guess.length).toBe(5);
    expect(bank.validGuesses).toContain(analysis.bestStarter.guess);
    expect(analysis.currentCandidates).toEqual(bank.answers);
  });
});

describe("Word Guess daily seeds", () => {
  it("formats and parses local daily seeds", () => {
    const date = new Date(2026, 5, 19);
    const seed = getWordGuessDailySeed(date);

    expect(seed).toBe("daily-word-guess-2026-06-19");
    expect(getWordGuessDailyLabel(seed)).toBe("2026-06-19");
    expect(getWordGuessDailyLabel("seed-123")).toBeNull();
  });
});

describe("Word Guess progress", () => {
  it("returns null when storage is unavailable", () => {
    expect(readWordGuessProgress("missing-window")).toBeNull();
  });

  it("round-trips valid browser storage progress and ignores invalid shapes", () => {
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
      writeWordGuessProgress({
        puzzleId: "word-guess-5x6-test",
        baselineChecksum: "expected-5",
        wordLength: 5,
        maxGuesses: 6,
        guesses: ["SLATE"],
        status: "playing",
      });

      expect(readWordGuessProgress("word-guess-5x6-test", "expected-5")).toEqual({
        puzzleId: "word-guess-5x6-test",
        baselineChecksum: "expected-5",
        wordLength: 5,
        maxGuesses: 6,
        guesses: ["SLATE"],
        status: "playing",
      });

      expect(readWordGuessProgress("word-guess-5x6-test", "another-answer")).toBeNull();
      storage.set("puzzle-forge:word-guess:bad", JSON.stringify({ puzzleId: 3 }));
      expect(readWordGuessProgress("bad")).toBeNull();
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });
});

describe("Word Guess share text", () => {
  it("formats share text without exposing non-summary state", () => {
    expect(
      formatWordGuessShareText({
        title: "Word Guess",
        seed: "seed-1",
        answer: "LEVEL",
        guesses: ["LELEE"],
        maxGuesses: 6,
        status: "playing",
      }),
    ).toBe("Word Guess 5×6 seed-1 1/6\n\n🟩🟩🟨🟩⬛");
  });
});

describe("Word Guess reducer", () => {
  it("accepts typed letters, validates dictionary membership, and detects wins", () => {
    const bank = makeTinyBank();
    const rules = { answer: "CRANE", maxGuesses: 6, wordBank: bank };
    let state = createWordGuessState("CRANE");

    for (const letter of "SLATE") {
      state = reduceWordGuess(state, { type: "input-letter", letter }, rules);
    }

    state = reduceWordGuess(state, { type: "submit" }, rules);
    expect(state.guesses).toHaveLength(1);
    expect(state.status).toBe("playing");

    for (const letter of "CRANE") {
      state = reduceWordGuess(state, { type: "input-letter", letter }, rules);
    }

    state = reduceWordGuess(state, { type: "submit" }, rules);
    expect(state.status).toBe("won");
    expect(state.message).toBe("Solved in 2/6.");
  });
});
