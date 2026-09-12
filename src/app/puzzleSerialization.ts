import type {
  CardColor,
  CardRank,
  CardStack,
  CardStackRole,
  CardSuit,
  GeneratedPuzzle,
  GridGeneratedPuzzle,
  JigsawEdgePolarity,
  JigsawEdgeProfileId,
  JigsawEdgeSide,
  JigsawPieceEdge,
  PlayingCard,
  PuzzleDifficulty,
  PuzzleId,
  SolitaireRedealLimit,
  SolitaireVariation,
  SudokuVariation,
} from "../catalog/types";
import { getPuzzleDefinition } from "../catalog/puzzleCatalog";
import { getPuzzleImageAsset } from "../games/imageAssets";
import { jigsawEdgeProfileCatalogRevision, jigsawEdgeProfileIds } from "../games/jigsaw/edgeProfiles";
import { solitaireRedealLimits } from "../games/solitaire/variation";
import { sudokuVariations } from "../games/sudoku/variation";
import { getPuzzleProvenance, isPuzzleProvenance, withPuzzleProvenance, type PuzzleProvenance } from "./puzzleProvenance";

const serializablePuzzleIds = [
  "sudoku",
  "nonogram",
  "word-guess",
  "klondike-solitaire",
  "jigsaw",
  "tile-swap",
  "sliding-puzzle",
  "futoshiki",
] as const satisfies readonly PuzzleId[];

type SerializablePuzzleId = (typeof serializablePuzzleIds)[number];
type WireCell = [value: string, locked: 0 | 1];
type WireCard = [code: string, faceUp: 0 | 1];
type WireStack = [
  id: string,
  title: string,
  role: CardStackRole,
  cards: WireCard[],
  faceDownCount?: number,
];
type WireTile = [id: string, currentIndex: number, solvedIndex: number, row: number, column: number];
type WireJigsawEdge = [
  edgeId: string,
  side: JigsawEdgeSide,
  boundary: 0 | 1,
  neighborPieceId: string | null,
  neighborEdgeId: string | null,
  profileId: JigsawEdgeProfileId | null,
  polarity: JigsawEdgePolarity,
  seedOffset: number,
];
type WireJigsawPiece = [
  id: string,
  currentIndex: number,
  solvedIndex: number,
  row: number,
  column: number,
  edges: WireJigsawEdge[],
];

type WireCommon = {
  p: SerializablePuzzleId;
  i: string;
  t: string;
  s: string;
  w: number;
  h: number;
  c: string;
  d?: PuzzleDifficulty;
  u?: boolean;
  x?: SudokuVariation;
  o?: PuzzleProvenance;
};

type WireGridPuzzle = WireCommon & {
  k: "g";
  b: WireCell[];
  a?: string[];
  r?: number[][];
  l?: number[][];
  g?: Array<[id: string, sum: number, cells: number[]]>;
  q?: Array<[lesser: number, greater: number]>;
};

type WireCardPuzzle = WireCommon & {
  k: "c";
  z: WireStack[];
  rules: SolitaireVariation;
};

type WireTilePuzzle = WireCommon & {
  k: "t";
  image: string;
  z: WireTile[];
};

type WireSlidingPuzzle = WireCommon & {
  k: "s";
  image: string;
  z: WireTile[];
  e: number;
};

type WireJigsawPuzzle = WireCommon & {
  k: "j";
  image: string;
  z: WireJigsawPiece[];
};

type WirePuzzle = WireGridPuzzle | WireCardPuzzle | WireTilePuzzle | WireSlidingPuzzle | WireJigsawPuzzle;

export type PuzzleDecodeResult =
  | { ok: true; puzzle: GeneratedPuzzle }
  | { ok: false; reason: "malformed" | "invalid-puzzle" };

