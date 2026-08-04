import type {
  JigsawEdgePolarity,
  JigsawEdgeSide,
  JigsawPiece,
  JigsawPieceEdge,
  TilePuzzleGenerator,
} from "../../catalog/types";
import { createGeneratedJigsawPuzzle, createRandom, normalizeDimension, normalizeSeed } from "../shared";
import { jigsawEdgeProfileCatalogRevision, jigsawEdgeProfileIds } from "./edgeProfiles";
import { getJigsawImageAsset } from "./imageAssets";

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
}: {
  pieceId: string;
  row: number;
  column: number;
  width: number;
  height: number;
  edgeSeed: string;
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
    const profileId = jigsawEdgeProfileIds[Math.floor(random() * jigsawEdgeProfileIds.length)];
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

export const generateJigsaw: TilePuzzleGenerator = ({
  seed,
  width,
  height,
  jigsawImageId,
  jigsawAssetRevision,
}) => {
  const normalizedSeed = normalizeSeed(seed);
  const boundedWidth = normalizeDimension(width, 4, 2, 8);
  const boundedHeight = normalizeDimension(height, 4, 2, 8);
  const asset = getJigsawImageAsset(jigsawImageId, jigsawAssetRevision);
  const assetIdentity = `${asset.id}@${asset.assetRevision}`;
  const edgeIdentity = `edges@${jigsawEdgeProfileCatalogRevision}`;
  const edgeModel = {
    catalogRevision: jigsawEdgeProfileCatalogRevision,
    profileIds: [...jigsawEdgeProfileIds],
  };
  const solvedIndexes = Array.from({ length: boundedWidth * boundedHeight }, (_, index) => index);
  const shuffleSeed = `jigsaw:${normalizedSeed}:${boundedWidth}x${boundedHeight}:${assetIdentity}`;
  const edgeSeed = `${shuffleSeed}:${edgeIdentity}`;
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
      }),
    };
  });
  const shuffledIndexes = shuffle(solvedIndexes, shuffleSeed);
  const tiles = shuffledIndexes.map((solvedIndex, currentIndex) => ({
    ...piecesBySolvedIndex[solvedIndex],
    currentIndex,
  }));

  return createGeneratedJigsawPuzzle({
    id: `jigsaw-${assetIdentity}-${edgeIdentity}-${normalizedSeed}-${boundedWidth}x${boundedHeight}`,
    title: "Jigsaw",
    seed: normalizedSeed,
    width: boundedWidth,
    height: boundedHeight,
    tiles,
    asset,
    edgeModel,
    notes: [`Square-piece Jigsaw using the bundled ${asset.title} image.`],
  });
};
