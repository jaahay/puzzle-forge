import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const sessionsSource = readFileSync(new URL("../app/usePuzzleSessions.ts", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("./JigsawWorkspace.tsx", import.meta.url), "utf8");

const sourceBetween = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThan(-1);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};

describe("Jigsaw resource-session persistence integration", () => {
  it("keeps snapped Jigsaw progress in the canonical app session state", () => {
    expect(appSource).toContain("const [jigsawProgress, setJigsawProgress]");
    expect(appSource).toContain("session.progress.jigsawSnappedPieceIds");
    expect(appSource).toContain('puzzle.puzzleId === "jigsaw" && jigsawProgress?.puzzleInstanceId === puzzle.id');
    expect(appSource).toContain("jigsawSnappedPieceIds:");
    expect(appSource).toContain("jigsaw={workspaceJigsaw}");
  });

  it("keeps zero snapped pieces as an explicit bound state", () => {
    const reset = sourceBetween(appSource, "const resetCurrentPuzzle =", "const commitGenerationSettings =");
    const jigsawBinding = sourceBetween(appSource, "const workspaceJigsaw =", "const workspaceSolitaire =");

    expect(sessionsSource).toContain(
      'generatedPuzzle.puzzleId === "jigsaw" ? { jigsawSnappedPieceIds: [] } : {}',
    );
    expect(reset).toContain("setJigsawProgress({ puzzleInstanceId: puzzle.id, snappedPieceIds: [] });");
    expect(jigsawBinding).not.toContain("if (!current && pieceIds.length === 0) return current;");
  });

  it("routes snapped progress through the Jigsaw workspace before staging", () => {
    expect(workspaceSource).toContain("initialSnappedPieceIds={jigsawSnappedPieceIds}");
    expect(workspaceSource).toContain("onSnappedPieceIdsChange={onJigsawSnappedPieceIdsChange}");
    expect(previewSource).toContain("if (initialSnappedPieceIds === null) return;");
  });

  it("has no component-local persistence or migration fallback", () => {
    expect(previewSource).not.toContain("localStorage");
    expect(previewSource).not.toContain("loadLegacy");
    expect(previewSource).not.toContain("puzzle-forge.jigsaw");
    expect(previewSource).not.toContain("placementSchemaVersion");
    expect(previewSource).not.toContain("onPlacementsCommit");
    expect(previewSource).not.toContain("initialPlacements");
  });

  it("publishes only committed snapped progress across the session boundary", () => {
    const scatter = sourceBetween(previewSource, "const scatterPieces =", "useEffect(() => {\n    if (lastResetVersion");
    const history = sourceBetween(previewSource, "const dispatchHistoryAction =", "useEffect(() => {\n    if (!onHistoryControllerChange)");
    const moveDrag = sourceBetween(previewSource, "const moveDrag =", "const finishDrag =");
    const finishDrag = sourceBetween(previewSource, "const finishDrag =", "const cancelDrag =");

    expect(scatter).toContain("publishSnappedProgress(nextPlacements);");
    expect(history).toContain("publishSnappedProgress(transition.placements);");
    expect(moveDrag).not.toContain("publishSnappedProgress");
    expect(finishDrag).toContain("publishSnappedProgress(nextState.placements);");
  });
});
