import type {
  JigsawImageAsset,
  JigsawSpecialPiecesMode,
} from "../../catalog/types";
import { createRandom } from "../shared";
import {
  getJigsawCapsuleCandidatePlacements,
  type JigsawCapsulePlacement,
} from "./capsule";
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

export type JigsawSpecialPiecePlan =
  | { family: "medallion"; placement: JigsawMedallionPlacement }
  | { family: "capsule"; placement: JigsawCapsulePlacement };

export const jigsawSpecialPieceFamilies = ["medallion", "capsule"] as const;

export const selectJigsawSpecialPiecePlan = ({
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
}): JigsawSpecialPiecePlan | null => {
  const normalizedMode = normalizeJigsawSpecialPiecesMode(mode);
  if (normalizedMode === "off") return null;

  const families = [
    {
      family: "medallion" as const,
      candidates: getJigsawMedallionCandidateIntersections(width, height, asset),
    },
    {
      family: "capsule" as const,
      candidates: getJigsawCapsuleCandidatePlacements(width, height, asset),
    },
  ].filter(({ candidates }) => candidates.length > 0);
  if (families.length === 0) return null;

  if (normalizedMode === "rare") {
    const presenceRandom = createRandom(`${identitySeed}:presence`);
    if (presenceRandom() >= jigsawRareSpecialPieceRate) return null;
  }

  const familyRandom = createRandom(`${identitySeed}:family`);
  const selectedFamily =
    families[Math.floor(familyRandom() * families.length)] ?? families[0]!;
  const locationRandom = createRandom(
    `${identitySeed}:${selectedFamily.family}:location`,
  );
  const placement = selectedFamily.candidates[
    Math.floor(locationRandom() * selectedFamily.candidates.length)
  ];
  if (!placement) return null;

  return selectedFamily.family === "medallion"
    ? { family: "medallion", placement: placement as JigsawMedallionPlacement }
    : { family: "capsule", placement: placement as JigsawCapsulePlacement };
};
