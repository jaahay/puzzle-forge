import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(new URL("./PuzzleWorkspaceLayout.tsx", import.meta.url), "utf8");
const jigsawWorkspaceSource = readFileSync(new URL("./JigsawWorkspace.tsx", import.meta.url), "utf8");
const imageTileWorkspaceSource = readFileSync(new URL("./ImageTilePuzzleWorkspace.tsx", import.meta.url), "utf8");
const jigsawPreviewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const immersiveCss = readFileSync(new URL("../site/immersive.css", import.meta.url), "utf8");
const jigsawCss = readFileSync(new URL("../site/jigsaw.css", import.meta.url), "utf8");
const workspaceCss = readFileSync(new URL("../site/workspace.css", import.meta.url), "utf8");

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
    expect(stageRule).not.toContain("min-height:");
    expect(stageRule).not.toContain("max-height:");
    expect(jigsawCss).toContain(":where(.jigsaw-workspace:not(.is-immersive)) .jigsaw-freeform-stage");
  });

  it("keeps narrow expanded controls compact and collapses secondary puzzle actions", () => {
    const mobileCss = immersiveCss.slice(immersiveCss.indexOf("@media (max-width: 700px)"));
    const mobileToggleRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .jigsaw-mobile-tools-toggle {");
    const mobileToolRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .tile-puzzle-tools {");
    const mobileOpenRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .tile-puzzle-tools.is-mobile-open {");
    const mobileToolButtonRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .tile-puzzle-tools button {");
    const mobileCameraRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .jigsaw-camera-tools {");
    const mobileCameraButtonRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .jigsaw-camera-tools button {");

    expect(jigsawCss).toContain(":where(.jigsaw-workspace:not(.is-immersive)) .tile-puzzle-tools button");
    expect(jigsawCss).toContain("flex: 1 1 8rem;");
    expect(workspaceCss).toContain(":where(.jigsaw-workspace:not(.is-immersive)) .tile-puzzle-tools button:first-child");
    expect(workspaceCss).toContain(":where(.jigsaw-workspace:not(.is-immersive)) .tile-puzzle-tools button:nth-child(n + 2)");
    expect(workspaceCss).toContain(".tile-puzzle-tools button:first-child,\n.word-guess-actions button:first-child");
    expect(workspaceCss).toContain(".tile-puzzle-tools button:nth-child(n + 2),\n.word-guess-actions button:nth-child(n + 2)");
    expect(jigsawCss).toContain('.tile-puzzle-tools button:nth-child(2)');
    expect(jigsawCss).toContain('.tile-puzzle-tools button[aria-pressed="true"]');
    expect(jigsawPreviewSource).toContain('class="jigsaw-mobile-tools-toggle"');
    expect(jigsawPreviewSource).toContain("aria-expanded={showMobileImmersiveTools}");
    expect(jigsawPreviewSource).toContain(".jigsaw-mobile-tools-toggle, .tile-puzzle-tools");
    expect(mobileToggleRule).toContain("display: block;");
    expect(mobileToggleRule).toContain("top: 0.45rem;");
    expect(mobileToolRule).toContain("display: none;");
    expect(mobileToolRule).toContain("top: 3.65rem;");
    expect(mobileToolRule).toContain("flex-direction: column;");
    expect(mobileToolRule).toContain("transform: none;");
    expect(mobileOpenRule).toContain("display: flex;");
    expect(mobileToolButtonRule).toContain("min-height: 2.75rem;");
    expect(mobileToolButtonRule).toContain("max-width: 10.5rem;");
    expect(mobileToolButtonRule).not.toContain("flex: 0 0 auto;");
    expect(mobileToolButtonRule).not.toContain("width: auto;");
    expect(mobileCameraRule).toContain("bottom: 0.45rem;");
    expect(mobileCameraRule).toContain("flex-wrap: wrap;");
    expect(mobileCameraButtonRule).toContain("min-width: 2.75rem;");
    expect(mobileCameraButtonRule).toContain("min-height: 2.75rem;");
    expect(mobileCameraButtonRule).not.toContain("flex: 0 0 auto;");
    expect(immersiveCss).not.toContain("width: max-content;");
  });

  it("does not introduce an orientation-specific expanded-workspace breakpoint", () => {
    expect(immersiveCss).not.toContain("@media (orientation:");
  });
});
