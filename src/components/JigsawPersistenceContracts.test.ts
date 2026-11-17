import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("./JigsawWorkspace.tsx", import.meta.url), "utf8");

describe("Jigsaw resource-session persistence integration", () => {
  it("has one app-owned Jigsaw runtime rather than separately-owned assembly state", () => {
    expect(appSource).not.toContain("setJigsawProgress");
    expect(workspaceSource).not.toContain("onAssemblyChange=");
    expect(workspaceSource).toContain("initialRuntime={jigsawRuntime}");
    expect(workspaceSource).toContain("onRuntimeChange=");
    expect(appSource).toContain("onJigsawRuntimeChange:");
    expect(appSource).toContain("jigsawRuntimeRef.current =");
    expect(appSource).toContain("jigsaw={workspaceJigsaw}");
    expect(previewSource).not.toContain("publishAssemblyProgress(");
  });

  it("publishes completed actions, not pointer-movement snapshots", () => {
    expect(previewSource).toContain("replaceHistory(completed.history)");
    expect(previewSource).toContain("replaceHistory(transition.history)");
    expect(previewSource).toContain("replaceHistory(updatedHistory)");
    expect(previewSource).toContain("replaceHistory(makeEmptyJigsawHistoryState())");
    expect(previewSource).toContain("runtimeChangeRef.current?.({ snapshot: current, history })");
  });
});
