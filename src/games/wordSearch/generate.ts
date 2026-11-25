import type { PuzzleDifficulty } from "../../catalog/types";
import { createRandom, normalizeSeed } from "../shared";
import { allWordSearchDirections, wordSearchPath, wordSearchProfiles, type WordSearchBoard, type WordSearchProfile, type WordSearchTarget } from "./model";
import { getWordSearchTheme, type WordSearchTheme } from "./themes";
import { fillWordSearchBoard } from "./filler";

const reverse = (word: string) => [...word].reverse().join("");
type Random = () => number;

const shuffle = <T>(input: readonly T[], random: Random): T[] => {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
};

// Avoid targets that force another listed target to occur as a substring.
const chooseWords = (words: readonly string[], profile: WordSearchProfile, random: Random) => {
  const selected: string[] = [];
  for (const word of shuffle(words.filter(w => w.length <= profile.maxWordLength), random)) {
    if (selected.some(other => word.includes(other) || word.includes(reverse(other))
        || other.includes(word) || other.includes(reverse(word)))) continue;
    selected.push(word);
    if (selected.length === profile.targetCount) break;
  }
  return selected.sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));
};

// Count physical paths, not reading orientations (palindromes count once).
export const findWordSearchOccurrences = (letters: readonly string[], size: number, word: string): WordSearchTarget[] => {
  const paths = new Map<string, WordSearchTarget>();
  for (let start = 0; start < letters.length; start++) {
    if (letters[start] !== word[0]) continue;
    const row = Math.floor(start / size), col = start % size;
    for (const [dr, dc] of allWordSearchDirections) {
      const r = row + dr * (word.length - 1), c = col + dc * (word.length - 1);
      if (r < 0 || c < 0 || r >= size || c >= size) continue;
      const end = r * size + c;
      const step = dr * size + dc;
      let matches = true;
      for (let i = 1; i < word.length; i++) {
        if (letters[start + step * i] !== word[i]) { matches = false; break; }
      }
      if (matches) paths.set(`${Math.min(start, end)}:${Math.max(start, end)}`, { word, start, end });
    }
  }
  return [...paths.values()];
};

const samePath = (a: WordSearchTarget, b: WordSearchTarget) =>
  (a.start === b.start && a.end === b.end) || (a.start === b.end && a.end === b.start);

const placeWords = (words: readonly string[], profile: WordSearchProfile, random: Random) => {
  const { size, directions, overlapWeight } = profile;
  const letters: string[] = Array(size * size).fill("");
  const targets: WordSearchTarget[] = [];
  const directionCounts = Array<number>(directions.length).fill(0);
  const quadrantCounts = [0, 0, 0, 0];
  let totalOverlap = 0;
  for (const word of words) {
    let best: { start: number; end: number; direction: number; quadrant: number; overlap: number; score: number } | undefined;
    for (let start = 0; start < letters.length; start++) {
      const row = Math.floor(start / size), column = start % size;
      for (let direction = 0; direction < directions.length; direction++) {
        const [dr, dc] = directions[direction]!;
        const r = row + dr * (word.length - 1), c = column + dc * (word.length - 1);
        if (r < 0 || c < 0 || r >= size || c >= size) continue;
        const step = dr * size + dc;
        let overlap = 0, valid = true;
        for (let i = 0; i < word.length; i++) {
          const existing = letters[start + step * i];
          if (existing && existing !== word[i]) { valid = false; break; }
          if (existing) overlap++;
        }
        if (!valid || overlap === word.length) continue;
        const quadrant = ((row + r >= size - 1) ? 2 : 0) + ((column + c >= size - 1) ? 1 : 0);
        const score = overlapWeight * overlap - 5 * directionCounts[direction]!
          - 2 * quadrantCounts[quadrant]! + random() * 5;
        if (!best || score > best.score) best = { start, end: r * size + c, direction, quadrant, overlap, score };
      }
    }
    if (!best) return null;
    const path = wordSearchPath(size, best.start, best.end);
    path.forEach((index, i) => { letters[index] = word[i]!; });
    targets.push({ word, start: best.start, end: best.end });
    directionCounts[best.direction]!++;
    quadrantCounts[best.quadrant]!++;
    totalOverlap += best.overlap;
  }
  const usedDirections = directionCounts.filter(Boolean).length;
  if (usedDirections < profile.minDirections) return null;
  const occupied = letters.filter(Boolean).length;
  const quality = usedDirections * 8 + quadrantCounts.filter(Boolean).length * 5
    + occupied / size + totalOverlap * overlapWeight / 2;

  // Overlap can itself produce unintended occurrences. Reject those before trying filler.
  if (targets.some(target => {
    const paths = findWordSearchOccurrences(letters, size, target.word);
    return paths.length !== 1 || !samePath(paths[0]!, target);
  })) return null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const filled = fillWordSearchBoard(letters, targets, profile, random);
    if (filled && targets.every(target => {
      const paths = findWordSearchOccurrences(filled, size, target.word);
      return paths.length === 1 && samePath(paths[0]!, target);
    })) return { letters: filled, targets, quality };
  }
  return null;
};

export const generateWordSearch = ({ seed, difficulty, theme }: {
  seed: string; difficulty: PuzzleDifficulty; theme: WordSearchTheme;
}): WordSearchBoard => {
  const normalizedSeed = normalizeSeed(seed);
  const profile = wordSearchProfiles[difficulty];
  if (!profile) throw new Error("Unknown Word Search difficulty.");
  const words = getWordSearchTheme(theme).words;
  const random = createRandom(`word-search:${difficulty}:${theme}:${normalizedSeed}`);
  let best: NonNullable<ReturnType<typeof placeWords>> | undefined;
  let accepted = 0;
  // A fixed maximum bounds failure cost; compare up to three complete valid layouts.
  for (let attempt = 0; attempt < 24 && accepted < 3; attempt++) {
    const selected = chooseWords(words, profile, random);
    if (selected.length !== profile.targetCount) continue;
    const candidate = placeWords(selected, profile, random);
    if (!candidate) continue;
    accepted++;
    if (!best || candidate.quality > best.quality) best = candidate;
  }
  if (!best) throw new Error("Could not generate a valid Word Search board.");
  const targets = best.targets.sort((a, b) => a.word < b.word ? -1 : a.word > b.word ? 1 : 0);
  // The complete compact baseline is small and collision-free; it includes paths as well as letters.
  const checksum = `${profile.size}:${difficulty}:${theme}:${best.letters.join("")}:${targets.map(t => `${t.word},${t.start},${t.end}`).join(";")}`;
  return { seed: normalizedSeed, difficulty, theme, size: profile.size, letters: best.letters, targets, checksum };
};
