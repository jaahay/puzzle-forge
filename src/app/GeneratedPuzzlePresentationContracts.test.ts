import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const generatedPuzzleTypeSource = read("../catalog/types.ts");
const sharedGeneratorSource = read("../games/shared.ts");
const gridWorkspaceSource = read("../components/GridPuzzleWorkspace.tsx");
const jigsawWorkspaceSource = read("../components/JigsawWorkspace.tsx");

const generatorSources = [
  "../games/sudoku/generate.ts",
  "../games/futoshiki/generate.ts",
  "../games/nonogram/generate.ts",
  "../games/wordGuess/generate.ts",
  "../games/logicGrid/generate.ts",
  "../games/pegSolitaire/generate.ts",
  "../games/solitaire/generate.ts",
  "../games/jigsaw/generate.ts",
  "../games/tileSwap/generate.ts",
  "../games/slidingPuzzle/generate.ts",
].map(read);

describe("generated puzzle presentation ownership", () => {
  it("keeps generic renderable prose out of generated-puzzle state", () => {
    expect(generatedPuzzleTypeSource).not.toContain("notes: string[]");
    expect(generatedPuzzleTypeSource).not.toContain("messages: string[]");
    expect(generatedPuzzleTypeSource).not.toContain("metadataText");
    expect(sharedGeneratorSource).not.toContain("notes:");
    generatorSources.forEach((source) => expect(source).not.toContain("notes:"));
  });

  it("keeps workspaces from rendering a generic generated-puzzle prose channel", () => {
    expect(gridWorkspaceSource).not.toContain(".notes");
    expect(jigsawWorkspaceSource).not.toContain(".notes");
    expect(gridWorkspaceSource).not.toContain("notes-list");
    expect(jigsawWorkspaceSource).not.toContain("notes-list");
    expect(jigsawWorkspaceSource).not.toContain("getJigsawGameplayNotes");
  });

  it("keeps developer roadmap commentary out of generated puzzle payloads", () => {
    generatorSources.forEach((source) => {
      expect(source).not.toContain("Future versions");
      expect(source).not.toContain("This preview models");
    });
  });
});
