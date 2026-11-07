/**
 * Wheel input is local to the Jigsaw stage. A vertical wheel gesture zooms at
 * the pointer; Shift+wheel or predominantly horizontal trackpad motion pans.
 * Ctrl/Meta wheel (browser trackpad pinch) always zooms.
 */
export type JigsawWheelGesture =
  | { kind: "zoom"; factor: number }
  | { kind: "pan"; deltaX: number; deltaY: number };

export type JigsawWheelSample = {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
};

const asPixels = (delta: number, deltaMode: number, viewportHeight: number): number => {
  const unit = deltaMode === 1 ? 16 : deltaMode === 2 ? viewportHeight : 1;
  return delta * unit;
};

export const getJigsawWheelGesture = (
  sample: JigsawWheelSample,
  viewportHeight: number,
): JigsawWheelGesture => {
  const dx = asPixels(sample.deltaX, sample.deltaMode, viewportHeight);
  const dy = asPixels(sample.deltaY, sample.deltaMode, viewportHeight);
  if (!sample.ctrlKey && !sample.metaKey &&
      (sample.shiftKey || Math.abs(dx) > Math.abs(dy) * 1.5)) {
    return { kind: "pan", deltaX: sample.shiftKey ? (dx || dy) : dx, deltaY: 0 };
  }
  const normalized = Math.min(240, Math.max(-240, dy));
  return { kind: "zoom", factor: Math.exp(-normalized * 0.002) };
};
