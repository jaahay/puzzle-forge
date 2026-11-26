import type { CrosswordAnswer, CrosswordSense } from "./model";

const text = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value === value.trim();
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(text)
  && new Set(value).size === value.length;

// Eligibility is an explicitly authored answer and its usable senses, not
// membership in another game's answer list. Normalize order for seeded play.
export const parseMiniClueBank = (value: unknown): CrosswordAnswer[] => {
  if (!Array.isArray(value) || !value.length) throw new Error("Mini Crossword clue bank is empty.");
  const seen = new Set<string>();
  const answers: CrosswordAnswer[] = [];
  for (const record of value) {
    if (!record || typeof record !== "object"
        || typeof record.answer !== "string" || !/^[A-Z]{3,5}$/.test(record.answer)
        || seen.has(record.answer) || !Array.isArray(record.senses) || !record.senses.length) {
      throw new Error("Malformed or duplicate Mini Crossword answer.");
    }
    const meanings = new Set<string>();
    const clues = new Set<string>();
    const senses: CrosswordSense[] = [];
    for (const sense of record.senses) {
      if (!sense || typeof sense !== "object" || !text(sense.meaning)
          || meanings.has(sense.meaning) || !strings(sense.topics) || !strings(sense.clues)
          || sense.clues.some((clue: string) => clues.has(clue))) {
        throw new Error("Malformed or duplicate Mini Crossword sense or clue.");
      }
      meanings.add(sense.meaning);
      sense.clues.forEach((clue: string) => clues.add(clue));
      senses.push({ meaning: sense.meaning, topics: [...sense.topics].sort(compare), clues: [...sense.clues].sort(compare) });
    }
    seen.add(record.answer);
    answers.push({ answer: record.answer, senses: senses.sort((a, b) => compare(a.meaning, b.meaning)) });
  }
  return answers.sort((a, b) => compare(a.answer, b.answer));
};
