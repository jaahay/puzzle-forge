import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("contextual assistance controls", () => {
  it("discloses Futoshiki rules without permanently displacing the board", () => {
    expect(read("./FutoshikiBoard.tsx")).toContain('<details class="grid-rule-help">');
    expect(read("./FutoshikiBoard.tsx")).toContain('id="futoshiki-rule"');
  });

  it("overlays the image-tile reference without reflow and provides an accessible expansion state", () => {
    const component = read("./ImageTilePuzzlePreview.tsx");
    const css = read("../site/image-tiles.css");
    expect(component).toContain('class="image-tile-board-viewport" ref={boardViewportRef}');
    expect(component).toContain('class="image-tile-reference"');
    expect(component).toContain("hidden={!showPreview}");
    expect(component).toContain("aria-expanded={showPreview}");
    expect(css).toContain(".image-tile-reference {\n  position: absolute;");
    expect(css).toContain("pointer-events: auto;");
    expect(css).toContain(".image-tile-board-frame {\n  position: relative;");
    expect(component).toContain('class="image-tile-board-frame" style={{ width: boardStyle.width }}');
  });

  it("does not mix changing action labels with aria-pressed for Jigsaw view commands", () => {
    const source = read("./TilePuzzlePreview.tsx");
    for (const variable of ["fitIsOverview", "showPreview", "showEdgeSeams", "lockViewDragging"]) {
      expect(source).not.toContain(`aria-pressed={${variable}}`);
    }
    expect(source).toContain("aria-pressed={snapToFrame}");
  });
});
