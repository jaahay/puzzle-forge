import {
  jigsawBaselineCanonicalProductions,
  jigsawBaselineGrammarIds,
} from "./baselineGrammar";
import {
  baselineOppose,
  baselinePrimitive,
  baselineSequence,
  getJigsawBaselineProductionStructure,
  type JigsawBaselineProduction,
} from "./baselineProduction";
import {
  realizeJigsawBaselineProductionCandidate,
  type JigsawBaselineCandidateRejectionReason,
} from "./baselineProductionRealizer";

export type JigsawBaselineSpanPoint = {
  x: number;
  y: number;
};

export type JigsawBaselineSpanTerm =
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

export type JigsawBaselineSpanExplorationCandidate = {
  id:
    | "separated-bows"
    | "opposed-pair"
    | "primary-secondary"
    | "inflection-rest-bow";
  label: string;
  question: "separated-gestures" | "scale-hierarchy";
  terms: readonly JigsawBaselineSpanTerm[];
};

export type JigsawBaselineSpanRealization =
  | {
      accepted: true;
      points: readonly JigsawBaselineSpanPoint[];
      structureSignature: string;
      runSpans: readonly { start: number; end: number }[];
    }
  | {
      accepted: false;
      reason:
        | "invalid-span"
        | "invalid-amplitude"
        | "anchor-mismatch"
        | "non-finite-coordinate"
        | "bounds"
        | "non-monotonic-traversal"
        | "self-intersection"
        | JigsawBaselineCandidateRejectionReason;
    };

const bow = jigsawBaselineCanonicalProductions.bow;
const inflection = jigsawBaselineCanonicalProductions.inflection;

