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
import { findJigsawDragHoverIsland, getJigsawIslandStackOrder, initializeOrPreserveJigsawCamera, resolveJigsawCameraForViewportResize } from "./JigsawPreviewModel";

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
