import type { JigsawEdgeProfile, JigsawEdgeProfileId } from "../../catalog/types";

export const jigsawEdgeProfileCatalogRevision = 1;

export const jigsawEdgeProfileIds = [
  "classic-bulb",
  "mushroom",
  "keyhole",
  "dovetail",
  "t-lock",
  "bottle",
  "hook",
  "teardrop",
  "double-lobe",
  "crescent",
  "s-lock",
  "lightning",
  "castle",
  "arrowhead",
] as const satisfies readonly JigsawEdgeProfileId[];

export const jigsawEdgeProfileCatalog = {
  "classic-bulb": {
    id: "classic-bulb",
    label: "Classic bulb",
    description: "The familiar rounded jigsaw tab, retained as the visual baseline.",
    pathFamily: "classic-bulb",
    selectionWeight: 1.8,
    difficultyWeight: 1,
  },
  mushroom: {
    id: "mushroom",
    label: "Mushroom",
    description: "A narrow throat opens into a broad rounded cap with a visible undercut.",
    pathFamily: "mushroom",
    selectionWeight: 1.2,
    difficultyWeight: 1.1,
  },
  keyhole: {
    id: "keyhole",
    label: "Keyhole",
    description: "A slim stem feeds into a compact near-circular head.",
    pathFamily: "keyhole",
    selectionWeight: 1.1,
    difficultyWeight: 1.15,
  },
  dovetail: {
    id: "dovetail",
    label: "Dovetail",
    description: "A mechanical trapezoidal lock that widens beyond a narrower root.",
    pathFamily: "dovetail",
    selectionWeight: 1,
    difficultyWeight: 1.05,
  },
  "t-lock": {
    id: "t-lock",
    label: "T-lock",
    description: "A narrow stem terminates in a broad crossbar-like crown.",
    pathFamily: "t-lock",
    selectionWeight: 0.8,
    difficultyWeight: 1.15,
  },
  bottle: {
    id: "bottle",
    label: "Bottle",
    description: "A long narrow neck opens into an offset rounded body.",
    pathFamily: "bottle",
    selectionWeight: 0.9,
    difficultyWeight: 1.1,
  },
  hook: {
    id: "hook",
    label: "Hook",
    description: "A directional connector that bends sideways before curling outward.",
    pathFamily: "hook",
    selectionWeight: 0.75,
    difficultyWeight: 1.2,
  },
  teardrop: {
    id: "teardrop",
    label: "Teardrop",
    description: "An asymmetric rounded body converges to a visibly pointed crown.",
    pathFamily: "teardrop",
    selectionWeight: 0.9,
    difficultyWeight: 1.1,
  },
  "double-lobe": {
    id: "double-lobe",
    label: "Double lobe",
    description: "Two distinct rounded lobes form a clover-like crown.",
    pathFamily: "double-lobe",
    selectionWeight: 0.75,
    difficultyWeight: 1.2,
  },
  crescent: {
    id: "crescent",
    label: "Crescent",
    description: "A swept outer bulge is cut by a pronounced inward scoop.",
    pathFamily: "crescent",
    selectionWeight: 0.75,
    difficultyWeight: 1.2,
  },
  "s-lock": {
    id: "s-lock",
    label: "S-lock",
    description: "A serpentine seam crosses the baseline and reverses curvature.",
    pathFamily: "s-lock",
    selectionWeight: 0.85,
    difficultyWeight: 1.15,
  },
  lightning: {
    id: "lightning",
    label: "Lightning",
    description: "A sharp zig-zag interlock with a strongly directional silhouette.",
    pathFamily: "lightning",
    selectionWeight: 0.65,
    difficultyWeight: 1.2,
  },
  castle: {
    id: "castle",
    label: "Castle",
    description: "A stepped, castellated connector with rectilinear shoulders.",
    pathFamily: "castle",
    selectionWeight: 0.65,
    difficultyWeight: 1.2,
  },
  arrowhead: {
    id: "arrowhead",
    label: "Arrowhead",
    description: "A narrow stem flares into a broad pointed head with clear undercuts.",
    pathFamily: "arrowhead",
    selectionWeight: 0.85,
    difficultyWeight: 1.15,
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
