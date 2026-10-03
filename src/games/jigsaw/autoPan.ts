import {
  panJigsawCamera,
  type JigsawCamera,
  type JigsawViewport,
  type JigsawWorldLayout,
} from "./placement";

const edgePanZoneMaximum = 56;
const edgePanMaximumSpeed = 720;
const edgePanViewportSpeedsPerSecond = 1.5;
const edgePanFrameCatchUpLimitMs = 50;

type ScreenPoint = {
  x: number;
  y: number;
};

export type JigsawEdgePanVelocity = ScreenPoint;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const getAxisEdgePanVelocity = (position: number, extent: number) => {
  if (!Number.isFinite(position) || !Number.isFinite(extent) || extent <= 0) return 0;

  const zone = Math.min(edgePanZoneMaximum, extent * 0.25);
  if (zone <= 0) return 0;

  const maximumSpeed = Math.min(edgePanMaximumSpeed, extent * edgePanViewportSpeedsPerSecond);
  if (position < zone) {
    const strength = clamp((zone - position) / zone, 0, 1);
    return -maximumSpeed * strength;
  }
  if (position > extent - zone) {
    const strength = clamp((position - (extent - zone)) / zone, 0, 1);
    return maximumSpeed * strength;
  }
  return 0;
};

export const getJigsawEdgePanVelocity = (
  pointer: ScreenPoint,
  viewport: JigsawViewport,
): JigsawEdgePanVelocity => ({
  x: getAxisEdgePanVelocity(pointer.x, viewport.width),
  y: getAxisEdgePanVelocity(pointer.y, viewport.height),
});

export const advanceJigsawEdgePanCamera = (
  layout: JigsawWorldLayout,
  viewport: JigsawViewport,
  camera: JigsawCamera,
  pointer: ScreenPoint,
  elapsedMs: number,
): JigsawCamera => {
  const velocity = getJigsawEdgePanVelocity(pointer, viewport);
  if ((!velocity.x && !velocity.y) || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return camera;

  const elapsedSeconds = Math.min(elapsedMs, edgePanFrameCatchUpLimitMs) / 1000;
  return panJigsawCamera(
    layout,
    viewport,
    camera,
    velocity.x * elapsedSeconds,
    velocity.y * elapsedSeconds,
  );
};
