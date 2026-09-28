import type { JigsawSeamGrammarId } from "../../catalog/types";

export type JigsawSeamPoint = {
  x: number;
  y: number;
};

type Range = readonly [minimum: number, maximum: number];

export type JigsawSeamGrammarDefinition = {
  id: JigsawSeamGrammarId;
  label: string;
  description: string;
  production: string;
  renderMode: "smooth" | "angular";
  curveTension: number;
  mirrorable: boolean;
  width: Range;
  depth: Range;
  cornerBuffer: number;
  lean: number;
};

type ClassicBulbProgram = {
  grammarId: "classic-bulb";
  events: readonly ["lobe"];
  crown: number;
  shoulder: number;
};

type NeckedHeadProgram = {
  grammarId: "necked-head";
  events: readonly ["neck", "undercut", "head", "undercut", "neck"];
  stem: number;
  head: number;
  shaftHeight: number;
  crown: number;
};

type MultiLobeProgram = {
  grammarId: "multi-lobe";
  events: readonly string[];
  lobeCount: number;
  saddleDepth: number;
  asymmetry: number;
};

type ScoopProgram = {
  grammarId: "scoop";
  events: readonly ["outer-sweep", "scoop", "return"];
  bite: number;
  sweep: number;
};

type SerpentineProgram = {
  grammarId: "serpentine";
  events: readonly ["lobe", "cross-baseline", "opposed-lobe"];
  reverseDepth: number;
  skew: number;
};

type TerraceProgram = {
  grammarId: "terrace";
  events: readonly string[];
  levels: number;
  crown: number;
};

type ZigzagProgram = {
  grammarId: "zigzag";
  events: readonly string[];
  turns: number;
  low: number;
  high: number;
};

type StackedLockProgram = {
  grammarId: "stacked-lock";
  events: readonly ["chamber", "waist", "chamber"];
  lowerChamber: number;
  waist: number;
  upperChamber: number;
  crown: number;
};

export type JigsawSeamProgram =
  | ClassicBulbProgram
  | NeckedHeadProgram
  | MultiLobeProgram
  | ScoopProgram
  | SerpentineProgram
  | TerraceProgram
  | ZigzagProgram
  | StackedLockProgram;

export const jigsawSeamGrammarIds = [
  "classic-bulb",
  "necked-head",
  "multi-lobe",
  "scoop",
  "serpentine",
  "terrace",
  "zigzag",
  "stacked-lock",
] as const satisfies readonly JigsawSeamGrammarId[];

export const jigsawSeamGrammarCatalog = {
  "classic-bulb": {
    id: "classic-bulb",
    label: "Classic bulb",
    description: "A single smooth lobe with no neck, reversal, saddle, or baseline crossing.",
    production: "lobe",
    renderMode: "smooth",
    curveTension: 0.12,
    mirrorable: false,
    width: [64, 82],
    depth: [18, 26],
    cornerBuffer: 7,
    lean: 0.05,
  },
  "necked-head": {
    id: "necked-head",
    label: "Necked head",
    description: "A narrow neck reverses outward into one overhanging head before narrowing again.",
    production: "neck > undercut > head > undercut > neck",
    renderMode: "smooth",
    curveTension: 0.1,
    mirrorable: false,
    width: [60, 76],
    depth: [20, 27],
    cornerBuffer: 8,
    lean: 0.04,
  },
  "multi-lobe": {
    id: "multi-lobe",
    label: "Multi-lobe",
    description: "Two to four lateral lobes are separated by explicit saddles.",
    production: "repeat(lobe > saddle){2..4}",
    renderMode: "smooth",
    curveTension: 0.1,
    mirrorable: false,
    width: [72, 90],
    depth: [18, 25],
    cornerBuffer: 5,
    lean: 0.05,
  },
  scoop: {
    id: "scoop",
    label: "Scoop",
    description: "A broad outer sweep doubles back into a pronounced interior bite before returning.",
    production: "outer-sweep > scoop > return",
    renderMode: "smooth",
    curveTension: 0.09,
    mirrorable: true,
    width: [76, 90],
    depth: [18, 24],
    cornerBuffer: 5,
    lean: 0.07,
  },
  serpentine: {
    id: "serpentine",
    label: "Serpentine",
    description: "One lobe crosses the nominal edge and resolves as an opposed lobe on the other side.",
    production: "lobe > cross-baseline > opposed-lobe",
    renderMode: "smooth",
    curveTension: 0.1,
    mirrorable: true,
    width: [74, 88],
    depth: [22, 28],
    cornerBuffer: 6,
    lean: 0.08,
  },
  terrace: {
    id: "terrace",
    label: "Terrace",
    description: "Repeated orthogonal rises and plateaus build a stepped skyline.",
    production: "repeat(step > plateau){2..4}",
    renderMode: "angular",
    curveTension: 0,
    mirrorable: false,
    width: [68, 84],
    depth: [18, 25],
    cornerBuffer: 7,
    lean: 0,
  },
  zigzag: {
    id: "zigzag",
    label: "Zigzag",
    description: "Repeated diagonal turns alternate between high and low levels.",
    production: "repeat(zig > zag){2..4}",
    renderMode: "angular",
    curveTension: 0,
    mirrorable: true,
    width: [68, 86],
    depth: [18, 25],
    cornerBuffer: 7,
    lean: 0.04,
  },
  "stacked-lock": {
    id: "stacked-lock",
    label: "Stacked lock",
    description: "Two vertically stacked chambers are separated by a narrow waist.",
    production: "chamber > waist > chamber",
    renderMode: "smooth",
    curveTension: 0.09,
    mirrorable: false,
    width: [58, 74],
    depth: [20, 26],
    cornerBuffer: 9,
    lean: 0.03,
  },
} as const satisfies Record<JigsawSeamGrammarId, JigsawSeamGrammarDefinition>;

