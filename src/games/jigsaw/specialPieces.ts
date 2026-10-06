import type {
  JigsawImageAsset,
  JigsawSpecialPiecesMode,
} from "../../catalog/types";
import { createRandom } from "../shared";
import {
  getJigsawMedallionCandidateIntersections,
  type JigsawMedallionPlacement,
} from "./medallion";

export const jigsawSpecialPiecesModes = [
  "off",
  "rare",
  "always",
] as const satisfies readonly JigsawSpecialPiecesMode[];

export const defaultJigsawSpecialPiecesMode: JigsawSpecialPiecesMode = "rare";

export const jigsawSpecialPiecesModeLabels = {
  off: "Off",
  rare: "Rare",
  always: "Always",
} as const satisfies Record<JigsawSpecialPiecesMode, string>;

export const jigsawSpecialPiecesModeDescriptions = {
  off: "Use ordinary grid-backed pieces only.",
  rare: "Occasionally include one memorable special piece.",
  always: "Include one special piece whenever the puzzle can safely support it.",
} as const satisfies Record<JigsawSpecialPiecesMode, string>;

export const jigsawRareSpecialPieceRate = 0.25;

export const isJigsawSpecialPiecesMode = (
  value: unknown,
): value is JigsawSpecialPiecesMode =>
  typeof value === "string" &&
  jigsawSpecialPiecesModes.includes(value as JigsawSpecialPiecesMode);

export const normalizeJigsawSpecialPiecesMode = (
  value: unknown,
): JigsawSpecialPiecesMode =>
  isJigsawSpecialPiecesMode(value) ? value : defaultJigsawSpecialPiecesMode;

export const selectJigsawMedallionPlacement = ({
  mode,
  identitySeed,
  width,
  height,
  asset,
}: {
  mode: JigsawSpecialPiecesMode;
  identitySeed: string;
  width: number;
  height: number;
  asset: Pick<JigsawImageAsset, "intrinsicWidth" | "intrinsicHeight">;
}): JigsawMedallionPlacement | null => {
  const normalizedMode = normalizeJigsawSpecialPiecesMode(mode);
  if (normalizedMode === "off") return null;

  const candidates = getJigsawMedallionCandidateIntersections(width, height, asset);
  if (candidates.length === 0) return null;

  if (normalizedMode === "rare") {
    const presenceRandom = createRandom(`${identitySeed}:presence`);
    if (presenceRandom() >= jigsawRareSpecialPieceRate) return null;
  }

  const locationRandom = createRandom(`${identitySeed}:location`);
  return candidates[Math.floor(locationRandom() * candidates.length)] ?? null;
};
