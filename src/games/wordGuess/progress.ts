export type WordGuessProgressStatus = "playing" | "won" | "lost";

export type SavedWordGuessProgress = {
  puzzleId: string;
  wordLength: number;
  maxGuesses: number;
  guesses: string[];
  currentInput?: string;
  status: WordGuessProgressStatus;
};

const storagePrefix = "puzzle-forge:word-guess:";

const isSavedWordGuessProgress = (value: unknown): value is SavedWordGuessProgress => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SavedWordGuessProgress>;
  return (
    typeof candidate.puzzleId === "string" &&
    typeof candidate.wordLength === "number" &&
    typeof candidate.maxGuesses === "number" &&
    Array.isArray(candidate.guesses) &&
    candidate.guesses.every((guess) => typeof guess === "string") &&
    (candidate.currentInput === undefined || typeof candidate.currentInput === "string") &&
    (candidate.status === "playing" || candidate.status === "won" || candidate.status === "lost")
  );
};

export const getWordGuessProgressKey = (puzzleId: string) => `${storagePrefix}${puzzleId}`;

export const readWordGuessProgress = (puzzleId: string) => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = window.localStorage.getItem(getWordGuessProgressKey(puzzleId));
    const parsed = saved ? JSON.parse(saved) : null;
    return isSavedWordGuessProgress(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeWordGuessProgress = (progress: SavedWordGuessProgress) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getWordGuessProgressKey(progress.puzzleId), JSON.stringify(progress));
  } catch {
    // Persistence is best-effort; gameplay still works when browser storage is unavailable.
  }
};
