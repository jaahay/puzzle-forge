import { describe, expect, it } from "vitest";
import { getJigsawWheelGesture, type JigsawWheelSample } from "./wheelInput";

const wheel = (options: Partial<JigsawWheelSample> = {}): JigsawWheelSample => ({
  deltaX: 0, deltaY: 120, deltaMode: 0,
  shiftKey: false, ctrlKey: false, metaKey: false,
  ...options,
});

describe("Jigsaw workspace wheel gestures", () => {
  it("zooms with ordinary vertical wheel movement, including trackpad scrolling", () => {
    expect(getJigsawWheelGesture(wheel(), 600)).toEqual({
      kind: "zoom", factor: Math.exp(-120 * 0.002),
    });
    expect(getJigsawWheelGesture(wheel({ deltaY: -120 }), 600)).toEqual({
      kind: "zoom", factor: Math.exp(120 * 0.002),
    });
  });

  it("respects line and page wheel units, preventing extreme one-event jumps", () => {
    expect(getJigsawWheelGesture(wheel({ deltaY: 3, deltaMode: 1 }), 600)).toEqual({
      kind: "zoom", factor: Math.exp(-48 * 0.002),
    });
    expect(getJigsawWheelGesture(wheel({ deltaY: 1, deltaMode: 2 }), 600)).toEqual({
      kind: "zoom", factor: Math.exp(-240 * 0.002),
    });
  });

  it("preserves horizontal trackpad or Shift-wheel panning without hijacking pinch zoom", () => {
    expect(getJigsawWheelGesture(wheel({ deltaX: 80, deltaY: 5 }), 600))
      .toEqual({ kind: "pan", deltaX: 80, deltaY: 0 });
    expect(getJigsawWheelGesture(wheel({ shiftKey: true, deltaY: 50 }), 600))
      .toEqual({ kind: "pan", deltaX: 50, deltaY: 0 });
    const pinch = getJigsawWheelGesture(wheel({ ctrlKey: true, deltaX: 80, deltaY: 5 }), 600);
    expect(pinch.kind).toBe("zoom");
    expect(getJigsawWheelGesture(wheel({ metaKey: true, shiftKey: true }), 600).kind).toBe("zoom");
  });
});
