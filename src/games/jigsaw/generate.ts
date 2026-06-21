import type { TilePuzzleGenerator } from "../../catalog/types";
import { createGeneratedTilePuzzle, createRandom, normalizeDimension, normalizeSeed } from "../shared";

const palettes = [
  ["#0f172a", "#14b8a6", "#a7f3d0", "#facc15"],
  ["#1e1b4b", "#7c3aed", "#f0abfc", "#f8fafc"],
  ["#164e63", "#38bdf8", "#ecfeff", "#fb923c"],
  ["#3f1d1d", "#ef4444", "#fed7aa", "#fef3c7"],
];

const shuffle = <T>(items: T[], seed: string) => {
  const random = createRandom(seed);
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (shuffled.every((item, index) => item === items[index]) && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
};

export const generateJigsaw: TilePuzzleGenerator = ({ seed, width, height }) => {
  const normalizedSeed = normalizeSeed(seed);
  const boundedWidth = normalizeDimension(width, 4, 2, 8);
  const boundedHeight = normalizeDimension(height, 4, 2, 8);
  const solvedIndexes = Array.from({ length: boundedWidth * boundedHeight }, (_, index) => index);
  const shuffledIndexes = shuffle(solvedIndexes, `jigsaw:${normalizedSeed}:${boundedWidth}x${boundedHeight}`);
  const paletteIndex = Math.floor(createRandom(`jigsaw-palette:${normalizedSeed}`)() * palettes.length);
  const asset = {
    id: `generated-${paletteIndex}`,
    title: "Generated color field",
    kind: "generated" as const,
    palette: palettes[paletteIndex],
  };

  const tiles = shuffledIndexes.map((solvedIndex, currentIndex) => ({
    id: `tile-${solvedIndex}`,
    currentIndex,
    solvedIndex,
    row: Math.floor(solvedIndex / boundedWidth),
    column: solvedIndex % boundedWidth,
  }));

  return createGeneratedTilePuzzle({
    id: `jigsaw-${normalizedSeed}-${boundedWidth}x${boundedHeight}`,
    puzzleId: "jigsaw",
    title: "Jigsaw",
    seed: normalizedSeed,
    width: boundedWidth,
    height: boundedHeight,
    tiles,
    asset,
    notes: ["Prototype square-tile Jigsaw generated from a seed."],
  });
};
