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
    expect(layoutSource).toContain('aria-label="Exit expanded workspace"');
    expect(layoutSource).toContain('"Exit fullscreen" : "Enter fullscreen"');
    expect(layoutSource).toContain("FullscreenIcon");
    expect(layoutSource).toContain("ExitExpandedIcon");

    expect(jigsawWorkspaceSource).toContain('immersiveEntry="descendant"');
    expect(jigsawPreviewSource).toContain("usePuzzleWorkspaceDisplayMode");
    expect(jigsawPreviewSource).toContain("displayMode.enterExpanded");
    expect(jigsawPreviewSource).toContain('aria-label="Expand workspace"');
    expect(jigsawPreviewSource).toContain("JigsawExpandIcon");
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
    const previewRule = cssRule(immersiveCss, ".jigsaw-workspace.is-immersive .tile-puzzle-art-preview {");
    expect(previewRule).toContain("position: absolute;");
    expect(previewRule).toContain("background-size: contain;");
    expect(previewRule).not.toContain("display: none;");
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

  it("keeps secondary Jigsaw actions disclosed while persistent view chrome stays compact", () => {
    const mobileCss = immersiveCss.slice(immersiveCss.indexOf("@media (max-width: 700px)"));
    const immersiveToggleRule = cssRule(immersiveCss, ".jigsaw-workspace.is-immersive .jigsaw-tools-toggle {");
    const immersiveToolRule = cssRule(immersiveCss, ".jigsaw-workspace.is-immersive .tile-puzzle-tools {");
    const immersiveOpenRule = cssRule(immersiveCss, ".jigsaw-workspace.is-immersive .tile-puzzle-tools.is-open {");
    const immersiveFitRule = cssRule(immersiveCss, ".jigsaw-workspace.is-immersive .jigsaw-fit-menu {");
    const mobileToolButtonRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .tile-puzzle-tools button {");
    const mobileCameraRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .jigsaw-camera-tools {");
    const mobileCameraButtonRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .jigsaw-camera-tools button {");

    expect(jigsawPreviewSource).toContain('class="jigsaw-tools-toggle"');
    expect(jigsawPreviewSource).toContain('aria-label="Jigsaw tools"');
    expect(jigsawPreviewSource).toContain("<JigsawToolsIcon />");
    expect(jigsawPreviewSource).toContain("aria-expanded={showCompactTools}");
    expect(jigsawPreviewSource).toContain("if (!isSolved) return;");
    expect(jigsawPreviewSource).toContain("setShowCompactTools(false);");
    expect(jigsawPreviewSource).toContain(".jigsaw-tools-toggle, .tile-puzzle-tools");
    expect(jigsawPreviewSource).toContain(
      'usesToolsDisclosure && element.classList.contains("tile-puzzle-tools")',
    );
    expect(jigsawPreviewSource).toContain('class="jigsaw-fit-toggle"');
    expect(jigsawPreviewSource).toContain('aria-label="Fit view"');
    expect(jigsawPreviewSource).toContain("<JigsawFitIcon />");
    expect(jigsawPreviewSource).toContain("aria-expanded={showFitMenu}");
    expect(jigsawPreviewSource).toContain("Restage pieces");
    expect(jigsawPreviewSource).toContain("restagePieces();");
    expect(jigsawPreviewSource).not.toContain("Scatter pieces");

    expect(immersiveToggleRule).toContain("display: grid;");
    expect(immersiveToolRule).toContain("display: none;");
    expect(immersiveToolRule).toContain("flex-direction: column;");
    expect(immersiveOpenRule).toContain("display: flex;");
    expect(immersiveFitRule).toContain("bottom: calc(100% + 0.4rem);");
    expect(immersiveFitRule).not.toContain("display:");

    expect(jigsawCss).toContain(".jigsaw-workspace:not(.is-immersive) .jigsaw-tools-toggle");
    expect(jigsawCss).toContain(".jigsaw-workspace:not(.is-immersive) .tile-puzzle-tools.is-open");
    expect(jigsawCss).toContain(".jigsaw-fit-menu.is-open");
    expect(jigsawCss).toContain(".jigsaw-tools-toggle svg,");
    expect(jigsawCss).toContain("flex-wrap: nowrap;");
    expect(layoutSource).toContain("ExpandWorkspaceIcon");
    expect(mobileToolButtonRule).toContain("min-height: 2.75rem;");
    expect(mobileToolButtonRule).toContain("max-width: 10.5rem;");
    expect(mobileCameraRule).toContain("bottom: 0.45rem;");
    expect(mobileCameraRule).toContain("flex-wrap: nowrap;");
    expect(mobileCameraButtonRule).toContain("min-width: 2.75rem;");
    expect(mobileCameraButtonRule).toContain("min-height: 2.75rem;");
    expect(immersiveCss).not.toContain("width: max-content;");
  });

  it("does not introduce an orientation-specific expanded-workspace breakpoint", () => {
    expect(immersiveCss).not.toContain("@media (orientation:");
  });
});
