import { describe, expect, it } from "vitest";
import type { JigsawBoundaryEdge } from "../../catalog/types";
import {
  getJigsawOuterBoundaryPoints,
  validateJigsawOuterBoundary,
} from "./boundaryContours";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";

const makeParams = (seed: string, width = 6, height = 5) => ({
  puzzleId: "jigsaw" as const,
  seed,
  width,
  height,
  imageId: defaultJigsawImageAsset.id,
  jigsawCutStyle: "unconventional" as const,
});

const boundaryEdges = (puzzle: ReturnType<typeof generateJigsaw>) =>
  puzzle.tiles
    .flatMap((piece) => piece.edges)
    .filter((edge): edge is JigsawBoundaryEdge => edge.boundary);

describe("Jigsaw boundary contour generation", () => {
  it("keeps ordinary generated Jigsaws flat by default", () => {
    const puzzle = generateJigsaw(makeParams("flat-default"));

    expect(boundaryEdges(puzzle)).toHaveLength(
      puzzle.width * 2 + puzzle.height * 2,
    );
    expect(
      boundaryEdges(puzzle).every((edge) => edge.contour === undefined),
    ).toBe(true);
    expect(puzzle.id).not.toContain("boundary:");
  });

  it("deterministically assigns real contours without inventing outside neighbors", () => {
    const first = generateJigsaw({
      ...makeParams("bounded-contours"),
      jigsawBoundaryMode: "contoured",
    });
    const second = generateJigsaw({
      ...makeParams("bounded-contours"),
      jigsawBoundaryMode: "contoured",
    });

    expect(first.id).toBe(second.id);
    expect(first.checksum).toBe(second.checksum);
    expect(first.tiles).toEqual(second.tiles);
    expect(first.id).toContain("boundary:contoured");

    const edges = boundaryEdges(first);
    expect(edges).toHaveLength(first.width * 2 + first.height * 2);
    for (const edge of edges) {
      expect(edge.contour).toBeDefined();
      expect(edge.contour?.baselineGrammarId).not.toBe("straight");
      expect(edge.neighborPieceId).toBeNull();
      expect(edge.neighborEdgeId).toBeNull();
      expect(edge.profileId).toBeNull();
      expect(edge.polarity).toBe("flat");
      expect(edge.seedOffset).toBe(0);
    }
  });

  it("produces one safe closed perimeter across representative seeds and sizes", () => {
    for (const [width, height] of [
      [4, 4],
      [7, 5],
      [12, 8],
    ] as const) {
      for (let index = 0; index < 24; index += 1) {
        const puzzle = generateJigsaw({
          ...makeParams(`boundary-sweep-${width}x${height}-${index}`, width, height),
          jigsawBoundaryMode: "contoured",
        });
        const validation = validateJigsawOuterBoundary({
          pieces: puzzle.tiles,
          width: puzzle.width,
          height: puzzle.height,
          edgeModel: puzzle.edgeModel,
        });
        const points = getJigsawOuterBoundaryPoints(
          puzzle.tiles,
          puzzle.width,
          puzzle.height,
          puzzle.edgeModel,
        );

        expect(validation).toEqual({ ok: true });
        expect(points).not.toBeNull();
        expect(points?.[0]).toEqual(points?.at(-1));
      }
    }
  });

  it("changes geometry identity while preserving interior adjacency truth", () => {
    const params = makeParams("same-interior-truth");
    const flat = generateJigsaw(params);
    const contoured = generateJigsaw({
      ...params,
      jigsawBoundaryMode: "contoured",
    });

    expect(contoured.id).not.toBe(flat.id);
    expect(contoured.checksum).not.toBe(flat.checksum);

    const flatInterior = flat.tiles
      .flatMap((piece) => piece.edges)
      .filter((edge) => !edge.boundary);
    const contouredInterior = contoured.tiles
      .flatMap((piece) => piece.edges)
      .filter((edge) => !edge.boundary);

    expect(contouredInterior).toEqual(flatInterior);
  });
});