const seededUnit = (seedOffset: number, salt: number) => {
  const mixed = Math.imul((seedOffset ^ salt) >>> 0, 2_654_435_761) >>> 0;
  return mixed / 0xffff_ffff;
};

const range = (seedOffset: number, salt: number, minimum: number, maximum: number) =>
  minimum + seededUnit(seedOffset, salt) * (maximum - minimum);

const point = (x: number, y: number): JigsawSeamPoint => ({ x, y });

const repeatedEvents = (
  count: number,
  first: string,
  second: string,
): readonly string[] =>
  Array.from({ length: count }, (_, index) =>
    index === count - 1 ? [first] : [first, second],
  ).flat();

export const deriveJigsawSeamProgram = (
  grammarId: JigsawSeamGrammarId,
  seedOffset: number,
): JigsawSeamProgram => {
  switch (grammarId) {
    case "classic-bulb":
      return {
        grammarId,
        events: ["lobe"],
        crown: range(seedOffset, 0x1a31, 0.96, 1.08),
        shoulder: range(seedOffset, 0x1a32, 0.38, 0.48),
      };
    case "necked-head":
      return {
        grammarId,
        events: ["neck", "undercut", "head", "undercut", "neck"],
        stem: range(seedOffset, 0x2b41, 0.1, 0.17),
        head: range(seedOffset, 0x2b42, 0.48, 0.64),
        shaftHeight: range(seedOffset, 0x2b43, 0.42, 0.56),
        crown: range(seedOffset, 0x2b44, 1.04, 1.16),
      };
    case "multi-lobe": {
      const lobeCount = 2 + Math.floor(seededUnit(seedOffset, 0x3c51) * 3);
      return {
        grammarId,
        events: repeatedEvents(lobeCount, "lobe", "saddle"),
        lobeCount,
        saddleDepth: range(seedOffset, 0x3c52, 0.36, 0.56),
        asymmetry: range(seedOffset, 0x3c53, -0.08, 0.08),
      };
    }
    case "scoop":
      return {
        grammarId,
        events: ["outer-sweep", "scoop", "return"],
        bite: range(seedOffset, 0x4d61, 0.12, 0.28),
        sweep: range(seedOffset, 0x4d62, 0.54, 0.66),
      };
    case "serpentine":
      return {
        grammarId,
        events: ["lobe", "cross-baseline", "opposed-lobe"],
        reverseDepth: range(seedOffset, 0x5e71, 0.3, 0.44),
        skew: range(seedOffset, 0x5e72, -0.08, 0.08),
      };
    case "terrace": {
      const levels = 2 + Math.floor(seededUnit(seedOffset, 0x7091) * 3);
      return {
        grammarId,
        events: repeatedEvents(levels, "step", "plateau"),
        levels,
        crown: range(seedOffset, 0x7092, 0.82, 0.96),
      };
    }
    case "zigzag": {
      const turns = 2 + Math.floor(seededUnit(seedOffset, 0x81a1) * 3);
      return {
        grammarId,
        events: repeatedEvents(turns, "zig", "zag"),
        turns,
        low: range(seedOffset, 0x81a2, 0.18, 0.3),
        high: range(seedOffset, 0x81a3, 0.9, 1.04),
      };
    }
    case "stacked-lock":
      return {
        grammarId,
        events: ["chamber", "waist", "chamber"],
        lowerChamber: range(seedOffset, 0x92b1, 0.44, 0.54),
        waist: range(seedOffset, 0x92b2, 0.16, 0.24),
        upperChamber: range(seedOffset, 0x92b3, 0.36, 0.46),
        crown: range(seedOffset, 0x92b4, 1.1, 1.2),
      };
  }
};

