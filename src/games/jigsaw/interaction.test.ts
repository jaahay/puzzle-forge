import { describe, expect, it } from "vitest";
import type { JigsawPiece, JigsawPieceEdge } from "../../catalog/types";
import {
  moveJigsawComponent,
  resolveJigsawComponentDrop,
  stageJigsawAssemblyPlacements,
} from "./interaction";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";
import {
  createJigsawWorldLayout,
  getJigsawPieceWorldSize,
  getJigsawSolvedPosition,
  type JigsawPlacement,
} from "./placement";

const edge = (
  edgeId: string,
  side: "left" | "right",
  neighborPieceId: string | null,
  polarity: "tab" | "blank" = "tab",
): JigsawPieceEdge => neighborPieceId === null
  ? {
      edgeId,
      side,
      boundary: true as const,
      neighborPieceId: null,
      neighborEdgeId: null,
      profileId: null,
      polarity: "flat" as const,
      seedOffset: 0,
    }
  : {
      edgeId,
      side,
      boundary: false as const,
      neighborPieceId,
      neighborEdgeId: `${neighborPieceId}-mate`,
      profileId: "classic-bulb" as const,
      polarity,
      seedOffset: 1,
    };

const pieces: JigsawPiece[] = [
  {
    id: "tile-0",
    currentIndex: 0,
    solvedIndex: 0,
    row: 0,
    column: 0,
    edges: [edge("0-left", "left", null), edge("0-right", "right", "tile-1")],
  },
  {
    id: "tile-1",
    currentIndex: 1,
    solvedIndex: 1,
    row: 0,
    column: 1,
    edges: [edge("1-left", "left", "tile-0", "blank"), edge("1-right", "right", "tile-2")],
  },
  {
    id: "tile-2",
    currentIndex: 2,
    solvedIndex: 2,
    row: 0,
    column: 2,
    edges: [edge("2-left", "left", "tile-1", "blank"), edge("2-right", "right", "tile-3")],
  },
  {
    id: "tile-3",
    currentIndex: 3,
    solvedIndex: 3,
    row: 0,
    column: 3,
    edges: [edge("3-left", "left", "tile-2", "blank"), edge("3-right", "right", null)],
  },
];

const bridgePieces: JigsawPiece[] = [
  {
    id: "bridge-0",
    currentIndex: 0,
    solvedIndex: 0,
    row: 0,
    column: 0,
    edges: [edge("bridge-0-left", "left", null), edge("bridge-0-right", "right", "bridge-1")],
  },
  {
    id: "bridge-1",
    currentIndex: 1,
    solvedIndex: 1,
    row: 0,
    column: 1,
    edges: [edge("bridge-1-left", "left", "bridge-0", "blank"), edge("bridge-1-right", "right", "bridge-2")],
  },
  {
    id: "bridge-2",
    currentIndex: 2,
    solvedIndex: 2,
    row: 0,
    column: 2,
    edges: [edge("bridge-2-left", "left", "bridge-1", "blank"), edge("bridge-2-right", "right", "bridge-3")],
  },
  {
    id: "bridge-3",
    currentIndex: 3,
    solvedIndex: 3,
    row: 0,
    column: 3,
    edges: [edge("bridge-3-left", "left", "bridge-2", "blank"), edge("bridge-3-right", "right", "bridge-4")],
  },
  {
    id: "bridge-4",
    currentIndex: 4,
    solvedIndex: 4,
    row: 0,
    column: 4,
    edges: [edge("bridge-4-left", "left", "bridge-3", "blank"), edge("bridge-4-right", "right", null)],
  },
];

const generateAlwaysWithFamily = (
  family: "medallion" | "capsule",
  seedPrefix: string,
) => {
  for (let index = 0; index < 128; index += 1) {
    const puzzle = generateJigsaw({
      puzzleId: "jigsaw",
      seed: `${seedPrefix}-${index}`,
      width: 6,
      height: 6,
      imageId: defaultJigsawImageAsset.id,
      jigsawSpecialPiecesMode: "always",
    });
    if (puzzle.tiles.some((tile) => tile.specialShape?.kind === family)) return puzzle;
  }
  throw new Error(`Expected generated ${family}.`);
};

const layout = createJigsawWorldLayout({
  imageWidth: 1200,
  imageHeight: 300,
  puzzleWidth: 4,
  puzzleHeight: 1,
});

const bridgeLayout = createJigsawWorldLayout({
  imageWidth: 1500,
  imageHeight: 300,
  puzzleWidth: 5,
  puzzleHeight: 1,
});

