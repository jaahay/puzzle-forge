import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("./JigsawWorkspace.tsx", import.meta.url), "utf8");

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

  it("publishes semantic assembly only through the three committed-state boundaries", () => {
    expect((previewSource.match(/publishAssemblyProgress\(/g) ?? []).length).toBe(3);
    expect(previewSource).toContain("publishAssemblyProgress(nextAssembly);");
    expect(previewSource).toContain("publishAssemblyProgress(transition.snapshot.assembly);");
    expect(previewSource).toContain("publishAssemblyProgress(nextState.assembly);");
  });
});
