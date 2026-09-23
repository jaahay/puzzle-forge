import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(new URL("./PuzzleWorkspaceLayout.tsx", import.meta.url), "utf8");
const jigsawWorkspaceSource = readFileSync(new URL("./JigsawWorkspace.tsx", import.meta.url), "utf8");
const imageTileWorkspaceSource = readFileSync(new URL("./ImageTilePuzzleWorkspace.tsx", import.meta.url), "utf8");
const jigsawPreviewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const immersiveCss = readFileSync(new URL("../site/immersive.css", import.meta.url), "utf8");
const jigsawCss = readFileSync(new URL("../site/jigsaw.css", import.meta.url), "utf8");

const cssRule = (source: string, selector: string) => {
  const start = source.indexOf(selector);
  if (start < 0) return "";
  const end = source.indexOf("\n}", start);
  return end < 0 ? source.slice(start) : source.slice(start, end + 2);
};

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
    expect(jigsawPreviewSource).toContain('class="jigsaw-expand-workspace"');
    expect(jigsawCss).toContain(".jigsaw-camera-tools .jigsaw-expand-workspace");
    expect(jigsawPreviewSource).not.toContain("displayMode.exitExpanded");
    expect(jigsawPreviewSource).not.toContain("displayMode.toggleBrowserFullscreen");
  });

  it("keeps the shared immersive shell generic while Jigsaw alone takes the one-row overlay composition", () => {
    expect(imageTileWorkspaceSource).toContain("enableImmersive");
    const sharedLayoutRule = cssRule(immersiveCss, ".puzzle-workspace-layout.is-immersive {");
    expect(sharedLayoutRule).toContain("grid-template-rows: auto minmax(0, 1fr);");
    expect(sharedLayoutRule).toContain("overflow: auto;");
    const jigsawLayoutRule = cssRule(immersiveCss, ".jigsaw-workspace.is-immersive {");
    expect(jigsawLayoutRule).toContain("grid-template-rows: minmax(0, 1fr);");
    expect(jigsawLayoutRule).toContain("overflow: hidden;");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive > .puzzle-workspace-display-tools");
  });

  it("gives the expanded Jigsaw stage the layout while moving controls into overlay chrome", () => {
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .tile-puzzle-summary");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .tile-puzzle-art-preview");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .workspace-layout-play-surface");
    const panelRule = cssRule(immersiveCss, ".jigsaw-workspace.is-immersive .jigsaw-puzzle-panel {");
    expect(panelRule).toContain("box-sizing: border-box;");
    expect(panelRule).toContain("padding: 0;");
    expect(panelRule).toContain("margin: 0;");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .tile-puzzle-tools");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .jigsaw-camera-tools");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .jigsaw-solved-presentation.is-completed");
    expect(immersiveCss).toContain("padding-top: 4.25rem;");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .jigsaw-freeform-stage");
    const stageRule = cssRule(immersiveCss, ".jigsaw-workspace.is-immersive .jigsaw-freeform-stage {");
    expect(stageRule).toContain("height: 100%;");
    expect(stageRule).toContain("min-height: 0;");
  });

  it("keeps narrow expanded controls separated instead of stacking competing full-width rows", () => {
    const mobileCss = immersiveCss.slice(immersiveCss.indexOf("@media (max-width: 700px)"));
    const mobileToolRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .tile-puzzle-tools {");
    const mobileCameraRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .jigsaw-camera-tools {");

    expect(mobileToolRule).toContain("top: 50%;");
    expect(mobileToolRule).toContain("flex-direction: column;");
    expect(mobileToolRule).toContain("transform: translateY(-50%);");
    expect(mobileCameraRule).toContain("bottom: 0.45rem;");
  });

  it("does not introduce an orientation-specific expanded-workspace breakpoint", () => {
    expect(immersiveCss).not.toContain("@media (orientation:");
  });
});
