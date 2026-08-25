import { describe, expect, it } from "vitest";
import { createJigsawWorldLayout, screenToJigsawWorld } from "./placement";
import { getJigsawPinchCamera } from "./pinch";

const layout = createJigsawWorldLayout({
  imageWidth: 2048,
  imageHeight: 1536,
  puzzleWidth: 10,
  puzzleHeight: 8,
});
const viewport = { width: 1200, height: 800 };
const camera = {
  centerX: layout.worldWidth / 2,
  centerY: layout.worldHeight / 2,
  zoom: 0.5,
};

describe("Jigsaw touch pinch camera", () => {
  it("scales around the pinch centroid", () => {
    const nextCamera = getJigsawPinchCamera(
      layout,
      viewport,
      camera,
      [{ x: 500, y: 400 }, { x: 700, y: 400 }],
      [{ x: 400, y: 400 }, { x: 800, y: 400 }],
    );

    expect(nextCamera.zoom).toBeCloseTo(1);
    expect(nextCamera.centerX).toBeCloseTo(camera.centerX);
    expect(nextCamera.centerY).toBeCloseTo(camera.centerY);
  });

  it("keeps the original world anchor under a moving pinch centroid", () => {
    const startCentroid = { x: 600, y: 400 };
    const currentCentroid = { x: 660, y: 445 };
    const worldAnchor = screenToJigsawWorld(camera, viewport, startCentroid.x, startCentroid.y);
    const nextCamera = getJigsawPinchCamera(
      layout,
      viewport,
      camera,
      [{ x: 500, y: 400 }, { x: 700, y: 400 }],
      [{ x: 510, y: 445 }, { x: 810, y: 445 }],
    );
    const currentWorld = screenToJigsawWorld(
      nextCamera,
      viewport,
      currentCentroid.x,
      currentCentroid.y,
    );

    expect(nextCamera.zoom).toBeCloseTo(0.75);
    expect(currentWorld.x).toBeCloseTo(worldAnchor.x);
    expect(currentWorld.y).toBeCloseTo(worldAnchor.y);
  });

  it("ignores an unusably small initial pinch distance", () => {
    expect(getJigsawPinchCamera(
      layout,
      viewport,
      camera,
      [{ x: 600, y: 400 }, { x: 600.5, y: 400 }],
      [{ x: 500, y: 400 }, { x: 700, y: 400 }],
    )).toBe(camera);
  });
});
