import type { JigsawEdgeProfile, JigsawEdgeProfileId } from "../../catalog/types";

export const jigsawEdgeProfileCatalogRevision = 2;

export const jigsawEdgeProfileIds = [
  "classic-bulb",
  "narrow-neck",
  "broad-shallow",
  "offset-bulb",
  "keyhole",
  "asymmetric-scoop",
  "wave",
  "angular",
  "multi-lobe",
] as const satisfies readonly JigsawEdgeProfileId[];

export const jigsawEdgeProfileCatalog = {
  "classic-bulb": {
    id: "classic-bulb",
    label: "Classic bulb",
    description: "A familiar rounded bulb with balanced shoulders and moderate depth.",
    pathFamily: "classic-bulb",
    selectionWeight: 1.8,
    difficultyWeight: 1,
  },
  "narrow-neck": {
    id: "narrow-neck",
    label: "Narrow neck",
    description: "A pronounced bulb with a narrow neck and broader rounded head.",
    pathFamily: "narrow-neck",
    selectionWeight: 1.15,
    difficultyWeight: 1.1,
  },
  "broad-shallow": {
    id: "broad-shallow",
    label: "Broad shallow",
    description: "A wide low-profile connector with restrained depth and broad shoulders.",
    pathFamily: "broad-shallow",
    selectionWeight: 1.1,
    difficultyWeight: 0.9,
  },
  "offset-bulb": {
    id: "offset-bulb",
    label: "Offset bulb",
    description: "A rounded bulb whose center can sit noticeably off-axis.",
    pathFamily: "offset-bulb",
    selectionWeight: 0.95,
    difficultyWeight: 1.15,
  },
  keyhole: {
    id: "keyhole",
    label: "Keyhole",
    description: "A compact lock-like connector with a narrow approach and broad crown.",
    pathFamily: "keyhole",
    selectionWeight: 0.75,
    difficultyWeight: 1.2,
  },
  "asymmetric-scoop": {
    id: "asymmetric-scoop",
    label: "Asymmetric scoop",
    description: "A deliberately uneven curved connector with different shoulder character on each side.",
    pathFamily: "asymmetric-scoop",
    selectionWeight: 0.75,
    difficultyWeight: 1.15,
  },
  wave: {
    id: "wave",
    label: "Wave",
    description: "A flowing S-influenced connector with gentle seeded asymmetry.",
    pathFamily: "wave",
    selectionWeight: 1,
    difficultyWeight: 1.05,
  },
  angular: {
    id: "angular",
    label: "Angular",
    description: "A compact geometric connector with sharper shoulders and a directional crown.",
    pathFamily: "angular",
    selectionWeight: 0.9,
    difficultyWeight: 1.1,
  },
  "multi-lobe": {
    id: "multi-lobe",
    label: "Multi-lobe",
    description: "An uncommon restrained double-lobe connector used sparingly for visual variety.",
    pathFamily: "multi-lobe",
    selectionWeight: 0.45,
    difficultyWeight: 1.3,
  },
} as const satisfies Record<JigsawEdgeProfileId, JigsawEdgeProfile>;

export const defaultJigsawEdgeProfileId: JigsawEdgeProfileId = "classic-bulb";

export const getJigsawEdgeProfile = (profileId: JigsawEdgeProfileId): JigsawEdgeProfile =>
  jigsawEdgeProfileCatalog[profileId];

const selectionWeightTotal = jigsawEdgeProfileIds.reduce(
  (total, profileId) => total + jigsawEdgeProfileCatalog[profileId].selectionWeight,
  0,
);

export const selectJigsawEdgeProfile = (randomUnit: number): JigsawEdgeProfileId => {
  const normalized = Math.min(1 - Number.EPSILON, Math.max(0, randomUnit));
  let cursor = normalized * selectionWeightTotal;

  for (const profileId of jigsawEdgeProfileIds) {
    cursor -= jigsawEdgeProfileCatalog[profileId].selectionWeight;
    if (cursor < 0) return profileId;
  }

  return jigsawEdgeProfileIds[jigsawEdgeProfileIds.length - 1];
};