export const realizeJigsawSeamProgram = (
  program: JigsawSeamProgram,
): JigsawSeamPoint[] => {
  switch (program.grammarId) {
    case "classic-bulb":
      return [
        point(-1, 0),
        point(-0.58, 0.02),
        point(-program.shoulder, 0.34),
        point(-0.24, 0.74),
        point(0, program.crown),
        point(0.24, 0.74),
        point(program.shoulder, 0.34),
        point(0.58, 0.02),
        point(1, 0),
      ];
    case "necked-head":
      return [
        point(-1, 0),
        point(-0.24, 0),
        point(-program.stem, 0.2),
        point(-program.stem, program.shaftHeight),
        point(-program.head, program.shaftHeight + 0.08),
        point(-program.head, 0.84),
        point(-program.head * 0.72, 1.04),
        point(-0.18, program.crown),
        point(0, program.crown + 0.03),
        point(0.18, program.crown),
        point(program.head * 0.72, 1.04),
        point(program.head, 0.84),
        point(program.head, program.shaftHeight + 0.08),
        point(program.stem, program.shaftHeight),
        point(program.stem, 0.2),
        point(0.24, 0),
        point(1, 0),
      ];
    case "multi-lobe": {
      const points: JigsawSeamPoint[] = [point(-1, 0), point(-0.66, 0.02)];
      const left = -0.6;
      const right = 0.6;
      const cell = (right - left) / program.lobeCount;
      for (let index = 0; index < program.lobeCount; index += 1) {
        const center = left + cell * (index + 0.5);
        const half = cell * 0.42;
        const peak =
          0.88 +
          (index % 2 === 0 ? program.asymmetry : -program.asymmetry);
        points.push(
          point(center - half, 0.46),
          point(center, peak),
          point(center + half, 0.46),
        );
        if (index < program.lobeCount - 1) {
          points.push(point(left + cell * (index + 1), program.saddleDepth));
        }
      }
      points.push(point(0.66, 0.02), point(1, 0));
      return points;
    }
    case "scoop":
      return [
        point(-1, 0),
        point(-0.56, 0.02),
        point(-program.sweep, 0.34),
        point(-0.46, 0.7),
        point(-0.12, 1.02),
        point(0.3, 0.98),
        point(0.6, 0.72),
        point(0.62, 0.5),
        point(0.32, 0.42),
        point(-program.bite, 0.28),
        point(0.14, 0.18),
        point(0.48, 0.1),
        point(0.56, 0.02),
        point(1, 0),
      ];
    case "serpentine":
      return [
        point(-1, 0),
        point(-0.6, 0),
        point(-0.48, 0.34),
        point(-0.22 + program.skew, 0.58),
        point(0.06 + program.skew, 0.5),
        point(0.2 + program.skew, 0.18),
        point(-0.02 + program.skew, -program.reverseDepth),
        point(0.2 + program.skew, -program.reverseDepth - 0.1),
        point(0.48, -0.3),
        point(0.6, -0.05),
        point(1, 0),
      ];
    case "terrace": {
      const points: JigsawSeamPoint[] = [point(-1, 0), point(-0.66, 0)];
      const steps = program.levels * 2;
      const left = -0.62;
      const right = 0.62;
      const cell = (right - left) / steps;
      let y = 0;
      for (let index = 0; index < steps; index += 1) {
        const ascending = index < program.levels;
        const levelIndex = ascending ? index + 1 : steps - index;
        const nextY = (program.crown * levelIndex) / program.levels;
        const x = left + cell * index;
        const nextX = left + cell * (index + 1);
        points.push(point(x, nextY), point(nextX, nextY));
        y = nextY;
      }
      points.push(point(0.66, y), point(0.66, 0), point(1, 0));
      return points;
    }
    case "zigzag": {
      const points: JigsawSeamPoint[] = [point(-1, 0), point(-0.64, 0)];
      const vertices = program.turns * 2 + 1;
      for (let index = 0; index < vertices; index += 1) {
        const x = -0.56 + (1.12 * index) / Math.max(1, vertices - 1);
        const y = index % 2 === 0 ? program.low : program.high;
        points.push(point(x, y));
      }
      points.push(point(0.64, 0), point(1, 0));
      return points;
    }
    case "stacked-lock":
      return [
        point(-1, 0),
        point(-0.24, 0),
        point(-0.16, 0.24),
        point(-program.lowerChamber, 0.34),
        point(-program.lowerChamber, 0.54),
        point(-program.waist, 0.62),
        point(-program.waist, 0.72),
        point(-program.upperChamber, 0.8),
        point(-program.upperChamber, 1.0),
        point(-0.18, program.crown),
        point(0, program.crown + 0.03),
        point(0.18, program.crown),
        point(program.upperChamber, 1.0),
        point(program.upperChamber, 0.8),
        point(program.waist, 0.72),
        point(program.waist, 0.62),
        point(program.lowerChamber, 0.54),
        point(program.lowerChamber, 0.34),
        point(0.16, 0.24),
        point(0.24, 0),
        point(1, 0),
      ];
  }
};

export const getJigsawSeamGrammarDefinition = (
  grammarId: JigsawSeamGrammarId,
): JigsawSeamGrammarDefinition => jigsawSeamGrammarCatalog[grammarId];

export const getJigsawSeamProgramSignature = (
  program: JigsawSeamProgram,
): string => program.events.join(" > ");
