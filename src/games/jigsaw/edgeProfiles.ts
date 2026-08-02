import type { JigsawEdgeProfile, JigsawEdgeProfileId } from "../../catalog/types";

export const jigsawEdgeProfileCatalogRevision = 1;

export const jigsawEdgeProfileCatalog = {
  "classic-round": {
    id: "classic-round",
    label: "Classic round",
    description: "A balanced round tab with a familiar traditional jigsaw silhouette.",
    pathFamily: "round-tab",
    difficultyWeight: 1,
  },
  "soft-round": {
    id: "soft-round",
    label: "Soft round",
    description: "A shallow rounded connection intended for quieter piece boundaries.",
    pathFamily: "round-tab",
    difficultyWeight: 0.85,
  },
  angular: {
    id: "angular",
    label: "Angular",
    description: "A sharper geometric tab that creates a more pronounced directional edge.",
    pathFamily: "angular-tab",
    difficultyWeight: 1.15,
  },
  wave: {
    id: "wave",
    label: "Wave",
    description: "A flowing asymmetric connection intended for broad curved silhouettes.",
    pathFamily: "wave-tab",
    difficultyWeight: 1.1,
  },
  "simple-lock": {
    id: "simple-lock",
    label: "Simple lock",
    description: "A compact low-variation connection suitable for smaller puzzle pieces.",
    pathFamily: "angular-tab",
    difficultyWeight: 0.75,
  },
} as const satisfies Record<JigsawEdgeProfileId, JigsawEdgeProfile>;

export const jigsawEdgeProfileIds = Object.keys(jigsawEdgeProfileCatalog) as JigsawEdgeProfileId[];
export const defaultJigsawEdgeProfileId: JigsawEdgeProfileId = "classic-round";

export const getJigsawEdgeProfile = (profileId: JigsawEdgeProfileId): JigsawEdgeProfile =>
  jigsawEdgeProfileCatalog[profileId];
