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
import { initializeOrPreserveJigsawCamera, resolveJigsawCameraForViewportResize } from "./JigsawPreviewModel";

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
