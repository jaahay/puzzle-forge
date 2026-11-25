import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { PuzzleDifficulty } from "../../catalog/types";
import { generateWordSearch, findWordSearchOccurrences } from "./generate";
import { allWordSearchDirections, snapWordSearchEnd, wordSearchPath, wordSearchProfiles } from "./model";
import { fillWordSearchBoard, wordSearchFillerWeights } from "./filler";
import { createRandom } from "../shared";
import { createWordSearchProgress, isWordSearchComplete, restoreWordSearchProgress, selectWordSearchEndpoints, wordSearchFoundCells } from "./progress";
import { getWordSearchTheme, wordSearchNamedTerms, wordSearchThemeIds } from "./themes";

import { loadGeneralWordSearchWords, parseGeneralWordSearchWords } from "./generalWords";

const generalWords = parseGeneralWordSearchWords(readFileSync(new URL("../../../public/lexicon/word-search/general.json", import.meta.url), "utf8"));

describe("Word Search editorial themes", () => {
  it("contains unique familiar themed spellings, checked against the shared spelling corpus", () => {
    const spelling = new Set<string>();
    for (let n = 4; n <= 10; n++) {
      const bank = JSON.parse(readFileSync(new URL(`../../../public/lexicon/word-guess/banks/${n}.json`, import.meta.url), "utf8"));
      bank.validGuesses.forEach((word: string) => spelling.add(word));
    }
    for (const word of wordSearchNamedTerms) spelling.add(word);
    for (const theme of wordSearchThemeIds) {
      const words = getWordSearchTheme(theme, generalWords).words;
      expect(new Set(words).size).toBe(words.length);
      expect(words.every(word => /^[A-Z]{4,10}$/.test(word) && spelling.has(word))).toBe(true);
      expect(words.filter(word => word.length <= 6).length).toBeGreaterThan(15);
    }
  });
});

