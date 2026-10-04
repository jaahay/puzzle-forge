import type {
  JigsawBaselineCourseId,
  JigsawCutStyle,
  JigsawEdgeProfileId,
} from "../../catalog/types";
import { createRandom } from "../shared";
import { jigsawBaselineCourseIds } from "./baselineCourse";
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
  unconventional: "Expressive cuts drawn from the full Puzzle Forge edge vocabulary.",
} as const satisfies Record<JigsawCutStyle, string>;

export const jigsawEdgeProfileIds = [
  ...jigsawConnectorGrammarIds,
  "connectorless-wave",
] as const satisfies readonly JigsawEdgeProfileId[];

type WeightMap<T extends string> = Partial<Record<T, number>>;

type JigsawCutStyleDefinition = {
  edgeProfileWeights: WeightMap<JigsawEdgeProfileId>;
  baselineCourseWeights: WeightMap<JigsawBaselineCourseId>;
  requiredBaselineCourseIds: readonly JigsawBaselineCourseId[];
  baselinePaletteSize: number;
};

const jigsawCutStyleDefinitions: Record<JigsawCutStyle, JigsawCutStyleDefinition> = {
  traditional: {
    edgeProfileWeights: {
      "classic-bulb": 4,
      "necked-head": 2,
    },
    baselineCourseWeights: {
      straight: 4,
      bow: 3,
      inflection: 1.2,
      "angled-course": 0.8,
    },
    requiredBaselineCourseIds: ["straight", "bow"],
    baselinePaletteSize: 3,
  },
  unconventional: {
    edgeProfileWeights: {
      "classic-bulb": 0.3,
      "necked-head": 0.55,
      "multi-lobe": 1,
      scoop: 1.1,
      serpentine: 1.2,
      terrace: 0.95,
      zigzag: 1,
      "stacked-lock": 1.15,
      "compound-lock": 1.15,
      "opposed-dual-lock": 0.9,
      "notched-head": 1.05,
      "connectorless-wave": 0.65,
    },
    baselineCourseWeights: {
      straight: 0.15,
      bow: 0.55,
      inflection: 0.8,
      "angled-course": 0.85,
      dogleg: 1,
      wave: 1.15,
      "stepped-course": 1.05,
      "separated-bows": 0.9,
      "opposed-pair": 0.9,
      "primary-secondary": 0.85,
      "inflection-rest-bow": 0.95,
      "same-side-hairpin": 0.75,
      "opposed-hairpin": 0.7,
      "counter-hook": 0.75,
    },
    requiredBaselineCourseIds: ["bow"],
    baselinePaletteSize: 4,
  },
};

const selectWeightedId = <T extends string>(
  ids: readonly T[],
  weights: WeightMap<T>,
  randomUnit: number,
): T => {
  const weighted = ids
    .map((id) => ({ id, weight: Math.max(0, weights[id] ?? 0) }))
    .filter(({ weight }) => weight > 0);
  if (weighted.length === 0) {
    throw new Error("Jigsaw cut-style policy has no selectable edge vocabulary.");
  }

  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  const normalized = Math.min(1 - Number.EPSILON, Math.max(0, randomUnit));
  let cursor = normalized * total;

  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor < 0) return entry.id;
  }

  return weighted[weighted.length - 1]!.id;
};

export const normalizeJigsawCutStyle = (
  value: JigsawCutStyle | undefined,
): JigsawCutStyle => value ?? defaultJigsawCutStyle;

export const selectJigsawEdgeProfileForCutStyle = (
  cutStyle: JigsawCutStyle,
  randomUnit: number,
): JigsawEdgeProfileId =>
  selectWeightedId(
    jigsawEdgeProfileIds,
    jigsawCutStyleDefinitions[cutStyle].edgeProfileWeights,
    randomUnit,
  );

export const deriveJigsawBaselineCoursePalette = (
  cutStyle: JigsawCutStyle,
  seed: string,
): readonly JigsawBaselineCourseId[] => {
  const definition = jigsawCutStyleDefinitions[cutStyle];
  const selected = [...definition.requiredBaselineCourseIds];
  const available = jigsawBaselineCourseIds.filter(
    (courseId) =>
      !selected.includes(courseId) &&
      (definition.baselineCourseWeights[courseId] ?? 0) > 0,
  );
  const random = createRandom(`${seed}:baseline-palette`);

  while (
    selected.length < definition.baselinePaletteSize &&
    available.length > 0
  ) {
    const courseId = selectWeightedId(
      available,
      definition.baselineCourseWeights,
      random(),
    );
    selected.push(courseId);
    available.splice(available.indexOf(courseId), 1);
  }

  return selected;
};

export const sampleJigsawBaselineCourseForCutStyle = (
  cutStyle: JigsawCutStyle,
  baselineCourseIds: readonly JigsawBaselineCourseId[],
  randomUnit: number,
): JigsawBaselineCourseId => {
  if (baselineCourseIds.length === 0) {
    throw new Error("Jigsaw baseline palette must contain at least one course.");
  }

  return selectWeightedId(
    baselineCourseIds,
    jigsawCutStyleDefinitions[cutStyle].baselineCourseWeights,
    randomUnit,
  );
};
