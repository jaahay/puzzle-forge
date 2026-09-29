import type { JigsawEdgeProfile, JigsawEdgeProfileId } from "../../catalog/types";
import { jigsawConnectorGrammarCatalog, jigsawConnectorGrammarIds } from "./connectorGrammar";

export const jigsawEdgeProfileCatalogRevision = 1;

export const jigsawEdgeProfileIds = jigsawConnectorGrammarIds;

const makeProfile = (
  id: JigsawEdgeProfileId,
  selectionWeight: number,
  difficultyWeight: number,
): JigsawEdgeProfile => ({
  id,
  label: jigsawConnectorGrammarCatalog[id].label,
  description: jigsawConnectorGrammarCatalog[id].description,
  connectorGrammarId: id,
  selectionWeight,
  difficultyWeight,
});

export const jigsawEdgeProfileCatalog = {
  "classic-bulb": makeProfile("classic-bulb", 1.6, 1),
  "necked-head": makeProfile("necked-head", 1.2, 1.1),
  "multi-lobe": makeProfile("multi-lobe", 1, 1.15),
  scoop: makeProfile("scoop", 0.9, 1.15),
  serpentine: makeProfile("serpentine", 0.9, 1.2),
  terrace: makeProfile("terrace", 0.75, 1.15),
  zigzag: makeProfile("zigzag", 0.75, 1.2),
  "stacked-lock": makeProfile("stacked-lock", 0.85, 1.2),
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
