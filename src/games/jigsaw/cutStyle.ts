import type {
  JigsawBaselineGrammarId,
  JigsawConnectorGrammarId,
  JigsawCutStyle,
} from "../../catalog/types";
import { createRandom } from "../shared";
import { jigsawBaselineGrammarIds } from "./baselineGrammar";
import { jigsawConnectorGrammarIds } from "./connectorGrammar";

export const jigsawCutStyles = [
  "traditional",
  "unconventional",
] as const satisfies readonly JigsawCutStyle[];

export const defaultJigsawCutStyle: JigsawCutStyle = "traditional";

export const isJigsawCutStyle = (value: unknown): value is JigsawCutStyle =>
  value === "traditional" || value === "unconventional";

export const jigsawCutStyleLabels = {
  traditional: "Traditional",
  unconventional: "Unconventional",
} as const satisfies Record<JigsawCutStyle, string>;

export const jigsawCutStyleDescriptions = {
  traditional: "Familiar, restrained cuts with occasional irregular character.",
  unconventional: "Expressive cuts drawn from the broader Puzzle Forge grammar.",
} as const satisfies Record<JigsawCutStyle, string>;

type WeightMap<T extends string> = Partial<Record<T, number>>;

type JigsawCutStyleDefinition = {
  connectorWeights: WeightMap<JigsawConnectorGrammarId>;
  baselineWeights: WeightMap<JigsawBaselineGrammarId>;
  requiredBaselineGrammarIds: readonly JigsawBaselineGrammarId[];
  baselinePaletteSize: number;
};

const jigsawCutStyleDefinitions = {
  traditional: {
    connectorWeights: {
      "classic-bulb": 4,
      "necked-head": 2,
    },
    baselineWeights: {
      straight: 4,
      bow: 3,
      inflection: 1.2,
      "angled-course": 0.8,
    },
    requiredBaselineGrammarIds: ["straight", "bow"],
    baselinePaletteSize: 3,
  },
  unconventional: {
    connectorWeights: {
      "classic-bulb": 0.35,
      "necked-head": 0.6,
      "multi-lobe": 1.1,
      scoop: 1.25,
      serpentine: 1.35,
      terrace: 1.05,
      zigzag: 1.15,
      "stacked-lock": 1.3,
    },
    baselineWeights: {
      straight: 0.2,
      bow: 0.65,
      inflection: 1,
      "angled-course": 1.05,
      dogleg: 1.25,
      wave: 1.5,
      "stepped-course": 1.35,
    },
    requiredBaselineGrammarIds: ["bow"],
    baselinePaletteSize: 4,
  },
} as const satisfies Record<JigsawCutStyle, JigsawCutStyleDefinition>;

const weightFor = <T extends string>(
  weights: WeightMap<T>,
  id: T,
) => Math.max(0, weights[id] ?? 0);

const selectWeightedId = <T extends string>(
  ids: readonly T[],
  weights: WeightMap<T>,
  randomUnit: number,
): T => {
  const weighted = ids
    .map((id) => ({ id, weight: weightFor(weights, id) }))
    .filter(({ weight }) => weight > 0);
  if (weighted.length === 0) {
    throw new Error("Jigsaw cut-style policy has no selectable grammar.");
  }

  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  const normalized = Math.min(1 - Number.EPSILON, Math.max(0, randomUnit));
  let cursor = normalized * total;

  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor < 0) return entry.id;
  }

  return weighted[weighted.length - 1].id;
};

export const normalizeJigsawCutStyle = (
  value: JigsawCutStyle | string | undefined,
): JigsawCutStyle =>
  value === "unconventional" ? "unconventional" : defaultJigsawCutStyle;

const getJigsawCutStyleDefinition = (
  cutStyle: JigsawCutStyle,
): JigsawCutStyleDefinition =>
  jigsawCutStyleDefinitions[cutStyle];

export const selectJigsawConnectorGrammarForCutStyle = (
  cutStyle: JigsawCutStyle,
  randomUnit: number,
): JigsawConnectorGrammarId =>
  selectWeightedId(
    jigsawConnectorGrammarIds,
    getJigsawCutStyleDefinition(cutStyle).connectorWeights,
    randomUnit,
  );

export const deriveJigsawBaselinePalette = (
  cutStyle: JigsawCutStyle,
  seed: string,
): readonly JigsawBaselineGrammarId[] => {
  const definition = getJigsawCutStyleDefinition(cutStyle);
  const selected = [...definition.requiredBaselineGrammarIds];
  const available = jigsawBaselineGrammarIds.filter(
    (grammarId) =>
      !selected.includes(grammarId) &&
      weightFor(definition.baselineWeights, grammarId) > 0,
  );
  const random = createRandom(`${seed}:baseline-palette`);

  while (
    selected.length < definition.baselinePaletteSize &&
    available.length > 0
  ) {
    const grammarId = selectWeightedId(
      available,
      definition.baselineWeights,
      random(),
    );
    selected.push(grammarId);
    available.splice(available.indexOf(grammarId), 1);
  }

  return selected;
};

export const sampleJigsawBaselineGrammarForCutStyle = (
  cutStyle: JigsawCutStyle,
  baselineGrammarIds: readonly JigsawBaselineGrammarId[],
  randomUnit: number,
): JigsawBaselineGrammarId => {
  if (baselineGrammarIds.length === 0) {
    throw new Error("Jigsaw baseline palette must contain at least one grammar.");
  }

  return selectWeightedId(
    baselineGrammarIds,
    getJigsawCutStyleDefinition(cutStyle).baselineWeights,
    randomUnit,
  );
};