export const jigsawBaselineSpanExplorationCandidates = [
  {
    id: "separated-bows",
    label: "Separated bows",
    question: "separated-gestures",
    terms: [
      { kind: "gesture", production: bow, spanWeight: 3, amplitude: 1 },
      { kind: "run", spanWeight: 2 },
      { kind: "gesture", production: bow, spanWeight: 3, amplitude: 1 },
    ],
  },
  {
    id: "opposed-pair",
    label: "Opposed pair",
    question: "separated-gestures",
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
  {
    id: "primary-secondary",
    label: "Primary / secondary",
    question: "scale-hierarchy",
    terms: [
      { kind: "gesture", production: bow, spanWeight: 4, amplitude: 1 },
      { kind: "run", spanWeight: 1.5 },
      { kind: "gesture", production: bow, spanWeight: 2.5, amplitude: 0.45 },
    ],
  },
  {
    id: "inflection-rest-bow",
    label: "Inflection / rest / bow",
    question: "separated-gestures",
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
] as const satisfies readonly JigsawBaselineSpanExplorationCandidate[];

const epsilon = 1e-9;

const point = (x: number, y: number): JigsawBaselineSpanPoint => ({ x, y });

const deriveTermSeed = (
  seedOffset: number,
  termIndex: number,
) =>
  Math.imul(
    (seedOffset ^ Math.imul(termIndex + 1, 0x9e3779b1)) >>> 0,
    1_597_334_677,
  ) >>> 0;

const cross = (
  start: JigsawBaselineSpanPoint,
  end: JigsawBaselineSpanPoint,
  candidate: JigsawBaselineSpanPoint,
) =>
  (end.x - start.x) * (candidate.y - start.y) -
  (end.y - start.y) * (candidate.x - start.x);

const segmentsProperlyIntersect = (
  firstStart: JigsawBaselineSpanPoint,
  firstEnd: JigsawBaselineSpanPoint,
  secondStart: JigsawBaselineSpanPoint,
  secondEnd: JigsawBaselineSpanPoint,
) => {
  const firstA = cross(firstStart, firstEnd, secondStart);
  const firstB = cross(firstStart, firstEnd, secondEnd);
  const secondA = cross(secondStart, secondEnd, firstStart);
  const secondB = cross(secondStart, secondEnd, firstEnd);

  return (
    ((firstA > epsilon && firstB < -epsilon) ||
      (firstA < -epsilon && firstB > epsilon)) &&
    ((secondA > epsilon && secondB < -epsilon) ||
      (secondA < -epsilon && secondB > epsilon))
  );
};

const getStructureSignature = (
  terms: readonly JigsawBaselineSpanTerm[],
) =>
  terms
    .map((term) =>
      term.kind === "run"
        ? `run[${term.spanWeight}]`
        : `gesture(${getJigsawBaselineProductionStructure(term.production)})[${term.spanWeight};${term.amplitude}]`,
    )
    .join(" > ");

export const realizeJigsawBaselineSpanCandidate = (
  candidate: JigsawBaselineSpanExplorationCandidate,
  seedOffset: number,
): JigsawBaselineSpanRealization => {
  if (
    candidate.terms.some(
      (term) =>
        !Number.isFinite(term.spanWeight) ||
        term.spanWeight <= 0,
    )
  ) {
    return { accepted: false, reason: "invalid-span" };
  }
  if (
    candidate.terms.some(
      (term) =>
        term.kind === "gesture" &&
        (!Number.isFinite(term.amplitude) ||
          term.amplitude <= 0 ||
          term.amplitude > 1),
    )
  ) {
    return { accepted: false, reason: "invalid-amplitude" };
  }

  const totalWeight = candidate.terms.reduce(
    (sum, term) => sum + term.spanWeight,
    0,
  );
  const points: JigsawBaselineSpanPoint[] = [];
  const runSpans: Array<{ start: number; end: number }> = [];
  let cursor = 0;

  for (let index = 0; index < candidate.terms.length; index += 1) {
    const term = candidate.terms[index]!;
    const start = cursor;
    const end =
      index === candidate.terms.length - 1
        ? 1
        : cursor + term.spanWeight / totalWeight;
    cursor = end;

    let termPoints: readonly JigsawBaselineSpanPoint[];
    if (term.kind === "run") {
      runSpans.push({ start, end });
      termPoints = [
        point(start, 0),
        point(end, 0),
      ];
    } else {
      const realized = realizeJigsawBaselineProductionCandidate(
        term.production,
        deriveTermSeed(seedOffset, index),
      );
      if (!realized.accepted) return realized;

      termPoints = realized.points.map((candidatePoint) =>
        point(
          start + candidatePoint.x * (end - start),
          candidatePoint.y * term.amplitude,
        ),
      );
    }

    points.push(
      ...(points.length === 0
        ? termPoints
        : termPoints.slice(1)),
    );
  }

  const first = points[0];
  const last = points.at(-1);
  if (
    !first ||
    !last ||
    Math.abs(first.x) > epsilon ||
    Math.abs(first.y) > epsilon ||
    Math.abs(last.x - 1) > epsilon ||
    Math.abs(last.y) > epsilon
  ) {
    return { accepted: false, reason: "anchor-mismatch" };
  }

  for (let index = 0; index < points.length; index += 1) {
    const candidatePoint = points[index]!;
    if (
      !Number.isFinite(candidatePoint.x) ||
      !Number.isFinite(candidatePoint.y)
    ) {
      return { accepted: false, reason: "non-finite-coordinate" };
    }
    if (
      candidatePoint.x < -epsilon ||
      candidatePoint.x > 1 + epsilon ||
      Math.abs(candidatePoint.y) > 1 + epsilon
    ) {
      return { accepted: false, reason: "bounds" };
    }
    if (
      index > 0 &&
      candidatePoint.x < points[index - 1]!.x - epsilon
    ) {
      return { accepted: false, reason: "non-monotonic-traversal" };
    }
  }

  for (let firstIndex = 0; firstIndex < points.length - 1; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 2;
      secondIndex < points.length - 1;
      secondIndex += 1
    ) {
      if (
        segmentsProperlyIntersect(
          points[firstIndex]!,
          points[firstIndex + 1]!,
          points[secondIndex]!,
          points[secondIndex + 1]!,
        )
      ) {
        return { accepted: false, reason: "self-intersection" };
      }
    }
  }

  return {
    accepted: true,
    points,
    structureSignature: getStructureSignature(candidate.terms),
    runSpans,
  };
};

export const getCurrentBaselineSequenceWithoutRun = () =>
  baselineSequence(
    bow,
    baselinePrimitive("identity"),
    bow,
  );

export const baselineSpanExperimentLeavesProductionCatalogUntouched = () =>
  jigsawBaselineSpanExplorationCandidates.every(
    (candidate) =>
      !jigsawBaselineGrammarIds.includes(
        candidate.id as (typeof jigsawBaselineGrammarIds)[number],
      ),
  );