const serializablePuzzleIdSet = new Set<string>(serializablePuzzleIds);
const puzzleDifficulties = new Set<PuzzleDifficulty>(["Easy", "Medium", "Hard", "Expert"]);
const cardStackRoles = new Set<CardStackRole>(["stock", "waste", "foundation", "tableau"]);
const jigsawEdgeSides = new Set<JigsawEdgeSide>(["top", "right", "bottom", "left"]);
const jigsawEdgeProfileIdSet = new Set<JigsawEdgeProfileId>(jigsawEdgeProfileIds);

const rankByCode: Record<string, CardRank> = {
  A: "ace",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  J: "jack",
  Q: "queen",
  K: "king",
};
const rankLabels: Record<CardRank, string> = {
  ace: "Ace",
  "2": "Two",
  "3": "Three",
  "4": "Four",
  "5": "Five",
  "6": "Six",
  "7": "Seven",
  "8": "Eight",
  "9": "Nine",
  "10": "Ten",
  jack: "Jack",
  queen: "Queen",
  king: "King",
};
const suitBySymbol: Record<string, CardSuit> = {
  "♣": "clubs",
  "♦": "diamonds",
  "♥": "hearts",
  "♠": "spades",
};
const suitLabels: Record<CardSuit, string> = {
  clubs: "Clubs",
  diamonds: "Diamonds",
  hearts: "Hearts",
  spades: "Spades",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;
const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;
const isDifficulty = (value: unknown): value is PuzzleDifficulty =>
  typeof value === "string" && puzzleDifficulties.has(value as PuzzleDifficulty);
const isSudokuVariation = (value: unknown): value is SudokuVariation =>
  typeof value === "string" && sudokuVariations.includes(value as SudokuVariation);
const isSolitaireRedealLimit = (value: unknown): value is SolitaireRedealLimit =>
  solitaireRedealLimits.includes(value as SolitaireRedealLimit);
const isSolitaireVariation = (value: unknown): value is SolitaireVariation =>
  isRecord(value) &&
  (value.drawMode === "draw-1" || value.drawMode === "draw-3") &&
  isSolitaireRedealLimit(value.redeals) &&
  (value.wasteMode === "standard" || value.wasteMode === "relaxed") &&
  typeof value.knownSolvable === "boolean";

const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(`${base64}${padding}`);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const wireCommon = (puzzle: GeneratedPuzzle): WireCommon => {
  if (!serializablePuzzleIdSet.has(puzzle.puzzleId)) {
    throw new Error(`Puzzle type ${puzzle.puzzleId} cannot be serialized.`);
  }
  const provenance = getPuzzleProvenance(puzzle);
  return {
    p: puzzle.puzzleId as SerializablePuzzleId,
    i: puzzle.id,
    t: puzzle.title,
    s: puzzle.seed,
    w: puzzle.width,
    h: puzzle.height,
    c: puzzle.checksum,
    ...(puzzle.difficulty ? { d: puzzle.difficulty } : {}),
    ...(puzzle.uniqueSolution !== undefined ? { u: puzzle.uniqueSolution } : {}),
    ...(puzzle.sudokuVariation ? { x: puzzle.sudokuVariation } : {}),
    ...(provenance ? { o: provenance } : {}),
  };
};

const gridCellsToWire = (puzzle: GridGeneratedPuzzle): WireCell[] => {
  const cellsByIndex = new Map(
    puzzle.cells.map((cell) => [cell.row * puzzle.width + cell.column, cell] as const),
  );
  if (cellsByIndex.size !== puzzle.width * puzzle.height) {
    throw new Error(`Puzzle ${puzzle.id} does not contain a complete grid.`);
  }
  return Array.from({ length: puzzle.width * puzzle.height }, (_, index) => {
    const cell = cellsByIndex.get(index);
    if (!cell) throw new Error(`Puzzle ${puzzle.id} is missing grid cell ${index}.`);
    return [cell.value, cell.locked ? 1 : 0];
  });
};

const gridPuzzleToWire = (puzzle: GridGeneratedPuzzle): WireGridPuzzle => ({
  ...wireCommon(puzzle),
  k: "g",
  b: gridCellsToWire(puzzle),
  ...(puzzle.answerKey ? { a: [...puzzle.answerKey] } : {}),
  ...(puzzle.clues?.rows ? { r: puzzle.clues.rows.map((run) => [...run]) } : {}),
  ...(puzzle.clues?.columns ? { l: puzzle.clues.columns.map((run) => [...run]) } : {}),
  ...(puzzle.cages ? {
    g: puzzle.cages.map((cage) => [
      cage.id,
      cage.sum,
      cage.cells.map((cell) => cell.row * puzzle.width + cell.column),
    ]),
  } : {}),
  ...(puzzle.inequalities ? {
    q: puzzle.inequalities.map((inequality) => [
      inequality.lesser.row * puzzle.width + inequality.lesser.column,
      inequality.greater.row * puzzle.width + inequality.greater.column,
    ]),
  } : {}),
});

const cardPuzzleToWire = (puzzle: Extract<GeneratedPuzzle, { kind: "cards" }>): WireCardPuzzle => ({
  ...wireCommon(puzzle),
  k: "c",
  z: puzzle.stacks.map((stack) => [
    stack.id,
    stack.title,
    stack.role,
    stack.cards.map((card) => [card.code, card.faceUp ? 1 : 0]),
    ...(stack.faceDownCount !== undefined ? [stack.faceDownCount] : []),
  ] as WireStack),
  rules: { ...puzzle.solitaireVariation },
});

const tilePuzzleToWire = (puzzle: Extract<GeneratedPuzzle, { kind: "tiles" }>): WirePuzzle => {
  if (puzzle.asset.kind !== "image") {
    throw new Error(`Puzzle ${puzzle.id} does not use a serializable image asset.`);
  }
  const common = wireCommon(puzzle);
  if (puzzle.puzzleId === "jigsaw") {
    return {
      ...common,
      k: "j",
      image: puzzle.asset.id,
      z: puzzle.tiles.map((tile) => [
        tile.id,
        tile.currentIndex,
        tile.solvedIndex,
        tile.row,
        tile.column,
        tile.edges.map((edge): WireJigsawEdge => [
          edge.edgeId,
          edge.side,
          edge.boundary ? 1 : 0,
          edge.neighborPieceId,
          edge.neighborEdgeId,
          edge.profileId,
          edge.polarity,
          edge.seedOffset,
        ]),
      ]),
    };
  }
  const tiles = puzzle.tiles.map((tile): WireTile => [
    tile.id,
    tile.currentIndex,
    tile.solvedIndex,
    tile.row,
    tile.column,
  ]);
  if (puzzle.puzzleId === "sliding-puzzle") {
    return { ...common, k: "s", image: puzzle.asset.id, z: tiles, e: puzzle.emptyIndex };
  }
  return { ...common, k: "t", image: puzzle.asset.id, z: tiles };
};

const puzzleToWire = (puzzle: GeneratedPuzzle): WirePuzzle => {
  if (puzzle.kind === "grid") return gridPuzzleToWire(puzzle);
  if (puzzle.kind === "cards") return cardPuzzleToWire(puzzle);
  return tilePuzzleToWire(puzzle);
};

export const serializePuzzle = (puzzle: GeneratedPuzzle) =>
  encodeBase64Url(JSON.stringify(puzzleToWire(puzzle)));

export const materializedPuzzlesEqual = (left: GeneratedPuzzle, right: GeneratedPuzzle) =>
  serializePuzzle(left) === serializePuzzle(right);

const readCommon = (candidate: Record<string, unknown>) => {
  if (
    typeof candidate.p !== "string" ||
    !serializablePuzzleIdSet.has(candidate.p) ||
    typeof candidate.i !== "string" ||
    candidate.i.length === 0 ||
    typeof candidate.t !== "string" ||
    candidate.t.length === 0 ||
    typeof candidate.s !== "string" ||
    candidate.s.length === 0 ||
    !isPositiveInteger(candidate.w) ||
    !isPositiveInteger(candidate.h) ||
    typeof candidate.c !== "string" ||
    candidate.c.length === 0 ||
    (candidate.d !== undefined && !isDifficulty(candidate.d)) ||
    (candidate.u !== undefined && typeof candidate.u !== "boolean") ||
    (candidate.x !== undefined && !isSudokuVariation(candidate.x)) ||
    (candidate.o !== undefined && !isPuzzleProvenance(candidate.o))
  ) return null;

  const puzzleId = candidate.p as SerializablePuzzleId;
  const definition = getPuzzleDefinition(puzzleId);
  if (
    candidate.w < definition.minWidth ||
    candidate.w > definition.maxWidth ||
    candidate.h < definition.minHeight ||
    candidate.h > definition.maxHeight
  ) return null;

  return {
    puzzleId,
    id: candidate.i,
    title: candidate.t,
    seed: candidate.s,
    width: candidate.w,
    height: candidate.h,
    checksum: candidate.c,
    difficulty: candidate.d as PuzzleDifficulty | undefined,
    uniqueSolution: candidate.u as boolean | undefined,
    sudokuVariation: candidate.x as SudokuVariation | undefined,
    provenance: candidate.o as PuzzleProvenance | undefined,
  };
};

const readNumberRuns = (value: unknown): number[][] | undefined | null => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;
  const runs: number[][] = [];
  for (const run of value) {
    if (!Array.isArray(run) || !run.every((entry) => isPositiveInteger(entry))) return null;
    runs.push(run.map(Number));
  }
  return runs;
};