describe("General Word Search vocabulary loading", () => {
  it("rejects malformed inventories and retries a failed fetch before caching a successful load", async () => {
    expect(() => parseGeneralWordSearchWords("[]")).toThrow("incomplete");
    const malformed = [...generalWords];
    malformed[1] = malformed[0]!;
    expect(() => parseGeneralWordSearchWords(JSON.stringify(malformed))).toThrow("malformed");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(generalWords) });
    vi.stubGlobal("fetch", fetchMock);
    try {
      await expect(loadGeneralWordSearchWords()).rejects.toThrow("could not be loaded");
      const first = loadGeneralWordSearchWords();
      expect(loadGeneralWordSearchWords()).toBe(first);
      await expect(first).resolves.toEqual(generalWords);
      expect(loadGeneralWordSearchWords()).toBe(first);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1]?.[0]).toContain("lexicon/word-search/general.json");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("Word Search generation", () => {
  it("compiles General from the familiar source inventory without narrowing the themed lists", () => {
    const answers = JSON.parse(readFileSync(new URL("../../../assets/lexicon/word-guess-answers.json", import.meta.url), "utf8")) as Record<string, string[]>;
    const expected = [...new Set(Array.from({ length: 7 }, (_, i) => answers[String(i + 4)]!).flat())].sort();
    expect(generalWords).toEqual(expected);
    expect(generalWords.length).toBeGreaterThan(9000);
    expect(() => generateWordSearch({ seed: "missing", theme: "general", difficulty: "Easy" })).toThrow("requires its vocabulary");
  });

  it("favors natural reading directions more strongly at lower difficulties", () => {
    const naturalShares = ["Easy", "Medium", "Hard", "Expert"].map(difficulty => {
      let natural = 0, total = 0;
      for (let i = 0; i < 16; i++) {
        const board = generateWordSearch({ seed: `direction-sweep-${i}`, theme: "general", difficulty: difficulty as PuzzleDifficulty, generalWords });
        for (const { start, end } of board.targets) {
          if ((Math.floor(start / board.size) === Math.floor(end / board.size) && end > start) || (start % board.size === end % board.size && end > start)) natural++;
          total++;
        }
      }
      return natural / total;
    });
    expect(naturalShares[0]).toBe(1);
    expect(naturalShares[1]!).toBeGreaterThan(naturalShares[2]!);
    expect(naturalShares[2]!).toBeGreaterThan(naturalShares[3]!);
  }, 30000);
  it("generates each theme at each difficulty, with unique physical target paths", () => {
    for (const theme of wordSearchThemeIds) {
      for (const difficulty of Object.keys(wordSearchProfiles) as PuzzleDifficulty[]) {
        const profile = wordSearchProfiles[difficulty];
        const board = generateWordSearch({ seed: "coverage", theme, difficulty, generalWords });
        expect(board.size).toBe(profile.size);
        expect(board.letters).toHaveLength(profile.size ** 2);
        expect(board.letters.every(letter => /^[A-Z]$/.test(letter))).toBe(true);
        expect(board.targets).toHaveLength(profile.targetCount);
        expect(new Set(board.targets.map(t => t.word)).size).toBe(profile.targetCount);
        const directions = new Set<string>();
        for (const target of board.targets) {
          expect(getWordSearchTheme(theme, generalWords).words).toContain(target.word);
          const path = wordSearchPath(board.size, target.start, target.end);
          expect(path.map(i => board.letters[i]).join("")).toBe(target.word);
          const dr = Math.sign(Math.floor(target.end / board.size) - Math.floor(target.start / board.size));
          const dc = Math.sign(target.end % board.size - target.start % board.size);
          expect(profile.directions).toContainEqual([dr, dc]);
          directions.add(`${dr}:${dc}`);
          // Independent endpoint enumeration, including reverse directions.
          const occurrences = new Set<string>();
          for (let a = 0; a < board.letters.length; a++) {
            for (let b = a; b < board.letters.length; b++) {
              const cells = wordSearchPath(board.size, a, b);
              if (cells.length !== target.word.length) continue;
              const value = cells.map(i => board.letters[i]).join("");
              if (value === target.word || [...value].reverse().join("") === target.word) occurrences.add(`${a}:${b}`);
            }
          }
          expect([...occurrences]).toEqual([`${Math.min(target.start, target.end)}:${Math.max(target.start, target.end)}`]);
        }
        expect(directions.size).toBeGreaterThanOrEqual(profile.minDirections);
      }
    }
  }, 30000);

  it("reproduces the baseline and varies it with the seed or profile", () => {
    const input = { seed: "reproduce", difficulty: "Medium", theme: "animals" } as const;
    const first = generateWordSearch(input);
    expect(generateWordSearch(input)).toEqual(first);
    expect(generateWordSearch({ ...input, seed: "another" }).checksum).not.toBe(first.checksum);
    expect(generateWordSearch({ ...input, theme: "garden" }).checksum).not.toBe(first.checksum);
    expect(generateWordSearch({ ...input, difficulty: "Hard" }).checksum).not.toBe(first.checksum);
  });

  it("counts palindromic paths once and detects multiple occurrences", () => {
    const letters = [..."ABBAZZZZABBAZZZZ"];
    expect(findWordSearchOccurrences(letters, 4, "ABBA")).toHaveLength(2);
    expect(findWordSearchOccurrences([... "ABBAZZZZZZZZZZZZ"], 4, "ABBA")).toHaveLength(1);
  });
});

describe("Word Search distractor design", () => {
  it("keeps all letters possible while increasing target-specific bias", () => {
    const words = ["AAAA", "AAAB"];
    const weights = (difficulty: PuzzleDifficulty) => wordSearchFillerWeights(words, wordSearchProfiles[difficulty]);
    for (const difficulty of Object.keys(wordSearchProfiles) as PuzzleDifficulty[]) {
      const w = weights(difficulty);
      expect(w).toHaveLength(26);
      expect(w.every(value => value > 0)).toBe(true);
      expect(w.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 10);
    }
    expect(weights("Medium")[0]).toBeGreaterThan(weights("Easy")[0]!);
    expect(weights("Hard")[0]).toBeGreaterThan(weights("Medium")[0]!);
    expect(weights("Expert")[0]).toBeGreaterThan(weights("Hard")[0]!);
    expect(wordSearchProfiles.Hard.size).toBe(wordSearchProfiles.Medium.size);
  });

  it("never overwrites placed letters and builds repeatable filler", () => {
    const profile = wordSearchProfiles.Hard;
    const placed = Array<string>(profile.size ** 2).fill("");
    const targets = [
      { word: "TIGER", start: 0, end: 4 },
      { word: "BEAR", start: 10, end: 13 },
      { word: "WOLF", start: 20, end: 23 },
    ];
    for (const target of targets) {
      wordSearchPath(profile.size, target.start, target.end).forEach((cell, i) => { placed[cell] = target.word[i]!; });
    }
    const result = fillWordSearchBoard(placed, targets, profile, createRandom("filler"));
    expect(result).not.toBeNull();
    expect(result).toEqual(fillWordSearchBoard(placed, targets, profile, createRandom("filler")));
    expect(result!.every((letter, i) => !placed[i] || placed[i] === letter)).toBe(true);
    expect(placed.filter(Boolean)).toHaveLength(13);
  });

  it("guarantees the requested distinct false leads without making additional targets", () => {
    // Check independently from the planter, on every theme and several seeds.
    for (const theme of wordSearchThemeIds) {
      for (const difficulty of ["Medium", "Hard", "Expert"] as const) {
        const profile = wordSearchProfiles[difficulty];
        for (const seed of ["distractor-1", "distractor-2", "distractor-3"]) {
          const board = generateWordSearch({ seed, theme, difficulty, generalWords });
          const nearMatchWords = new Set<string>();
          for (const target of board.targets) {
            expect(findWordSearchOccurrences(board.letters, board.size, target.word)).toHaveLength(1);
            for (let start = 0; start < board.letters.length; start++) {
              const r = Math.floor(start / board.size), c = start % board.size;
              for (const [dr, dc] of allWordSearchDirections) {
                const endR = r + dr * (target.word.length - 1), endC = c + dc * (target.word.length - 1);
                if (endR < 0 || endC < 0 || endR >= board.size || endC >= board.size) continue;
                const word = wordSearchPath(board.size, start, endR * board.size + endC).map(i => board.letters[i]).join("");
                if (word.slice(0, 3) !== target.word.slice(0, 3)) continue;
                if ([...word].filter((letter, i) => letter !== target.word[i]).length === 1) nearMatchWords.add(target.word);
              }
            }
          }
          expect(nearMatchWords.size).toBeGreaterThanOrEqual(profile.filler.nearMatches);
        }
      }
    }
  }, 30000);
});

describe("Word Search selection and progress", () => {
  it("uses straight rays without row wrapping and snaps drags to legal endpoints", () => {
    expect(wordSearchPath(5, 0, 24)).toEqual([0, 6, 12, 18, 24]);
    expect(wordSearchPath(5, 4, 5)).toEqual([]);
    expect(wordSearchPath(5, 4, 20)).toEqual([4, 8, 12, 16, 20]);
    expect(snapWordSearchEnd(5, 0, 0.2, 8)).toBe(4);
    expect(snapWordSearchEnd(5, 12, 7, 7)).toBe(24);
    expect(snapWordSearchEnd(5, 12, -4, -4)).toBe(0);
    expect(snapWordSearchEnd(5, 12, 2, 2)).toBe(12);
  });

  it("finds a word in either direction, ignores duplicates and wrong paths, and restores only matching progress", () => {
    const board = generateWordSearch({ seed: "progress", theme: "music", difficulty: "Easy" });
    const empty = createWordSearchProgress(board);
    const first = board.targets[0]!;
    const progress = selectWordSearchEndpoints(board, empty, first.end, first.start);
    expect(progress.found).toEqual([first.word]);
    expect(selectWordSearchEndpoints(board, progress, first.start, first.end)).toBe(progress);
    expect(selectWordSearchEndpoints(board, progress, 0, 0)).toBe(progress);
    expect(restoreWordSearchProgress(board, JSON.parse(JSON.stringify(progress)))).toEqual(progress);
    expect(restoreWordSearchProgress(board, { ...progress, baselineChecksum: "other" })).toBeNull();
    expect(restoreWordSearchProgress(board, { ...progress, found: [first.word, first.word] })).toBeNull();
    expect(restoreWordSearchProgress(board, { ...progress, found: ["UNKNOWN"] })).toBeNull();
    expect(wordSearchFoundCells(board, progress)).toEqual(new Set(wordSearchPath(board.size, first.start, first.end)));
    const complete = board.targets.reduce((state, t) => selectWordSearchEndpoints(board, state, t.start, t.end), progress);
    expect(isWordSearchComplete(board, complete)).toBe(true);
    expect(isWordSearchComplete(board, createWordSearchProgress(board))).toBe(false);
  });
});
