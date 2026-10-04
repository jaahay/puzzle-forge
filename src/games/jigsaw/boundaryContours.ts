import type {
  JigsawBaselineGrammarId,
  JigsawBoundaryContour,
  JigsawEdgeModel,
  JigsawEdgeSide,
  JigsawPiece,
  JigsawPieceEdge,
} from "../../catalog/types";
import { createRandom } from "../shared";
import { getJigsawEdgePoints } from "./edgePaths";

export type JigsawBoundaryMode = "flat" | "contoured";

export const jigsawBoundaryModes = [
  "flat",
  "contoured",
] as const satisfies readonly JigsawBoundaryMode[];

export const defaultJigsawBoundaryMode: JigsawBoundaryMode = "flat";

export const normalizeJigsawBoundaryMode = (
  value: JigsawBoundaryMode | undefined,
): JigsawBoundaryMode => value ?? defaultJigsawBoundaryMode;

const boundedBoundaryGrammarIds = [
  "bow",
  "inflection",
  "angled-course",
  "dogleg",
  "wave",
  "stepped-course",
] as const satisfies readonly JigsawBaselineGrammarId[];

const maximumBoundaryOverhang = 8;
const maximumBoundaryAttempts = 8;
const coordinateEpsilon = 0.001;

type Point = {
  x: number;
  y: number;
};

export type JigsawOuterBoundaryValidation =
  | { ok: true }
  | { ok: false; reason: string };

const pointKey = (row: number, column: number) => `${row}:${column}`;

const samePoint = (left: Point, right: Point) =>
  Math.abs(left.x - right.x) <= coordinateEpsilon &&
  Math.abs(left.y - right.y) <= coordinateEpsilon;

const cross = (start: Point, end: Point, candidate: Point) =>
  (end.x - start.x) * (candidate.y - start.y) -
  (end.y - start.y) * (candidate.x - start.x);

const pointOnSegment = (start: Point, end: Point, candidate: Point) =>
  Math.abs(cross(start, end, candidate)) <= coordinateEpsilon &&
  candidate.x >= Math.min(start.x, end.x) - coordinateEpsilon &&
  candidate.x <= Math.max(start.x, end.x) + coordinateEpsilon &&
  candidate.y >= Math.min(start.y, end.y) - coordinateEpsilon &&
  candidate.y <= Math.max(start.y, end.y) + coordinateEpsilon;

const segmentsIntersect = (
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
) => {
  const firstToSecondStart = cross(firstStart, firstEnd, secondStart);
  const firstToSecondEnd = cross(firstStart, firstEnd, secondEnd);
  const secondToFirstStart = cross(secondStart, secondEnd, firstStart);
  const secondToFirstEnd = cross(secondStart, secondEnd, firstEnd);

  const properIntersection =
    ((firstToSecondStart > coordinateEpsilon &&
      firstToSecondEnd < -coordinateEpsilon) ||
      (firstToSecondStart < -coordinateEpsilon &&
        firstToSecondEnd > coordinateEpsilon)) &&
    ((secondToFirstStart > coordinateEpsilon &&
      secondToFirstEnd < -coordinateEpsilon) ||
      (secondToFirstStart < -coordinateEpsilon &&
        secondToFirstEnd > coordinateEpsilon));

  if (properIntersection) return true;

  return (
    (Math.abs(firstToSecondStart) <= coordinateEpsilon &&
      pointOnSegment(firstStart, firstEnd, secondStart)) ||
    (Math.abs(firstToSecondEnd) <= coordinateEpsilon &&
      pointOnSegment(firstStart, firstEnd, secondEnd)) ||
    (Math.abs(secondToFirstStart) <= coordinateEpsilon &&
      pointOnSegment(secondStart, secondEnd, firstStart)) ||
    (Math.abs(secondToFirstEnd) <= coordinateEpsilon &&
      pointOnSegment(secondStart, secondEnd, firstEnd))
  );
};

const deriveBoundaryContour = (
  edgeSeed: string,
  row: number,
  column: number,
  side: JigsawEdgeSide,
  attempt: number,
): JigsawBoundaryContour => {
  const random = createRandom(
    `${edgeSeed}:boundary:${row}:${column}:${side}:attempt:${attempt}`,
  );
  random();
  const grammarIndex = Math.floor(random() * boundedBoundaryGrammarIds.length);
  const baselineGrammarId =
    boundedBoundaryGrammarIds[
      Math.min(grammarIndex, boundedBoundaryGrammarIds.length - 1)
    ];
  const seedOffset = Math.floor(random() * 1_000_000);

  return {
    baselineGrammarId,
    seedOffset,
  };
};

const withBoundaryContours = (
  pieces: readonly JigsawPiece[],
  edgeSeed: string,
  attempt: number,
): JigsawPiece[] =>
  pieces.map((piece) => ({
    ...piece,
    edges: piece.edges.map((edge): JigsawPieceEdge =>
      edge.boundary
        ? {
            ...edge,
            contour: deriveBoundaryContour(
              edgeSeed,
              piece.row,
              piece.column,
              edge.side,
              attempt,
            ),
          }
        : edge,
    ),
  }));

