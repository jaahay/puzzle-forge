import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const sessionSource = read("./session.ts");
const persistenceSource = read("./sessionPersistence.ts");
const historySource = read("./solitaireHistory.ts");
const generationSource = read("./usePuzzleGeneration.ts");
const appSource = read("../App.tsx");
const gridWorkspaceSource = read("../components/GridPuzzleWorkspace.tsx");
const jigsawWorkspaceSource = read("../components/JigsawWorkspace.tsx");
const solitaireWorkspaceSource = read("../components/SolitaireWorkspace.tsx");
const imageWorkspaceSource = read("../components/ImageTilePuzzleWorkspace.tsx");
const wordGuessSource = read("../components/WordGuessGame.tsx");

describe("quiet workspace status ownership", () => {
  it("keeps transient status prose out of durable session and history state", () => {
    expect(sessionSource).not.toContain("statusMessage");
    expect(persistenceSource).not.toContain("statusMessage");
    expect(historySource).not.toContain("statusMessage");
  });

  it("starts and resets generated puzzles with neutral status instead of ready copy", () => {
    expect(generationSource).not.toContain("makeReadyMessage");
    expect(generationSource).not.toMatch(/ ready\./i);
    expect(appSource).toContain("buildFreshSessionForGeneratedPuzzle(generatedPuzzle)");
    expect(appSource).toContain('setStatusMessage("");');
  });

  it("renders shared status surfaces only when live feedback exists", () => {
    expect(solitaireWorkspaceSource).toContain("status={statusMessage ?");
    expect(imageWorkspaceSource).toContain("status={statusMessage ?");
    expect(jigsawWorkspaceSource).toContain("const showStatus = Boolean(statusMessage);");
    expect(gridWorkspaceSource).toContain("usesDedicatedStatus || !statusMessage");
    expect(wordGuessSource).toContain('{statusMessage ? <span class="sr-only">');
  });

  it("removes the hidden generic board-meta copy path", () => {
    expect(gridWorkspaceSource).not.toContain("puzzle-meta");
    expect(gridWorkspaceSource).not.toContain("getGridPuzzleMetaItems");
    expect(gridWorkspaceSource).not.toContain("Answer-list solvable");
  });
});
