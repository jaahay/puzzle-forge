export type JigsawBaselinePoint = {
  x: number;
  y: number;
};

type Range = readonly [minimum: number, maximum: number];

export type JigsawBaselineGrammarId =
  | "bow"
  | "inflection"
  | "wave"
  | "angled-course"
  | "stepped-course";

export type JigsawBaselineGrammarDefinition = {
  id: JigsawBaselineGrammarId;
  label: string;
  description: string;
  production: string;
  renderMode: "smooth" | "angular";
  curveTension: number;
  depth: Range;
};

type BaselineProgramBase = {
  baselineGrammarId: JigsawBaselineGrammarId;
  events: readonly string[];
  depth: number;
  direction: -1 | 1;
};

type BowProgram = BaselineProgramBase & {
  baselineGrammarId: "bow";
  events: readonly ["bow"];
  peak: number;
};

type InflectionProgram = BaselineProgramBase & {
  baselineGrammarId: "inflection";
  events: readonly ["sweep", "cross-baseline", "counter-sweep"];
  crossover: number;
};

type WaveProgram = BaselineProgramBase & {
  baselineGrammarId: "wave";
  events: readonly ["crest", "trough", "crest"];
  middleDepth: number;
};

type AngledCourseProgram = BaselineProgramBase & {
  baselineGrammarId: "angled-course";
  events: readonly ["ramp", "course", "return"];
  courseStart: number;
  courseEnd: number;
};

type SteppedCourseProgram = BaselineProgramBase & {
  baselineGrammarId: "stepped-course";
  events: readonly ["step", "run", "step", "run", "step"];
  middleLevel: number;
};

export type JigsawBaselineProgram =
  | BowProgram
  | InflectionProgram
  | WaveProgram
  | AngledCourseProgram
  | SteppedCourseProgram;

export const jigsawBaselineGrammarIds = [
  "bow",
  "inflection",
  "wave",
  "angled-course",
  "stepped-course",
] as const satisfies readonly JigsawBaselineGrammarId[];

export const jigsawBaselineGrammarCatalog = {
  bow: {
    id: "bow",
    label: "Bow",
    description: "One shallow same-side arc rises from and returns to the nominal edge.",
    production: "bow",
    renderMode: "smooth",
    curveTension: 0.12,
    depth: [3.5, 6.5],
  },
  inflection: {
    id: "inflection",
    label: "Inflection",
    description: "A smooth sweep crosses the nominal edge once and resolves with an opposed counter-sweep.",
    production: "sweep > cross-baseline > counter-sweep",
    renderMode: "smooth",
    curveTension: 0.11,
    depth: [3.5, 6.5],
  },
  wave: {
    id: "wave",
    label: "Wave",
    description: "Three alternating smooth lobes create repeated baseline crossings without becoming an interlock.",
    production: "crest > trough > crest",
    renderMode: "smooth",
    curveTension: 0.1,
    depth: [3, 5.75],
  },
  "angled-course": {
    id: "angled-course",
    label: "Angled course",
    description: "A diagonal ramp enters one offset course before returning diagonally to the nominal edge.",
    production: "ramp > course > return",
    renderMode: "angular",
    curveTension: 0,
    depth: [3, 5.5],
  },
  "stepped-course": {
    id: "stepped-course",
    label: "Stepped course",
    description: "Orthogonal steps move through two offset runs before returning to the nominal edge.",
    production: "step > run > step > run > step",
    renderMode: "angular",
    curveTension: 0,
    depth: [3, 5.5],
  },
} as const satisfies Record<JigsawBaselineGrammarId, JigsawBaselineGrammarDefinition>;

const seededUnit = (seedOffset: number, salt: number) => {
  const mixed = Math.imul((seedOffset ^ salt) >>> 0, 2_654_435_761) >>> 0;
  return mixed / 0xffff_ffff;
};

const range = (seedOffset: number, salt: number, minimum: number, maximum: number) =>
  minimum + seededUnit(seedOffset, salt) * (maximum - minimum);

