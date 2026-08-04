import type {
  GridGeneratedPuzzle,
  GridPuzzleCage,
  GridPuzzleClues,
  GridPuzzleInequality,
  JigsawEdgeModel,
  JigsawGeneratedPuzzle,
  JigsawImageAsset,
  JigsawPiece,
  PuzzleCell,
  PuzzleDifficulty,
  PuzzleId,
} from "../catalog/types";

const RNG_MODULUS = 2147483647;
const RNG_MULTIPLIER = 48271;

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const normalizeDimension = (value: number, fallback: number, min: number, max: number) =>
  clamp(Math.floor(Number.isFinite(value) ? value : fallback), min, max);

const seedToState = (seed: string) => {
  let state = 17;

  for (const character of seed) {
    state = (state * 31 + (character.codePointAt(0) ?? 0)) % RNG_MODULUS;
  }

  return state === 0 ? 1 : state;
};

export const createRandom = (seed: string) => {
  let state = seedToState(seed);

  return () => {
    state = (state * RNG_MULTIPLIER) % RNG_MODULUS;
    return state / RNG_MODULUS;
  };
};

export const normalizeSeed = (seed: string) => seed.trim() || "puzzle-forge";

export const makeChecksumFromParts = (parts: string[]) => {
  const total = parts.reduce((sum, part, index) => {
    const valueWeight = Array.from(part).reduce((valueSum, character) => valueSum + character.charCodeAt(0), 0);
    return sum + valueWeight * (index + 1);
  }, 0);

  return total.toString(36).padStart(6, "0");
};

export const makeChecksum = (cells: PuzzleCell[], cages: GridPuzzleCage[] = [], inequalities: GridPuzzleInequality[] = []) => {
  const parts = cells.map((cell) => `${cell.row}:${cell.column}:${cell.value}:${cell.locked ? "locked" : "open"}:${cell.tone}`);
  parts.push(...cages.map((cage) => `${cage.id}:${cage.sum}:${cage.cells.map((cell) => `${cell.row},${cell.column}`).join("|")}`));
  parts.push(...inequalities.map((clue) => `${clue.lesser.row},${clue.lesser.column}<${clue.greater.row},${clue.greater.column}`));

  return makeChecksumFromParts(parts);
};

const makeJigsawEdgeModelChecksumPart = (edgeModel: JigsawEdgeModel) =>
  `edge-model:${edgeModel.catalogRevision}:${edgeModel.profileIds.join("|")}`;

const makeJigsawTileChecksumPart = (tile: JigsawPiece) => {
  const edgeParts = tile.edges.map(
    (edge) =>
      `${edge.edgeId}:${edge.side}:${edge.neighborPieceId ?? "none"}:${edge.neighborEdgeId ?? "none"}:${edge.boundary ? "boundary" : "interior"}:${edge.profileId ?? "flat"}:${edge.polarity}:${edge.seedOffset}`,
  );

  return `${tile.id}:${tile.currentIndex}:${tile.solvedIndex}:${edgeParts.join("|")}`;
};

export const createGeneratedPuzzle = ({
  id,
  puzzleId,
  title,
  seed,
  width,
  height,
  difficulty,
  uniqueSolution,
  cells,
  notes,
  answerKey,
  clues,
  cages,
  inequalities,
}: {
  id: string;
  puzzleId: PuzzleId;
  title: string;
  seed: string;
  width: number;
  height: number;
  difficulty?: PuzzleDifficulty;
  uniqueSolution?: boolean;
  cells: PuzzleCell[];
  notes: string[];
  answerKey?: string[];
  clues?: GridPuzzleClues;
  cages?: GridPuzzleCage[];
  inequalities?: GridPuzzleInequality[];
}): GridGeneratedPuzzle => ({
  kind: "grid",
  id,
  puzzleId,
  title,
  seed,
  width,
  height,
  difficulty,
  uniqueSolution,
  cells,
  answerKey,
  clues,
  cages,
  inequalities,
  checksum: makeChecksum(cells, cages, inequalities),
  createdAt: new Date().toISOString(),
  notes,
});

export const createGeneratedJigsawPuzzle = ({
  id,
  title,
  seed,
  width,
  height,
  tiles,
  asset,
  edgeModel,
  notes,
}: {
  id: string;
  title: string;
  seed: string;
  width: number;
  height: number;
  tiles: JigsawPiece[];
  asset: JigsawImageAsset;
  edgeModel: JigsawEdgeModel;
  notes: string[];
}): JigsawGeneratedPuzzle => ({
  kind: "tiles",
  id,
  puzzleId: "jigsaw",
  title,
  seed,
  width,
  height,
  tiles,
  asset,
  edgeModel,
  checksum: makeChecksumFromParts([
    makeJigsawEdgeModelChecksumPart(edgeModel),
    ...tiles.map(makeJigsawTileChecksumPart),
  ]),
  createdAt: new Date().toISOString(),
  notes,
});
