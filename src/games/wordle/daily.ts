const wordGuessDailyPrefix = "daily-word-guess";

const padDatePart = (value: number) => value.toString().padStart(2, "0");

export const getLocalDateStamp = (date = new Date()) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const getWordGuessDailySeed = (date = new Date()) => `${wordGuessDailyPrefix}-${getLocalDateStamp(date)}`;

export const getWordGuessDailyLabel = (seed: string) => {
  const dateStamp = seed.startsWith(`${wordGuessDailyPrefix}-`) ? seed.slice(wordGuessDailyPrefix.length + 1) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStamp) ? dateStamp : null;
};
