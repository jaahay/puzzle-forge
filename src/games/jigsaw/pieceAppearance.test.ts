import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultJigsawPlayerPreferences, jigsawPieceAppearances } from "./playerPreferences";

const preview = readFileSync(new URL("../../components/TilePuzzlePreview.tsx", import.meta.url), "utf8");

describe("Jigsaw piece appearance selection", () => {
  it("uses Inlaid by default while offering all three treatments", () => {
    expect(defaultJigsawPlayerPreferences.appearance).toBe("inlaid");
    expect(jigsawPieceAppearances).toEqual(["outlined", "inlaid", "seamless"]);
  });

  it("honors the selected appearance on every island, including a single loose piece", () => {
    expect(preview).toContain("data-piece-appearance={appearance}");
    expect(preview).not.toContain("resolveJigsawPieceAppearance(");
    expect(preview).toContain('class="tile-puzzle-piece-outline-halo"');
    expect(preview).toContain('class="tile-puzzle-piece-inlaid-lip"');
    expect(preview).toContain('!isSolved && appearance === "outlined"');
    expect(preview).toContain('!isSolved && appearance === "inlaid"');
  });
});
