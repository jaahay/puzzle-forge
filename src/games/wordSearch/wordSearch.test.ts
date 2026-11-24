import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PuzzleDifficulty } from "../../catalog/types";
import { generateWordSearch, findWordSearchOccurrences } from "./generate";
import { snapWordSearchEnd, wordSearchPath, wordSearchProfiles } from "./model";
import { createWordSearchProgress, isWordSearchComplete, restoreWordSearchProgress, selectWordSearchEndpoints, wordSearchFoundCells } from "./progress";
import { getWordSearchTheme, wordSearchNamedTerms, wordSearchThemeIds } from "./themes";

describe("Word Search editorial themes", () => {
  it("contains unique familiar themed spellings, checked against the shared spelling corpus", () => {
    const spelling = new Set<string>();
    for (let n = 4; n <= 10; n++) {
      const bank = JSON.parse(readFileSync(new URL(`../../../public/lexicon/word-guess/banks/${n}.json`, import.meta.url), "utf8"));
      bank.validGuesses.forEach((word: string) => spelling.add(word));
    }
    for (const word of wordSearchNamedTerms) spelling.add(word);
    for (const theme of wordSearchThemeIds) {
      const words = getWordSearchTheme(theme).words;
      expect(new Set(words).size).toBe(words.length);
      expect(words.every(word => /^[A-Z]{4,10}$/.test(word) && spelling.has(word))).toBe(true);
      expect(words.filter(word => word.length <= 6).length).toBeGreaterThan(15);
    }
  });
});

describe("Word Search generation", () => {
  it("generates each theme at each difficulty, with unique physical target paths", () => {
    for (const theme of wordSearchThemeIds) {
      for (const difficulty of Object.keys(wordSearchProfiles) as PuzzleDifficulty[]) {
        const profile = wordSearchProfiles[difficulty];
        const board = generateWordSearch({ seed: "coverage", theme, difficulty });
        expect(board.size).toBe(profile.size);
        expect(board.letters).toHaveLength(profile.size ** 2);
        expect(board.letters.every(letter => /^[A-Z]$/.test(letter))).toBe(true);
        expect(board.targets).toHaveLength(profile.targetCount);
        expect(new Set(board.targets.map(t => t.word)).size).toBe(profile.targetCount);
        const directions = new Set<string>();
        for (const target of board.targets) {
          expect(getWordSearchTheme(theme).words).toContain(target.word);
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