const readGridPuzzle = (
  candidate: Record<string, unknown>,
  common: NonNullable<ReturnType<typeof readCommon>>,
): GeneratedPuzzle | null => {
  const gridPuzzleIds = new Set<SerializablePuzzleId>(["sudoku", "nonogram", "word-guess", "futoshiki"]);
  if (!gridPuzzleIds.has(common.puzzleId) || !Array.isArray(candidate.b)) return null;
  const cellCount = common.width * common.height;
  if (candidate.b.length !== cellCount) return null;

  const cells = candidate.b.map((entry, index) => {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== "string" ||
      (entry[1] !== 0 && entry[1] !== 1)
    ) return null;
    const row = Math.floor(index / common.width);
    const column = index % common.width;
    const value = entry[0];
    const locked = entry[1] === 1;
    return {
      row,
      column,
      value,
      locked,
      tone: locked ? "given" as const : "empty" as const,
      ariaLabel: locked
        ? `Given ${value} at row ${row + 1}, column ${column + 1}`
        : `Empty ${common.title} cell at row ${row + 1}, column ${column + 1}`,
    };
  });
  if (cells.some((cell) => cell === null)) return null;

  let answerKey: string[] | undefined;
  if (candidate.a !== undefined) {
    if (!Array.isArray(candidate.a) || !candidate.a.every((value) => typeof value === "string")) return null;
    answerKey = [...candidate.a];
  }

  const rows = readNumberRuns(candidate.r);
  const columns = readNumberRuns(candidate.l);
  if (rows === null || columns === null) return null;
  const clues = rows !== undefined || columns !== undefined
    ? { ...(rows ? { rows } : {}), ...(columns ? { columns } : {}) }
    : undefined;

  let cages: GridGeneratedPuzzle["cages"];
  if (candidate.g !== undefined) {
    if (!Array.isArray(candidate.g)) return null;
    cages = [];
    for (const entry of candidate.g) {
      if (
        !Array.isArray(entry) ||
        entry.length !== 3 ||
        typeof entry[0] !== "string" ||
        !isPositiveInteger(entry[1]) ||
        !Array.isArray(entry[2]) ||
        entry[2].length === 0 ||
        !entry[2].every((index) => isNonNegativeInteger(index) && index < cellCount)
      ) return null;
      cages.push({
        id: entry[0],
        sum: entry[1],
        cells: entry[2].map((index) => ({
          row: Math.floor(Number(index) / common.width),
          column: Number(index) % common.width,
        })),
      });
    }
  }

  let inequalities: GridGeneratedPuzzle["inequalities"];
  if (candidate.q !== undefined) {
    if (!Array.isArray(candidate.q)) return null;
    inequalities = [];
    for (const entry of candidate.q) {
      if (
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        !entry.every((index) => isNonNegativeInteger(index) && index < cellCount)
      ) return null;
      const [lesser, greater] = entry.map(Number);
      inequalities.push({
        lesser: { row: Math.floor(lesser / common.width), column: lesser % common.width },
        greater: { row: Math.floor(greater / common.width), column: greater % common.width },
      });
    }
  }

  const puzzle: GridGeneratedPuzzle = {
    kind: "grid",
    id: common.id,
    puzzleId: common.puzzleId,
    title: common.title,
    seed: common.seed,
    width: common.width,
    height: common.height,
    checksum: common.checksum,
    createdAt: new Date().toISOString(),
    ...(common.difficulty ? { difficulty: common.difficulty } : {}),
    ...(common.uniqueSolution !== undefined ? { uniqueSolution: common.uniqueSolution } : {}),
    ...(common.sudokuVariation ? { sudokuVariation: common.sudokuVariation } : {}),
    notes: [],
    cells: cells as GridGeneratedPuzzle["cells"],
    ...(answerKey ? { answerKey } : {}),
    ...(clues ? { clues } : {}),
    ...(cages ? { cages } : {}),
    ...(inequalities ? { inequalities } : {}),
  };
  return withPuzzleProvenance(puzzle, common.provenance);
};

