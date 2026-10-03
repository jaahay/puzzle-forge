import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const previewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const jigsawCss = readFileSync(new URL("../site/jigsaw.css", import.meta.url), "utf8");

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
      "const renderDraggedPieceImmediately =",
      "const beginPan =",
    );

    expect(renderCamera).toContain("state = wheelStateRef.current");
    expect(renderCamera).toContain("applyJigsawCameraTransform(worldLayer, state.camera, state.viewport)");
    expect(dragLoop).toContain("state = wheelStateRef.current");
    expect(dragLoop).toContain("projectJigsawDragAction(");
    expect(dragLoop).toContain("state.layout");
    expect(dragLoop).toContain("state.camera");
    expect(dragLoop).toContain("state.viewport");
    expect(dragLoop).toContain("renderCameraImmediately(wheelStateRef.current)");
    expect(dragLoop).toContain("renderDraggedPieceImmediately(drag, wheelStateRef.current)");
  });

  it("keeps canonical and transient piece motion on separate ownership channels", () => {
    const beginDrag = sourceBetween(
      previewSource,
      "const beginDrag =",
      "const moveDrag =",
    );
    const dragLoop = sourceBetween(
      previewSource,
      "const renderDraggedPieceImmediately =",
      "const beginPan =",
    );

    expect(previewSource).toContain('"--jigsaw-piece-x":');
    expect(previewSource).toContain('"--jigsaw-piece-y":');
    expect(dragLoop).toContain("applyJigsawDragOffset(drag.pieceElements, projection.dragX, projection.dragY)");
    expect(dragLoop).not.toContain(".style.transform");
    expect(beginDrag).toContain("const pieceElements = pieceIds.flatMap");
    expect(beginDrag).toContain("resetJigsawDragOffset(pieceElements)");
    expect(beginDrag).toContain("puzzleId: puzzle.id");
    expect(previewSource).toContain("activeDrag?.puzzleId === puzzle.id");

    expect(jigsawCss).toContain("calc(var(--jigsaw-piece-x, 0px) + var(--jigsaw-active-drag-x))");
    expect(jigsawCss).toContain("calc(var(--jigsaw-piece-y, 0px) + var(--jigsaw-active-drag-y))");
    expect(jigsawCss).toContain(".tile-puzzle-piece.dragging");
    expect(jigsawCss).toContain("--jigsaw-active-drag-x: var(--jigsaw-drag-x, 0px)");
    expect(jigsawCss).toContain("--jigsaw-active-drag-y: var(--jigsaw-drag-y, 0px)");
  });

  it("removes transient drag influence on every interaction termination path", () => {
    const pinchStart = sourceBetween(
      previewSource,
      "const beginTouchPinch =",
      "const moveTouchPinch =",
    );
    const finishDrag = sourceBetween(
      previewSource,
      "const finishDrag =",
      "const cancelDrag =",
    );
    const cancelDrag = sourceBetween(
      previewSource,
      "const cancelDrag =",
      "const beginPan =",
    );
    const staging = sourceBetween(
      previewSource,
      "const applyStagedPlacements =",
      "const resetPieces =",
    );

    expect(pinchStart).toContain("setActiveTileId(null)");
    expect(finishDrag).toContain("setActiveTileId(null)");
    expect(cancelDrag).toContain("setActiveTileId(null)");
    expect(staging).toContain("setActiveTileId(null)");
  });

  it("quarantines transient drag work to the originating puzzle instance", () => {
    const pinchStart = sourceBetween(
      previewSource,
      "const beginTouchPinch =",
      "const moveTouchPinch =",
    );
    const dragLoop = sourceBetween(
      previewSource,
      "const runDragAnimationFrame =",
      "const beginPan =",
    );
    const stagingBaseline = sourceBetween(
      previewSource,
      "const getStagingActionBaseline =",
      "const applyStagedPlacements =",
    );

    expect(previewSource).toContain("dragRef.current?.puzzleId === puzzle.id");
    expect(stagingBaseline).toContain("dragRef.current?.puzzleId === puzzle.id ? dragRef.current : null");
    expect(pinchStart).toContain("dragRef.current?.puzzleId === puzzle.id ? dragRef.current : null");
    expect(dragLoop).toContain("drag.puzzleId !== current.puzzleId");
    expect(dragLoop).toContain("drag.puzzleId !== puzzle.id");
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
