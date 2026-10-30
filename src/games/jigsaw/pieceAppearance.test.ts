import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultJigsawPlayerPreferences, jigsawPieceAppearances } from "./playerPreferences";

const preview = readFileSync(new URL("../../components/TilePuzzlePreview.tsx", import.meta.url), "utf8");

describe("Jigsaw piece appearance selection", () => {
  it("uses Inlaid by default while offering all three treatments", () => {
    expect(defaultJigsawPlayerPreferences.appearance).toBe("inlaid");
    expect(jigsawPieceAppearances).toEqual(["outlined", "inlaid", "seamless"]);
  });

  it("draws the same cached unique physical cuts for all modes, including loose pieces", () => {
    expect(preview).toContain("data-piece-appearance={appearance}");
    expect(preview).toContain("island.cuts.map((cut)");
    expect(preview).toContain('class={`tile-puzzle-piece-outline ${cut.kind}`}');
    expect(preview).not.toContain("resolveJigsawPieceAppearance(");
    expect(preview).not.toContain("tile-puzzle-piece-outline-halo");
  });
});
