import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCrosswordTopology } from "./model";
import { parseMiniClueBank } from "./clues";
import { generateMiniCrossword } from "./generate";

const bank = parseMiniClueBank(JSON.parse(readFileSync(new URL("../../../public/lexicon/crossword/mini-clues.json", import.meta.url), "utf8")));

describe("Crossword topology", () => {
  it("numbers starts in reading order, sharing a number across directions", () => {
    const board = buildCrosswordTopology(["##...", "#....", ".....", "....#", "...##"]);
    expect(board.numbers).toEqual([null, null, 1, 2, 3, null, 4, null, null, null, 5, null, null, null, null, 6, null, null, null, null, 7, null, null, null, null]);
    expect(board.entries.filter(entry => entry.direction === "across").map(entry => entry.cells.length)).toEqual([3, 4, 5, 4, 3]);
    expect(board.entries.filter(entry => entry.direction === "down").map(entry => entry.cells.length)).toEqual([5, 4, 3, 4, 3]);
    expect(board.entries.filter(entry => entry.number === 1).map(entry => entry.direction)).toEqual(["across", "down"]);
    for (let i = 0; i < board.blocks.length; i++) {
      expect(board.entries.filter(entry => entry.cells.includes(i)).length).toBe(board.blocks[i] ? 0 : 2);
    }
  });
  it("rejects ragged, invalid, short, empty and disconnected layouts", () => {
    for (const rows of [[], ["...", ".."], ["...","..X","..."], ["..",".."], ["###","###","###"], ["...#...", "...#...", "...#..."]]) {
      expect(() => buildCrosswordTopology(rows)).toThrow();
    }
  });
});

describe("Crossword clue inventory", () => {
  it("contains deliberately selected, distinct clue/answer pairs", () => {
    expect(bank.length).toBeGreaterThanOrEqual(100);
    for (const n of [3, 4, 5]) expect(bank.filter(record => record.answer.length === n).length).toBeGreaterThan(15);
    const spelling = JSON.parse(readFileSync(new URL("../../../assets/lexicon/word-guess-answers.json", import.meta.url), "utf8")) as Record<string, string[]>;
    for (const record of bank.filter(record => record.answer.length >= 4)) {
      expect(spelling[String(record.answer.length)]).toContain(record.answer);
    }
  });
  it("rejects duplicate answers and invalid records", () => {
    for (const invalid of [null, [], [{ answer: "CAT", clue: "" }], [{ answer: "cat", clue: "Pet" }], [{ answer: "AB", clue: "Two letters" }], [{ answer: "CAT", clue: "Pet" }, { answer: "CAT", clue: "Feline" }]]) {
      expect(() => parseMiniClueBank(invalid)).toThrow();
    }
  });
});

describe("Mini Crossword construction", () => {
  it("constructs deterministic, fully checked boards with distinct approved answers across seeds", () => {
    const byAnswer = new Map(bank.map(record => [record.answer, record.clue]));
    const solutions = new Set<string>();
    const answerSets = new Set<string>();
    for (let i = 0; i < 128; i++) {
      const board = generateMiniCrossword(`sweep-${i}`, bank);
      expect(board.width).toBe(5);
      expect(board.height).toBe(5);
      expect(board.solution).toMatch(/^[A-Z#]{25}$/);
      expect(board.entries).toHaveLength(10);
      const found: string[] = [];
      for (const entry of board.entries) {
        const answer = entry.cells.map(cell => board.solution[cell]).join("");
        expect(byAnswer.get(answer)).toBe(entry.clue);
        found.push(answer);
      }
      expect(new Set(found).size).toBe(10);
      for (let cell = 0; cell < board.solution.length; cell++) {
        expect(board.solution[cell] === "#").toBe(board.blocks[cell]);
        const directions = board.entries.filter(entry => entry.cells.includes(cell)).map(entry => entry.direction).sort();
        expect(directions).toEqual(board.blocks[cell] ? [] : ["across", "down"]);
      }
      expect(generateMiniCrossword(`sweep-${i}`, [...bank].reverse())).toEqual(board);
      solutions.add(board.solution);
      answerSets.add(found.sort().join(","));
    }
    expect(solutions.size).toBeGreaterThanOrEqual(10);
    expect(answerSets.size).toBeGreaterThanOrEqual(6);
  }, 30_000);

  it("includes clue text in the exact baseline and fails explicitly with insufficient fill", () => {
    const board = generateMiniCrossword("baseline", bank);
    const answer = board.entries[0].cells.map(cell => board.solution[cell]).join("");
    const revised = generateMiniCrossword("baseline", bank.map(record => record.answer === answer ? { ...record, clue: record.clue + " (revised)" } : record));
    expect(revised.solution).toBe(board.solution);
    expect(revised.checksum).not.toBe(board.checksum);
    expect(() => generateMiniCrossword("impossible", [{ answer: "CAT", clue: "Pet" }])).toThrow("Could not construct");
  });
});
