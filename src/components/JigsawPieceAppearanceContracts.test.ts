import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const preview = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../site/jigsaw.css", import.meta.url), "utf8");

describe("Jigsaw piece appearance integration", () => {
  it("exposes an accessible preference in the existing tools, without workspace toolbar clutter", () => {
    expect(preview).toContain('class="jigsaw-appearance-setting"');
    expect(preview).toContain('aria-label="Piece appearance"');
    for (const name of ["outlined", "inlaid", "seamless"]) {
      expect(preview).toContain(`<option value="${name}">`);
    }
    expect(preview).toContain('appearance={appearance}');
  });

  it("switches seam presentation only, reusing common island artwork, masks, and hit targets", () => {
    expect(preview).toContain('data-piece-appearance={appearance}');
    expect(preview).toContain('appearance === "inlaid"');
    expect(css).toContain('.jigsaw-island.loose[data-piece-appearance="seamless"] .tile-puzzle-piece-outline');
    expect(css).toContain('.jigsaw-island[data-piece-appearance="seamless"] .tile-puzzle-piece-outline');
    expect(css).toContain('.jigsaw-island[data-piece-appearance="inlaid"] .tile-puzzle-piece-outline');
    expect(css).toContain('.tile-puzzle-piece-outline-halo {');
    expect(css).toContain('.tile-puzzle-piece-inlaid-lip {');
    expect(css).toContain('vector-effect: non-scaling-stroke;');
    expect(css).toContain('.jigsaw-freeform-stage.solved .jigsaw-island .tile-puzzle-piece-outline');
    expect(preview).toContain('class="jigsaw-island-artwork"');
    expect(preview).toContain('class="tile-puzzle-piece-hit-target"');
    expect(preview).toContain('showEdgeSeams && !isSolved ? seams.map(');
  });
});
