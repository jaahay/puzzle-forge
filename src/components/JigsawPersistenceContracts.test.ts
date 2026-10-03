import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const sessionsSource = readFileSync(new URL("../app/usePuzzleSessions.ts", import.meta.url), "utf8");
const persistenceSource = readFileSync(new URL("../app/sessionPersistence.ts", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("./JigsawWorkspace.tsx", import.meta.url), "utf8");

const sourceBetween = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThan(-1);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};

describe("Jigsaw resource-session persistence integration", () => {
  it("keeps canonical assembly progress in the app-owned resource session", () => {
    expect(appSource).toContain("const [jigsawProgress, setJigsawProgress]");
    expect(appSource).toContain("session.progress.jigsawAssembly");
    expect(appSource).toContain('puzzle.puzzleId === "jigsaw" && jigsawProgress?.puzzleInstanceId === puzzle.id');
    expect(appSource).toContain("jigsawAssembly:");
    expect(appSource).toContain("jigsaw={workspaceJigsaw}");
  });

  it("keeps an empty assembly as explicit bound zero progress", () => {
    const reset = sourceBetween(appSource, "const resetCurrentPuzzle =", "const commitGenerationSettings =");
    const jigsawBinding = sourceBetween(appSource, "const workspaceJigsaw =", "const workspaceSolitaire =");

    expect(sessionsSource).toContain("makeEmptyJigsawAssemblyProgress()");
    expect(reset).toContain("assembly: makeEmptyJigsawAssemblyProgress()");
    expect(jigsawBinding).toContain("sameJigsawAssemblyProgress(current.assembly, assembly)");
  });

  it("routes assembly progress through the Jigsaw workspace before staging", () => {
    expect(workspaceSource).toContain("initialAssembly={jigsawAssembly}");
    expect(workspaceSource).toContain("onAssemblyChange={onJigsawAssemblyChange}");
    expect(previewSource).toContain("if (initialAssembly === null) return;");
    expect(previewSource).toContain("resolveInitialJigsawState(");
  });

  it("keeps persistence semantic and canonical rather than coordinate-based", () => {
    expect(persistenceSource).toContain("normalizeJigsawAssemblyProgress(session.progress.jigsawAssembly)");
    expect(persistenceSource).toContain("parseJigsawAssemblyProgress");
    expect(persistenceSource).not.toContain("jigsawSnappedPieceIds");
    expect(persistenceSource).not.toContain("jigsawPlacements");
    expect(persistenceSource).not.toContain("componentTranslations");
  });

  it("has no component-local persistence or migration fallback", () => {
    expect(previewSource).not.toContain("localStorage");
    expect(previewSource).not.toContain("loadLegacy");
    expect(previewSource).not.toContain("puzzle-forge.jigsaw");
    expect(previewSource).not.toContain("placementSchemaVersion");
    expect(previewSource).not.toContain("onPlacementsCommit");
    expect(previewSource).not.toContain("initialPlacements");
  });

  it("publishes semantic assembly only at committed interaction boundaries", () => {
    const staging = sourceBetween(previewSource, "const applyStagedPlacements =", "const resetPieces =");
    const history = sourceBetween(
      previewSource,
      "const dispatchHistoryAction =",
      "useEffect(() => {\n    if (!onHistoryControllerChange)",
    );
    const moveDrag = sourceBetween(previewSource, "const moveDrag =", "const finishDrag =");
    const finishDrag = sourceBetween(previewSource, "const finishDrag =", "const cancelDrag =");

    expect(staging).toContain("publishAssemblyProgress(nextAssembly);");
    expect(history).toContain("publishAssemblyProgress(transition.snapshot.assembly);");
    expect(moveDrag).not.toContain("publishAssemblyProgress");
    expect(finishDrag).toContain("publishAssemblyProgress(nextState.assembly);");
  });
});
