import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const previewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const islandVisualSource = readFileSync(new URL("./JigsawIslandVisual.tsx", import.meta.url), "utf8");
const jigsawCss = readFileSync(new URL("../site/jigsaw.css", import.meta.url), "utf8");

describe("Jigsaw auto-pan controller boundary", () => {
  it("keeps live camera and drag projection behind explicit controller/renderer boundaries", () => {
    expect(previewSource).toContain("advanceJigsawEdgePanCamera(");
    expect(previewSource).toContain("applyJigsawCameraTransform(");
    expect(previewSource).toContain("projectJigsawDragAction(");
    expect(previewSource).toContain("applyJigsawDragOffset(");
    expect(previewSource).toContain("resetJigsawDragOffset(");
    expect(previewSource).not.toContain('style.setProperty("--jigsaw-drag-x"');
    expect(previewSource).not.toContain("worldLayer.style.transform =");
  });

  it("keeps canonical and transient piece motion on separate styling channels", () => {
    expect(islandVisualSource).toContain('"--jigsaw-piece-x":');
    expect(islandVisualSource).toContain('"--jigsaw-piece-y":');

    expect(jigsawCss).toContain(".jigsaw-island {");
    expect(jigsawCss).toContain("transform: translate(");
    expect(jigsawCss).toContain("var(--jigsaw-piece-x, 0px)");
    expect(jigsawCss).toContain("var(--jigsaw-piece-y, 0px)");
    expect(jigsawCss).not.toContain("--jigsaw-active-drag-x");
    expect(jigsawCss).toContain("drag motion uses style.translate");
    expect(jigsawCss).toContain(".tile-puzzle-piece {");
    expect(jigsawCss).toContain("Hit targets need a local translation");
    expect(jigsawCss).not.toContain("transform: translate3d(\n    var(--jigsaw-piece-x, 0px)");
    expect(jigsawCss).toContain("var(--jigsaw-piece-x, 0px)");
    expect(jigsawCss).toContain("var(--jigsaw-piece-y, 0px)");
    expect(previewSource).toContain("projectJigsawDragOffset(");
    expect(previewSource).toContain("islandElement");
    expect(previewSource).toContain("endDragPresentation(drag)");
    expect(previewSource).toContain("positionJigsawVisualIslands(");
    expect(previewSource).toContain("reconcileJigsawVisualScene(");
    expect(islandVisualSource).toContain("export const JigsawIslandVisual = memo(");
  });

  it("keeps camera pan and drag-hover work outside per-pointer React reconciliation", () => {
    const pan = previewSource.slice(previewSource.indexOf("const movePan ="), previewSource.indexOf("const finishPan ="));
    expect(pan).toContain("wheelStateRef.current = {");
    expect(pan).toContain("scheduleCameraRender()");
    expect(pan).not.toContain("setCamera(");
    const finish = previewSource.slice(previewSource.indexOf("const finishPan ="), previewSource.indexOf("const handleWheel ="));
    expect(finish).toContain("flushCameraRender()");
    expect(finish).toContain("setCamera(wheelStateRef.current.camera)");
    expect(previewSource).toContain("panRef.current !== null || dragRef.current?");
    const dragMove = previewSource.slice(previewSource.indexOf("const moveDrag ="), previewSource.indexOf("const finishDrag ="));
    expect(dragMove).toContain("dragHoverNeedsUpdateRef.current = true");
    expect(dragMove).not.toContain("updateDragHover(drag)");
    expect(dragMove).not.toContain("renderDraggedPieceImmediately(drag)");
    expect(previewSource).toContain("if (previousTime === null || panned || dragHoverNeedsUpdateRef.current)");
    expect(previewSource).toContain("new Path2D(entry.outline)");
    expect(previewSource).toContain("context.isPointInPath(path, x, y)");
    expect(previewSource).toContain("findJigsawDragHoverIslandAtWorldPoint(");
    expect(previewSource).toContain("getDragStagePoint(drag)");
    expect(jigsawCss).toContain(".tile-puzzle-piece-outline.exterior {\n  transition: none;");
  });

  it("coalesces pinch transforms and cancels leftover camera frames on cleanup", () => {
    const pinch = previewSource.slice(previewSource.indexOf("const moveTouchPinch ="), previewSource.indexOf("const endTouchPinch ="));
    expect(pinch).toContain("scheduleCameraRender()");
    const end = previewSource.slice(previewSource.indexOf("const endTouchPinch ="), previewSource.indexOf("const renderDraggedPieceImmediately ="));
    expect(end).toContain("flushCameraRender()");
    expect(previewSource).toContain("window.cancelAnimationFrame(cameraAnimationFrameRef.current)");
  });

  it("keeps the source image unfiltered while placing shadows on the physical silhouette", () => {
    expect(islandVisualSource).toContain('<g class="jigsaw-island-artwork">');
    expect(islandVisualSource).toContain('clip-path={`url(#${clipId}-piece-${piece.id})`}');
    expect(jigsawCss).toContain(".jigsaw-island.anchored .jigsaw-island-sidewall");
    expect(jigsawCss).not.toContain(".jigsaw-island.dragging .jigsaw-island-artwork");
    expect(islandVisualSource).toContain('class="tile-puzzle-piece-hit-visual"');
    expect(islandVisualSource).toContain('class={`tile-puzzle-piece-outline ${cut.kind}`}');
  });

  it("zooms at the pointer on ordinary wheel input, preserving directional pan and pinch", () => {
    expect(previewSource).toContain("getJigsawWheelGesture(event, current.viewport.height)");
    expect(previewSource).toContain('gesture.kind === "zoom"');
    expect(previewSource).toContain("current.camera.zoom * gesture.factor");
    expect(previewSource).toContain("stagePoint.x,");
    expect(previewSource).toContain("stagePoint.y,");
    expect(previewSource).toContain('stage.addEventListener("wheel", handleWheel, { passive: false })');
    expect(previewSource).toContain("event.preventDefault()");
    expect(previewSource).toContain("Scroll the mouse wheel to zoom toward the pointer");
  });

  it("honors a persistent drag-to-pan lock without disabling piece dragging or wheel zoom", () => {
    expect(previewSource).toContain("if (lockViewDragging || dragRef.current || pinchRef.current) return;");
    expect(previewSource).toContain('aria-pressed={lockViewDragging}');
    expect(previewSource).toContain('"Lock panning"');
    expect(previewSource).toContain('"Unlock panning"');
    expect(previewSource).toContain('"Background dragging is locked."');
    expect(islandVisualSource).toContain('onPointerDown={(event) => pointerActions.current?.beginDrag(event, piece)}');
    expect(previewSource).toContain('stage.addEventListener("wheel", handleWheel, { passive: false })');
  });

  it("clears transient interaction presentation when gestures terminate", () => {
    expect(previewSource).toContain("const endDragPresentation = (drag: ActiveDrag | null, afterPlacementCommit = false) => {");
    expect(previewSource).toContain("useLayoutEffect(() => {");
    expect(previewSource).toContain("resetJigsawDragOffset([pending])");
    expect(previewSource).toContain("if (afterPlacementCommit) pendingDragResetRef.current = drag.islandElement");
    // The transient transform is retained until placement has committed;
    // an unsnapped drop does not depend on the dragging CSS class for its pose.
    expect(jigsawCss).not.toContain("--jigsaw-active-drag-x");
    expect((previewSource.match(/endDragPresentation\(/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(previewSource).toContain("dragRef.current = null");
    expect(previewSource).toContain("pinchRef.current = null");
    expect(previewSource).toContain("panRef.current = null");
    expect(previewSource).toContain("endDragPresentation(interruptedDrag, true)");
    expect(previewSource).toContain("endDragPresentation(drag, true)");
  });

  it("quarantines transient drag work to the originating puzzle instance", () => {
    expect(previewSource).toContain("dragRef.current?.puzzleId === puzzle.id");
    expect(previewSource).toContain("drag.puzzleId !== current.puzzleId");
    expect(previewSource).toContain("drag.puzzleId !== puzzle.id");
  });

  it("derives keyboard and zoom camera commands from the live camera ref", () => {
    expect(previewSource).toContain("getJigsawZoomStep(wheelStateRef.current.camera.zoom");
    expect(previewSource).toContain("const current = wheelStateRef.current");
    expect(previewSource).toContain("zoomJigsawCameraAtPoint(");
    expect(previewSource).toContain("panJigsawCamera(");
  });
  it("keeps active pieces above the board, drops completed islands behind loose pieces, and marks hover targets through pointer capture", () => {
    expect(islandVisualSource).toContain("getJigsawIslandStackOrder(island, puzzle.tiles.length, active, anchored, freeDropRank)");
    expect(previewSource).toContain("freeDropRank={freeDropOrder.indexOf(getJigsawIslandLayerIdentity(island))}");
    expect(previewSource).not.toContain("setRaisedTileId(");
    expect(previewSource).toContain("setActiveTileId(null)");
    expect(previewSource).toContain("findJigsawDragHoverIsland(");
    expect(previewSource).toContain("updateDragHover(drag)");
    expect(previewSource).toContain('classList.remove("drag-hover")');
    expect(jigsawCss).toContain(".jigsaw-island.drag-hover .tile-puzzle-piece-outline.exterior");
  });
});
