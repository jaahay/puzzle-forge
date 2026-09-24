import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./JigsawNewPuzzleControl.tsx", import.meta.url), "utf8");

describe("Jigsaw Adapt grid contracts", () => {
  it("keeps adaptation advisory and Custom-only without re-deriving intent from dimensions", () => {
    expect(source).toContain("sizeSelection === jigsawCustomSizeSelection");
    expect(source).not.toContain("getJigsawSizePresetForDimensions");
    expect(source).toContain("getJigsawGridAdaptation(selectedAsset, width, height)");
    expect(source).toContain("Grid may stretch pieces");
    expect(source).toContain("Adapt grid");
  });

  it("marks manual dimensions and explicit adaptation as Custom while named buttons set their preset", () => {
    expect(source).toContain("jigsawSizeSelection: preset");
    expect(source.match(/jigsawSizeSelection: jigsawCustomSizeSelection/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("width: gridAdaptation.width");
    expect(source).toContain("height: gridAdaptation.height");
  });

  it("preserves Custom dimensions across artwork changes from explicit size intent", () => {
    expect(source).toContain("if (sizeSelection === jigsawCustomSizeSelection)");
    expect(source).toContain("return { imageId: asset.id };");
    expect(source).toContain("makeJigsawImageSelectionSettings(asset, sizeSelection)");
  });

  it("announces a newly available adaptation without moving focus", () => {
    expect(source).toContain('class="jigsaw-grid-adaptation-copy"');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('aria-atomic="true"');
  });
});
