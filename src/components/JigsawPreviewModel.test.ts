import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../catalog/types";
import {
  createInitialJigsawPlacements,
  createJigsawOccupiedFitCamera,
  createJigsawWorkingFitCamera,
  createJigsawWorldLayout,
  getJigsawCameraTransform,
  getJigsawOccupiedBounds,
} from "../games/jigsaw/placement";
import { findJigsawDragHoverIsland, findJigsawDragHoverIslandAtWorldPoint, getJigsawIslandStackOrder, initializeOrPreserveJigsawCamera, resolveJigsawCameraForViewportResize } from "./JigsawPreviewModel";

describe("Jigsaw initial All pieces view", () => {
  it.each([
    { imageWidth: 1200, imageHeight: 1200, columns: 4, rows: 4, viewport: { width: 390, height: 844 } },
    { imageWidth: 1900, imageHeight: 800, columns: 8, rows: 8, viewport: { width: 390, height: 844 } },
    { imageWidth: 800, imageHeight: 1900, columns: 7, rows: 9, viewport: { width: 390, height: 844 } },
  ])("initializes the whole table for $columns x $rows pieces", ({ imageWidth, imageHeight, columns, rows, viewport }) => {
    const layout = createJigsawWorldLayout({ imageWidth, imageHeight, puzzleWidth: columns, puzzleHeight: rows });
    const pieces: JigsawPiece[] = Array.from({ length: columns * rows }, (_, index) => ({
      id: `tile-${index}`,
      currentIndex: index,
      solvedIndex: index,
      column: index % columns,
      row: Math.floor(index / columns),
      edges: [],
    }));
    const placements = createInitialJigsawPlacements(layout, pieces, viewport);
    const camera = initializeOrPreserveJigsawCamera(layout, viewport, null, placements, pieces);
    const all = createJigsawOccupiedFitCamera(layout, viewport, placements, 28, {}, pieces);
    const work = createJigsawWorkingFitCamera(layout, viewport, placements, 28, {}, pieces);
    expect(camera).toEqual(all);
    expect(camera.zoom).toBeLessThanOrEqual(work.zoom);
    const bounds = getJigsawOccupiedBounds(layout, placements, pieces);
    const transform = getJigsawCameraTransform(camera, viewport);
    expect(bounds.x * transform.scale + transform.translateX).toBeGreaterThanOrEqual(27.9);
    expect(bounds.y * transform.scale + transform.translateY).toBeGreaterThanOrEqual(27.9);
    expect((bounds.x + bounds.width) * transform.scale + transform.translateX).toBeLessThanOrEqual(viewport.width - 27.9);
    expect((bounds.y + bounds.height) * transform.scale + transform.translateY).toBeLessThanOrEqual(viewport.height - 27.9);
    expect(initializeOrPreserveJigsawCamera(layout, viewport, camera, placements, pieces)).toBe(camera);
    const resized = { width: 430, height: 932 };
    expect(resolveJigsawCameraForViewportResize(layout, resized, placements, camera, false, {}, pieces, true))
      .toEqual(createJigsawOccupiedFitCamera(layout, resized, placements, 28, {}, pieces));
    expect(resolveJigsawCameraForViewportResize(layout, resized, placements, camera, true, {}, pieces, true))
      .toBe(camera);
  });
});