const readPlayingCard = (value: unknown): PlayingCard | null => {
  if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== "string" || (value[1] !== 0 && value[1] !== 1)) {
    return null;
  }
  const code = value[0];
  const suitSymbol = code.slice(-1);
  const rankCode = code.slice(0, -1);
  const suit = suitBySymbol[suitSymbol];
  const rank = rankByCode[rankCode];
  if (!suit || !rank) return null;
  const color: CardColor = suit === "diamonds" || suit === "hearts" ? "red" : "black";
  return {
    suit,
    rank,
    code,
    color,
    label: `${rankLabels[rank]} of ${suitLabels[suit]}`,
    faceUp: value[1] === 1,
  };
};

const readCardStack = (value: unknown): CardStack | null => {
  if (
    !Array.isArray(value) ||
    (value.length !== 4 && value.length !== 5) ||
    typeof value[0] !== "string" ||
    typeof value[1] !== "string" ||
    typeof value[2] !== "string" ||
    !cardStackRoles.has(value[2] as CardStackRole) ||
    !Array.isArray(value[3]) ||
    (value[4] !== undefined && !isNonNegativeInteger(value[4]))
  ) return null;
  const cards = value[3].map(readPlayingCard);
  if (cards.some((card) => card === null)) return null;
  return {
    id: value[0],
    title: value[1],
    role: value[2] as CardStackRole,
    cards: cards as PlayingCard[],
    ...(value[4] !== undefined ? { faceDownCount: value[4] } : {}),
  };
};

