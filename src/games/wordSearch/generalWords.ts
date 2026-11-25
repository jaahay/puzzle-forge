// Only the worker needs this collection; themed puzzles do not fetch it.
let pending: Promise<readonly string[]> | undefined;

export const parseGeneralWordSearchWords = (text: string): readonly string[] => {
  const words: unknown = JSON.parse(text);
  if (!Array.isArray(words) || words.length < 1000) throw new Error("General Word Search vocabulary is incomplete.");
  let previous = "";
  for (const word of words) {
    if (typeof word !== "string" || !/^[A-Z]{4,10}$/.test(word) || word <= previous) {
      throw new Error("General Word Search vocabulary is malformed or unsorted.");
    }
    previous = word;
  }
  return words;
};

export const loadGeneralWordSearchWords = (): Promise<readonly string[]> => {
  if (pending) return pending;
  pending = fetch(`${import.meta.env.BASE_URL}lexicon/word-search/general.json`).then(async response => {
    if (!response.ok) throw new Error("General Word Search vocabulary could not be loaded.");
    return parseGeneralWordSearchWords(await response.text());
  }).catch((reason: unknown) => {
    pending = undefined;
    throw reason;
  });
  return pending;
};
