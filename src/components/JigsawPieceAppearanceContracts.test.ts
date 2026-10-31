import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const preview = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../site/jigsaw.css", import.meta.url), "utf8");

describe("Jigsaw piece appearance integration", () => {
  it("exposes one accessible preference in the existing Jigsaw tools", () => {
    expect(preview).toContain('class="jigsaw-appearance-setting"');
    expect(preview).toContain('aria-label="Piece appearance"');
    for (const name of ["outlined", "inlaid", "seamless"]) {
      expect(preview).toContain(`<option value="${name}">`);
    }
    expect(preview).toContain('appearance={appearance}');
  });

  it("draws each cut once with butt endpoints instead of doubled piece corners", () => {
    expect(preview).toContain('class={`tile-puzzle-piece-outline ${cut.kind}`}');
    expect(preview).toContain("island.cuts.map((cut)");
    expect(css).toContain("stroke-linecap: butt;");
    expect(css).toContain('data-piece-appearance="outlined"] .tile-puzzle-piece-outline');
    expect(css).toContain('data-piece-appearance="inlaid"] .tile-puzzle-piece-outline');
    expect(css).toContain('data-piece-appearance="seamless"] .tile-puzzle-piece-outline.interior');
    expect(css).not.toContain("stroke: rgba(125, 211, 252, 0.96)");
    expect(preview).toContain('class="jigsaw-island-artwork"');
    expect(preview).toContain('class="tile-puzzle-piece-hit-target"');
  });

  it("grounds the island as one physical object without a texture overlay on every piece", () => {
    expect(preview).toContain('class="jigsaw-island-sidewall"');
    expect(preview).toContain('class="jigsaw-material-finish"');
    expect(preview).toContain("<linearGradient id={finishId}");
    expect(preview).toContain('clip-path={`url(#${clipId})`}');
    expect(css).toContain('.jigsaw-island[data-piece-appearance="inlaid"] .jigsaw-island-sidewall');
    expect(css).toContain('.jigsaw-island[data-piece-appearance="inlaid"] .jigsaw-material-finish');
    expect(css).toContain(".jigsaw-island.joined .jigsaw-island-artwork");
    expect(preview).toContain('class="jigsaw-island-artwork"');
    expect(preview).toContain('class="tile-puzzle-piece-hit-target"');
  });

  it("keeps edge guides separate from appearance and suppresses solved cuts", () => {
    expect(preview).toContain("showEdgeSeams && !isSolved ? island.cuts.map(");
    expect(css).toContain(".jigsaw-freeform-stage.solved .jigsaw-island .tile-puzzle-piece-outline");
    expect(css).toContain("vector-effect: non-scaling-stroke;");
  });
});
