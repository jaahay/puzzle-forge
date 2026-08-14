import type { JigsawImageAsset, PuzzleDifficulty } from "../../catalog/types";

export const jigsawMinimumAxis = 2;
export const jigsawMaximumAxis = 32;

export const jigsawDifficultyOrder: readonly PuzzleDifficulty[] = ["Easy", "Medium", "Hard", "Expert"];

export const jigsawDifficultyTargetPieces: Record<PuzzleDifficulty, number> = {
  Easy: 16,
  Medium: 36,
  Hard: 64,
  Expert: 100,
};

export type JigsawDifficultyDimensions = {
  width: number;
  height: number;
  pieceCount: number;
};

type ScoredDimensions = JigsawDifficultyDimensions & {
  score: number;
  countError: number;
  aspectError: number;
};

const scoreDimensions = (
  imageRatio: number,
  targetPieceCount: number,
  width: number,
  height: number,
): ScoredDimensions => {
  const pieceCount = width * height;
  const countError = Math.abs(pieceCount - targetPieceCount) / targetPieceCount;
  const pieceAspectRatio = imageRatio * height / width;
  const aspectError = Math.abs(Math.log(Math.max(0.01, pieceAspectRatio)));

  return {
    width,
    height,
    pieceCount,
    countError,
    aspectError,
    score: countError * 1.25 + aspectError * 0.75,
  };
};

const isBetterCandidate = (candidate: ScoredDimensions, current: ScoredDimensions | null) => {
  if (!current) return true;
  const epsilon = 1e-9;
  if (candidate.score < current.score - epsilon) return true;
  if (candidate.score > current.score + epsilon) return false;
  if (candidate.countError < current.countError - epsilon) return true;
  if (candidate.countError > current.countError + epsilon) return false;
  if (candidate.aspectError < current.aspectError - epsilon) return true;
  if (candidate.aspectError > current.aspectError + epsilon) return false;

  const candidateSpan = Math.max(candidate.width, candidate.height);
  const currentSpan = Math.max(current.width, current.height);
  if (candidateSpan !== currentSpan) return candidateSpan < currentSpan;
  if (candidate.height !== current.height) return candidate.height < current.height;
  return candidate.width < current.width;
};

export const resolveJigsawDifficultyDimensions = (
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">,
  difficulty: PuzzleDifficulty,
): JigsawDifficultyDimensions => {
  const imageRatio = Math.max(0.01, asset.intrinsicWidth / Math.max(1, asset.intrinsicHeight));
  const targetPieceCount = jigsawDifficultyTargetPieces[difficulty];
  let best: ScoredDimensions | null = null;

  for (let width = jigsawMinimumAxis; width <= jigsawMaximumAxis; width += 1) {
    for (let height = jigsawMinimumAxis; height <= jigsawMaximumAxis; height += 1) {
      const candidate = scoreDimensions(imageRatio, targetPieceCount, width, height);
      if (isBetterCandidate(candidate, best)) best = candidate;
    }
  }

  return best
    ? { width: best.width, height: best.height, pieceCount: best.pieceCount }
    : { width: 4, height: 4, pieceCount: 16 };
};

export const getJigsawDifficultyForDimensions = (
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">,
  width: number,
  height: number,
): PuzzleDifficulty | null =>
  jigsawDifficultyOrder.find((difficulty) => {
    const resolved = resolveJigsawDifficultyDimensions(asset, difficulty);
    return resolved.width === width && resolved.height === height;
  }) ?? null;
