import type { JigsawConnectorGrammarId } from "../../catalog/types";
import { jigsawConnectorGrammarIds } from "./connectorGrammar";

export const jigsawConnectorProductionPrimitives = [
  "lobe",
  "saddle",
  "neck",
  "undercut",
  "head",
  "outer-sweep",
  "scoop",
  "return",
  "cross",
  "step",
  "plateau",
  "zig",
  "zag",
  "chamber",
  "waist",
  "notch",
  "backtrack",
  "catch",
] as const;

export type JigsawConnectorProductionPrimitive =
  (typeof jigsawConnectorProductionPrimitives)[number];

export type JigsawConnectorProduction =
  | {
      kind: "primitive";
      primitive: JigsawConnectorProductionPrimitive;
    }
  | {
      kind: "sequence";
      terms: readonly JigsawConnectorProduction[];
    }
  | {
      kind: "repeat";
      term: JigsawConnectorProduction;
      minimum: number;
      maximum: number;
    }
  | {
      kind: "oppose";
      term: JigsawConnectorProduction;
    }
  | {
      kind: "mirror";
      term: JigsawConnectorProduction;
    }
  | {
      kind: "nest";
      shell: JigsawConnectorProduction;
      inset: JigsawConnectorProduction;
    };

export const connectorPrimitive = (
  primitive: JigsawConnectorProductionPrimitive,
): JigsawConnectorProduction => ({
  kind: "primitive",
  primitive,
});

export const connectorSequence = (
  ...terms: readonly JigsawConnectorProduction[]
): JigsawConnectorProduction => {
  const flattened = terms.flatMap((term) =>
    term.kind === "sequence" ? term.terms : [term],
  );

  if (flattened.length === 0) {
    throw new Error("Connector production sequence must contain at least one term.");
  }
  if (flattened.length === 1) return flattened[0]!;

  return {
    kind: "sequence",
    terms: flattened,
  };
};

export const connectorRepeat = (
  term: JigsawConnectorProduction,
  minimum: number,
  maximum: number,
): JigsawConnectorProduction => {
  if (
    !Number.isInteger(minimum) ||
    !Number.isInteger(maximum) ||
    minimum < 1 ||
    maximum < minimum
  ) {
    throw new Error(
      "Connector production repeat bounds must be positive ordered integers.",
    );
  }

  if (minimum === 1 && maximum === 1) return term;

  return {
    kind: "repeat",
    term,
    minimum,
    maximum,
  };
};

export const connectorOppose = (
  term: JigsawConnectorProduction,
): JigsawConnectorProduction =>
  term.kind === "oppose"
    ? term.term
    : {
        kind: "oppose",
        term,
      };

export const connectorMirror = (
  term: JigsawConnectorProduction,
): JigsawConnectorProduction =>
  term.kind === "mirror"
    ? term.term
    : {
        kind: "mirror",
        term,
      };

export const connectorNest = (
  shell: JigsawConnectorProduction,
  inset: JigsawConnectorProduction,
): JigsawConnectorProduction => ({
  kind: "nest",
  shell,
  inset,
});

export const getJigsawConnectorProductionStructure = (
  production: JigsawConnectorProduction,
): string => {
  switch (production.kind) {
    case "primitive":
      return production.primitive;
    case "sequence":
      return production.terms
        .map((term) => getJigsawConnectorProductionStructure(term))
        .join(" > ");
    case "repeat":
      return `repeat(${getJigsawConnectorProductionStructure(production.term)}){${production.minimum}..${production.maximum}}`;
    case "oppose":
      return `oppose(${getJigsawConnectorProductionStructure(production.term)})`;
    case "mirror":
      return `mirror(${getJigsawConnectorProductionStructure(production.term)})`;
    case "nest":
      return `nest(${getJigsawConnectorProductionStructure(production.shell)} :: ${getJigsawConnectorProductionStructure(production.inset)})`;
  }
};

const lobe = connectorPrimitive("lobe");
const saddle = connectorPrimitive("saddle");
const neck = connectorPrimitive("neck");
const undercut = connectorPrimitive("undercut");
const head = connectorPrimitive("head");
const outerSweep = connectorPrimitive("outer-sweep");
const scoop = connectorPrimitive("scoop");
const returnEvent = connectorPrimitive("return");
const cross = connectorPrimitive("cross");
const step = connectorPrimitive("step");
const plateau = connectorPrimitive("plateau");
const zig = connectorPrimitive("zig");
const zag = connectorPrimitive("zag");
const chamber = connectorPrimitive("chamber");
const waist = connectorPrimitive("waist");
const notch = connectorPrimitive("notch");
const backtrack = connectorPrimitive("backtrack");
const catchEvent = connectorPrimitive("catch");

const neckedHead = connectorSequence(
  neck,
  undercut,
  head,
  undercut,
  neck,
);

export const jigsawConnectorCanonicalProductions = {
  "classic-bulb": lobe,
  "necked-head": neckedHead,
  "multi-lobe": connectorRepeat(
    connectorSequence(lobe, saddle),
    2,
    4,
  ),
  scoop: connectorSequence(
    outerSweep,
    scoop,
    returnEvent,
  ),
  serpentine: connectorSequence(
    lobe,
    cross,
    connectorOppose(lobe),
  ),
  terrace: connectorRepeat(
    connectorSequence(step, plateau),
    2,
    4,
  ),
  zigzag: connectorRepeat(
    connectorSequence(zig, zag),
    2,
    4,
  ),
  "stacked-lock": connectorSequence(
    chamber,
    waist,
    chamber,
  ),
} as const satisfies Record<JigsawConnectorGrammarId, JigsawConnectorProduction>;

