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

const isIdentity = (production: JigsawBaselineProduction) =>
  production.kind === "primitive" && production.primitive === "identity";

export const baselineSequence = (
  ...terms: readonly JigsawBaselineProduction[]
): JigsawBaselineProduction => {
  const flattened = terms
    .flatMap((term) => (term.kind === "sequence" ? term.terms : [term]))
    .filter((term) => !isIdentity(term));

  if (flattened.length === 0) return baselinePrimitive("identity");
  if (flattened.length === 1) return flattened[0];

  return {
    kind: "sequence",
    terms: flattened,
  };
};

export const baselineRepeat = (
  term: JigsawBaselineProduction,
  count: number,
): JigsawBaselineProduction => {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Baseline production repeat count must be a positive integer.");
  }

  if (isIdentity(term) || count === 1) return term;

  if (term.kind === "repeat") {
    return {
      kind: "repeat",
      term: term.term,
      count: term.count * count,
    };
  }

  return {
    kind: "repeat",
    term,
    count,
  };
};

export const baselineOppose = (
  term: JigsawBaselineProduction,
): JigsawBaselineProduction => {
  if (isIdentity(term)) return term;
  if (term.kind === "oppose") return term.term;

  return {
    kind: "oppose",
    term,
  };
};

export const baselineMirror = (
  term: JigsawBaselineProduction,
): JigsawBaselineProduction => {
  if (isIdentity(term)) return term;
  if (term.kind === "mirror") return term.term;

  return {
    kind: "mirror",
    term,
  };
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
