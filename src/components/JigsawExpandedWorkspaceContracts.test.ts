import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(new URL("./PuzzleWorkspaceLayout.tsx", import.meta.url), "utf8");
const jigsawWorkspaceSource = readFileSync(new URL("./JigsawWorkspace.tsx", import.meta.url), "utf8");
const jigsawPreviewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const immersiveCss = readFileSync(new URL("../site/immersive.css", import.meta.url), "utf8");

describe("Jigsaw expanded workspace contracts", () => {
  it("keeps expanded entry local to Jigsaw while the shared shell owns persistent exit/fullscreen", () => {
    expect(layoutSource).toContain("usePuzzleWorkspaceDisplayMode");
    expect(layoutSource).toContain('immersiveEntry?: "workspace" | "descendant"');
    expect(layoutSource).toContain('enableImmersive && (isExpanded || immersiveEntry === "workspace")');
    expect(layoutSource).toContain("Exit expanded");
    expect(layoutSource).toContain("Fullscreen");

    expect(jigsawWorkspaceSource).toContain('immersiveEntry="descendant"');
    expect(jigsawPreviewSource).toContain("usePuzzleWorkspaceDisplayMode");
    expect(jigsawPreviewSource).toContain("displayMode.enterExpanded");
    expect(jigsawPreviewSource).toContain("Expand workspace");
    expect(jigsawPreviewSource).not.toContain("displayMode.exitExpanded");
    expect(jigsawPreviewSource).not.toContain("displayMode.toggleBrowserFullscreen");
  });

  it("gives the expanded Jigsaw stage the layout while moving controls into overlay chrome", () => {
    expect(immersiveCss).toContain("grid-template-rows: minmax(0, 1fr);");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .tile-puzzle-summary");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .tile-puzzle-art-preview");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .workspace-layout-play-surface");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .tile-puzzle-tools");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .jigsaw-camera-tools");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .jigsaw-freeform-stage");
    expect(immersiveCss).toMatch(
      /.jigsaw-workspace.is-immersive .jigsaw-freeform-stage {[sS]*?height: 100%;[sS]*?min-height: 0;/,
    );
  });

  it("keeps narrow expanded controls separated instead of stacking competing full-width rows", () => {
    expect(immersiveCss).toMatch(
      /@media (max-width: 700px)[sS]*?.jigsaw-workspace.is-immersive .tile-puzzle-tools {[sS]*?top: 50%;[sS]*?flex-direction: column;[sS]*?transform: translateY(-50%);/,
    );
    expect(immersiveCss).toMatch(
      /.jigsaw-workspace.is-immersive .jigsaw-camera-tools {[sS]*?bottom: 0.45rem;/,
    );
  });

  it("does not introduce an orientation-specific expanded-workspace breakpoint", () => {
    expect(immersiveCss).not.toContain("@media (orientation:");
  });
});
