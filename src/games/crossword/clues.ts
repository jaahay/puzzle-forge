import type { CrosswordClue } from "./model";

// Eligibility is the presence of a deliberately authored clue in this bank,
// not membership in the Word Guess answer list. One clue per spelling for now.
export const parseMiniClueBank = (value: unknown): CrosswordClue[] => {
  if (!Array.isArray(value) || !value.length) throw new Error("Mini Crossword clue bank is empty.");
  const seen = new Set<string>();
  const clues: CrosswordClue[] = [];
  for (const record of value) {
    if (!record || typeof record !== "object"
        || typeof record.answer !== "string" || !/^[A-Z]{3,5}$/.test(record.answer)
        || typeof record.clue !== "string" || !record.clue.trim() || record.clue !== record.clue.trim()
        || seen.has(record.answer)) throw new Error("Malformed or duplicate Mini Crossword clue.");
    seen.add(record.answer);
    clues.push({ answer: record.answer, clue: record.clue });
  }
  return clues.sort((a, b) => a.answer < b.answer ? -1 : a.answer > b.answer ? 1 : 0);
};
