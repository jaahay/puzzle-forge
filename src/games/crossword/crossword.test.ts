import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCrosswordTopology } from "./model";
import { parseMiniClueBank } from "./clues";
import { areNearDuplicateCrosswordAnswers, generateMiniCrossword } from "./generate";

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
    expect(bank.length).toBeGreaterThanOrEqual(500);
    expect(bank.filter(record => record.senses.length > 1).length).toBeGreaterThan(25);
    expect(bank.filter(record => record.senses.some(sense => sense.clues.length > 1)).length).toBeGreaterThan(20);
    for (const n of [3, 4, 5]) expect(bank.filter(record => record.answer.length === n).length).toBeGreaterThan(15);
    // Verify spelling against the broad spelling reference, not another
    // game's more restrictive answer eligibility.
    for (const n of [4, 5]) {
      const spelling = JSON.parse(readFileSync(new URL(`../../../public/lexicon/word-guess/banks/${n}.json`, import.meta.url), "utf8")) as { validGuesses: string[] };
      const accepted = new Set(spelling.validGuesses);
      for (const record of bank.filter(record => record.answer.length === n)) {
        expect(accepted.has(record.answer)).toBe(true);
      }
    }
  });
  it("rejects malformed records and duplicate answers, senses or clue formulations", () => {
    const sense = { meaning: "domestic animal", topics: ["animals"], clues: ["Pet that purrs"] };
    const valid = { answer: "CAT", senses: [sense] };
    for (const invalid of [
      null, [], [{ ...valid, answer: "cat" }], [{ ...valid, answer: "AB" }],
      [{ ...valid, senses: [] }], [valid, valid],
      [{ ...valid, senses: [sense, sense] }],
      [{ ...valid, senses: [sense, { ...sense, meaning: "different" }] }],
      [{ ...valid, senses: [{ ...sense, topics: [] }] }],
      [{ ...valid, senses: [{ ...sense, clues: [""] }] }],
      [{ ...valid, senses: [{ ...sense, clues: ["Pet", "Pet"] }] }],
    ]) expect(() => parseMiniClueBank(invalid)).toThrow();
  });
});

describe("Mini Crossword construction", () => {
  it("constructs deterministic, fully checked boards with distinct approved answers across seeds", () => {
    const byAnswer = new Map(bank.map(record => [record.answer, record.senses.flatMap(sense => sense.clues)]));
    const layouts = new Set<string>();
    const selectedClues = new Map<string, Set<string>>();
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
        expect(byAnswer.get(answer)).toContain(entry.clue);
        found.push(answer);
        const observed = selectedClues.get(answer) ?? new Set<string>();
        observed.add(entry.clue);
        selectedClues.set(answer, observed);
      }
      expect(new Set(found).size).toBe(10);
      expect(found.some((answer, i) => found.slice(i + 1).some(other => areNearDuplicateCrosswordAnswers(answer, other)))).toBe(false);
      for (let cell = 0; cell < board.solution.length; cell++) {
        expect(board.solution[cell] === "#").toBe(board.blocks[cell]);
        const directions = board.entries.filter(entry => entry.cells.includes(cell)).map(entry => entry.direction).sort();
        expect(directions).toEqual(board.blocks[cell] ? [] : ["across", "down"]);
      }
      const reordered = [...bank].reverse().map(record => ({
        ...record, senses: [...record.senses].reverse().map(sense => ({
          ...sense, topics: [...sense.topics].reverse(), clues: [...sense.clues].reverse(),
        })),
      }));
      expect(generateMiniCrossword(`sweep-${i}`, reordered)).toEqual(board);
      layouts.add(board.blocks.map(block => block ? "#" : ".").join(""));
      solutions.add(board.solution);
      answerSets.add(found.sort().join(","));
    }
    expect(layouts.size).toBe(7);
    expect(solutions.size).toBeGreaterThanOrEqual(16);
    expect(answerSets.size).toBeGreaterThanOrEqual(40);
    // Alternative clue formulations must be exercised in generated boards,
    // not merely present in the source bank.
    expect([...selectedClues.values()].some(clues => clues.size > 1)).toBe(true);
    expect(bank.some(record => record.senses.filter(sense =>
      sense.clues.some(clue => selectedClues.get(record.answer)?.has(clue))).length > 1)).toBe(true);
  }, 30_000);

  it("does not weight fill by the number of clues or senses", () => {
    const expanded = bank.map(record => ({
      ...record, senses: [
        ...record.senses.map(sense => ({ ...sense, clues: [...sense.clues, "Alternate formulation for " + sense.meaning] })),
        { meaning: "synthetic test sense", topics: ["test"], clues: ["Synthetic test clue"] },
      ],
    }));
    for (let i = 0; i < 12; i++) {
      expect(generateMiniCrossword(`variant-${i}`, expanded).solution).toBe(generateMiniCrossword(`variant-${i}`, bank).solution);
    }
  });

  it("includes clue text in the exact baseline and fails explicitly with insufficient fill", () => {
    const board = generateMiniCrossword("baseline", bank);
    const answer = board.entries[0].cells.map(cell => board.solution[cell]).join("");
    const revised = generateMiniCrossword("baseline", bank.map(record => record.answer === answer ? {
      ...record, senses: record.senses.map(sense => ({ ...sense, clues: sense.clues.map(clue => clue + " (revised)") })),
    } : record));
    expect(revised.solution).toBe(board.solution);
    expect(revised.checksum).not.toBe(board.checksum);
    expect(() => generateMiniCrossword("impossible", [{ answer: "CAT", senses: [{ meaning: "animal", topics: ["animals"], clues: ["Pet"] }] }])).toThrow("Could not construct");
  });
});