export type JigsawConnectorExplorationAxis =
  | "multi-lock"
  | "mixed-polarity"
  | "asymmetric-catch"
  | "nested-lock"
  | "singular-notch"
  | "longitudinal-reversal"
  | "mixed-lock";

export type JigsawConnectorExplorationProbe = {
  id: string;
  label: string;
  axis: JigsawConnectorExplorationAxis;
  production: JigsawConnectorProduction;
  rationale: string;
  geometryRisk: "moderate" | "high";
};

export const jigsawConnectorExplorationProbes = [
  {
    id: "paired-lock",
    label: "Paired lock",
    axis: "multi-lock",
    production: connectorSequence(
      lobe,
      saddle,
      neckedHead,
    ),
    rationale:
      "Two separately legible locking events share one seam instead of repeating one motif.",
    geometryRisk: "moderate",
  },
  {
    id: "opposed-dual-lock",
    label: "Opposed dual lock",
    axis: "mixed-polarity",
    production: connectorSequence(
      neckedHead,
      cross,
      connectorOppose(neckedHead),
    ),
    rationale:
      "Two full lock events occupy opposite sides of the nominal edge, challenging whole-seam tab/blank semantics.",
    geometryRisk: "high",
  },
  {
    id: "asymmetric-catch",
    label: "Asymmetric catch",
    axis: "asymmetric-catch",
    production: connectorSequence(
      outerSweep,
      undercut,
      head,
      returnEvent,
    ),
    rationale:
      "A unilateral sweep and undercut form a catch rather than a centered head or scoop.",
    geometryRisk: "high",
  },
  {
    id: "nested-lock",
    label: "Nested lock",
    axis: "nested-lock",
    production: connectorNest(
      connectorSequence(chamber, waist, chamber),
      neckedHead,
    ),
    rationale:
      "A secondary lock is structurally contained within a larger chamber instead of appearing serially beside it.",
    geometryRisk: "high",
  },
  {
    id: "notched-head",
    label: "Notched head",
    axis: "singular-notch",
    production: connectorSequence(
      neck,
      undercut,
      head,
      notch,
      undercut,
      neck,
    ),
    rationale:
      "A singular cleft changes the matching clue inside an otherwise coherent overhanging head.",
    geometryRisk: "moderate",
  },
  {
    id: "hook-catch",
    label: "Hook catch",
    axis: "longitudinal-reversal",
    production: connectorSequence(
      outerSweep,
      backtrack,
      catchEvent,
      returnEvent,
    ),
    rationale:
      "A deliberate along-edge reversal revisits the hook/curl neighborhood without collapsing it into Scoop.",
    geometryRisk: "high",
  },
  {
    id: "mixed-lock",
    label: "Mixed lock",
    axis: "mixed-lock",
    production: connectorSequence(
      lobe,
      saddle,
      chamber,
      waist,
      chamber,
    ),
    rationale:
      "Different lock motifs share one seam so hierarchy comes from structure rather than repeated copies.",
    geometryRisk: "moderate",
  },
] as const satisfies readonly JigsawConnectorExplorationProbe[];

export type JigsawSeamExplorationGap = {
  id: "connector-cardinality";
  limitation: string;
  likelyLanguageNeed: string;
};

export const jigsawSeamExplorationGaps = [
  {
    id: "connector-cardinality",
    limitation:
      "SeamProgram always contains exactly one connector slot, so connectorless interior seams and multiple separately owned connector events are not expressible at the seam level.",
    likelyLanguageNeed:
      "First evaluate zero/one/many connector cardinality as a seam concept; keep multiple local lock events inside one ConnectorProduction unless play evidence proves they need independent seam ownership.",
  },
] as const satisfies readonly JigsawSeamExplorationGap[];

export type JigsawBaselineExplorationGap = {
  id: "separated-gestures" | "longitudinal-reversal" | "scale-hierarchy";
  limitation: string;
  likelyLanguageNeed: string;
};

export const jigsawBaselineExplorationGaps = [
  {
    id: "separated-gestures",
    limitation:
      "Baseline identity is normalized away inside sequences, so an explicit quiet baseline span cannot separate two gestures.",
    likelyLanguageNeed:
      "A span-consuming baseline run primitive or an explicit longitudinal allocation operator, distinct from algebraic identity.",
  },
  {
    id: "longitudinal-reversal",
    limitation:
      "The generic candidate validator requires monotonic longitudinal traversal, so a baseline gesture cannot deliberately double back.",
    likelyLanguageNeed:
      "A bounded reversal construct plus stronger self-intersection and corner-safety validation before geometry is considered promotable.",
  },
  {
    id: "scale-hierarchy",
    limitation:
      "The generic realizer allocates longitudinal space uniformly across instructions, so dominant and subordinate gestures are not structurally expressible.",
    likelyLanguageNeed:
      "Local span allocation or a hierarchical sub-production operator; ordinary continuous parameter variation is not enough.",
  },
] as const satisfies readonly JigsawBaselineExplorationGap[];

export const getCanonicalConnectorProductionSignatures = () =>
  new Map(
    jigsawConnectorGrammarIds.map((grammarId) => [
      grammarId,
      getJigsawConnectorProductionStructure(
        jigsawConnectorCanonicalProductions[grammarId],
      ),
    ]),
  );
