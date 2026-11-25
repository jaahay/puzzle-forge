import { wordSearchPath, type WordSearchBoard } from "./model";

export type WordSearchProgress = {
  baselineChecksum: string;
  found: readonly string[];
};

export const createWordSearchProgress = (board: WordSearchBoard): WordSearchProgress =>
  ({ baselineChecksum: board.checksum, found: [] });

export const restoreWordSearchProgress = (board: WordSearchBoard, value: unknown): WordSearchProgress | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<WordSearchProgress>;
  if (candidate.baselineChecksum !== board.checksum || !Array.isArray(candidate.found)) return null;
  const found = new Set(candidate.found);
  if (found.size !== candidate.found.length || candidate.found.some(word => !board.targets.some(target => target.word === word))) return null;
  return { baselineChecksum: board.checksum, found: board.targets.filter(target => found.has(target.word)).map(target => target.word) };
};

export const selectWordSearchEndpoints = (board: WordSearchBoard, progress: WordSearchProgress, start: number, end: number): WordSearchProgress => {
  if (progress.baselineChecksum !== board.checksum || wordSearchPath(board.size, start, end).length < 2) return progress;
  const target = board.targets.find(t => (t.start === start && t.end === end) || (t.start === end && t.end === start));
  if (!target || progress.found.includes(target.word)) return progress;
  return { baselineChecksum: board.checksum, found: board.targets.filter(t => t.word === target.word || progress.found.includes(t.word)).map(t => t.word) };
};

export const isWordSearchComplete = (board: WordSearchBoard, progress: WordSearchProgress) =>
  progress.baselineChecksum === board.checksum && board.targets.every(target => progress.found.includes(target.word));

export const wordSearchFoundCells = (board: WordSearchBoard, progress: WordSearchProgress): ReadonlySet<number> =>
  new Set(progress.baselineChecksum === board.checksum
    ? board.targets.filter(target => progress.found.includes(target.word)).flatMap(target => wordSearchPath(board.size, target.start, target.end))
    : []);
