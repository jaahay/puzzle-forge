import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const unavailableSource = readFileSync(new URL("./ResourceUnavailableView.tsx", import.meta.url), "utf8");
const shellSource = readFileSync(new URL("./AppShell.tsx", import.meta.url), "utf8");
const changelogSource = readFileSync(new URL("./ChangelogView.tsx", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

describe("GA recovery presentation", () => {
  it("offers same-puzzle recovery instead of a dead-end invalid resource", () => {
    expect(appSource).toContain('const message = "This puzzle is no longer available."');
    expect(appSource).toContain("onStartNew={recoverUnavailablePuzzle}");
    expect(appSource).toContain("createNewPuzzle({ resourceHistory: \"replace\" });");
    expect(appSource).toContain("randomizeNextPuzzleArtwork(selectedPuzzleId, nextPuzzleDraft)");
    expect(unavailableSource).toContain("Start a new {puzzleTitle}");
    expect(unavailableSource).toContain(">Home</button>");
  });

  it("keeps pre-GA development notes out of public navigation", () => {
    expect(shellSource).not.toContain('href="/updates"');
    expect(indexSource).not.toContain('href="/updates"');
    expect(changelogSource).toContain("Release notes begin at GA");
    expect(changelogSource).not.toContain("changelogEntries");
  });
});
