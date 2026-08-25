import {
  panJigsawCamera,
  zoomJigsawCameraAtPoint,
  type JigsawCamera,
  type JigsawViewport,
  type JigsawWorldLayout,
} from "./placement";

export type JigsawPinchPoint = {
  x: number;
  y: number;
};

export type JigsawPinchPair = readonly [JigsawPinchPoint, JigsawPinchPoint];

const getPinchCentroid = ([first, second]: JigsawPinchPair): JigsawPinchPoint => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

const getPinchDistance = ([first, second]: JigsawPinchPair) =>
  Math.hypot(second.x - first.x, second.y - first.y);

export const getJigsawPinchCamera = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  startCamera: JigsawCamera,
  startPoints: JigsawPinchPair,
  currentPoints: JigsawPinchPair,
): JigsawCamera => {
  const startDistance = getPinchDistance(startPoints);
  if (startDistance < 1) return startCamera;

  const startCentroid = getPinchCentroid(startPoints);
  const currentCentroid = getPinchCentroid(currentPoints);
  const currentDistance = getPinchDistance(currentPoints);
  const zoomed = zoomJigsawCameraAtPoint(
    layout,
    viewport,
    startCamera,
    startCamera.zoom * (currentDistance / startDistance),
    startCentroid.x,
    startCentroid.y,
  );

  return panJigsawCamera(
    layout,
    viewport,
    zoomed,
    startCentroid.x - currentCentroid.x,
    startCentroid.y - currentCentroid.y,
  );
};