const readCardPuzzle = (
  candidate: Record<string, unknown>,
  common: NonNullable<ReturnType<typeof readCommon>>,
): GeneratedPuzzle | null => {
  if (common.puzzleId !== "klondike-solitaire" || !Array.isArray(candidate.z) || !isSolitaireVariation(candidate.rules)) return null;
  const stacks = candidate.z.map(readCardStack);
  if (stacks.some((stack) => stack === null)) return null;
  const puzzle: Extract<GeneratedPuzzle, { kind: "cards" }> = {
    kind: "cards",
    id: common.id,
    puzzleId: "klondike-solitaire",
    title: common.title,
    seed: common.seed,
    width: common.width,
    height: common.height,
    checksum: common.checksum,
    createdAt: new Date().toISOString(),
    ...(common.difficulty ? { difficulty: common.difficulty } : {}),
    ...(common.uniqueSolution !== undefined ? { uniqueSolution: common.uniqueSolution } : {}),
    notes: [],
    stacks: stacks as CardStack[],
    solitaireVariation: { ...candidate.rules },
  };
  return withPuzzleProvenance(puzzle, common.provenance);
};

const readWireTile = (value: unknown, width: number, height: number): WireTile | null => {
  if (
    !Array.isArray(value) ||
    value.length !== 5 ||
    typeof value[0] !== "string" ||
    !isNonNegativeInteger(value[1]) ||
    !isNonNegativeInteger(value[2]) ||
    !isNonNegativeInteger(value[3]) ||
    !isNonNegativeInteger(value[4]) ||
    value[1] >= width * height ||
    value[2] >= width * height ||
    value[3] >= height ||
    value[4] >= width
  ) return null;
  return [value[0], value[1], value[2], value[3], value[4]];
};

