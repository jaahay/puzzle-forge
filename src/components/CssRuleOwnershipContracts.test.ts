import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalCss = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const workspaceCss = readFileSync(new URL("../site/workspace.css", import.meta.url), "utf8");
const nextPuzzleCss = readFileSync(new URL("../site/next-puzzle.css", import.meta.url), "utf8");
const workspaceHierarchyCss = readFileSync(new URL("../site/workspace-hierarchy.css", import.meta.url), "utf8");
const numericGridCss = readFileSync(new URL("../site/numeric-grid.css", import.meta.url), "utf8");
const solitaireCss = readFileSync(new URL("../site/solitaire.css", import.meta.url), "utf8");
const appShellCss = readFileSync(new URL("../site/app-shell.css", import.meta.url), "utf8");
const immersiveCss = readFileSync(new URL("../site/immersive.css", import.meta.url), "utf8");
const jigsawCss = readFileSync(new URL("../site/jigsaw.css", import.meta.url), "utf8");

const cssRule = (source: string, selector: string) => {
  const start = source.indexOf(selector);
  if (start < 0) return "";
  const end = source.indexOf("\n}", start);
  return end < 0 ? source.slice(start) : source.slice(start, end + 2);
};

describe("CSS rule ownership contracts", () => {
  it("keeps completion and Nonogram action width ownership positive", () => {
    expect(workspaceCss).toContain(
      ".workspace-layout-gameplay > :where(.puzzle-actions:not(.nonogram-current-actions))",
    );
    expect(cssRule(workspaceCss, ".completion-dock .puzzle-actions {")).not.toContain("width: auto;");
    expect(workspaceHierarchyCss).not.toContain(".nonogram-current-actions {\n  width: auto;");
  });

  it("gives icon and text-copy seed buttons distinct geometry without resets", () => {
    expect(workspaceCss).toContain(
      ":where(:not(.current-seed-field-text-copy)) > .seed-control button",
    );
    expect(cssRule(nextPuzzleCss, ".current-seed-field-text-copy .seed-control button {")).not.toContain(
      "width: auto;",
    );
  });

  it("does not make the crown New command undo a play-column width", () => {
    const playColumnRule = cssRule(
      workspaceHierarchyCss,
      ".sudoku-workspace .square-grid-board-viewport,",
    );
    expect(playColumnRule).not.toContain(".new-puzzle-command,");
    expect(workspaceHierarchyCss).not.toContain(
      ".current-puzzle-new-action .new-puzzle-command {\n  width: auto;",
    );
  });

  it("assigns digit-pad sizing to the contexts that own it", () => {
    expect(numericGridCss).toContain(".board-viewport-inner > .numeric-grid-digit-pad {");
    expect(cssRule(workspaceHierarchyCss, ".sudoku-play-controls .numeric-grid-digit-pad {")).not.toContain(
      "max-width: none;",
    );
  });

  it("does not cap then uncap the Solitaire stock row or reorder then reset its settings", () => {
    expect(cssRule(solitaireCss, ".stock-row {")).not.toContain("max-width:");
    expect(solitaireCss).not.toContain(".card-board-top-row .stock-row {");
    expect(workspaceCss).not.toContain(".solitaire-control-panel > label {\n  order:");
    expect(cssRule(workspaceCss, ".solitaire-settings {")).not.toContain("order:");
    expect(nextPuzzleCss).not.toContain("order: initial;");
  });

  it("does not cap then uncap the only page-level h1", () => {
    expect(cssRule(globalCss, "h1 {")).not.toContain("max-width:");
    expect(cssRule(appShellCss, ".puzzle-start-panel h1 {")).not.toContain("max-width: none;");
  });

  it("does not rely on specificity escape hatches for the catalog", () => {
    expect(appShellCss).not.toContain("!important");
  });

  it("keeps immersive Jigsaw sizing independent from normal-flow sizing", () => {
    expect(jigsawCss).toContain(
      ":where(.jigsaw-workspace:not(.is-immersive)) .tile-puzzle-tools button",
    );
    expect(jigsawCss).toContain(
      ":where(.jigsaw-workspace:not(.is-immersive)) .jigsaw-freeform-stage",
    );
    const immersiveStage = cssRule(
      immersiveCss,
      ".jigsaw-workspace.is-immersive .jigsaw-freeform-stage {",
    );
    expect(immersiveStage).not.toContain("min-height:");
    expect(immersiveStage).not.toContain("max-height:");
    expect(immersiveCss).not.toContain("width: auto;");
    expect(immersiveCss).not.toContain("flex: 0 0 auto;");
  });
});
