import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultJigsawPlayerPreferences, jigsawPieceAppearances } from "./playerPreferences";

const preview = readFileSync(new URL("../../components/TilePuzzlePreview.tsx", import.meta.url), "utf8");

describe("Jigsaw piece appearance treatment", () => {
  it("retains Inlaid as the initial preference and all three appearance choices", () => {
    expect(defaultJigsawPlayerPreferences.appearance).toBe("inlaid");
    expect(jigsawPieceAppearances).toEqual(["outlined", "inlaid", "seamless"]);
  });

  it("applies the selected appearance to both loose and joined islands", () => {
    expect(preview).toContain("data-piece-appearance={appearance}");
    expect(preview).toContain('appearance === "inlaid"');
    expect(preview).not.toContain("resolveJigsawPieceAppearance(");
    expect(preview).not.toContain('isJoined ? preference : "outlined"');
  });
});