const readTilePuzzle = (
  candidate: Record<string, unknown>,
  common: NonNullable<ReturnType<typeof readCommon>>,
): GeneratedPuzzle | null => {
  if ((common.puzzleId !== "tile-swap" && common.puzzleId !== "sliding-puzzle") || typeof candidate.image !== "string" || !Array.isArray(candidate.z)) return null;
  if ((common.puzzleId === "tile-swap" && candidate.k !== "t") || (common.puzzleId === "sliding-puzzle" && candidate.k !== "s")) return null;
  const tiles = candidate.z.map((value) => readWireTile(value, common.width, common.height));
  if (tiles.some((tile) => tile === null)) return null;
  const boardCellCount = common.width * common.height;
  const expectedTileCount = common.puzzleId === "sliding-puzzle" ? boardCellCount - 1 : boardCellCount;
  if (tiles.length !== expectedTileCount) return null;
  const currentIndexes = new Set(tiles.map((tile) => tile?.[1]));
  if (currentIndexes.size !== tiles.length) return null;

  let asset;
  try {
    asset = getPuzzleImageAsset(candidate.image, common.puzzleId);
  } catch {
    return null;
  }
  const base = {
    kind: "tiles" as const,
    id: common.id,
    puzzleId: common.puzzleId,
    title: common.title,
    seed: common.seed,
    width: common.width,
    height: common.height,
    checksum: common.checksum,
    createdAt: new Date().toISOString(),
    ...(common.difficulty ? { difficulty: common.difficulty } : {}),
    ...(common.uniqueSolution !== undefined ? { uniqueSolution: common.uniqueSolution } : {}),
    notes: [],
    tiles: (tiles as WireTile[]).map(([id, currentIndex, solvedIndex, row, column]) => ({
      id,
      currentIndex,
      solvedIndex,
      row,
      column,
    })),
    asset,
  };
  if (common.puzzleId === "sliding-puzzle") {
    if (!isNonNegativeInteger(candidate.e) || candidate.e >= boardCellCount || currentIndexes.has(candidate.e)) return null;
    return withPuzzleProvenance({ ...base, puzzleId: "sliding-puzzle", emptyIndex: candidate.e }, common.provenance);
  }
  return withPuzzleProvenance({ ...base, puzzleId: "tile-swap" }, common.provenance);
};

