import type {
  JigsawBaselineCourseId,
  JigsawCutStyle,
  JigsawEdgeProfileId,
} from "../../catalog/types";
import { createRandom } from "../shared";
import { jigsawBaselineCourseIds } from "./baselineCourse";
import { jigsawConnectorGrammarIds } from "./connectorGrammar";

export const jigsawCutStyles = [
  "classic",
  "flowing",
  "geometric",
  "intricate",
  "eclectic",
] as const satisfies readonly JigsawCutStyle[];

export const defaultJigsawCutStyle: JigsawCutStyle = "classic";

export const isJigsawCutStyle = (value: unknown): value is JigsawCutStyle =>
  jigsawCutStyles.includes(value as JigsawCutStyle);

export const jigsawCutStyleLabels = {
  classic: "Classic",
  flowing: "Flowing",
  geometric: "Geometric",
  intricate: "Intricate",
  eclectic: "Eclectic",
} as const satisfies Record<JigsawCutStyle, string>;

export const jigsawCutStyleDescriptions = {
  classic: "Familiar, restrained cuts inspired by manufactured jigsaws.",
  flowing: "Rounded, organic cuts with sweeping curves and waves.",
  geometric: "Angular, architectural cuts built from steps, terraces, and zigzags.",
  intricate: "Compound and multi-event interlocks with dense matching clues.",
  eclectic: "A coherent puzzle drawn from the full Puzzle Forge edge vocabulary.",
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
  classic: {
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
  flowing: {
    edgeProfileWeights: {
      "classic-bulb": 0.6,
      "multi-lobe": 1.15,
      scoop: 1.3,
      serpentine: 1.2,
      "connectorless-wave": 0.7,
    },
    baselineCourseWeights: {
      straight: 0.25,
      bow: 1.35,
      inflection: 1,
      wave: 1.4,
    },
    requiredBaselineCourseIds: ["bow", "wave"],
    baselinePaletteSize: 3,
  },
  geometric: {
    edgeProfileWeights: {
      terrace: 1.2,
      zigzag: 1.25,
      "stacked-lock": 1,
    },
    baselineCourseWeights: {
      straight: 0.25,
      "angled-course": 1.05,
      dogleg: 1.2,
      "stepped-course": 1.3,
    },
    requiredBaselineCourseIds: ["angled-course", "stepped-course"],
    baselinePaletteSize: 3,
  },
  intricate: {
    edgeProfileWeights: {
      "necked-head": 0.35,
      "multi-lobe": 0.55,
      "stacked-lock": 0.85,
      "compound-lock": 1.25,
      "opposed-dual-lock": 1.1,
      "notched-head": 1.15,
    },
    baselineCourseWeights: {
      bow: 0.25,
      inflection: 0.35,
      wave: 0.3,
      "separated-bows": 0.9,
      "opposed-pair": 0.95,
      "primary-secondary": 1.15,
      "inflection-rest-bow": 1.05,
      "same-side-hairpin": 0.9,
      "opposed-hairpin": 0.9,
      "counter-hook": 1,
    },
    requiredBaselineCourseIds: ["primary-secondary"],
    baselinePaletteSize: 4,
  },
  eclectic: {
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
      "same-side-hairpin": 0.78,
      "opposed-hairpin": 0.72,
      "counter-hook": 0.76,
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
    throw new Error("Jigsaw cut-style policy has no selectable vocabulary.");
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