describe("Jigsaw selection and settled layer order", () => {
  const piece = (currentIndex: number) => ({ piece: { currentIndex } });
  const layer = (indices: number[]) =>
    ({ members: indices.map(piece) }) as unknown as Parameters<typeof getJigsawIslandStackOrder>[0];

  it("settles joined islands behind loose pieces, larger joins behind smaller joins", () => {
    const count = 64;
    const loose = getJigsawIslandStackOrder(layer([0]), count, false, false, false);
    const highLoose = getJigsawIslandStackOrder(layer([63]), count, false, false, false);
    const pair = getJigsawIslandStackOrder(layer([61, 62]), count, false, false, false);
    const triple = getJigsawIslandStackOrder(layer([0, 1, 63]), count, false, false, false);
    expect(highLoose).toBeGreaterThan(loose);
    expect(loose).toBeGreaterThan(pair);
    expect(pair).toBeGreaterThan(triple);
    expect(getJigsawIslandStackOrder(layer([63]), count, false, false, true))
      .toBeGreaterThan(2); // The board occupies z-index 2.
    expect(getJigsawIslandStackOrder(layer([63]), count, false, false, true))
      .toBeLessThan(triple);
    expect(getJigsawIslandStackOrder(layer([0, 1, 63]), count, false, true, false))
      .toBeGreaterThan(highLoose);
    expect(getJigsawIslandStackOrder(layer([0, 1, 63]), count, true, true, false))
      .toBeGreaterThan(getJigsawIslandStackOrder(layer([0]), count, false, true, false));
  });

  const positioned = (
    key: string, worldX: number, worldY: number, currentIndex: number,
    column = 0, row = 0,
  ) => ({
    key, worldX, worldY, minColumn: column, minRow: row,
    widthCells: 1, heightCells: 1,
    members: [{ piece: { id: key, currentIndex, column, row }, span: { width: 1, height: 1 } }],
  }) as unknown as Parameters<typeof findJigsawDragHoverIslandAtWorldPoint>[0][number];

  it("tests cached outlines rather than treating overlapping bounds as solid", () => {
    const low = positioned("low", 10, 20, 1);
    const high = positioned("high", 10, 20, 8);
    const calls: string[] = [];
    const hit = (id: string, x: number, y: number) => {
      calls.push(id);
      return x >= 20 && x <= 80 && y >= 20 && y <= 80 && id !== "high";
    };
    expect(findJigsawDragHoverIslandAtWorldPoint(
      [low, high], { x: 60, y: 60 }, null,
      { pieceWidth: 100, pieceHeight: 100 }, new Set(), 20, hit,
    )).toBe("low");
    expect(calls).toContain("high");
    expect(findJigsawDragHoverIslandAtWorldPoint(
      [low, high], { x: 15, y: 25 }, null,
      { pieceWidth: 100, pieceHeight: 100 }, new Set(), 20, hit,
    )).toBeNull();
    expect(findJigsawDragHoverIslandAtWorldPoint(
      [low, high], { x: 60, y: 60 }, "low",
      { pieceWidth: 100, pieceHeight: 100 }, new Set(), 20, hit,
    )).toBeNull();
  });

  it("projects joined-member outlines into island-local coordinates and honors layer order", () => {
    const joined = {
      ...positioned("joined", 40, 80, 2, 3, 2),
      widthCells: 2,
      members: [
        { piece: { id: "left", currentIndex: 2, column: 3, row: 2 }, span: { width: 1, height: 1 } },
        { piece: { id: "right", currentIndex: 3, column: 4, row: 2 }, span: { width: 1, height: 1 } },
      ],
    } as unknown as Parameters<typeof findJigsawDragHoverIslandAtWorldPoint>[0][number];
    const local: { id: string; x: number; y: number }[] = [];
    const test = (id: string, x: number, y: number) => {
      local.push({ id, x, y });
      return id === "right" && Math.abs(x - 20) < 0.001 && Math.abs(y - 25) < 0.001;
    };
    expect(findJigsawDragHoverIslandAtWorldPoint(
      [joined], { x: 160, y: 105 }, null,
      { pieceWidth: 100, pieceHeight: 100 }, new Set(), 100, test,
    )).toBe("joined");
    expect(local.some(({ id, x, y }) => id === "right" && Math.abs(x - 20) < 0.001 && Math.abs(y - 25) < 0.001)).toBe(true);

    const loose = positioned("loose", 40, 80, 50);
    const all = [joined, loose];
    expect(findJigsawDragHoverIslandAtWorldPoint(
      all, { x: 60, y: 100 }, null,
      { pieceWidth: 100, pieceHeight: 100 }, new Set(["loose"]), 100,
      (_id, x, y) => x >= 0 && x <= 100 && y >= 0 && y <= 100,
    )).toBe("joined"); // An anchored loose island is behind a free joined island.
    expect(findJigsawDragHoverIslandAtWorldPoint(
      all, { x: 60, y: 100 }, null,
      { pieceWidth: 100, pieceHeight: 100 }, new Set(), 100,
      (_id, x, y) => x >= 0 && x <= 100 && y >= 0 && y <= 100,
    )).toBe("loose");
  });

  it("discovers an underlying island through the dragged hit target, not empty bounds", () => {
    const source = {} as Element;
    const target = {} as HTMLElement;
    const outside = {} as HTMLElement;
    const hit = (island: Element | null, isPiece = true) => ({
      matches: (selector: string) => isPiece && selector === ".tile-puzzle-piece-hit-target",
      closest: () => island,
    }) as unknown as Element;
    const stage = { contains: (element: Element) => element === source || element === target } as Element;
    expect(findJigsawDragHoverIsland(
      [hit(source), hit(outside), hit(target)], source, stage,
    )).toBe(target);
    expect(findJigsawDragHoverIsland([hit(source), hit(target, false)], source, stage)).toBeNull();
    expect(findJigsawDragHoverIsland([hit(outside)], source, stage)).toBeNull();
  });
});
