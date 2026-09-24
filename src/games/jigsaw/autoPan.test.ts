import { describe, expect, it } from "vitest";
import { advanceJigsawEdgePanCamera, getJigsawEdgePanVelocity } from "./autoPan";
import {
  createJigsawFitCamera,
  createJigsawWorldLayout,
  getJigsawCameraTransform,
  screenToJigsawWorld,
} from "./placement";

const layout = createJigsawWorldLayout({
  imageWidth: 1600,
  imageHeight: 1200,
  puzzleWidth: 11,
  puzzleHeight: 9,
});

const viewport = { width: 1000, height: 650 };

describe("Jigsaw edge auto-pan", () => {
  it("stays idle away from every edge", () => {
    expect(getJigsawEdgePanVelocity({ x: 500, y: 325 }, viewport)).toEqual({ x: 0, y: 0 });
  });

  it("ramps velocity toward the nearest edge and supports diagonal motion", () => {
    const near = getJigsawEdgePanVelocity({ x: 40, y: 40 }, viewport);
    const atEdge = getJigsawEdgePanVelocity({ x: 0, y: 0 }, viewport);
    const opposite = getJigsawEdgePanVelocity({ x: 1000, y: 650 }, viewport);

    expect(near.x).toBeLessThan(0);
    expect(near.y).toBeLessThan(0);
    expect(Math.abs(atEdge.x)).toBeGreaterThan(Math.abs(near.x));
    expect(Math.abs(atEdge.y)).toBeGreaterThan(Math.abs(near.y));
    expect(opposite.x).toBeGreaterThan(0);
    expect(opposite.y).toBeGreaterThan(0);
  });

  it("uses elapsed time rather than animation-frame count", () => {
    const camera = createJigsawFitCamera(layout, viewport, "board");
    const pointer = { x: viewport.width - 1, y: viewport.height / 2 };

    const oneStep = advanceJigsawEdgePanCamera(layout, viewport, camera, pointer, 16);
    const firstHalf = advanceJigsawEdgePanCamera(layout, viewport, camera, pointer, 8);
    const twoHalves = advanceJigsawEdgePanCamera(layout, viewport, firstHalf, pointer, 8);

    expect(twoHalves.centerX).toBeCloseTo(oneStep.centerX, 8);
    expect(twoHalves.centerY).toBeCloseTo(oneStep.centerY, 8);
  });

  it("caps a stalled frame instead of jumping across the workspace", () => {
    const camera = createJigsawFitCamera(layout, viewport, "board");
    const pointer = { x: viewport.width - 1, y: viewport.height / 2 };

    const capped = advanceJigsawEdgePanCamera(layout, viewport, camera, pointer, 500);
    const fiftyMilliseconds = advanceJigsawEdgePanCamera(layout, viewport, camera, pointer, 50);

    expect(capped).toEqual(fiftyMilliseconds);
  });

  it("keeps edge zones usable on narrow viewports", () => {
    const narrowViewport = { width: 120, height: 180 };

    expect(getJigsawEdgePanVelocity({ x: 29, y: 90 }, narrowViewport).x).toBeLessThan(0);
    expect(getJigsawEdgePanVelocity({ x: 31, y: 90 }, narrowViewport).x).toBe(0);
    expect(getJigsawEdgePanVelocity({ x: 91, y: 90 }, narrowViewport).x).toBeGreaterThan(0);
  });

  it("allows a dragged anchor to remain under a stationary pointer while the camera moves", () => {
    const camera = createJigsawFitCamera(layout, viewport, "board");
    const pointer = { x: viewport.width - 1, y: viewport.height / 2 };
    const offset = { x: 22, y: 17 };
    const nextCamera = advanceJigsawEdgePanCamera(layout, viewport, camera, pointer, 16);
    const worldPoint = screenToJigsawWorld(nextCamera, viewport, pointer.x, pointer.y);
    const piecePosition = {
      x: worldPoint.x - offset.x,
      y: worldPoint.y - offset.y,
    };
    const transform = getJigsawCameraTransform(nextCamera, viewport);

    const renderedAnchor = {
      x: (piecePosition.x + offset.x) * transform.scale + transform.translateX,
      y: (piecePosition.y + offset.y) * transform.scale + transform.translateY,
    };

    expect(renderedAnchor.x).toBeCloseTo(pointer.x, 8);
    expect(renderedAnchor.y).toBeCloseTo(pointer.y, 8);
  });
});
