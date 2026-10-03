import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../../catalog/types";
import {
  beginJigsawDragAction,
  cancelJigsawDragAction,
  completeJigsawDragAction,
  projectJigsawDragAction,
} from "./dragAction";
import { makeEmptyJigsawHistoryState } from "./history";
import { createJigsawWorldLayout, getJigsawSolvedPosition } from "./placement";

const pieces: JigsawPiece[] = [
  {
    id: "tile-0",
    currentIndex: 0,
    solvedIndex: 0,
    row: 0,
    column: 0,
    edges: [],
  },
  {
    id: "tile-1",
    currentIndex: 1,
    solvedIndex: 1,
    row: 0,
    column: 1,
    edges: [],
  },
];

const layout = createJigsawWorldLayout({
  imageWidth: 800,
  imageHeight: 400,
  puzzleWidth: 2,
  puzzleHeight: 1,
});

const makeSnapshot = () => ({
  placements: pieces.map((piece) => {
    const solved = getJigsawSolvedPosition(layout, piece);
    return {
      id: piece.id,
      worldX: solved.left + 120,
      worldY: solved.top + 90,
    };
  }),
  assembly: { joinedComponents: [] },
});

describe("Jigsaw drag action", () => {
  it("captures one defensive pre-drag snapshot and pointer offset", () => {
    const snapshot = makeSnapshot();
    const origin = snapshot.placements[0]!;
    const drag = beginJigsawDragAction({
      puzzleId: "jigsaw-1",
      tileId: "tile-0",
      pieceIds: ["tile-0"],
      pointerId: 7,
      camera: { centerX: 400, centerY: 300, zoom: 1 },
      viewport: { width: 800, height: 600 },
      stagePoint: { x: origin.worldX, y: origin.worldY },
      origin: { left: origin.worldX, top: origin.worldY },
      snapshot,
      clientX: 100,
      clientY: 120,
    });

    snapshot.placements[0]!.worldX += 999;
    expect(drag.startSnapshot.placements[0]!.worldX).not.toBe(snapshot.placements[0]!.worldX);
    expect(drag.pieceIds).toEqual(["tile-0"]);
  });

  it("projects pointer motion from the live camera without mutating canonical state", () => {
    const snapshot = makeSnapshot();
    const origin = snapshot.placements[0]!;
    const camera = { centerX: 400, centerY: 300, zoom: 1 };
    const viewport = { width: 800, height: 600 };
    const drag = beginJigsawDragAction({
      puzzleId: "jigsaw-1",
      tileId: "tile-0",
      pieceIds: ["tile-0"],
      pointerId: 7,
      camera,
      viewport,
      stagePoint: { x: 200, y: 200 },
      origin: { left: origin.worldX, top: origin.worldY },
      snapshot,
      clientX: 200,
      clientY: 200,
    });

    const before = structuredClone(drag.startSnapshot);
    const projection = projectJigsawDragAction(
      layout,
      { ...camera, centerX: camera.centerX + 20 },
      viewport,
      { x: 240, y: 210 },
      drag,
    );

    expect(projection).not.toBeNull();
    expect(projection?.placements[0]).not.toEqual(drag.startSnapshot.placements[0]);
    expect(drag.startSnapshot).toEqual(before);
  });

  it("commits one completed drag to history and cancel restores the start snapshot", () => {
    const snapshot = makeSnapshot();
    const origin = snapshot.placements[0]!;
    const drag = beginJigsawDragAction({
      puzzleId: "jigsaw-1",
      tileId: "tile-0",
      pieceIds: ["tile-0"],
      pointerId: 7,
      camera: { centerX: 400, centerY: 300, zoom: 1 },
      viewport: { width: 800, height: 600 },
      stagePoint: { x: 200, y: 200 },
      origin: { left: origin.worldX, top: origin.worldY },
      snapshot,
      clientX: 200,
      clientY: 200,
    });
    const moved = drag.startSnapshot.placements.map((placement) => ({
      ...placement,
      worldX: placement.id === "tile-0" ? placement.worldX + 40 : placement.worldX,
    }));

    const completed = completeJigsawDragAction(
      layout,
      pieces,
      makeEmptyJigsawHistoryState(),
      moved,
      drag,
    );

    expect(completed.history.undoStack).toHaveLength(1);
    expect(completed.history.undoStack[0]).toEqual(drag.startSnapshot);
    expect(completed.snapshot.placements[0]!.worldX)
      .toBeGreaterThan(drag.startSnapshot.placements[0]!.worldX);
    expect(cancelJigsawDragAction(drag)).toEqual(drag.startSnapshot);
    expect(cancelJigsawDragAction(drag)).not.toBe(drag.startSnapshot);
  });
});
