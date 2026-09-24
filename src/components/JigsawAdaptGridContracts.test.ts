import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./JigsawNewPuzzleControl.tsx", import.meta.url), "utf8");

describe("Jigsaw Adapt grid contracts", () => {
  it("keeps adaptation advisory and Custom-only", () => {
    expect(source).toContain("selectedPreset === jigsawCustomPreset");
    expect(source).toContain("getJigsawGridAdaptation(selectedAsset, width, height)");
    expect(source).toContain("Grid may stretch pieces");
    expect(source).toContain("Adapt grid");
  });

  it("applies adaptation only from the explicit action", () => {
    expect(source).toContain("width: gridAdaptation.width");
    expect(source).toContain("height: gridAdaptation.height");
    expect(source).toContain("onClick={() => onSettingsChange({");
  });

  it("continues to preserve Custom dimensions across artwork changes", () => {
    expect(source).toContain("if (preset === jigsawCustomPreset)");
    expect(source).toContain("return { imageId: asset.id };");
    expect(source).toContain("makeJigsawImageSelectionSettings(asset, selectedPreset)");
  });
});
