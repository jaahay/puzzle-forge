import { createRandom, normalizeSeed } from "../shared";
import { parseMiniClueBank } from "./clues";
import { buildCrosswordTopology, type CrosswordBoard, type CrosswordClue } from "./model";

// A fully checked, rotationally symmetric initial construction template.
// Its reflected equivalent is obtained by transposing the answers, not by
// reversing spellings. Further templates should earn their place through fill quality.
const miniLayout = ["##...", "#....", ".....", "....#", "...##"] as const;
const miniTopology = buildCrosswordTopology(miniLayout);
const maxSearchNodes = 50_000;

export const generateMiniCrossword = (seed: string, bank: unknown): CrosswordBoard => {
  const normalizedSeed = normalizeSeed(seed);
  const random = createRandom(`crossword:mini:${normalizedSeed}`);
  const clues = parseMiniClueBank(bank);
  // Deterministic candidate ordering, independent of source record order.
  for (let i = clues.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [clues[i], clues[j]] = [clues[j], clues[i]];
  }
  const byLength = new Map<number, CrosswordClue[]>();
  for (const clue of clues) {
    const candidates = byLength.get(clue.answer.length) ?? [];
    candidates.push(clue);
    byLength.set(clue.answer.length, candidates);
  }
  const { entries, blocks } = miniTopology;
  const letters = blocks.map(block => block ? "#" : "");
  const assigned: (CrosswordClue | undefined)[] = Array(entries.length).fill(undefined);
  const used = new Set<string>();
  let remaining = maxSearchNodes;

  // Recompute the small domains from the shared letters. Selecting the
  // most constrained entry and rejecting empty domains avoids blind fill.
  const search = (): boolean => {
    if (remaining-- <= 0) return false;
    if (used.size === entries.length) return true;
    let next = -1;
    let domain: CrosswordClue[] = [];
    for (let i = 0; i < entries.length; i++) {
      if (assigned[i]) continue;
      const cells = entries[i].cells;
      const candidates = (byLength.get(cells.length) ?? []).filter(clue =>
        !used.has(clue.answer) && cells.every((cell, index) => !letters[cell] || letters[cell] === clue.answer[index]));
      if (!candidates.length) return false;
      if (next < 0 || candidates.length < domain.length) {
        next = i;
        domain = candidates;
      }
    }
    if (next < 0) return false;
    const cells = entries[next].cells;
    for (const clue of domain) {
      if (remaining <= 0) break;
      const previous = cells.map(cell => letters[cell]);
      cells.forEach((cell, index) => { letters[cell] = clue.answer[index]; });
      assigned[next] = clue;
      used.add(clue.answer);
      if (search()) return true;
      used.delete(clue.answer);
      assigned[next] = undefined;
      cells.forEach((cell, index) => { letters[cell] = previous[index]; });
    }
    return false;
  };

  if (!search()) throw new Error("Could not construct a valid Mini Crossword from the approved clue bank.");
  const solution = letters.join("");
  const filledEntries = entries.map((entry, index) => ({ ...entry, clue: assigned[index]!.clue }));
  const { width, height, numbers } = miniTopology;
  // Exact baseline includes the clue text as well as geometry and solution.
  const checksum = JSON.stringify(["mini", width, height, solution, filledEntries.map(entry => [entry.number, entry.direction, entry.cells, entry.clue])]);
  return { format: "mini", seed: normalizedSeed, width, height, blocks, numbers, entries: filledEntries, solution, checksum };
};
