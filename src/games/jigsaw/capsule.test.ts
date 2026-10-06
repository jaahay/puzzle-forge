import { describe, expect, it } from "vitest";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";
import {
  applyJigsawCapsuleTopology,
  deriveJigsawCapsuleGeometry,
  getJigsawCapsuleCandidatePlacements,
} from "./capsule";
import { getJigsawPieceAspectRatio } from "./size";
import { getJigsawPieceNeighborIds } from "./specialTopology";

describe("Jigsaw capsule topology", () => {
  it("keeps circular end caps circular in world space for both orientations", () => {
    for (const orientation of ["horizontal", "vertical"] as const) {
      const geometry = deriveJigsawCapsuleGeometry(
        6,
        4,
        defaultJigsawImageAsset,
        { orientation, anchorRow: 1, anchorColumn: 1 },
      );
      expect(geometry).not.toBeNull();
      if (!geometry) continue;

      const pieceAspectRatio = getJigsawPieceAspectRatio(
        defaultJigsawImageAsset,
        6,
        4,
      );
      expect(geometry.radiusX * pieceAspectRatio).toBeCloseTo(
        geometry.radiusY,
        2,
      );
      expect(geometry.sockets).toHaveLength(6);
    }
  });

  it("offers horizontal and vertical interior placements but declines unsafe grids", () => {
    const candidates = getJigsawCapsuleCandidatePlacements(
      6,
      6,
      defaultJigsawImageAsset,
    );
    expect(new Set(candidates.map(({ orientation }) => orientation))).toEqual(
      new Set(["horizontal", "vertical"]),
    );
    expect(getJigsawCapsuleCandidatePlacements(
      5,
      3,
      defaultJigsawImageAsset,
    )).toEqual([]);
  });

  it("replaces the buried grid seam with one capsule and six true socket neighbors", () => {
    const base = generateJigsaw({
      puzzleId: "jigsaw",
      seed: "capsule-topology-base",
      width: 6,
      height: 6,
      imageId: defaultJigsawImageAsset.id,
      jigsawSpecialPiecesMode: "off",
    });
    const pieces = applyJigsawCapsuleTopology({
      pieces: base.tiles,
      width: base.width,
      height: base.height,
      asset: base.asset,
      placement: {
        orientation: "horizontal",
        anchorRow: 2,
        anchorColumn: 2,
      },
    });
    const capsule = pieces.find((piece) => piece.specialShape?.kind === "capsule");
    const sockets = pieces.filter((piece) => piece.specialShape?.kind === "capsule-socket");
    expect(capsule).toBeDefined();
    expect(sockets).toHaveLength(6);
    if (!capsule || capsule.specialShape?.kind !== "capsule") return;

    expect(new Set(getJigsawPieceNeighborIds(capsule))).toEqual(
      new Set(capsule.specialShape.socketPieceIds),
    );
    for (const socket of sockets) {
      expect(getJigsawPieceNeighborIds(socket)).toContain(capsule.id);
    }

    const centerSockets = sockets.filter((socket) =>
      socket.specialShape?.kind === "capsule-socket" &&
      (socket.specialShape.role === "north" || socket.specialShape.role === "south"));
    expect(centerSockets).toHaveLength(2);
    for (const socket of centerSockets) {
      expect(socket.edges.filter((edge) =>
        !edge.boundary && edge.specialGeometry?.kind === "removed")).toHaveLength(1);
    }
    const [north, south] = centerSockets;
    if (north && south) {
      expect(getJigsawPieceNeighborIds(north)).not.toContain(south.id);
      expect(getJigsawPieceNeighborIds(south)).not.toContain(north.id);
    }
  });
});
