import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const previewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");

const sourceBetween = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThan(-1);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};

describe("Jigsaw auto-pan controller boundary", () => {
  it("projects drag and camera rendering from the live interaction viewport", () => {
    const renderCamera = sourceBetween(
      previewSource,
      "const renderCameraImmediately =",
      "const beginTouchPinch =",
    );
    const dragLoop = sourceBetween(
      previewSource,
      "const getPointerPlacement =",
      "const beginPan =",
    );

    expect(renderCamera).toContain("state = wheelStateRef.current");
    expect(renderCamera).toContain("getJigsawCameraTransform(state.camera, state.viewport)");
    expect(dragLoop).toContain("state = wheelStateRef.current");
    expect(dragLoop).toContain("screenToJigsawWorld(state.camera, state.viewport");
    expect(dragLoop).toContain("state.layout");
    expect(dragLoop).toContain("renderCameraImmediately(wheelStateRef.current)");
    expect(dragLoop).toContain("renderDraggedPieceImmediately(drag, wheelStateRef.current)");
  });

  it("settles imperative piece rendering before every drag termination handoff", () => {
    const pinchStart = sourceBetween(
      previewSource,
      "const beginTouchPinch =",
      "const moveTouchPinch =",
    );
    const dragLoop = sourceBetween(
      previewSource,
      "const settleDraggedPieceImmediately =",
      "const beginPan =",
    );
    const scatter = sourceBetween(
      previewSource,
      "const scatterPieces =",
      "useEffect(() => {",
    );

    expect(pinchStart).toContain("settleDraggedPieceImmediately(interruptedDrag, startPlacement)");
    expect(dragLoop).toContain("settleDraggedPieceImmediately(drag, startPlacement)");
    expect(dragLoop).toContain("settleDraggedPieceImmediately(drag, nextPlacement)");
    expect(scatter).toContain("settleDraggedPieceImmediately(activeDrag, nextPlacement)");
  });

  it("derives keyboard and zoom camera commands from the live camera ref", () => {
    const controls = sourceBetween(
      previewSource,
      "const setZoomAtCenter =",
      "const previewStyle =",
    );

    expect(controls).toContain("getJigsawZoomStep(wheelStateRef.current.camera.zoom");
    expect(controls).toContain("zoomJigsawCameraAtPoint(\n      current.layout,\n      current.viewport,\n      current.camera");
    expect(controls).toContain(
      "panJigsawCamera(current.layout, current.viewport, current.camera, deltaX, deltaY)",
    );
  });
});
