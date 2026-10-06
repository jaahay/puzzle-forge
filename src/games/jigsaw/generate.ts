import type {
  JigsawBoundaryMode,
  JigsawEdgePolarity,
  JigsawEdgeProfileId,
  JigsawEdgeSide,
  JigsawPiece,
  JigsawPieceEdge,
  JigsawPuzzleGenerator,
} from "../../catalog/types";
import { getPuzzleImageAsset } from "../imageAssets";
import { createGeneratedJigsawPuzzle, createRandom, normalizeDimension, normalizeSeed } from "../shared";
import { jigsawMaximumAxis, jigsawMinimumAxis } from "./size";
import {
  defaultJigsawCutStyle,
  deriveJigsawBaselineCoursePalette,
  normalizeJigsawCutStyle,
  selectJigsawEdgeProfileForCutStyle,
} from "./cutStyle";
import {
  applyJigsawBoundaryMode,
  defaultJigsawBoundaryMode,
  normalizeJigsawBoundaryMode,
} from "./boundaryContours";
import { applyJigsawMedallionTopology } from "./medallion";

const edgeSides: readonly JigsawEdgeSide[] = ["top", "right", "bottom", "left"];
const oppositeSide: Record<JigsawEdgeSide, JigsawEdgeSide> = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
};
const neighborOffset: Record<JigsawEdgeSide, { row: number; column: number }> = {
  top: { row: -1, column: 0 },
  right: { row: 0, column: 1 },
  bottom: { row: 1, column: 0 },
  left: { row: 0, column: -1 },
};

