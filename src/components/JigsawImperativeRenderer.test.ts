import { describe, expect, it } from "vitest";
import {
  applyJigsawCameraTransform,
  applyJigsawDragOffset,
  resetJigsawDragOffset,
} from "./JigsawImperativeRenderer";

const makeCssVariableTarget = () => {
  const values = new Map<string, string>();
  return {
    values,
    target: {
      style: {
        setProperty: (property: string, value: string) => values.set(property, value),
      },
    },
  };
};

describe("Jigsaw imperative renderer", () => {
  it("applies the camera projection directly to the world layer", () => {
    const target = { style: { transform: "" } };

    applyJigsawCameraTransform(
      target,
      { centerX: 100, centerY: 80, zoom: 2 },
      { width: 400, height: 300 },
    );

    expect(target.style.transform).toBe("translate3d(0px, -10px, 0) scale(2)");
  });

  it("applies one transient drag offset to every island member", () => {
    const first = makeCssVariableTarget();
    const second = makeCssVariableTarget();

    applyJigsawDragOffset([first.target, second.target], 14.5, -8);

    for (const values of [first.values, second.values]) {
      expect(values.get("--jigsaw-drag-x")).toBe("14.5px");
      expect(values.get("--jigsaw-drag-y")).toBe("-8px");
    }
  });

  it("resets transient drag offsets without touching canonical placement", () => {
    const member = makeCssVariableTarget();
    member.values.set("--jigsaw-piece-x", "120px");
    member.values.set("--jigsaw-piece-y", "75px");

    resetJigsawDragOffset([member.target]);

    expect(member.values.get("--jigsaw-drag-x")).toBe("0px");
    expect(member.values.get("--jigsaw-drag-y")).toBe("0px");
    expect(member.values.get("--jigsaw-piece-x")).toBe("120px");
    expect(member.values.get("--jigsaw-piece-y")).toBe("75px");
  });
});
