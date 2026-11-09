import { describe, expect, it } from "vitest";
import {
  applyJigsawCameraTransform,
  applyJigsawDragOffset,
  resetJigsawDragOffset,
} from "./JigsawImperativeRenderer";

const makeDragTarget = () => {
  let translate = "";
  let writes = 0;
  return {
    target: {
      style: {
        transform: "translate(var(--jigsaw-piece-x), var(--jigsaw-piece-y))",
        get translate() { return translate; },
        set translate(value: string) { translate = value; writes++; },
      },
    },
    get translate() { return translate; },
    get writes() { return writes; },
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

  it("moves the island independently of inherited SVG properties and skips unchanged frames", () => {
    const first = makeDragTarget();
    const second = makeDragTarget();

    applyJigsawDragOffset([first.target, second.target], 14.5, -8);
    expect(first.translate).toBe("14.5px -8px");
    expect(second.translate).toBe("14.5px -8px");
    applyJigsawDragOffset([first.target, second.target], 14.5, -8);
    expect(first.writes).toBe(1);
    expect(second.writes).toBe(1);
    applyJigsawDragOffset([first.target], 15, -8);
    expect(first.translate).toBe("15px -8px");
    expect(first.writes).toBe(2);
  });

  it("resets the temporary translate while retaining the canonical CSS transform", () => {
    const member = makeDragTarget();
    // The settled transform is a separate styling channel, so it remains
    // untouched by active drag movement or by the release reset.
    applyJigsawDragOffset([member.target], 14, 9);
    resetJigsawDragOffset([member.target]);
    expect(member.translate).toBe("");
    expect(member.target.style.transform).toBe("translate(var(--jigsaw-piece-x), var(--jigsaw-piece-y))");
    expect(member.writes).toBe(2);
    resetJigsawDragOffset([member.target]);
    expect(member.writes).toBe(2); // Already at rest: no DOM mutation.
  });
});
