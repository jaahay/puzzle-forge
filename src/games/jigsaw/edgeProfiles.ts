import type { JigsawEdgeProfile, JigsawEdgeProfileId } from "../../catalog/types";
import { jigsawConnectorGrammarCatalog, jigsawConnectorGrammarIds } from "./connectorGrammar";

export const jigsawEdgeProfileCatalogRevision = 1;

export const jigsawEdgeProfileIds = jigsawConnectorGrammarIds;

const makeProfile = (
  id: JigsawEdgeProfileId,
  difficultyWeight: number,
): JigsawEdgeProfile => ({
  id,
  label: jigsawConnectorGrammarCatalog[id].label,
  description: jigsawConnectorGrammarCatalog[id].description,
  connectorGrammarId: id,
  difficultyWeight,
});

export const jigsawEdgeProfileCatalog = {
  "classic-bulb": makeProfile("classic-bulb", 1),
  "necked-head": makeProfile("necked-head", 1.1),
  "multi-lobe": makeProfile("multi-lobe", 1.15),
  scoop: makeProfile("scoop", 1.15),
  serpentine: makeProfile("serpentine", 1.2),
  terrace: makeProfile("terrace", 1.15),
  zigzag: makeProfile("zigzag", 1.2),
  "stacked-lock": makeProfile("stacked-lock", 1.2),
} as const satisfies Record<JigsawEdgeProfileId, JigsawEdgeProfile>;

export const defaultJigsawEdgeProfileId: JigsawEdgeProfileId = "classic-bulb";

export const getJigsawEdgeProfile = (profileId: JigsawEdgeProfileId): JigsawEdgeProfile =>
  jigsawEdgeProfileCatalog[profileId];
