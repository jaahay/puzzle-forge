import type { JigsawImageAsset } from "../../catalog/types";

export const jigsawMinimumAxis = 2;
export const jigsawMaximumAxis = 32;

export const jigsawSizePresets = ["Small", "Medium", "Large", "Extra large"] as const;
export type JigsawSizePreset = (typeof jigsawSizePresets)[number];

export const jigsawSizeTargetPieces: Record<JigsawSizePreset, number> = {
  Small: 16,
  Medium: 36,
  Large: 64,
  "Extra large": 100,
};

export type JigsawSizeDimensions = {
  width: number;
  height: number;
  pieceCount: number;
};

type ScoredDimensions = JigsawSizeDimensions & {
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

export const resolveJigsawSizeDimensions = (
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">,
  preset: JigsawSizePreset,
): JigsawSizeDimensions => {
  const imageRatio = Math.max(0.01, asset.intrinsicWidth / Math.max(1, asset.intrinsicHeight));
  const targetPieceCount = jigsawSizeTargetPieces[preset];
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

export const getJigsawSizePresetForDimensions = (
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">,
  width: number,
  height: number,
): JigsawSizePreset | null =>
  jigsawSizePresets.find((preset) => {
    const resolved = resolveJigsawSizeDimensions(asset, preset);
    return resolved.width === width && resolved.height === height;
  }) ?? null;