const shuffle = <T>(items: T[], seed: string) => {
  const random = createRandom(seed);
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (shuffled.every((item, index) => item === items[index]) && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
};

const makeEdgeId = (pieceId: string, side: JigsawEdgeSide) => `${pieceId}:edge:${side}`;

const makeEdgePairKey = (row: number, column: number, side: JigsawEdgeSide) => {
  if (side === "right") return `horizontal:${row}:${column}`;
  if (side === "left") return `horizontal:${row}:${column - 1}`;
  if (side === "bottom") return `vertical:${row}:${column}`;
  return `vertical:${row - 1}:${column}`;
};

const invertPolarity = (polarity: Exclude<JigsawEdgePolarity, "flat">): Exclude<JigsawEdgePolarity, "flat"> =>
  polarity === "tab" ? "blank" : "tab";

const makePieceEdges = ({
  pieceId,
  row,
  column,
  width,
  height,
  edgeSeed,
  profileId,
}: {
  pieceId: string;
  row: number;
  column: number;
  width: number;
  height: number;
  edgeSeed: string;
  profileId: JigsawEdgeProfileId;
}): JigsawPieceEdge[] =>
  edgeSides.map((side) => {
    const offset = neighborOffset[side];
    const neighborRow = row + offset.row;
    const neighborColumn = column + offset.column;
    const boundary = neighborRow < 0 || neighborRow >= height || neighborColumn < 0 || neighborColumn >= width;

    if (boundary) {
      return {
        edgeId: makeEdgeId(pieceId, side),
        side,
        neighborPieceId: null,
        neighborEdgeId: null,
        boundary: true,
        profileId: null,
        polarity: "flat",
        seedOffset: 0,
      };
    }

    const pairKey = makeEdgePairKey(row, column, side);
    const random = createRandom(`${edgeSeed}:${pairKey}`);
    // The first sample from similarly structured pair seeds is visibly correlated.
    // Burn it so polarity and shape variation use the well-mixed subsequent sequence.
    random();
    const leadingPolarity: Exclude<JigsawEdgePolarity, "flat"> = random() < 0.5 ? "tab" : "blank";
    const seedOffset = Math.floor(random() * 1_000_000);
    const isLeadingPiece = side === "right" || side === "bottom";
    const neighborPieceId = `tile-${neighborRow * width + neighborColumn}`;

    return {
      edgeId: makeEdgeId(pieceId, side),
      side,
      neighborPieceId,
      neighborEdgeId: makeEdgeId(neighborPieceId, oppositeSide[side]),
      boundary: false,
      profileId,
      polarity: isLeadingPiece ? leadingPolarity : invertPolarity(leadingPolarity),
      seedOffset,
    };
  });

export const generateJigsaw: JigsawPuzzleGenerator = ({
  seed,
  width,
  height,
  imageId,
  jigsawCutStyle = defaultJigsawCutStyle,
  jigsawBoundaryMode = defaultJigsawBoundaryMode,
}) => {
  const normalizedSeed = normalizeSeed(seed);
  const boundedWidth = normalizeDimension(width, 4, jigsawMinimumAxis, jigsawMaximumAxis);
  const boundedHeight = normalizeDimension(height, 4, jigsawMinimumAxis, jigsawMaximumAxis);
  const asset = getPuzzleImageAsset(imageId, "jigsaw");
  const imageIdentity = asset.id;
  const cutStyle = normalizeJigsawCutStyle(jigsawCutStyle);
  const boundaryMode: JigsawBoundaryMode = normalizeJigsawBoundaryMode(jigsawBoundaryMode);
  const edgeIdentity = `edges:${cutStyle}`;
  const boundaryIdentity = boundaryMode === "flat" ? "" : `-boundary:${boundaryMode}`;
  const solvedIndexes = Array.from({ length: boundedWidth * boundedHeight }, (_, index) => index);
  const shuffleSeed = `jigsaw:${normalizedSeed}:${boundedWidth}x${boundedHeight}:${imageIdentity}`;
  const edgeSeed = `${shuffleSeed}:${edgeIdentity}`;
  const baselineCourseIds = deriveJigsawBaselineCoursePalette(cutStyle, edgeSeed);
  const edgeModel = {
    cutStyle,
    baselineCourseIds: [...baselineCourseIds],
  };
  const profileRandom = createRandom(`${edgeSeed}:profile`);
  profileRandom();
  const profileId = selectJigsawEdgeProfileForCutStyle(
    cutStyle,
    profileRandom(),
  );
  const piecesBySolvedIndex = solvedIndexes.map((solvedIndex): JigsawPiece => {
    const row = Math.floor(solvedIndex / boundedWidth);
    const column = solvedIndex % boundedWidth;
    const id = `tile-${solvedIndex}`;

    return {
      id,
      currentIndex: solvedIndex,
      solvedIndex,
      row,
      column,
      edges: makePieceEdges({
        pieceId: id,
        row,
        column,
        width: boundedWidth,
        height: boundedHeight,
        edgeSeed,
        profileId,
      }),
    };
  });
  const boundedPieces = applyJigsawBoundaryMode({
    pieces: piecesBySolvedIndex,
    width: boundedWidth,
    height: boundedHeight,
    edgeModel,
    edgeSeed,
    boundaryMode,
  });
  const topologyPieces = applyJigsawMedallionTopology({
    pieces: boundedPieces,
    width: boundedWidth,
    height: boundedHeight,
    asset,
  });
  const topologyIndexes = Array.from(
    { length: topologyPieces.length },
    (_, index) => index,
  );
  const topologyShuffleSeed =
    topologyPieces.length === boundedPieces.length
      ? shuffleSeed
      : `${shuffleSeed}:medallion`;
  const shuffledIndexes = shuffle(topologyIndexes, topologyShuffleSeed);
  const tiles = shuffledIndexes.map((solvedIndex, currentIndex) => ({
    ...topologyPieces[solvedIndex]!,
    currentIndex,
  }));

  return createGeneratedJigsawPuzzle({
    id: `jigsaw-${imageIdentity}-${edgeIdentity}${boundaryIdentity}-${normalizedSeed}-${boundedWidth}x${boundedHeight}`,
    title: "Jigsaw",
    seed: normalizedSeed,
    width: boundedWidth,
    height: boundedHeight,
    tiles,
    asset,
    edgeModel,
    notes: [`Jigsaw using the bundled ${asset.title} image.`],
  });
};

