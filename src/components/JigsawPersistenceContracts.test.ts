import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("./JigsawWorkspace.tsx", import.meta.url), "utf8");

const sourceBetween = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThan(-1);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};

describe("Jigsaw resource-session persistence integration", () => {
  it("keeps exact Jigsaw placements in the canonical app session state", () => {
    expect(appSource).toContain("const [jigsawProgress, setJigsawProgress]");
    expect(appSource).toContain("session.progress.jigsawPlacements");
    expect(appSource).toContain('puzzle.puzzleId === "jigsaw" && jigsawProgress?.puzzleInstanceId === puzzle.id');
    expect(appSource).toContain("jigsawPlacements:");
    expect(appSource).toContain("jigsaw={workspaceJigsaw}");
  });

  it("routes restored and committed placements through the Jigsaw workspace", () => {
    expect(workspaceSource).toContain("initialPlacements={jigsawPlacements}");
    expect(workspaceSource).toContain("onPlacementsCommit={onJigsawPlacementsChange}");
  });

  it("uses legacy component storage only as a read-only migration fallback", () => {
    expect(previewSource).toContain("loadLegacyPersistedPlacements");
    expect(previewSource).toContain("initialPlacements ?? loadLegacyPersistedPlacements");
    expect(previewSource).not.toContain("localStorage.setItem");
    expect(previewSource).not.toContain("savePersistedPlacements");
  });

  it("publishes only committed placement states across the session boundary", () => {
    const scatter = sourceBetween(previewSource, "const scatterPieces =", "useEffect(() => {\n    if (lastResetVersion");
    const history = sourceBetween(previewSource, "const dispatchHistoryAction =", "useEffect(() => {\n    if (!onHistoryControllerChange)");
    const moveDrag = sourceBetween(previewSource, "const moveDrag =", "const finishDrag =");
    const finishDrag = sourceBetween(previewSource, "const finishDrag =", "const cancelDrag =");

    expect(scatter).toContain("publishCommittedPlacements(nextPlacements);");
    expect(history).toContain("publishCommittedPlacements(transition.placements);");
    expect(moveDrag).not.toContain("publishCommittedPlacements");
    expect(finishDrag).toContain("publishCommittedPlacements(nextState.placements);");
  });
});
