import type {
  JigsawBaselineGrammarId,
  JigsawBoundaryContour,
  JigsawBoundaryMode,
  JigsawEdgeModel,
  JigsawEdgeSide,
  JigsawPiece,
  JigsawPieceEdge,
} from "../../catalog/types";
import { createRandom } from "../shared";
import { getJigsawEdgePoints } from "./edgePaths";

export const jigsawBoundaryModes = [
  "flat",
  "contoured",
] as const satisfies readonly JigsawBoundaryMode[];

export const defaultJigsawBoundaryMode: JigsawBoundaryMode = "flat";

export const isJigsawBoundaryMode = (
  value: unknown,
): value is JigsawBoundaryMode =>
  value === "flat" || value === "contoured";

export const jigsawBoundaryModeLabels = {
  flat: "Flat",
  contoured: "Shaped",
} as const satisfies Record<JigsawBoundaryMode, string>;

export const jigsawBoundaryModeDescriptions = {
  flat: "Straight outside edges preserve the classic frame-first solve.",
  contoured: "Non-flat outside edges remove the usual border-piece shortcut.",
} as const satisfies Record<JigsawBoundaryMode, string>;

export const normalizeJigsawBoundaryMode = (
  value: JigsawBoundaryMode | undefined,
): JigsawBoundaryMode => value ?? defaultJigsawBoundaryMode;

export const getJigsawBoundaryMode = (
  pieces: readonly JigsawPiece[],
): JigsawBoundaryMode =>
  pieces.some((piece) =>
    piece.edges.some((edge) => edge.boundary && edge.contour !== undefined))
    ? "contoured"
    : "flat";

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
  baselineGrammarIds: readonly JigsawBaselineGrammarId[],
  row: number,
  column: number,
  side: JigsawEdgeSide,
  attempt: number,
): JigsawBoundaryContour => {
  const random = createRandom(
    `${edgeSeed}:boundary:${row}:${column}:${side}:attempt:${attempt}`,
  );
  random();
  const contourGrammarIds = baselineGrammarIds.filter(
    (grammarId) => grammarId !== "straight",
  );
  if (contourGrammarIds.length === 0) {
    throw new Error("Contoured Jigsaw boundaries require a non-straight baseline grammar.");
  }
  const grammarIndex = Math.floor(random() * contourGrammarIds.length);
  const baselineGrammarId =
    contourGrammarIds[Math.min(grammarIndex, contourGrammarIds.length - 1)];
  const seedOffset = Math.floor(random() * 1_000_000);

  return {
    baselineGrammarId,
    seedOffset,
  };
};