const getBoundaryTraversal = (
  pieces: readonly JigsawPiece[],
  width: number,
  height: number,
): Array<{ piece: JigsawPiece; side: JigsawEdgeSide }> | null => {
  const piecesByPosition = new Map(
    pieces.map((piece) => [pointKey(piece.row, piece.column), piece]),
  );
  const traversal: Array<{ piece: JigsawPiece; side: JigsawEdgeSide }> = [];

  const push = (row: number, column: number, side: JigsawEdgeSide) => {
    const piece = piecesByPosition.get(pointKey(row, column));
    if (!piece) return false;
    traversal.push({ piece, side });
    return true;
  };

  for (let column = 0; column < width; column += 1) {
    if (!push(0, column, "top")) return null;
  }
  for (let row = 0; row < height; row += 1) {
    if (!push(row, width - 1, "right")) return null;
  }
  for (let column = width - 1; column >= 0; column -= 1) {
    if (!push(height - 1, column, "bottom")) return null;
  }
  for (let row = height - 1; row >= 0; row -= 1) {
    if (!push(row, 0, "left")) return null;
  }

  return traversal;
};

export const getJigsawOuterBoundaryPoints = (
  pieces: readonly JigsawPiece[],
  width: number,
  height: number,
  edgeModel: JigsawEdgeModel,
): Point[] | null => {
  const traversal = getBoundaryTraversal(pieces, width, height);
  if (!traversal) return null;

  const points: Point[] = [];

  for (const { piece, side } of traversal) {
    const edge = piece.edges.find((candidate) => candidate.side === side);
    if (!edge?.boundary) return null;

    const localPoints = getJigsawEdgePoints(edge, edgeModel);
    const translated = localPoints.map((candidate) => ({
      x: candidate.x + piece.column * 100,
      y: candidate.y + piece.row * 100,
    }));

    points.push(...(points.length === 0 ? translated : translated.slice(1)));
  }

  return points;
};

export const validateJigsawOuterBoundary = ({
  pieces,
  width,
  height,
  edgeModel,
}: {
  pieces: readonly JigsawPiece[];
  width: number;
  height: number;
  edgeModel: JigsawEdgeModel;
}): JigsawOuterBoundaryValidation => {
  const points = getJigsawOuterBoundaryPoints(
    pieces,
    width,
    height,
    edgeModel,
  );
  if (!points || points.length < 5) {
    return { ok: false, reason: "missing outer-boundary geometry" };
  }

  if (points.some((candidate) => !Number.isFinite(candidate.x) || !Number.isFinite(candidate.y))) {
    return { ok: false, reason: "non-finite outer-boundary coordinate" };
  }

  if (!samePoint(points[0], points[points.length - 1])) {
    return { ok: false, reason: "outer boundary is not closed" };
  }

  const maximumX = width * 100;
  const maximumY = height * 100;
  if (
    points.some(
      (candidate) =>
        candidate.x < -maximumBoundaryOverhang ||
        candidate.x > maximumX + maximumBoundaryOverhang ||
        candidate.y < -maximumBoundaryOverhang ||
        candidate.y > maximumY + maximumBoundaryOverhang,
    )
  ) {
    return { ok: false, reason: "outer boundary exceeds the bounded overhang" };
  }

  const segmentCount = points.length - 1;
  for (let firstIndex = 0; firstIndex < segmentCount; firstIndex += 1) {
    const firstStart = points[firstIndex];
    const firstEnd = points[firstIndex + 1];

    for (
      let secondIndex = firstIndex + 1;
      secondIndex < segmentCount;
      secondIndex += 1
    ) {
      const adjacent =
        secondIndex === firstIndex + 1 ||
        (firstIndex === 0 && secondIndex === segmentCount - 1);
      if (adjacent) continue;

      if (
        segmentsIntersect(
          firstStart,
          firstEnd,
          points[secondIndex],
          points[secondIndex + 1],
        )
      ) {
        return { ok: false, reason: "outer boundary self-intersects" };
      }
    }
  }

  return { ok: true };
};

export const applyJigsawBoundaryMode = ({
  pieces,
  width,
  height,
  edgeModel,
  edgeSeed,
  boundaryMode,
}: {
  pieces: readonly JigsawPiece[];
  width: number;
  height: number;
  edgeModel: JigsawEdgeModel;
  edgeSeed: string;
  boundaryMode: JigsawBoundaryMode;
}): JigsawPiece[] => {
  if (boundaryMode === "flat") return [...pieces];

  let lastFailure = "unknown validation failure";
  for (let attempt = 0; attempt < maximumBoundaryAttempts; attempt += 1) {
    const candidate = withBoundaryContours(pieces, edgeSeed, attempt);
    const validation = validateJigsawOuterBoundary({
      pieces: candidate,
      width,
      height,
      edgeModel,
    });
    if (validation.ok) return candidate;
    lastFailure = validation.reason;
  }

  throw new Error(
    `Unable to generate a safe Jigsaw outer boundary after ${maximumBoundaryAttempts} attempts: ${lastFailure}.`,
  );
};
