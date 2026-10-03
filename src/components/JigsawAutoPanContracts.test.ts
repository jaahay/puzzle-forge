import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const previewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
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
    expect(previewSource).toContain('"--jigsaw-piece-x":');
    expect(previewSource).toContain('"--jigsaw-piece-y":');

    expect(jigsawCss).toContain("calc(var(--jigsaw-piece-x, 0px) + var(--jigsaw-active-drag-x))");
    expect(jigsawCss).toContain("calc(var(--jigsaw-piece-y, 0px) + var(--jigsaw-active-drag-y))");
    expect(jigsawCss).toContain(".tile-puzzle-piece.dragging");
    expect(jigsawCss).toContain("--jigsaw-active-drag-x: var(--jigsaw-drag-x, 0px)");
    expect(jigsawCss).toContain("--jigsaw-active-drag-y: var(--jigsaw-drag-y, 0px)");
  });

  it("clears transient interaction presentation when gestures terminate", () => {
    expect((previewSource.match(/setActiveTileId\(null\)/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(previewSource).toContain("dragRef.current = null");
    expect(previewSource).toContain("pinchRef.current = null");
    expect(previewSource).toContain("panRef.current = null");
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
});
