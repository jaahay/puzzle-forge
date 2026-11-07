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
import { getJigsawIslandStackOrder, initializeOrPreserveJigsawCamera, resolveJigsawCameraForViewportResize } from "./JigsawPreviewModel";

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

describe("Jigsaw settled island layer order", () => {
  const island = (...indices: number[]) =>
    ({ members: indices.map((currentIndex) => ({ piece: { currentIndex } })) }) as unknown as
      Parameters<typeof getJigsawIslandStackOrder>[0];

  it("places loose pieces above joined islands, with larger joins behind smaller joins", () => {
    const pieceCount = 64;
    const loose = getJigsawIslandStackOrder(island(0), pieceCount, false, false);
    const laterLoose = getJigsawIslandStackOrder(island(63), pieceCount, false, false);
    const joined = getJigsawIslandStackOrder(island(61, 62), pieceCount, false, false);
    const larger = getJigsawIslandStackOrder(island(0, 1, 63), pieceCount, false, false);
    expect(laterLoose).toBeGreaterThan(loose);
    expect(loose).toBeGreaterThan(joined);
    expect(joined).toBeGreaterThan(larger);
  });

  it("keeps anchored islands above the board but below free pieces", () => {
    const anchored = getJigsawIslandStackOrder(island(63), 64, false, true);
    const joined = getJigsawIslandStackOrder(island(1, 2, 3), 64, false, false);
    expect(anchored).toBeGreaterThan(2); // The assembly board is layer 2.
    expect(anchored).toBeLessThan(joined);
  });

  it("lifts only the active drag, settling immediately after release", () => {
    const loose = getJigsawIslandStackOrder(island(63), 64, false, false);
    const dragging = getJigsawIslandStackOrder(island(1, 2, 3), 64, true, false);
    const afterDrop = getJigsawIslandStackOrder(island(1, 2, 3), 64, false, false);
    expect(dragging).toBeGreaterThan(loose);
    expect(afterDrop).toBeLessThan(loose);
  });
});