const readJigsawEdge = (value: unknown): JigsawPieceEdge | null => {
  if (
    !Array.isArray(value) ||
    value.length !== 8 ||
    typeof value[0] !== "string" ||
    typeof value[1] !== "string" ||
    !jigsawEdgeSides.has(value[1] as JigsawEdgeSide) ||
    (value[2] !== 0 && value[2] !== 1) ||
    !Number.isFinite(value[7])
  ) return null;

  const [edgeId, side, boundary, neighborPieceId, neighborEdgeId, profileId, polarity, seedOffset] = value;
  if (boundary === 1) {
    if (neighborPieceId !== null || neighborEdgeId !== null || profileId !== null || polarity !== "flat" || seedOffset !== 0) return null;
    return {
      edgeId,
      side: side as JigsawEdgeSide,
      boundary: true,
      neighborPieceId: null,
      neighborEdgeId: null,
      profileId: null,
      polarity: "flat",
      seedOffset: 0,
    };
  }
  if (
    typeof neighborPieceId !== "string" ||
    typeof neighborEdgeId !== "string" ||
    typeof profileId !== "string" ||
    !jigsawEdgeProfileIdSet.has(profileId as JigsawEdgeProfileId) ||
    (polarity !== "tab" && polarity !== "blank")
  ) return null;
  return {
    edgeId,
    side: side as JigsawEdgeSide,
    boundary: false,
    neighborPieceId,
    neighborEdgeId,
    profileId: profileId as JigsawEdgeProfileId,
    polarity,
    seedOffset: Number(seedOffset),
  };
};

const readJigsawPuzzle = (
  candidate: Record<string, unknown>,
  common: NonNullable<ReturnType<typeof readCommon>>,
): GeneratedPuzzle | null => {
  if (common.puzzleId !== "jigsaw" || candidate.k !== "j" || typeof candidate.image !== "string" || !Array.isArray(candidate.z)) return null;
  const pieces = [];
  for (const value of candidate.z) {
    if (!Array.isArray(value) || value.length !== 6) return null;
    const tile = readWireTile(value.slice(0, 5), common.width, common.height);
    if (!tile || !Array.isArray(value[5])) return null;
    const edges = value[5].map(readJigsawEdge);
    if (edges.some((edge) => edge === null)) return null;
    const [id, currentIndex, solvedIndex, row, column] = tile;
    pieces.push({ id, currentIndex, solvedIndex, row, column, edges: edges as JigsawPieceEdge[] });
  }
  if (pieces.length !== common.width * common.height) return null;
  if (new Set(pieces.map((piece) => piece.currentIndex)).size !== pieces.length) return null;

  let asset;
  try {
    asset = getPuzzleImageAsset(candidate.image, "jigsaw");
  } catch {
    return null;
  }
  return withPuzzleProvenance({
    kind: "tiles",
    id: common.id,
    puzzleId: "jigsaw",
    title: common.title,
    seed: common.seed,
    width: common.width,
    height: common.height,
    checksum: common.checksum,
    createdAt: new Date().toISOString(),
    ...(common.difficulty ? { difficulty: common.difficulty } : {}),
    ...(common.uniqueSolution !== undefined ? { uniqueSolution: common.uniqueSolution } : {}),
    notes: [],
    tiles: pieces,
    asset,
    edgeModel: {
      catalogRevision: jigsawEdgeProfileCatalogRevision,
      profileIds: [...jigsawEdgeProfileIds],
    },
  }, common.provenance);
};

export const deserializePuzzle = (serialized: string): PuzzleDecodeResult => {
  let candidate: unknown;
  try {
    candidate = JSON.parse(decodeBase64Url(serialized));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!isRecord(candidate)) return { ok: false, reason: "invalid-puzzle" };
  const common = readCommon(candidate);
  if (!common) return { ok: false, reason: "invalid-puzzle" };

  let puzzle: GeneratedPuzzle | null = null;
  if (candidate.k === "g") puzzle = readGridPuzzle(candidate, common);
  else if (candidate.k === "c") puzzle = readCardPuzzle(candidate, common);
  else if (candidate.k === "t" || candidate.k === "s") puzzle = readTilePuzzle(candidate, common);
  else if (candidate.k === "j") puzzle = readJigsawPuzzle(candidate, common);

  return puzzle ? { ok: true, puzzle } : { ok: false, reason: "invalid-puzzle" };
};
