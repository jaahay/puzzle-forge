import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(new URL("./PuzzleWorkspaceLayout.tsx", import.meta.url), "utf8");
const jigsawWorkspaceSource = readFileSync(new URL("./JigsawWorkspace.tsx", import.meta.url), "utf8");
const imageTileWorkspaceSource = readFileSync(new URL("./ImageTilePuzzleWorkspace.tsx", import.meta.url), "utf8");
const jigsawPreviewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const immersiveCss = readFileSync(new URL("../site/immersive.css", import.meta.url), "utf8");
const mobileWorkspaceCss = readFileSync(new URL("../site/mobile-workspace.css", import.meta.url), "utf8");
const hierarchyCss = readFileSync(new URL("../site/workspace-hierarchy.css", import.meta.url), "utf8");
const jigsawCss = readFileSync(new URL("../site/jigsaw.css", import.meta.url), "utf8");
const identitySource = readFileSync(new URL("./CurrentPuzzleIdentity.tsx", import.meta.url), "utf8");

const cssRule = (source: string, selector: string) => {
  const start = source.indexOf(selector);
  if (start < 0) return "";
  const end = source.indexOf("\n}", start);
  return end < 0 ? source.slice(start) : source.slice(start, end + 2);
};

describe("Jigsaw expanded workspace contracts", () => {
  it("keeps sticky mobile navigation above scrolling puzzle controls but below immersive play", () => {
    const mobileHeaderStart = mobileWorkspaceCss.indexOf("  .app-header {");
    const mobileHeaderEnd = mobileWorkspaceCss.indexOf("\n  }", mobileHeaderStart);
    const mobileHeader = mobileWorkspaceCss.slice(mobileHeaderStart, mobileHeaderEnd);
    const mobileLayer = Number(mobileHeader.match(/z-index:\s*(\d+)/)?.[1] ?? -1);
    const crownLayer = Number(cssRule(hierarchyCss, ".workspace-layout-crown {").match(/z-index:\s*(\d+)/)?.[1] ?? -1);
    const openMenuLayer = Number(cssRule(
      jigsawCss, ".jigsaw-workspace:not(.is-immersive) .workspace-layout-crown:has(.new-puzzle-options[open]) {",
    ).match(/z-index:\s*(\d+)/)?.[1] ?? -1);
    const immersiveLayer = Number(cssRule(
      immersiveCss, ".puzzle-workspace-layout.is-immersive {",
    ).match(/z-index:\s*(\d+)/)?.[1] ?? -1);
    expect(mobileHeader).toContain("position: sticky;");
    expect(mobileHeader).toContain("top: 0;");
    expect(mobileHeader).toContain("background: #0f172a;");
    expect(mobileHeader).toContain("box-shadow: 0 -0.5rem 0 #0f172a;");
    expect(mobileLayer).toBeGreaterThan(crownLayer);
    expect(mobileLayer).toBeGreaterThan(openMenuLayer);
    expect(mobileLayer).toBeLessThan(immersiveLayer);
  });

  it("keeps Close in the shared shell but delegates fullscreen to Jigsaw's view dock", () => {
    expect(layoutSource).toContain("usePuzzleWorkspaceDisplayMode");
    expect(layoutSource).toContain('immersiveEntry?: "workspace" | "descendant"');
    expect(layoutSource).toContain('enableImmersive && (isExpanded || immersiveEntry === "workspace")');
    expect(layoutSource).toContain('aria-label="Exit expanded workspace"');
    expect(layoutSource).toContain('"Exit fullscreen" : "Enter fullscreen"');
    expect(layoutSource).toContain("FullscreenIcon");
    expect(layoutSource).toContain("ExitExpandedIcon");

    expect(jigsawWorkspaceSource).toContain('immersiveEntry="descendant"');
    expect(jigsawWorkspaceSource).toContain('immersiveFullscreenControl="descendant"');
    expect(layoutSource).toContain('fullscreenAvailable && immersiveFullscreenControl === "workspace"');
    expect(jigsawPreviewSource).toContain("usePuzzleWorkspaceDisplayMode");
    expect(jigsawPreviewSource).toContain("displayMode.enterExpanded");
    expect(jigsawPreviewSource).toContain('aria-label="Expand workspace"');
    expect(jigsawPreviewSource).toContain("JigsawExpandIcon");
    expect(jigsawPreviewSource).toContain('class="jigsaw-expand-workspace"');
    expect(jigsawCss).toContain(".jigsaw-camera-tools .jigsaw-expand-workspace");
    expect(jigsawPreviewSource).not.toContain("displayMode.exitExpanded");
    expect(jigsawPreviewSource).toContain("displayMode.toggleBrowserFullscreen()");
    expect(jigsawPreviewSource).toContain('class="jigsaw-fullscreen-action"');
    expect(jigsawPreviewSource).toContain('aria-label={displayMode.isBrowserFullscreen ? "Exit fullscreen" : "Enter fullscreen"}');
  });

  it("opens a new or restaged puzzle in All pieces until the player chooses Work view", () => {
    expect(jigsawPreviewSource).toContain("const [fitIsOverview, setFitIsOverview] = useState(true);");
    expect(jigsawPreviewSource).toContain("setFitIsOverview(true);");
    expect(jigsawPreviewSource).toContain("setFitIsOverview(false);");
    expect(jigsawPreviewSource).toContain("setCamera(createJigsawOccupiedFitCamera(");
    expect(jigsawPreviewSource).toContain("createJigsawWorkingFitCamera(layout, viewport, placements, 28, insets, puzzle.tiles)");
  });

  it("keeps Jigsaw-only controls over the board without extending the shared header", () => {
    expect(jigsawWorkspaceSource).not.toContain("workspaceControls=");
    expect(identitySource).not.toContain("workspaceControls");
    expect(jigsawPreviewSource).not.toContain("createPortal(");
    expect(jigsawPreviewSource).toContain('class="jigsaw-workbench-toolbar"');
    expect(jigsawCss).toContain(".jigsaw-workspace:not(.is-immersive) .jigsaw-workbench-toolbar {");
    expect(cssRule(jigsawCss, ".jigsaw-workspace:not(.is-immersive) .jigsaw-workbench-toolbar {")).toContain("display: contents;");
    expect(jigsawCss).not.toContain(".jigsaw-tools-mobile-actions");
    const newMenuPriority = cssRule(
      jigsawCss,
      ".jigsaw-workspace:not(.is-immersive) .workspace-layout-crown:has(.new-puzzle-options[open]) {",
    );
    expect(newMenuPriority).toContain("z-index: 50;");
    expect(cssRule(jigsawCss, ".jigsaw-workspace:not(.is-immersive) .jigsaw-camera-tools {")).toContain("bottom: 0.6rem;");
    expect(cssRule(jigsawCss, ".jigsaw-workspace:not(.is-immersive) .jigsaw-camera-tools {")).toContain("right: 0.6rem;");
    expect(cssRule(jigsawCss, ".jigsaw-workspace:not(.is-immersive) .jigsaw-tools-toggle {")).toContain("left: 0.6rem;");
    expect(cssRule(jigsawCss, ".jigsaw-workspace:not(.is-immersive) .tile-puzzle-tools {")).toContain("bottom: 3.85rem;");
    expect(jigsawPreviewSource).not.toContain('class="jigsaw-tools-mobile-actions"');
    expect(jigsawPreviewSource).toContain('closest<HTMLElement>(".jigsaw-workspace")');
    expect(jigsawPreviewSource).not.toContain("No joins yet");
    expect(jigsawPreviewSource).toContain("onClick={toggleFitView}");
    expect(jigsawPreviewSource).toContain('fitIsOverview ? "Return to working view"');
    expect(jigsawPreviewSource).toContain("createJigsawWorkingFitCamera(layout, viewport, placements, 28, insets, puzzle.tiles)");
    expect(jigsawPreviewSource).toContain("setFitIsOverview(false)");
    expect(jigsawPreviewSource).not.toContain("coarseSections");
    expect(jigsawPreviewSource).not.toContain("selectSectionFocus");
    expect(jigsawPreviewSource).not.toContain("focusedSection");
    expect(jigsawCss).not.toContain(".jigsaw-section-tools");
    expect(jigsawCss).not.toContain(".jigsaw-workspace:not(.is-immersive) .tile-puzzle-summary {\n    display: none;");
    expect(jigsawPreviewSource).toContain(".tile-puzzle-summary, .puzzle-workspace-display-tools");
    expect(jigsawPreviewSource).toContain("getCurrentFitInsets(),\n        ),");
    expect(immersiveCss).toContain(".jigsaw-workspace.is-immersive .jigsaw-workbench-toolbar {\n  display: contents;");
  });

  it("stretches normal-mode board and panel to the full play-surface width before measuring the camera", () => {
    // The shared play-surface grid centers children. Without explicit width,
    // the Jigsaw board shrink-wraps to the control row (~220 CSS px on phones).
    // That starves the working-fit camera even when the outer viewport is 390px.
    const normalBoard = cssRule(jigsawCss, ".jigsaw-workspace:not(.is-immersive) .workspace-layout-board,");
    expect(normalBoard).toContain(".jigsaw-workspace:not(.is-immersive) .jigsaw-puzzle-panel");
    expect(normalBoard).toContain("width: 100%;");
    expect(normalBoard).toContain("box-sizing: border-box;");
    expect(jigsawPreviewSource).toContain('class="tile-puzzle-preview"');
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
    const immersiveToolRule = cssRule(immersiveCss.slice(immersiveCss.indexOf(".jigsaw-workspace.is-immersive .jigsaw-tools-toggle {")), ".jigsaw-workspace.is-immersive .tile-puzzle-tools {");
    const immersiveOpenRule = cssRule(immersiveCss, ".jigsaw-workspace.is-immersive .tile-puzzle-tools.is-open {");
    const mobileToolButtonRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .tile-puzzle-tools button {");
    const mobileCameraRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .jigsaw-camera-tools {");
    const mobileCameraButtonRule = cssRule(mobileCss, ".jigsaw-workspace.is-immersive .jigsaw-camera-tools button {");

    expect(jigsawPreviewSource).toContain('class="jigsaw-tools-toggle"');
    expect(jigsawPreviewSource).toContain('aria-label="Jigsaw tools"');
    expect(jigsawPreviewSource).toContain("<JigsawToolsIcon />");
    expect(jigsawPreviewSource).toContain("aria-expanded={showCompactTools}");
    expect(jigsawPreviewSource).toContain('doc.addEventListener("pointerdown", onOutsidePointer, true)');
    expect(jigsawPreviewSource).toContain('doc.addEventListener("focusin", onOutsideFocus, true)');
    expect(jigsawPreviewSource).toContain('doc.addEventListener("keydown", onEscape)');
    expect(jigsawPreviewSource).toContain("aria-pressed={showPreview}");
    expect(jigsawPreviewSource).toContain('onClick={() => setPlayerPreferences((current) => ({ ...current, showPreview: !current.showPreview }))}');
    expect(jigsawPreviewSource).toContain('saveJigsawPlayerPreferences(playerPreferences)');
    expect(jigsawPreviewSource).toContain('if (restagePieces()) setShowCompactTools(false)');
    expect(jigsawPreviewSource).toContain("if (!isSolved) return;");
    expect(jigsawPreviewSource).toContain("setShowCompactTools(false);");
    expect(jigsawPreviewSource).toContain(".jigsaw-tools-toggle, .tile-puzzle-tools");
    expect(jigsawPreviewSource).toContain(
      'usesToolsDisclosure && element.classList.contains("tile-puzzle-tools")',
    );
    expect(jigsawPreviewSource).toContain('class="jigsaw-fit-action"');
    expect(jigsawPreviewSource).toContain('aria-label={fitIsOverview ? "Return to working view"');
    expect(jigsawPreviewSource).toContain('fitIsOverview ? "Return to working view" : "Show all pieces"');
    expect(jigsawPreviewSource).toContain("<JigsawFitIcon />");
    expect(jigsawPreviewSource).toContain("onClick={toggleFitView}");
    expect(jigsawPreviewSource).toContain('aria-pressed={fitIsOverview}');
    expect(jigsawPreviewSource).not.toContain("jigsaw-view-action-label");
    expect(jigsawPreviewSource).toContain('title={fitIsOverview ? "Return to working view" : "Show all pieces"}');
    expect(jigsawPreviewSource).toContain('title="Expand workspace"');
    expect(jigsawPreviewSource).toContain('<rect x="2.5" y="3.5" width="19" height="17" rx="2.5" />');
    expect(jigsawPreviewSource).not.toContain('<circle cx="12" cy="12" r="2.5" />');
    expect(jigsawCss).toContain('.jigsaw-camera-tools .jigsaw-fit-action[aria-pressed="true"]');
    expect(jigsawCss).not.toContain(".jigsaw-view-action-label");
    const compactFitRule = cssRule(jigsawCss, ".jigsaw-camera-tools .jigsaw-fit-action {");
    expect(compactFitRule).toContain("width: 2.6rem;");
    expect(compactFitRule).toContain("padding: 0;");
    expect(cssRule(jigsawCss, ".jigsaw-camera-tools .jigsaw-expand-workspace,")).toContain("width: 2.6rem;");
    expect(jigsawPreviewSource).toContain("createJigsawOccupiedFitCamera(layout, viewport, placements, 28, insets, puzzle.tiles)");
    expect(jigsawPreviewSource).toContain('class="jigsaw-zoom-level"');
    expect(jigsawPreviewSource).not.toContain("setZoomAtCenter(1)");
    expect(jigsawPreviewSource).not.toContain("jigsaw-fit-menu");
    expect(jigsawPreviewSource).not.toContain("Fit board");
    expect(jigsawPreviewSource).toContain("Restage pieces");
    expect(jigsawPreviewSource).toContain("if (restagePieces()) setShowCompactTools(false)");
    expect(jigsawPreviewSource).toContain("Snap and lock to frame");
    expect(jigsawPreviewSource).toContain("aria-pressed={snapToFrame}");
    expect(jigsawPreviewSource).toContain("snapToFrame,");
    expect(jigsawCss).toContain('.tile-puzzle-tools button[aria-pressed="true"]');
    expect(jigsawPreviewSource).not.toContain("Scatter pieces");

    expect(immersiveToggleRule).toContain("display: grid;");
    expect(immersiveToolRule).toContain("display: none;");
    expect(immersiveToolRule).toContain("flex-direction: column;");
    expect(immersiveOpenRule).toContain("display: flex;");

    expect(jigsawCss).toContain(".jigsaw-workspace:not(.is-immersive) .jigsaw-tools-toggle");
    expect(jigsawCss).toContain(".jigsaw-workspace:not(.is-immersive) .tile-puzzle-tools.is-open");
    expect(jigsawCss).toContain(".jigsaw-fit-action");
    expect(jigsawCss).not.toContain(".jigsaw-fit-menu");
    expect(jigsawCss).toContain(".jigsaw-tools-toggle svg,");
    expect(jigsawCss).toContain("flex-wrap: nowrap;");
    expect(layoutSource).toContain("ExpandWorkspaceIcon");
    expect(mobileToolButtonRule).toContain("min-height: 2.75rem;");
    expect(mobileToolButtonRule).toContain("max-width: 10.5rem;");
    expect(immersiveToggleRule).toContain("bottom: 0.75rem;");
    expect(immersiveToolRule).toContain("bottom: 4rem;");
    expect(mobileCameraRule).toContain("right: 0.45rem;");
    expect(mobileCameraRule).toContain("bottom: 0.45rem;");
    expect(mobileCameraRule).toContain("flex-wrap: nowrap;");
    expect(mobileCameraButtonRule).toContain("min-width: 2.75rem;");
    expect(mobileCameraButtonRule).toContain("min-height: 2.75rem;");
    expect(jigsawCss).toContain('.jigsaw-camera-tools button:focus-visible');
    expect(jigsawPreviewSource).toContain('role="group" aria-label="Jigsaw view controls"');
    expect(immersiveCss).not.toContain("width: max-content;");
  });

  it("does not introduce an orientation-specific expanded-workspace breakpoint", () => {
    expect(immersiveCss).not.toContain("@media (orientation:");
  });
});
