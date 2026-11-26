import { createRandom, normalizeSeed } from "../shared";
import { parseMiniClueBank } from "./clues";
import { buildCrosswordTopology, type CrosswordBoard, type CrosswordAnswer, type CrosswordTopology } from "./model";

// Distinct connected, fully checked 5×5 geometries with viable curated fills.
// Do not count transpositions or reflections alone as meaningful variety.
const miniTopologies = [
  ["##...", "#....", ".....", "....#", "...##"],
  ["##...", "##...", ".....", "...##", "...##"],
].map(buildCrosswordTopology);
const maxSearchNodesPerLayout = 50_000;

const shuffle = <T>(values: readonly T[], random: () => number): T[] => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const fill = (topology: CrosswordTopology, byLength: ReadonlyMap<number, CrosswordAnswer[]>) => {
  const { entries, blocks } = topology;
  const letters: string[] = blocks.map(block => block ? "#" : "");
  const assigned: (CrosswordAnswer | undefined)[] = Array(entries.length).fill(undefined);
  const used = new Set<string>();
  let remaining = maxSearchNodesPerLayout;

  const search = (): boolean => {
    if (remaining-- <= 0) return false;
    if (used.size === entries.length) return true;
    let next = -1;
    let domain: CrosswordAnswer[] = [];
    // Choose the most constrained unfilled entry and reject empty domains.
    for (let i = 0; i < entries.length; i++) {
      if (assigned[i]) continue;
      const cells = entries[i].cells;
      const candidates = (byLength.get(cells.length) ?? []).filter(record =>
        !used.has(record.answer) && cells.every((cell, index) => !letters[cell] || letters[cell] === record.answer[index]));
      if (!candidates.length) return false;
      if (next < 0 || candidates.length < domain.length) {
        next = i;
        domain = candidates;
      }
    }
    if (next < 0) return false;
    const cells = entries[next].cells;
    for (const record of domain) {
      if (remaining <= 0) break;
      const previous = cells.map(cell => letters[cell]);
      cells.forEach((cell, index) => { letters[cell] = record.answer[index]; });
      assigned[next] = record;
      used.add(record.answer);
      if (search()) return true;
      used.delete(record.answer);
      assigned[next] = undefined;
      cells.forEach((cell, index) => { letters[cell] = previous[index]; });
    }
    return false;
  };

  return search() ? { solution: letters.join(""), answers: assigned.map(record => record!) } : null;
};

// Give each sense an equal opportunity, then select one formulation. A
// separate seed stream means clue edits cannot change the constructed fill.
const selectClue = (record: CrosswordAnswer, seed: string): string => {
  const random = createRandom(`crossword:mini:clue:${seed}:${record.answer}`);
  const sense = record.senses[Math.floor(random() * record.senses.length)];
  return sense.clues[Math.floor(random() * sense.clues.length)];
};

export const generateMiniCrossword = (seed: string, bank: unknown): CrosswordBoard => {
  const normalizedSeed = normalizeSeed(seed);
  const random = createRandom(`crossword:mini:${normalizedSeed}`);
  const answers = shuffle(parseMiniClueBank(bank), random);
  const byLength = new Map<number, CrosswordAnswer[]>();
  for (const record of answers) {
    const candidates = byLength.get(record.answer.length) ?? [];
    candidates.push(record);
    byLength.set(record.answer.length, candidates);
  }
  for (const topology of shuffle(miniTopologies, random)) {
    const candidate = fill(topology, byLength);
    if (!candidate) continue;
    const { width, height, blocks, numbers, entries } = topology;
    const { solution } = candidate;
    const filledEntries = entries.map((entry, index) => ({ ...entry, clue: selectClue(candidate.answers[index], normalizedSeed) }));
    // Exact baseline includes the displayed clue, geometry and solution.
    const checksum = JSON.stringify(["mini", width, height, solution, filledEntries.map(entry => [entry.number, entry.direction, entry.cells, entry.clue])]);
    return { format: "mini", seed: normalizedSeed, width, height, blocks, numbers, entries: filledEntries, solution, checksum };
  }
  throw new Error("Could not construct a valid Mini Crossword from the approved clue bank.");
};
