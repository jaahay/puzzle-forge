export const jigsawBaselinePrimitives = [
  "identity",
  "sweep",
  "cross",
  "course",
  "turn",
] as const;

export type JigsawBaselinePrimitive =
  (typeof jigsawBaselinePrimitives)[number];

type PrimitiveProduction = {
  kind: "primitive";
  primitive: JigsawBaselinePrimitive;
};

type SequenceProduction = {
  kind: "sequence";
  terms: readonly JigsawBaselineProduction[];
};

type RepeatProduction = {
  kind: "repeat";
  term: JigsawBaselineProduction;
  count: number;
};

type OpposeProduction = {
  kind: "oppose";
  term: JigsawBaselineProduction;
};

type MirrorProduction = {
  kind: "mirror";
  term: JigsawBaselineProduction;
};

export type JigsawBaselineProduction =
  | PrimitiveProduction
  | SequenceProduction
  | RepeatProduction
  | OpposeProduction
  | MirrorProduction;

export const baselinePrimitive = (
  primitive: JigsawBaselinePrimitive,
): JigsawBaselineProduction => ({
  kind: "primitive",
  primitive,
});

export const baselineSequence = (
  ...terms: readonly JigsawBaselineProduction[]
): JigsawBaselineProduction => ({
  kind: "sequence",
  terms,
});

export const baselineRepeat = (
  term: JigsawBaselineProduction,
  count: number,
): JigsawBaselineProduction => {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Baseline production repeat count must be a positive integer.");
  }

  return {
    kind: "repeat",
    term,
    count,
  };
};

export const baselineOppose = (
  term: JigsawBaselineProduction,
): JigsawBaselineProduction => ({
  kind: "oppose",
  term,
});

export const baselineMirror = (
  term: JigsawBaselineProduction,
): JigsawBaselineProduction => ({
  kind: "mirror",
  term,
});

const parenthesize = (production: JigsawBaselineProduction): string =>
  production.kind === "primitive"
    ? formatJigsawBaselineProduction(production)
    : `(${formatJigsawBaselineProduction(production)})`;

export const formatJigsawBaselineProduction = (
  production: JigsawBaselineProduction,
): string => {
  switch (production.kind) {
    case "primitive":
      return production.primitive;
    case "sequence":
      return production.terms
        .map((term) => formatJigsawBaselineProduction(term))
        .join(" > ");
    case "repeat":
      return `repeat(${formatJigsawBaselineProduction(production.term)}){${production.count}}`;
    case "oppose":
      return `oppose(${formatJigsawBaselineProduction(production.term)})`;
    case "mirror":
      return `mirror(${formatJigsawBaselineProduction(production.term)})`;
  }
};

export const expandJigsawBaselineProduction = (
  production: JigsawBaselineProduction,
): readonly JigsawBaselinePrimitive[] => {
  switch (production.kind) {
    case "primitive":
      return [production.primitive];
    case "sequence":
      return production.terms.flatMap((term) =>
        expandJigsawBaselineProduction(term),
      );
    case "repeat":
      return Array.from({ length: production.count }, () =>
        expandJigsawBaselineProduction(production.term),
      ).flat();
    case "oppose":
    case "mirror":
      return expandJigsawBaselineProduction(production.term);
  }
};

export const getJigsawBaselineProductionPrimitives = (
  production: JigsawBaselineProduction,
): ReadonlySet<JigsawBaselinePrimitive> =>
  new Set(expandJigsawBaselineProduction(production));

export const getJigsawBaselineProductionStructure = (
  production: JigsawBaselineProduction,
): string => {
  switch (production.kind) {
    case "primitive":
      return production.primitive;
    case "sequence":
      return production.terms
        .map((term) => getJigsawBaselineProductionStructure(term))
        .join(" > ");
    case "repeat":
      return `repeat(${getJigsawBaselineProductionStructure(production.term)}){${production.count}}`;
    case "oppose":
      return `oppose(${getJigsawBaselineProductionStructure(production.term)})`;
    case "mirror":
      return `mirror(${getJigsawBaselineProductionStructure(production.term)})`;
  }
};
