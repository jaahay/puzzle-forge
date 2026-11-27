import { parseMiniClueBank } from "./clues";
import type { CrosswordAnswer } from "./model";

let pending: Promise<readonly CrosswordAnswer[]> | undefined;

// Only the generation worker loads the compiled bank, and failures may retry.
export const loadCrosswordBank = (): Promise<readonly CrosswordAnswer[]> => {
  if (pending) return pending;
  pending = fetch(`${import.meta.env.BASE_URL}lexicon/crossword/mini-clues.json`).then(async response => {
    if (!response.ok) throw new Error("Crossword clue bank could not be loaded.");
    return parseMiniClueBank(await response.json());
  }).catch((reason: unknown) => {
    pending = undefined;
    throw reason;
  });
  return pending;
};
