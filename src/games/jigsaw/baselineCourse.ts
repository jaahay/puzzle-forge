import type {
  JigsawBaselineCourseId,
  JigsawBaselineGrammarId,
  JigsawBaselineReversalCourseId,
  JigsawBaselineSpanCourseId,
} from "../../catalog/types";
import {
  deriveJigsawBaselineProgram,
  getJigsawBaselineGrammarDefinition,
  jigsawBaselineGrammarIds,
  realizeJigsawBaselineProgram,
  type JigsawBaselinePoint,
  type JigsawBaselineProgram,
} from "./baselineGrammar";
import {
  jigsawBaselineSpanCourseIds,
  realizeJigsawBaselineSpanCourse,
} from "./baselineSpanGrammar";
import {
  jigsawBaselineReversalCourseIds,
  realizeJigsawBaselineReversalCourse,
} from "./baselineReversalGrammar";

type Range = readonly [minimum: number, maximum: number];

export type JigsawBaselineCourseDefinition = {
  id: JigsawBaselineCourseId;
  label: string;
  description: string;
  renderMode: "smooth" | "angular";
  curveTension: number;
  depth: Range;
};

type CanonicalCourseProgram = {
  kind: "canonical";
  baselineCourseId: JigsawBaselineGrammarId;
  depth: number;
  program: JigsawBaselineProgram;
};

type GeneratedCourseProgram = {
  kind: "generated";
  baselineCourseId: JigsawBaselineSpanCourseId | JigsawBaselineReversalCourseId;
  depth: number;
  points: readonly JigsawBaselinePoint[];
};

export type JigsawBaselineCourseProgram =
  | CanonicalCourseProgram
  | GeneratedCourseProgram;

export const jigsawBaselineCourseIds = [
  ...jigsawBaselineGrammarIds,
  ...jigsawBaselineSpanCourseIds,
  ...jigsawBaselineReversalCourseIds,
] as const satisfies readonly JigsawBaselineCourseId[];

const advancedDefinitions: Record<
  JigsawBaselineSpanCourseId | JigsawBaselineReversalCourseId,
  JigsawBaselineCourseDefinition
> = {
  "separated-bows": {
    id: "separated-bows",
    label: "Separated bows",
    description: "Two distinct same-side gestures are separated by a deliberate quiet run.",
    renderMode: "smooth",
    curveTension: 0.08,
    depth: [4, 6],
  },
  "opposed-pair": {
    id: "opposed-pair",
    label: "Opposed pair",
    description: "Two separated gestures occupy opposite sides of the nominal edge.",
    renderMode: "smooth",
    curveTension: 0.08,
    depth: [4, 6],
  },
  "primary-secondary": {
    id: "primary-secondary",
    label: "Primary / secondary",
    description: "One dominant gesture is followed by a smaller subordinate gesture.",
    renderMode: "smooth",
    curveTension: 0.08,
    depth: [4.5, 6.5],
  },
  "inflection-rest-bow": {
    id: "inflection-rest-bow",
    label: "Inflection / rest / bow",
    description: "A crossing gesture, quiet run, and secondary bow form one asymmetric course.",
    renderMode: "smooth",
    curveTension: 0.07,
    depth: [4, 6],
  },
  "same-side-hairpin": {
    id: "same-side-hairpin",
    label: "Same-side hairpin",
    description: "The course advances, backtracks once on the same side, then resumes forward.",
    renderMode: "angular",
    curveTension: 0,
    depth: [7, 9],
  },
  "opposed-hairpin": {
    id: "opposed-hairpin",
    label: "Opposed hairpin",
    description: "A single bounded backtrack crosses the nominal edge before resolving.",
    renderMode: "angular",
    curveTension: 0,
    depth: [7, 9],
  },
  "counter-hook": {
    id: "counter-hook",
    label: "Counter hook",
    description: "A deep shoulder backtracks once and resolves through a shallow counter-sweep.",
    renderMode: "angular",
    curveTension: 0,
    depth: [7, 9],
  },
};

const grammarIds = new Set<string>(jigsawBaselineGrammarIds);
export const isJigsawBaselineGrammarId = (
  courseId: JigsawBaselineCourseId,
): courseId is JigsawBaselineGrammarId => grammarIds.has(courseId);

const seededUnit = (seedOffset: number, salt: number) => {
  const mixed = Math.imul((seedOffset ^ salt) >>> 0, 2_654_435_761) >>> 0;
  return mixed / 0xffff_ffff;
};

const range = (seedOffset: number, rangeValue: Range) =>
  rangeValue[0] + seededUnit(seedOffset, 0xd101) * (rangeValue[1] - rangeValue[0]);

export const getJigsawBaselineCourseDefinition = (
  courseId: JigsawBaselineCourseId,
): JigsawBaselineCourseDefinition => {
  if (isJigsawBaselineGrammarId(courseId)) {
    return getJigsawBaselineGrammarDefinition(courseId);
  }
  return advancedDefinitions[courseId];
};

export const deriveJigsawBaselineCourseProgram = (
  courseId: JigsawBaselineCourseId,
  seedOffset: number,
): JigsawBaselineCourseProgram => {
  if (isJigsawBaselineGrammarId(courseId)) {
    const program = deriveJigsawBaselineProgram(courseId, seedOffset);
    return {
      kind: "canonical",
      baselineCourseId: courseId,
      depth: program.depth,
      program,
    };
  }

  const definition = advancedDefinitions[courseId];
  const depth = range(seedOffset, definition.depth);
  const normalizedPoints = jigsawBaselineSpanCourseIds.includes(
    courseId as JigsawBaselineSpanCourseId,
  )
    ? realizeJigsawBaselineSpanCourse(
        courseId as JigsawBaselineSpanCourseId,
        seedOffset,
      )
    : realizeJigsawBaselineReversalCourse(
        courseId as JigsawBaselineReversalCourseId,
        seedOffset,
      );

  return {
    kind: "generated",
    baselineCourseId: courseId,
    depth,
    points: normalizedPoints.map((candidate) => ({
      x: candidate.x,
      y: candidate.y * depth,
    })),
  };
};

export const realizeJigsawBaselineCourseProgram = (
  program: JigsawBaselineCourseProgram,
): JigsawBaselinePoint[] =>
  program.kind === "canonical"
    ? realizeJigsawBaselineProgram(program.program)
    : [...program.points];
