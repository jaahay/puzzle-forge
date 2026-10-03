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
  it("binds canonical assembly progress through the app-owned Jigsaw workspace", () => {
    expect(appSource).toContain("const [jigsawProgress, setJigsawProgress]");
    expect(appSource).toContain("session.progress.jigsawAssembly");
    expect(appSource).toContain("jigsawAssembly:");
    expect(appSource).toContain("jigsaw={workspaceJigsaw}");
    expect(workspaceSource).toContain("initialAssembly={jigsawAssembly}");
    expect(workspaceSource).toContain("onAssemblyChange={onJigsawAssemblyChange}");
    expect(previewSource).toContain("if (initialAssembly === null) return;");
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
