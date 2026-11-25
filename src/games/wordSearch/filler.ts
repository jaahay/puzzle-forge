import type { WordSearchProfile, WordSearchTarget } from "./model";
import { wordSearchPath } from "./model";
import { getWordSearchTheme } from "./themes";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
type Random = () => number;

const frequencies = (words: readonly string[]): number[] => {
  const counts = Array<number>(26).fill(0);
  let total = 0;
  for (const word of words) {
    for (const letter of word) {
      counts[letter.charCodeAt(0) - 65]!++;
      total++;
    }
  }
  return counts.map(count => count / total);
};

const broadFrequencies = frequencies(getWordSearchTheme("mixed").words);

// Mixture of uniform noise, the broad familiar theme vocabulary, and this
// board's actual targets. A uniform floor leaves every letter possible.
export const wordSearchFillerWeights = (words: readonly string[], profile: WordSearchProfile): readonly number[] => {
  const target = frequencies(words);
  const { uniformShare, targetShare } = profile.filler;
  const broadShare = 1 - uniformShare - targetShare;
  return target.map((weight, i) => uniformShare / 26 + broadShare * broadFrequencies[i]! + targetShare * weight);
};

const sampleLetter = (weights: readonly number[], random: Random, excluded?: string): string => {
  const excludedIndex = excluded ? excluded.charCodeAt(0) - 65 : -1;
  const total = weights.reduce((sum, weight, i) => i === excludedIndex ? sum : sum + weight, 0);
  let remaining = random() * total;
  for (let i = 0; i < weights.length; i++) {
    if (i === excludedIndex) continue;
    remaining -= weights[i]!;
    if (remaining < 0) return alphabet[i]!;
  }
  return excluded === "Z" ? "Y" : "Z";
};

type NearMatch = { word: string; cells: number[]; mismatch: number };

// Plant distinct, one-letter-off targets in unused cells. Their first three
// letters agree with the target, but the mismatch may appear anywhere later.
// A planted ray never modifies an intended word or an earlier near-match.
const plantNearMatches = (
  letters: string[], targets: readonly WordSearchTarget[], profile: WordSearchProfile,
  weights: readonly number[], random: Random,
): boolean => {
  const wanted = profile.filler.nearMatches;
  if (wanted === 0) return true;
  const { size, directions } = profile;
  const reserved = new Set<number>();
  // Random priorities avoid a preference for alphabetical or long words.
  const words = targets.map(target => ({ word: target.word, priority: random() }))
    .sort((a, b) => a.priority - b.priority);
  let planted = 0;
  for (const { word } of words) {
    let chosen: NearMatch | undefined;
    let candidates = 0;
    for (let start = 0; start < letters.length; start++) {
      const row = Math.floor(start / size), column = start % size;
      for (const [dr, dc] of directions) {
        const endRow = row + dr * (word.length - 1);
        const endColumn = column + dc * (word.length - 1);
        if (endRow < 0 || endRow >= size || endColumn < 0 || endColumn >= size) continue;
        const cells = wordSearchPath(size, start, endRow * size + endColumn);
        if (cells.some(cell => reserved.has(cell))) continue;
        if (cells.filter(cell => !letters[cell]).length < 2) continue;
        let fixedMismatch = -1;
        let incompatible = false;
        for (let i = 0; i < cells.length; i++) {
          const letter = letters[cells[i]!];
          if (!letter || letter === word[i]) continue;
          if (i < 3 || fixedMismatch !== -1) { incompatible = true; break; }
          fixedMismatch = i;
        }
        if (incompatible) continue;
        const mismatchPositions = fixedMismatch >= 0 ? [fixedMismatch]
          : cells.map((cell, i) => i >= 3 && !letters[cell] ? i : -1).filter(i => i >= 0);
        if (!mismatchPositions.length) continue;
        // Reservoir sampling chooses a feasible ray without materializing a
        // potentially large list of candidate paths.
        candidates++;
        if (random() * candidates < 1) {
          const mismatch = mismatchPositions[Math.floor(random() * mismatchPositions.length)]!;
          chosen = { word, cells, mismatch };
        }
      }
    }
    if (!chosen) continue;
    chosen.cells.forEach((cell, i) => {
      if (!letters[cell]) {
        letters[cell] = i === chosen!.mismatch
          ? sampleLetter(weights, random, chosen!.word[i])
          : chosen!.word[i]!;
      }
      reserved.add(cell);
    });
    planted++;
    if (planted === wanted) return true;
  }
  return false;
};

// Filler is tried on a fresh copy of the placed targets. The caller validates
// the completed board for all exact target occurrences, including reverse rays.
export const fillWordSearchBoard = (
  placed: readonly string[], targets: readonly WordSearchTarget[],
  profile: WordSearchProfile, random: Random,
): string[] | null => {
  const letters = [...placed];
  const weights = wordSearchFillerWeights(targets.map(target => target.word), profile);
  if (!plantNearMatches(letters, targets, profile, weights, random)) return null;
  return letters.map(letter => letter || sampleLetter(weights, random));
};
