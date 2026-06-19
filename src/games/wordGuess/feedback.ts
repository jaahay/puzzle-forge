import type { PuzzleCellTone } from "../../catalog/types";

export type WordGuessMark = "correct" | "present" | "absent";

export type WordGuessScoredLetter = {
  letter: string;
  mark: WordGuessMark;
};

export const scoreWordGuess = (answer: string, guess: string): WordGuessMark[] => {
  const normalizedAnswer = answer.toUpperCase();
  const normalizedGuess = guess.toUpperCase();

  if (normalizedAnswer.length !== normalizedGuess.length) {
    throw new Error("Answer and guess must have the same length.");
  }

  const marks: WordGuessMark[] = Array.from({ length: normalizedGuess.length }, () => "absent");
  const remainingAnswerLetters = new Map<string, number>();

  for (let index = 0; index < normalizedGuess.length; index += 1) {
    const answerLetter = normalizedAnswer[index];
    const guessLetter = normalizedGuess[index];

    if (answerLetter === guessLetter) {
      marks[index] = "correct";
    } else if (answerLetter) {
      remainingAnswerLetters.set(answerLetter, (remainingAnswerLetters.get(answerLetter) ?? 0) + 1);
    }
  }

  for (let index = 0; index < normalizedGuess.length; index += 1) {
    if (marks[index] === "correct") {
      continue;
    }

    const guessLetter = normalizedGuess[index];
    const remainingCount = remainingAnswerLetters.get(guessLetter) ?? 0;

    if (remainingCount > 0) {
      marks[index] = "present";
      remainingAnswerLetters.set(guessLetter, remainingCount - 1);
    }
  }

  return marks;
};

export const scoreWordGuessLetters = (answer: string, guess: string): WordGuessScoredLetter[] => {
  const marks = scoreWordGuess(answer, guess);
  const normalizedGuess = guess.toUpperCase();

  return marks.map((mark, index) => ({
    letter: normalizedGuess[index] ?? "",
    mark,
  }));
};

export const wordGuessMarkToTone = (mark: WordGuessMark): PuzzleCellTone => {
  if (mark === "correct") {
    return "answer";
  }

  if (mark === "present") {
    return "hint";
  }

  return "empty";
};

export const wordGuessMarkToEmoji = (mark: WordGuessMark) => {
  if (mark === "correct") {
    return "🟩";
  }

  if (mark === "present") {
    return "🟨";
  }

  return "⬛";
};

export const isSolvedWordGuess = (answer: string, guess: string) => answer.toUpperCase() === guess.toUpperCase();
