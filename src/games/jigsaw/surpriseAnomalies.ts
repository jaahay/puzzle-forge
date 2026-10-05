import type {
  JigsawEdgeProfileId,
  JigsawEdgeSide,
} from "../../catalog/types";
import { createRandom } from "../shared";

export const jigsawSurpriseEdgeProfileIds = [
  "serpentine",
  "terrace",
  "zigzag",
  "stacked-lock",
  "compound-lock",
  "opposed-dual-lock",
  "notched-head",
  "connectorless-wave",
] as const satisfies readonly JigsawEdgeProfileId[];

export type JigsawSurpriseAnomaly = {
  seamKey: string;
  pieceIds: readonly [string, string];
  profileId: JigsawEdgeProfileId;
};

type JigsawSurpriseAnomalyOptions = {
  width: number;
  height: number;
  edgeSeed: string;
  dominantProfileId: JigsawEdgeProfileId;
};

type InteriorSeamCandidate = {
  seamKey: string;
  pieceIds: readonly [string, string];
};

const pieceIdAt = (row: number, column: number, width: number) =>
  `tile-${row * width + column}`;

export const makeJigsawInteriorSeamKey = (
  row: number,
  column: number,
  side: JigsawEdgeSide,
) => {
  if (side === "right") return `horizontal:${row}:${column}`;
  if (side === "left") return `horizontal:${row}:${column - 1}`;
  if (side === "bottom") return `vertical:${row}:${column}`;
  return `vertical:${row - 1}:${column}`;
};

export const getJigsawSurpriseAnomalyBudget = (pieceCount: number) => {
  const count = Math.max(0, Math.floor(pieceCount));
  if (count < 16) return 0;
  if (count < 100) return 1;
  if (count < 400) return 2;
  return 3;
};

const enumerateInteriorSeams = (
  width: number,
  height: number,
): InteriorSeamCandidate[] => {
  const seams: InteriorSeamCandidate[] = [];

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width - 1; column += 1) {
      seams.push({
        seamKey: makeJigsawInteriorSeamKey(row, column, "right"),
        pieceIds: [
          pieceIdAt(row, column, width),
          pieceIdAt(row, column + 1, width),
        ],
      });
    }
  }

  for (let row = 0; row < height - 1; row += 1) {
    for (let column = 0; column < width; column += 1) {
      seams.push({
        seamKey: makeJigsawInteriorSeamKey(row, column, "bottom"),
        pieceIds: [
          pieceIdAt(row, column, width),
          pieceIdAt(row + 1, column, width),
        ],
      });
    }
  }

  return seams;
};

const shuffleWithRandom = <T>(items: readonly T[], random: () => number) => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }

  return shuffled;
};

export const deriveJigsawSurpriseAnomalies = ({
  width,
  height,
  edgeSeed,
  dominantProfileId,
}: JigsawSurpriseAnomalyOptions): readonly JigsawSurpriseAnomaly[] => {
  const budget = getJigsawSurpriseAnomalyBudget(width * height);
  if (budget === 0) return [];

  const selectableProfiles = jigsawSurpriseEdgeProfileIds.filter(
    (profileId) => profileId !== dominantProfileId,
  );
  if (selectableProfiles.length === 0) {
    throw new Error("Jigsaw surprise anomaly policy has no alternate profile.");
  }

  const random = createRandom(`${edgeSeed}:surprise-anomalies`);
  const candidates = shuffleWithRandom(enumerateInteriorSeams(width, height), random);
  const usedPieceIds = new Set<string>();
  const anomalies: JigsawSurpriseAnomaly[] = [];

  for (const candidate of candidates) {
    if (candidate.pieceIds.some((pieceId) => usedPieceIds.has(pieceId))) continue;

    const profileId = selectableProfiles[
      Math.floor(random() * selectableProfiles.length)
    ]!;
    anomalies.push({
      seamKey: candidate.seamKey,
      pieceIds: candidate.pieceIds,
      profileId,
    });
    candidate.pieceIds.forEach((pieceId) => usedPieceIds.add(pieceId));

    if (anomalies.length >= budget) break;
  }

  return anomalies;
};
