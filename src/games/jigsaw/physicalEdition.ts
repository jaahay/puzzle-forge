import type { JigsawEditionChoice, JigsawImageAsset, JigsawPhysicalEdition } from "../../catalog/types";
import { createRandom } from "../shared";

export const jigsawPhysicalEditions = ["heritage", "classic", "vivid"] as const satisfies readonly JigsawPhysicalEdition[];
export const jigsawEditionChoices = ["auto", ...jigsawPhysicalEditions] as const satisfies readonly JigsawEditionChoice[];
export const defaultJigsawEditionChoice: JigsawEditionChoice = "auto";
export const jigsawEditionLabels: Record<JigsawEditionChoice, string> = {
  auto: "Auto",
  heritage: "Artisan",
  classic: "Linen",
  vivid: "Lustre",
};
export const jigsawEditionDescriptions: Record<JigsawPhysicalEdition, string> = {
  heritage: "Warm matte printing with a hand-crafted, organic character.",
  classic: "Fine linen-textured satin cardboard.",
  vivid: "Smooth coated printing with a luminous glossy reflection.",
};
export const jigsawEditionSuggestedCuts: Record<JigsawPhysicalEdition, "flowing" | "classic"> = {
  heritage: "flowing",
  classic: "classic",
  vivid: "classic",
};

export const isJigsawEditionChoice = (value: unknown): value is JigsawEditionChoice =>
  jigsawEditionChoices.includes(value as JigsawEditionChoice);

export const normalizeJigsawEditionChoice = (value: unknown): JigsawEditionChoice =>
  isJigsawEditionChoice(value) ? value : defaultJigsawEditionChoice;

/** Artwork recommendations are editorial; the seed selects a compatible edition. */
export const resolveJigsawPhysicalEdition = (
  asset: Pick<JigsawImageAsset, "id" | "editionRecommendations">,
  seed: string,
  choice: JigsawEditionChoice = "auto",
): JigsawPhysicalEdition => {
  if (choice !== "auto") return choice;
  const eligible = asset.editionRecommendations?.length
    ? asset.editionRecommendations
    : (["classic"] as const);
  const random = createRandom(`jigsaw:physical-edition:${asset.id}:${seed}`);
  // Adjacent text seeds give correlated first samples; mix once before selection.
  random();
  return eligible[Math.floor(random() * eligible.length)] ?? "classic";
};