const withBoundaryContours = (
  pieces: readonly JigsawPiece[],
  edgeModel: JigsawEdgeModel,
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
              edgeModel.baselineGrammarIds,
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

type BoundaryRun = {
  side: JigsawEdgeSide;
  points: Point[];
};

const getBoundaryRuns = (
  pieces: readonly JigsawPiece[],
  width: number,
  height: number,
  edgeModel: JigsawEdgeModel,
): BoundaryRun[] | null => {
  const traversal = getBoundaryTraversal(pieces, width, height);
  if (!traversal) return null;

  const runs: BoundaryRun[] = [];
  for (const { piece, side } of traversal) {
    const edge = piece.edges.find((candidate) => candidate.side === side);
    if (!edge?.boundary) return null;

    runs.push({
      side,
      points: getJigsawEdgePoints(edge, edgeModel).map((candidate) => ({
        x: candidate.x + piece.column * 100,
        y: candidate.y + piece.row * 100,
      })),
    });
  }

  return runs;
};

export const getJigsawOuterBoundaryPoints = (
  pieces: readonly JigsawPiece[],
  width: number,
  height: number,
  edgeModel: JigsawEdgeModel,
): Point[] | null => {
  const runs = getBoundaryRuns(pieces, width, height, edgeModel);
  if (!runs) return null;

  return runs.flatMap((run, index) =>
    index === 0 ? run.points : run.points.slice(1),
  );
};

const boundsFor = (points: readonly Point[]) => ({
  minimumX: Math.min(...points.map((candidate) => candidate.x)),
  maximumX: Math.max(...points.map((candidate) => candidate.x)),
  minimumY: Math.min(...points.map((candidate) => candidate.y)),
  maximumY: Math.max(...points.map((candidate) => candidate.y)),
});

const boundsOverlap = (
  first: ReturnType<typeof boundsFor>,
  second: ReturnType<typeof boundsFor>,
) =>
  first.minimumX <= second.maximumX + coordinateEpsilon &&
  first.maximumX + coordinateEpsilon >= second.minimumX &&
  first.minimumY <= second.maximumY + coordinateEpsilon &&
  first.maximumY + coordinateEpsilon >= second.minimumY;

const runIntersects = (
  first: BoundaryRun,
  second: BoundaryRun,
  allowSharedEndpoint: boolean,
) => {
  for (let firstIndex = 0; firstIndex < first.points.length - 1; firstIndex += 1) {
    const firstStart = first.points[firstIndex];
    const firstEnd = first.points[firstIndex + 1];

    for (
      let secondIndex = 0;
      secondIndex < second.points.length - 1;
      secondIndex += 1
    ) {
      const secondStart = second.points[secondIndex];
      const secondEnd = second.points[secondIndex + 1];

      if (
        allowSharedEndpoint &&
        ((samePoint(firstEnd, secondStart) &&
          firstIndex === first.points.length - 2 &&
          secondIndex === 0) ||
          (samePoint(secondEnd, firstStart) &&
            secondIndex === second.points.length - 2 &&
            firstIndex === 0))
      ) {
        continue;
      }

      if (segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) {
        return true;
      }
    }
  }

  return false;
};

const runSelfIntersects = (run: BoundaryRun) => {
  const segmentCount = run.points.length - 1;

  for (let firstIndex = 0; firstIndex < segmentCount; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 2;
      secondIndex < segmentCount;
      secondIndex += 1
    ) {
      if (
        segmentsIntersect(
          run.points[firstIndex],
          run.points[firstIndex + 1],
          run.points[secondIndex],
          run.points[secondIndex + 1],
        )
      ) {
        return true;
      }
    }
  }

  return false;
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
  const runs = getBoundaryRuns(pieces, width, height, edgeModel);
  if (!runs || runs.some((run) => run.points.length < 2)) {
    return { ok: false, reason: "missing outer-boundary geometry" };
  }

  const points = runs.flatMap((run, index) =>
    index === 0 ? run.points : run.points.slice(1),
  );
  if (
    points.some(
      (candidate) =>
        !Number.isFinite(candidate.x) || !Number.isFinite(candidate.y),
    )
  ) {
    return { ok: false, reason: "non-finite outer-boundary coordinate" };
  }

  for (let index = 0; index < runs.length; index += 1) {
    const currentRun = runs[index];
    const nextRun = runs[(index + 1) % runs.length];
    if (
      !samePoint(
        currentRun.points[currentRun.points.length - 1],
        nextRun.points[0],
      )
    ) {
      return { ok: false, reason: "outer boundary is not continuous" };
    }
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

  if (runs.some(runSelfIntersects)) {
    return { ok: false, reason: "outer boundary self-intersects" };
  }

  const runBounds = runs.map((run) => boundsFor(run.points));
  for (let firstIndex = 0; firstIndex < runs.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < runs.length;
      secondIndex += 1
    ) {
      if (!boundsOverlap(runBounds[firstIndex], runBounds[secondIndex])) {
        continue;
      }

      const adjacent =
        secondIndex === firstIndex + 1 ||
        (firstIndex === 0 && secondIndex === runs.length - 1);
      if (runIntersects(runs[firstIndex], runs[secondIndex], adjacent)) {
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
    const candidate = withBoundaryContours(pieces, edgeModel, edgeSeed, attempt);
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
