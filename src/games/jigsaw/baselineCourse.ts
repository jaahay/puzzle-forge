import type {
  JigsawBaselineCourseId,
  JigsawBaselineGrammarId,
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
  baselineCourseId: JigsawBaselineSpanCourseId;
  depth: number;
  points: readonly JigsawBaselinePoint[];
};

export type JigsawBaselineCourseProgram =
  | CanonicalCourseProgram
  | GeneratedCourseProgram;

export const jigsawBaselineCourseIds = [
  ...jigsawBaselineGrammarIds,
  ...jigsawBaselineSpanCourseIds,
] as const satisfies readonly JigsawBaselineCourseId[];

const advancedDefinitions: Record<
  JigsawBaselineSpanCourseId,
  JigsawBaselineCourseDefinition
> = {
  "separated-bows": {
    id: "separated-bows",
    label: "Separated bows",
    description: "Two distinct same-side gestures are separated by a deliberate quiet run.",
    renderMode: "angular",
    curveTension: 0,
    depth: [4, 6],
  },
  "opposed-pair": {
    id: "opposed-pair",
    label: "Opposed pair",
    description: "Two separated gestures occupy opposite sides of the nominal edge.",
    renderMode: "angular",
    curveTension: 0,
    depth: [4, 6],
  },
  "primary-secondary": {
    id: "primary-secondary",
    label: "Primary / secondary",
    description: "One dominant gesture is followed by a smaller subordinate gesture.",
    renderMode: "angular",
    curveTension: 0,
    depth: [4.5, 6.5],
  },
  "inflection-rest-bow": {
    id: "inflection-rest-bow",
    label: "Inflection / rest / bow",
    description: "A crossing gesture, quiet run, and secondary bow form one asymmetric course.",
    renderMode: "angular",
    curveTension: 0,
    depth: [4, 6],
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
  const normalizedPoints = realizeJigsawBaselineSpanCourse(
    courseId as JigsawBaselineSpanCourseId,
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
