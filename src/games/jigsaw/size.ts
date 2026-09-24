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

export const jigsawGridAdaptationDistortionThreshold = 1.75;

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

export const getJigsawPieceAspectRatio = (
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">,
  width: number,
  height: number,
) => {
  const imageRatio = Math.max(0.01, asset.intrinsicWidth / Math.max(1, asset.intrinsicHeight));
  return imageRatio * Math.max(1, height) / Math.max(1, width);
};

export const getJigsawPieceDistortion = (
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">,
  width: number,
  height: number,
) => {
  const aspectRatio = Math.max(0.01, getJigsawPieceAspectRatio(asset, width, height));
  return Math.max(aspectRatio, 1 / aspectRatio);
};

export const resolveJigsawDimensionsForPieceCount = (
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">,
  targetPieceCount: number,
): JigsawSizeDimensions => {
  const imageRatio = Math.max(0.01, asset.intrinsicWidth / Math.max(1, asset.intrinsicHeight));
  const safeTargetPieceCount = Math.max(1, Math.round(targetPieceCount));
  let best: ScoredDimensions | null = null;

  for (let width = jigsawMinimumAxis; width <= jigsawMaximumAxis; width += 1) {
    for (let height = jigsawMinimumAxis; height <= jigsawMaximumAxis; height += 1) {
      const candidate = scoreDimensions(imageRatio, safeTargetPieceCount, width, height);
      if (isBetterCandidate(candidate, best)) best = candidate;
    }
  }

  return best
    ? { width: best.width, height: best.height, pieceCount: best.pieceCount }
    : { width: 4, height: 4, pieceCount: 16 };
};

export const resolveJigsawSizeDimensions = (
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">,
  preset: JigsawSizePreset,
): JigsawSizeDimensions =>
  resolveJigsawDimensionsForPieceCount(asset, jigsawSizeTargetPieces[preset]);

export const getJigsawGridAdaptation = (
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">,
  width: number,
  height: number,
): JigsawSizeDimensions | null => {
  const currentDistortion = getJigsawPieceDistortion(asset, width, height);
  if (currentDistortion < jigsawGridAdaptationDistortionThreshold) return null;

  const adapted = resolveJigsawDimensionsForPieceCount(asset, width * height);
  if (adapted.width === width && adapted.height === height) return null;

  const adaptedDistortion = getJigsawPieceDistortion(asset, adapted.width, adapted.height);
  return adaptedDistortion <= currentDistortion * 0.8 ? adapted : null;
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
