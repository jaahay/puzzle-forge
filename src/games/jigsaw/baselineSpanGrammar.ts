import {
  jigsawBaselineCanonicalProductions,
} from "./baselineGrammar";
import {
  baselineOppose,
  type JigsawBaselineProduction,
} from "./baselineProduction";
import {
  realizeJigsawBaselineProductionCandidate,
} from "./baselineProductionRealizer";
import type { JigsawBaselineSpanCourseId } from "../../catalog/types";

export type JigsawBaselineSpanPoint = {
  x: number;
  y: number;
};

type SpanTerm =
  | {
      kind: "gesture";
      production: JigsawBaselineProduction;
      spanWeight: number;
      amplitude: number;
    }
  | {
      kind: "run";
      spanWeight: number;
    };

type SpanCourseDefinition = {
  id: JigsawBaselineSpanCourseId;
  terms: readonly SpanTerm[];
};

const bow = jigsawBaselineCanonicalProductions.bow;
const inflection = jigsawBaselineCanonicalProductions.inflection;

export const jigsawBaselineSpanCourseIds = [
  "separated-bows",
  "opposed-pair",
  "primary-secondary",
  "inflection-rest-bow",
] as const satisfies readonly JigsawBaselineSpanCourseId[];

const spanCourses: Record<JigsawBaselineSpanCourseId, SpanCourseDefinition> = {
  "separated-bows": {
    id: "separated-bows",
    terms: [
      { kind: "gesture", production: bow, spanWeight: 3, amplitude: 1 },
      { kind: "run", spanWeight: 2 },
      { kind: "gesture", production: bow, spanWeight: 3, amplitude: 1 },
    ],
  },
  "opposed-pair": {
    id: "opposed-pair",
    terms: [
      { kind: "gesture", production: bow, spanWeight: 3, amplitude: 0.9 },
      { kind: "run", spanWeight: 2 },
      {
        kind: "gesture",
        production: baselineOppose(bow),
        spanWeight: 3,
        amplitude: 0.9,
      },
    ],
  },
  "primary-secondary": {
    id: "primary-secondary",
    terms: [
      { kind: "gesture", production: bow, spanWeight: 4, amplitude: 1 },
      { kind: "run", spanWeight: 1.5 },
      { kind: "gesture", production: bow, spanWeight: 2.5, amplitude: 0.45 },
    ],
  },
  "inflection-rest-bow": {
    id: "inflection-rest-bow",
    terms: [
      {
        kind: "gesture",
        production: inflection,
        spanWeight: 3.5,
        amplitude: 0.85,
      },
      { kind: "run", spanWeight: 2 },
      { kind: "gesture", production: bow, spanWeight: 2.5, amplitude: 0.65 },
    ],
  },
};

const point = (x: number, y: number): JigsawBaselineSpanPoint => ({ x, y });

const deriveTermSeed = (seedOffset: number, termIndex: number, attempt: number) =>
  Math.imul(
    (seedOffset ^ Math.imul(termIndex + 1, 0x9e3779b1) ^ Math.imul(attempt + 1, 0x85ebca6b)) >>> 0,
    1_597_334_677,
  ) >>> 0;

const realizeAttempt = (
  definition: SpanCourseDefinition,
  seedOffset: number,
  attempt: number,
): JigsawBaselineSpanPoint[] | null => {
  const totalWeight = definition.terms.reduce(
    (sum, term) => sum + term.spanWeight,
    0,
  );
  const points: JigsawBaselineSpanPoint[] = [];
  let cursor = 0;

  for (let index = 0; index < definition.terms.length; index += 1) {
    const term = definition.terms[index]!;
    const start = cursor;
    const end =
      index === definition.terms.length - 1
        ? 1
        : cursor + term.spanWeight / totalWeight;
    cursor = end;

    let termPoints: readonly JigsawBaselineSpanPoint[];
    if (term.kind === "run") {
      termPoints = [point(start, 0), point(end, 0)];
    } else {
      const realized = realizeJigsawBaselineProductionCandidate(
        term.production,
        deriveTermSeed(seedOffset, index, attempt),
      );
      if (!realized.accepted) return null;
      termPoints = realized.points.map((candidate) =>
        point(
          start + candidate.x * (end - start),
          candidate.y * term.amplitude,
        ),
      );
    }

    points.push(...(points.length === 0 ? termPoints : termPoints.slice(1)));
  }

  return points;
};

export const realizeJigsawBaselineSpanCourse = (
  courseId: JigsawBaselineSpanCourseId,
  seedOffset: number,
): JigsawBaselineSpanPoint[] => {
  const definition = spanCourses[courseId];

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const points = realizeAttempt(definition, seedOffset, attempt);
    if (points) return points;
  }

  throw new Error(`Unable to realize Jigsaw baseline span course: ${courseId}.`);
};