const direction = (seedOffset: number, salt: number): -1 | 1 =>
  seededUnit(seedOffset, salt) < 0.5 ? -1 : 1;

const point = (x: number, y: number): JigsawBaselinePoint => ({ x, y });

export const deriveJigsawBaselineProgram = (
  baselineGrammarId: JigsawBaselineGrammarId,
  seedOffset: number,
): JigsawBaselineProgram => {
  const definition = jigsawBaselineGrammarCatalog[baselineGrammarId];
  const depth = range(seedOffset, 0xb101, definition.depth[0], definition.depth[1]);
  const signedDirection = direction(seedOffset, 0xb102);

  switch (baselineGrammarId) {
    case "bow":
      return {
        baselineGrammarId,
        events: ["bow"],
        depth,
        direction: signedDirection,
        peak: range(seedOffset, 0xb111, 0.44, 0.56),
      };
    case "inflection":
      return {
        baselineGrammarId,
        events: ["sweep", "cross-baseline", "counter-sweep"],
        depth,
        direction: signedDirection,
        crossover: range(seedOffset, 0xb121, 0.46, 0.54),
      };
    case "wave":
      return {
        baselineGrammarId,
        events: ["crest", "trough", "crest"],
        depth,
        direction: signedDirection,
        middleDepth: range(seedOffset, 0xb131, 0.68, 0.86),
      };
    case "angled-course":
      return {
        baselineGrammarId,
        events: ["ramp", "course", "return"],
        depth,
        direction: signedDirection,
        courseStart: range(seedOffset, 0xb141, 0.3, 0.38),
        courseEnd: range(seedOffset, 0xb142, 0.62, 0.7),
      };
    case "stepped-course":
      return {
        baselineGrammarId,
        events: ["step", "run", "step", "run", "step"],
        depth,
        direction: signedDirection,
        middleLevel: range(seedOffset, 0xb151, 0.38, 0.58),
      };
  }
};

export const realizeJigsawBaselineProgram = (
  program: JigsawBaselineProgram,
): JigsawBaselinePoint[] => {
  const signedDepth = program.direction;

  switch (program.baselineGrammarId) {
    case "bow":
      return [
        point(0, 0),
        point(0.16, 0),
        point(0.3, signedDepth * 0.48),
        point(program.peak, signedDepth),
        point(0.7, signedDepth * 0.48),
        point(0.84, 0),
        point(1, 0),
      ];
    case "inflection":
      return [
        point(0, 0),
        point(0.14, 0),
        point(0.28, signedDepth * 0.72),
        point(program.crossover - 0.06, signedDepth * 0.18),
        point(program.crossover + 0.06, signedDepth * -0.18),
        point(0.72, signedDepth * -0.72),
        point(0.86, 0),
        point(1, 0),
      ];
    case "wave":
      return [
        point(0, 0),
        point(0.12, 0),
        point(0.25, signedDepth),
        point(0.42, 0),
        point(0.56, signedDepth * -program.middleDepth),
        point(0.7, 0),
        point(0.82, signedDepth * 0.72),
        point(0.9, 0),
        point(1, 0),
      ];
    case "angled-course":
      return [
        point(0, 0),
        point(0.16, 0),
        point(program.courseStart, signedDepth),
        point(program.courseEnd, signedDepth),
        point(0.84, 0),
        point(1, 0),
      ];
    case "stepped-course": {
      const middle = signedDepth * program.middleLevel;
      return [
        point(0, 0),
        point(0.14, 0),
        point(0.14, signedDepth),
        point(0.36, signedDepth),
        point(0.36, middle),
        point(0.64, middle),
        point(0.64, signedDepth),
        point(0.86, signedDepth),
        point(0.86, 0),
        point(1, 0),
      ];
    }
  }
};

export const getJigsawBaselineGrammarDefinition = (
  baselineGrammarId: JigsawBaselineGrammarId,
): JigsawBaselineGrammarDefinition => jigsawBaselineGrammarCatalog[baselineGrammarId];

export const getJigsawBaselineProgramSignature = (
  program: JigsawBaselineProgram,
): string => program.events.join(" > ");