const placementAtTranslation = (piece: JigsawPiece, x: number, y: number): JigsawPlacement => {
  const solved = getJigsawSolvedPosition(layout, piece);
  return {
    id: piece.id,
    worldX: solved.left + x,
    worldY: solved.top + y,
  };
};

const getTranslationForLayout = (
  targetLayout: ReturnType<typeof createJigsawWorldLayout>,
  placement: JigsawPlacement,
  piece: JigsawPiece,
) => {
  const solved = getJigsawSolvedPosition(targetLayout, piece);
  return {
    x: placement.worldX - solved.left,
    y: placement.worldY - solved.top,
  };
};

const getTranslation = (placement: JigsawPlacement, piece: JigsawPiece) => {
  const solved = getJigsawSolvedPosition(layout, piece);
  return {
    x: placement.worldX - solved.left,
    y: placement.worldY - solved.top,
  };
};

describe("Jigsaw island interaction", () => {
  it("moves a joined component rigidly", () => {
    const placements = [
      placementAtTranslation(pieces[0]!, -40, 20),
      placementAtTranslation(pieces[1]!, -40, 20),
      placementAtTranslation(pieces[2]!, 100, 20),
      placementAtTranslation(pieces[3]!, 100, 20),
    ];
    const moved = moveJigsawComponent(layout, placements, ["tile-0", "tile-1"], 24, -12);
    expect(moved[0]!.worldX - placements[0]!.worldX).toBe(24);
    expect(moved[1]!.worldX - placements[1]!.worldX).toBe(24);
    expect(moved[0]!.worldY - placements[0]!.worldY).toBe(-12);
    expect(moved[1]!.worldY - placements[1]!.worldY).toBe(-12);
  });

  it("clamps the whole island at workspace bounds without distorting it", () => {
    const placements = pieces.map((piece) => placementAtTranslation(piece, 0, 0));
    const moved = moveJigsawComponent(layout, placements, ["tile-0", "tile-1"], -1_000_000, -1_000_000);
    const first = moved[0]!;
    const second = moved[1]!;
    const firstDelta = {
      x: first.worldX - placements[0]!.worldX,
      y: first.worldY - placements[0]!.worldY,
    };
    const secondDelta = {
      x: second.worldX - placements[1]!.worldX,
      y: second.worldY - placements[1]!.worldY,
    };

    expect(secondDelta).toEqual(firstDelta);
    expect(first.worldX).toBeGreaterThanOrEqual(0);
    expect(first.worldY).toBeGreaterThanOrEqual(0);
  });

  it("snaps the circular medallion to a socket neighbor through special adjacency", () => {
    const puzzle = generateAlwaysWithFamily("medallion", "medallion-snap");
    const medallion = puzzle.tiles.find(
      (tile) => tile.specialShape?.kind === "medallion",
    );
    if (!medallion || medallion.specialShape?.kind !== "medallion") {
      throw new Error("Expected a generated medallion.");
    }
    const socketPieceIds = medallion.specialShape.socketPieceIds;
    const socket = puzzle.tiles.find(
      (tile) => tile.id === socketPieceIds[0],
    );
    if (!socket) throw new Error("Expected a medallion socket neighbor.");

    const medallionLayout = createJigsawWorldLayout({
      imageWidth: puzzle.asset.intrinsicWidth,
      imageHeight: puzzle.asset.intrinsicHeight,
      puzzleWidth: puzzle.width,
      puzzleHeight: puzzle.height,
    });
    const placements = puzzle.tiles.map((piece) => {
      const solved = getJigsawSolvedPosition(medallionLayout, piece);
      const near = piece.id === medallion.id;
      return {
        id: piece.id,
        worldX: solved.left + (near ? 8 : 0),
        worldY: solved.top + (near ? 6 : 0),
      };
    });

    const result = resolveJigsawComponentDrop(
      medallionLayout,
      puzzle.tiles,
      placements,
      { joinedComponents: [] },
      medallion.id,
    );

    expect(result.joined).toBe(true);
    expect(result.assembly.joinedComponents).toEqual([
      [medallion.id, ...socketPieceIds]
        .sort((left, right) => left.localeCompare(right)),
    ]);
  });

  it("snaps the capsule to all six aligned socket neighbors through special adjacency", () => {
    const puzzle = generateAlwaysWithFamily("capsule", "capsule-snap");
    const capsule = puzzle.tiles.find((tile) => tile.specialShape?.kind === "capsule");
    if (!capsule || capsule.specialShape?.kind !== "capsule") {
      throw new Error("Expected a generated capsule.");
    }
    const socketPieceIds = capsule.specialShape.socketPieceIds;
    const capsuleLayout = createJigsawWorldLayout({
      imageWidth: puzzle.asset.intrinsicWidth,
      imageHeight: puzzle.asset.intrinsicHeight,
      puzzleWidth: puzzle.width,
      puzzleHeight: puzzle.height,
    });
    const placements = puzzle.tiles.map((piece) => {
      const solved = getJigsawSolvedPosition(capsuleLayout, piece);
      const near = piece.id === capsule.id;
      return {
        id: piece.id,
        worldX: solved.left + (near ? 8 : 0),
        worldY: solved.top + (near ? 6 : 0),
      };
    });

    const result = resolveJigsawComponentDrop(
      capsuleLayout,
      puzzle.tiles,
      placements,
      { joinedComponents: [] },
      capsule.id,
    );

    expect(result.joined).toBe(true);
    expect(result.assembly.joinedComponents).toEqual([
      [capsule.id, ...socketPieceIds].sort((left, right) => left.localeCompare(right)),
    ]);
  });

  it("snaps a free piece to a neighboring island by canonical translation", () => {
    const targetTranslation = { x: 30, y: 18 };
    const placements = [
      placementAtTranslation(pieces[0]!, targetTranslation.x, targetTranslation.y),
      placementAtTranslation(pieces[1]!, targetTranslation.x, targetTranslation.y),
      placementAtTranslation(pieces[2]!, targetTranslation.x + 10, targetTranslation.y + 5),
      placementAtTranslation(pieces[3]!, 180, 90),
    ];
    const result = resolveJigsawComponentDrop(
      layout,
      pieces,
      placements,
      { joinedComponents: [["tile-0", "tile-1"]] },
      "tile-2",
    );

    expect(result.joined).toBe(true);
    expect(result.assembly).toEqual({
      joinedComponents: [["tile-0", "tile-1", "tile-2"]],
    });

    const tile2 = result.placements.find((placement) => placement.id === "tile-2")!;
    expect(getTranslation(tile2, pieces[2]!)).toEqual(targetTranslation);
  });

  it("snaps and merges two compatible islands", () => {
    const targetTranslation = { x: 46, y: 28 };
    const placements = [
      placementAtTranslation(pieces[0]!, targetTranslation.x, targetTranslation.y),
      placementAtTranslation(pieces[1]!, targetTranslation.x, targetTranslation.y),
      placementAtTranslation(pieces[2]!, targetTranslation.x + 8, targetTranslation.y + 5),
      placementAtTranslation(pieces[3]!, targetTranslation.x + 8, targetTranslation.y + 5),
    ];
    const result = resolveJigsawComponentDrop(
      layout,
      pieces,
      placements,
      { joinedComponents: [["tile-0", "tile-1"], ["tile-2", "tile-3"]] },
      "tile-2",
    );

    expect(result.joined).toBe(true);
    expect(result.assembly).toEqual({
      joinedComponents: [["tile-0", "tile-1", "tile-2", "tile-3"]],
    });
    for (const [index, piece] of pieces.entries()) {
      expect(getTranslation(result.placements[index]!, piece).x).toBeCloseTo(targetTranslation.x);
      expect(getTranslation(result.placements[index]!, piece).y).toBeCloseTo(targetTranslation.y);
    }
  });

  it("absorbs multiple mutually aligned neighboring components in one drop", () => {
    const targetTranslation = { x: 36, y: 24 };
    const placements = [
      placementAtTranslation(pieces[0]!, targetTranslation.x, targetTranslation.y),
      placementAtTranslation(pieces[1]!, targetTranslation.x + 7, targetTranslation.y + 4),
      placementAtTranslation(pieces[2]!, targetTranslation.x, targetTranslation.y),
      placementAtTranslation(pieces[3]!, targetTranslation.x, targetTranslation.y),
    ];
    const result = resolveJigsawComponentDrop(
      layout,
      pieces,
      placements,
      { joinedComponents: [["tile-2", "tile-3"]] },
      "tile-1",
    );

    expect(result.assembly).toEqual({
      joinedComponents: [["tile-0", "tile-1", "tile-2", "tile-3"]],
    });
    expect(result.joined).toBe(true);
  });

  it("bridges two independently offset islands in one drop", () => {
    const translations = new Map([
      ["bridge-0", 24],
      ["bridge-1", 24],
      ["bridge-2", 38],
      ["bridge-3", 46],
      ["bridge-4", 46],
    ]);
    const placements = bridgePieces.map((piece) => {
      const solved = getJigsawSolvedPosition(bridgeLayout, piece);
      return {
        id: piece.id,
        worldX: solved.left + (translations.get(piece.id) ?? 0),
        worldY: solved.top + 18,
      };
    });
    const result = resolveJigsawComponentDrop(
      bridgeLayout,
      bridgePieces,
      placements,
      {
        joinedComponents: [
          ["bridge-0", "bridge-1"],
          ["bridge-3", "bridge-4"],
        ],
      },
      "bridge-2",
    );

    expect(result.joined).toBe(true);
    expect(result.assembly).toEqual({
      joinedComponents: [[
        "bridge-0",
        "bridge-1",
        "bridge-2",
        "bridge-3",
        "bridge-4",
      ]],
    });
    for (const piece of bridgePieces) {
      const placement = result.placements.find((candidate) => candidate.id === piece.id)!;
      const translation = getTranslationForLayout(bridgeLayout, placement, piece);
      expect(translation.x).toBeCloseTo(24);
      expect(translation.y).toBeCloseTo(18);
    }
  });

  it("continues to a neighboring island that becomes reachable after the first snap", () => {
    const snapThreshold = Math.max(
      18,
      Math.min(bridgeLayout.pieceWidth, bridgeLayout.pieceHeight) * 0.42,
    );
    const firstTargetTranslation = 100;
    const bridgeTranslation = firstTargetTranslation + snapThreshold * 0.9;
    const secondTargetTranslation = firstTargetTranslation - snapThreshold * 0.2;
    expect(Math.abs(bridgeTranslation - firstTargetTranslation)).toBeLessThanOrEqual(snapThreshold);
    expect(Math.abs(bridgeTranslation - secondTargetTranslation)).toBeGreaterThan(snapThreshold);
    expect(Math.abs(firstTargetTranslation - secondTargetTranslation)).toBeLessThanOrEqual(snapThreshold);

    const translations = new Map([
      ["bridge-0", firstTargetTranslation],
      ["bridge-1", firstTargetTranslation],
      ["bridge-2", bridgeTranslation],
      ["bridge-3", secondTargetTranslation],
      ["bridge-4", secondTargetTranslation],
    ]);
    const placements = bridgePieces.map((piece) => {
      const solved = getJigsawSolvedPosition(bridgeLayout, piece);
      return {
        id: piece.id,
        worldX: solved.left + (translations.get(piece.id) ?? 0),
        worldY: solved.top + 18,
      };
    });
    const result = resolveJigsawComponentDrop(
      bridgeLayout,
      bridgePieces,
      placements,
      {
        joinedComponents: [
          ["bridge-0", "bridge-1"],
          ["bridge-3", "bridge-4"],
        ],
      },
      "bridge-2",
    );

    expect(result.joined).toBe(true);
    expect(result.assembly).toEqual({
      joinedComponents: [[
        "bridge-0",
        "bridge-1",
        "bridge-2",
        "bridge-3",
        "bridge-4",
      ]],
    });
    for (const piece of bridgePieces) {
      const placement = result.placements.find((candidate) => candidate.id === piece.id)!;
      const translation = getTranslationForLayout(bridgeLayout, placement, piece);
      expect(translation.x).toBeCloseTo(secondTargetTranslation);
      expect(translation.y).toBeCloseTo(18);
    }
  });

  it("resolves competing target transforms deterministically", () => {
    const placements = [
      placementAtTranslation(pieces[0]!, 0, 0),
      placementAtTranslation(pieces[1]!, 35, 0),
      placementAtTranslation(pieces[2]!, 70, 0),
      placementAtTranslation(pieces[3]!, 70, 0),
    ];
    const result = resolveJigsawComponentDrop(
      layout,
      pieces,
      placements,
      { joinedComponents: [["tile-2", "tile-3"]] },
      "tile-1",
    );

    expect(result.assembly).toEqual({
      joinedComponents: [["tile-0", "tile-1"], ["tile-2", "tile-3"]],
    });
    const tile1 = result.placements.find((placement) => placement.id === "tile-1")!;
    expect(getTranslation(tile1, pieces[1]!)).toEqual({ x: 0, y: 0 });
  });

  it("restricts snaps to fully eligible components", () => {
    const targetTranslation = { x: 30, y: 18 };
    const placements = [
      placementAtTranslation(pieces[0]!, targetTranslation.x, targetTranslation.y),
      placementAtTranslation(pieces[1]!, targetTranslation.x, targetTranslation.y),
      placementAtTranslation(pieces[2]!, targetTranslation.x + 8, targetTranslation.y + 4),
      placementAtTranslation(pieces[3]!, 180, 90),
    ];
    const assembly = {
      joinedComponents: [["tile-0", "tile-1"]],
    };

    expect(
      resolveJigsawComponentDrop(
        layout,
        pieces,
        placements,
        assembly,
        "tile-2",
        new Set(["tile-1", "tile-2", "tile-3"]),
      ),
    ).toMatchObject({
      joined: false,
      assembly,
    });

    expect(
      resolveJigsawComponentDrop(
        layout,
        pieces,
        placements,
        assembly,
        "tile-2",
        new Set(["tile-0", "tile-1", "tile-2"]),
      ),
    ).toMatchObject({
      joined: true,
      assembly: {
        joinedComponents: [["tile-0", "tile-1", "tile-2"]],
      },
    });
  });

  it("refuses a focused drag when its own joined island is only partially eligible", () => {
    const placements = [
      placementAtTranslation(pieces[0]!, 0, 0),
      placementAtTranslation(pieces[1]!, 0, 0),
      placementAtTranslation(pieces[2]!, 8, 4),
      placementAtTranslation(pieces[3]!, 8, 4),
    ];
    const assembly = {
      joinedComponents: [["tile-2", "tile-3"]],
    };

    const result = resolveJigsawComponentDrop(
      layout,
      pieces,
      placements,
      assembly,
      "tile-2",
      new Set(["tile-1", "tile-2"]),
    );

    expect(result.joined).toBe(false);
    expect(result.assembly).toEqual(assembly);
  });

  it("restages a joined island rigidly without persisting its old translation", () => {
    const staged = stageJigsawAssemblyPlacements(
      layout,
      pieces,
      { joinedComponents: [["tile-0", "tile-1"]] },
      { width: 760, height: 560 },
    );
    const first = getTranslation(staged[0]!, pieces[0]!);
    const second = getTranslation(staged[1]!, pieces[1]!);

    expect(second.x).toBeCloseTo(first.x);
    expect(second.y).toBeCloseTo(first.y);
  });

  it("keeps a restaged Capsule island within workspace bounds", () => {
    const puzzle = generateAlwaysWithFamily("capsule", "capsule-restage");
    const capsule = puzzle.tiles.find((piece) => piece.specialShape?.kind === "capsule");
    if (!capsule || capsule.specialShape?.kind !== "capsule") {
      throw new Error("Expected a generated capsule.");
    }
    const socketId = capsule.specialShape.socketPieceIds[0];
    const capsuleLayout = createJigsawWorldLayout({
      imageWidth: puzzle.asset.intrinsicWidth,
      imageHeight: puzzle.asset.intrinsicHeight,
      puzzleWidth: puzzle.width,
      puzzleHeight: puzzle.height,
    });
    const staged = stageJigsawAssemblyPlacements(
      capsuleLayout,
      puzzle.tiles,
      { joinedComponents: [[socketId, capsule.id]] },
      { width: 760, height: 560 },
    );
    const stagedById = new Map(staged.map((placement) => [placement.id, placement] as const));

    for (const pieceId of [socketId, capsule.id]) {
      const piece = puzzle.tiles.find((candidate) => candidate.id === pieceId)!;
      const placement = stagedById.get(pieceId)!;
      const size = getJigsawPieceWorldSize(capsuleLayout, piece);
      expect(placement.worldX).toBeGreaterThanOrEqual(0);
      expect(placement.worldY).toBeGreaterThanOrEqual(0);
      expect(placement.worldX + size.width).toBeLessThanOrEqual(capsuleLayout.worldWidth);
      expect(placement.worldY + size.height).toBeLessThanOrEqual(capsuleLayout.worldHeight);
    }

    const socket = puzzle.tiles.find((piece) => piece.id === socketId)!;
    const capsulePlacement = stagedById.get(capsule.id)!;
    const socketPlacement = stagedById.get(socketId)!;
    const capsuleTranslation = getTranslationForLayout(capsuleLayout, capsulePlacement, capsule);
    const socketTranslation = getTranslationForLayout(capsuleLayout, socketPlacement, socket);
    expect(capsuleTranslation.x).toBeCloseTo(socketTranslation.x);
    expect(capsuleTranslation.y).toBeCloseTo(socketTranslation.y);
  });

  it("does not treat correct absolute board placement as progress", () => {
    const placements = [
      placementAtTranslation(pieces[0]!, 0, 0),
      placementAtTranslation(pieces[1]!, 200, 0),
      placementAtTranslation(pieces[2]!, 200, 0),
      placementAtTranslation(pieces[3]!, 200, 0),
    ];
    const result = resolveJigsawComponentDrop(
      layout,
      pieces,
      placements,
      { joinedComponents: [] },
      "tile-0",
    );

    expect(result.joined).toBe(false);
    expect(result.assembly).toEqual({ joinedComponents: [] });
  });
});
