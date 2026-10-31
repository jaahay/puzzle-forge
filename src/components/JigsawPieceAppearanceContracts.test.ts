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

  it("emphasizes only exterior cuts on hover, focus, and drag-over", () => {
    expect(css).toContain(".tile-puzzle-piece-outline.exterior {");
    expect(css).toContain("transition: stroke 140ms ease-out, stroke-width 140ms ease-out;");
    expect(css).toContain(":has(.tile-puzzle-piece:hover) .tile-puzzle-piece-outline.exterior");
    expect(css).toContain(":has(.tile-puzzle-piece:focus-visible) .tile-puzzle-piece-outline.exterior");
    expect(css).toContain(".jigsaw-island.drag-hover .tile-puzzle-piece-outline.exterior");
    expect(css).not.toContain(".jigsaw-island.drag-hover .jigsaw-island-visual");
    expect(css).not.toContain("filter: brightness(1.05)");
    expect(css).toContain(".tile-puzzle-piece.dragging {\n  cursor: grabbing;\n}");
    expect(preview).toContain('class={`tile-puzzle-piece-outline ${cut.kind}`}');
  });

  it("remounts only the island clip when joined membership changes", () => {
    expect(preview).toContain("key={island.clipRevision}");
    expect(preview).toContain("${island.key}-${island.clipRevision}");
    expect(preview).toContain("key={island.key}");
  });

  it("isolates a growing joined region into independently clipped artwork pieces", () => {
    const surface = preview.slice(
      preview.indexOf("const JigsawIslandSurface ="),
      preview.indexOf("type IslandVisualProps ="),
    );
    expect(surface).toContain("island.members.map(({ piece, outline }, index)");
    expect(surface).toContain('id={`${clipId}-piece-${index}`}');
    expect(surface).toContain('clip-path={`url(#${clipId}-piece-${index})`}');
    expect(surface).not.toContain("<clipPath id={clipId}");
    expect(surface).not.toContain('clip-path={`url(#${clipId})`}');
    expect(surface).toContain('class="jigsaw-island-sidewall"');
    expect(surface).toContain('class="jigsaw-island-artwork"');
    expect(surface).toContain('class="jigsaw-island-coating"');
    expect(surface).toContain('clip-path={`url(#${clipId}-coating)`}');
    expect((surface.match(/class="jigsaw-material-finish"/g) ?? [])).toHaveLength(1);
    expect((surface.match(/class="jigsaw-material-texture"/g) ?? [])).toHaveLength(1);
    expect(surface.indexOf('class="jigsaw-island-artwork"'))
      .toBeLessThan(surface.indexOf('class="jigsaw-island-coating"'));
    expect(surface).toContain("island.cuts.map((cut)");
  });

  it("grounds the island as one physical object without a texture overlay on every piece", () => {
    expect(preview).toContain('class="jigsaw-island-sidewall"');
    expect(preview).toContain('class="jigsaw-material-finish"');
    expect(preview).toContain("<linearGradient id={finishId}");
    expect(preview).toContain('clip-path={`url(#${clipId}-piece-${index})`}');
    expect(css).not.toContain('[data-piece-appearance="inlaid"] .jigsaw-island-sidewall');
    expect(css).not.toContain('[data-piece-appearance="inlaid"] .jigsaw-material-finish');
    expect(css).toContain('.jigsaw-island[data-physical-edition="heritage"] .jigsaw-island-sidewall');
    expect(css).toContain(".jigsaw-island.joined .jigsaw-island-artwork");
    expect(preview).toContain('class="jigsaw-island-artwork"');
    expect(preview).toContain('class="tile-puzzle-piece-hit-target"');
  });

  it("renders an understated but legible Inlaid kerf and one shared cardboard silhouette", () => {
    expect(css).toContain("stroke-width: 1.22;");
    expect(css).toContain("drop-shadow(-0.65px -0.7px 0 rgba(251, 242, 218, 0.42))");
    expect(preview).toContain('transform="translate(0.85 2.05)"');
    expect(preview).toContain('class="jigsaw-island-sidewall"');
    expect(preview).toContain("island.cuts.map((cut)");
  });

  it("keeps incidental join counts off the playing surface and out of fit calculations", () => {
    expect(preview).not.toContain("tile-puzzle-summary");
    expect(preview).not.toContain("getJigsawConnectedPieceCount");
    expect(preview).not.toContain("assemblySummary");
    expect(css).not.toContain(".tile-puzzle-summary");
    expect(preview).toContain('class="jigsaw-solved-card is-completed"');
  });

  it("renders three distinct physical finishes without changing the canonical cut paths", () => {
    expect(preview).toContain("data-physical-edition={physicalEdition}");
    expect(preview).toContain('class="jigsaw-material-gloss"');
    expect(preview).toContain('aria-label="Physical finish"');
    expect(preview).toContain('physicalEdition={visibleEdition}');
    expect(preview).toContain('puzzleId: puzzle.id,');
    expect(css).toContain('data-physical-edition="heritage"');
    expect(css).toContain('data-physical-edition="classic"');
    expect(css).toContain('data-physical-edition="vivid"');
    expect(preview).toContain("island.cuts.map((cut)");
  });

  it("compares finishes on the live puzzle without a duplicate sample renderer", () => {
    expect(preview).toContain('aria-label="Physical finish"');
    expect(preview).toContain('physicalEdition={visibleEdition}');
    expect(preview).toContain('class="jigsaw-material-texture"');
    expect(preview).toContain('class="jigsaw-material-fibers"');
    expect(preview).toContain('class="jigsaw-material-edge"');
    expect(preview).not.toContain("showEditionComparison");
    expect(preview).not.toContain("comparisonGeometry");
    expect(preview).not.toContain("Compare editions");
    expect(css).not.toContain(".jigsaw-edition-comparison");
    expect(css).toContain('.jigsaw-island.dragging .jigsaw-material-gloss');
  });

  it("keeps edge guides separate from appearance and suppresses solved cuts", () => {
    expect(preview).toContain("showEdgeSeams && !isSolved ? island.cuts.map(");
    expect(css).toContain(".jigsaw-freeform-stage.solved .jigsaw-island .tile-puzzle-piece-outline");
    expect(css).toContain("vector-effect: non-scaling-stroke;");
  });
});
